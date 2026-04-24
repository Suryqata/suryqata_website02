// =============================================================================
// cart.js — Shopping cart state, DOM interface, and rendering
//
// Depends on: utils.js (must be loaded before this file)
// Used on: every page (the cart button lives in the shared header)
//
// Responsibilities:
//   - Hold the in-memory cart array and keep it synced to localStorage
//   - Build the cart button and slide-out panel in the header
//   - Re-render the panel whenever the cart changes
//   - Handle add / remove / quantity-change actions
// =============================================================================

// ─── Module-level variables ───────────────────────────────────────────────────
// The live cart array. Starts empty; filled by loadAndInitCart() on page load.
var cart = [];

// References to DOM nodes created by createCartInterface().
// Kept at module scope so renderCart() and open/closeCart() can reach them
// from anywhere without needing to query the DOM again.
var cartButton;         // The "Cart (n)" button in the header
var cartCount;          // The <span> badge showing the item count
var cartOverlay;        // The full-screen overlay that contains the panel
var cartItems;          // The scrollable list of cart items inside the panel
var cartSummary;        // The totals bar at the top of the panel
var cartCheckoutButton; // The "Go to Checkout" button inside the panel

// Called once on DOMContentLoaded (from script.js).
// Reads the saved cart from localStorage and hydrates the cart array.
function loadAndInitCart() {
	cart = loadCart();
}

// ─── localStorage helpers ──────────────────────────────────────────────────────

// Reads the cart from localStorage and runs every item through normalizeCartItem()
// to fill in any missing fields (handles old/corrupted data gracefully).
// Returns an empty array if nothing is saved or if JSON.parse fails.
function loadCart() {
	try {
		var savedCart = window.localStorage.getItem(storageKey);
		var parsedItems;
		var normalizedItems = [];
		var index;

		if (!savedCart) {
			return [];
		}

		parsedItems = JSON.parse(savedCart);

		for (index = 0; index < parsedItems.length; index += 1) {
			normalizedItems.push(normalizeCartItem(parsedItems[index]));
		}

		return normalizedItems;
	} catch (error) {
		return [];
	}
}

// Writes the current cart array to localStorage as JSON.
// Called after every mutation (addItem, changeQuantity, removeItem).
function persistCart() {
	try {
		window.localStorage.setItem(storageKey, JSON.stringify(cart));
	} catch (error) {
		return; // localStorage unavailable (private browsing, quota, etc.) — fail silently
	}
}

// ─── Item normalization ────────────────────────────────────────────────────────

// Ensures every cart item has all expected fields with sensible defaults.
// This is run on load (to repair old data) and when new items are added.
// It also refreshes the image path in case the format changed since the item was saved.
function normalizeCartItem(entry) {
	var normalizedSize = entry && entry.size ? entry.size : "Medium";
	var artworkId = entry && entry.artworkId ? entry.artworkId : entry.id;

	return {
		id:          entry && entry.id          ? entry.id          : artworkId + "-" + slugify(normalizedSize),
		artworkId:   artworkId,
		title:       entry && entry.title       ? entry.title       : "Artwork",
		description: entry && entry.description ? entry.description : "",
		visual:      entry && entry.visual      ? entry.visual      : "Artwork",
		// refreshLegacyImagePath converts old .jpg paths to .avif if needed
		image:       refreshLegacyImagePath(entry && entry.image ? entry.image : getArtworkImagePath(entry)),
		page:        entry && entry.page        ? entry.page        : "Current page",
		size:        normalizedSize,
		price:       entry && entry.price       ? entry.price       : getPriceForSize(normalizedSize),
		quantity:    entry && entry.quantity    ? entry.quantity    : 1
	};
}

// ─── Price helpers ─────────────────────────────────────────────────────────────

// Looks up the price for a given size string (Small / Medium / Large).
// Falls back to Medium price if the size is unknown.
function getPriceForSize(size) {
	return sizePrices[size] || sizePrices.Medium;
}

// Returns the per-unit price of a cart entry.
// Prefers the stored price (set when the item was added) over a live lookup.
function getUnitPrice(entry) {
	return entry && entry.price ? entry.price : getPriceForSize(entry && entry.size ? entry.size : "Medium");
}

// Returns the total price for a cart entry (unit price × quantity).
function getItemTotal(entry) {
	return getUnitPrice(entry) * (entry && entry.quantity ? entry.quantity : 1);
}

// ─── Image path helpers ────────────────────────────────────────────────────────

// Determines the image file path for an artwork entry by pattern-matching
// the page filename, artworkId, or title against known patterns like
// "piece03" or "clothing01". Returns an empty string if unrecognised.
function getArtworkImagePath(entry) {
	var source = [
		entry && entry.page      ? entry.page      : "",
		entry && entry.artworkId ? entry.artworkId : "",
		entry && entry.title     ? entry.title     : ""
	].join(" ");

	// Check if this is a clothing item first
	var clothingMatch = source.match(/clothing\s*0*(\d+)|clothing0*(\d+)\.html/i);
	var match         = source.match(/piece\s*0*(\d+)|piece0*(\d+)\.html/i);
	var clothingNumber;
	var pieceNumber;

	if (clothingMatch) {
		clothingNumber = clothingMatch[1] || clothingMatch[2];
		if (!clothingNumber) { return ""; }
		return getClothingImagePath(clothingNumber);
	}

	if (!match) { return ""; }

	pieceNumber = match[1] || match[2];
	if (!pieceNumber) { return ""; }

	// Zero-pad the number and build the path (e.g. piece03.avif)
	return withBasePath("gallerycontent/piece" + String(pieceNumber).padStart(2, "0") + ".avif");
}

// Converts old ".jpg" piece image paths to the newer ".avif" format.
// Also ensures the path starts with "/" so it resolves from the site root.
// Safe to call on already-valid paths — it returns them unchanged.
function refreshLegacyImagePath(imagePath) {
	var normalizedPath;

	if (!imagePath) { return imagePath; }

	normalizedPath = String(imagePath)
		.replace(/(\/)?gallerycontent\/piece(\d{2})\.jpg$/i, "gallerycontent/piece$2.avif")
		.replace(/^\/+/, "");

	if (/^gallerycontent\//i.test(normalizedPath)) {
		return withBasePath(normalizedPath);
	}

	return normalizedPath;
}

// Returns the file path for a clothing image.
// extensionMap controls which extension each clothing number uses.
// Returns "" for unknown clothing numbers.
function getClothingImagePath(clothingNumber) {
	var paddedNumber = String(clothingNumber).padStart(2, "0");
	var extensionMap = { "01": ".avif", "02": ".avif", "03": ".jpg" };

	if (!extensionMap[paddedNumber]) { return ""; }

	return withBasePath("gallerycontent/clothing" + paddedNumber + extensionMap[paddedNumber]);
}

// Returns the HTML markup for the thumbnail shown inside a cart item row.
// Uses an <img> if a valid image path exists; falls back to the artwork's
// text "visual" label (e.g. an emoji or short descriptor).
function getCartItemVisualMarkup(entry) {
	if (entry && entry.image) {
		return '<img src="' + escapeAttribute(entry.image) + '" alt="' + escapeAttribute((entry.title || "Artwork") + ' preview') + '">';
	}
	return escapeHtml(entry && entry.visual ? entry.visual : "Artwork");
}

// ─── Cart DOM interface ────────────────────────────────────────────────────────

// Dynamically builds the cart button and slide-out panel and injects them
// into the header navigation. Called once per page load if a header exists.
//
// The panel is kept hidden (hidden attribute) until openCart() is called.
// All user interactions inside the panel are handled via a single delegated
// event listener on cartOverlay (more efficient than per-button listeners).
function createCartInterface(headerNav) {
	// --- Build the header button ---
	cartButton = document.createElement("button");
	cartButton.type = "button";
	cartButton.className = "cart-button";
	cartButton.setAttribute("aria-label", "Open shopping cart");
	cartButton.innerHTML = [
		'<span class="cart-button-icon" aria-hidden="true">',
		'<svg viewBox="0 0 24 24" role="presentation" focusable="false">',
		'<path d="M7 5H22L20 13H9L7 5Z"></path>',
		'<path d="M7 5L6.2 2H2"></path>',
		'<circle cx="10" cy="19" r="1.6"></circle>',
		'<circle cx="18" cy="19" r="1.6"></circle>',
		'</svg>',
		'</span>',
		'<span class="cart-button-label">Cart</span>',
		'<span class="cart-count" aria-live="polite">0</span>'
	].join("");

	cartCount = cartButton.querySelector(".cart-count");
	headerNav.appendChild(cartButton);

	// --- Build the overlay + slide-out panel ---
	cartOverlay = document.createElement("div");
	cartOverlay.className = "cart-overlay";
	cartOverlay.hidden = true; // Shown by openCart(), hidden by closeCart()
	cartOverlay.innerHTML = [
		'<div class="cart-backdrop" data-cart-close="true"></div>',
		'<aside class="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title">',
		'    <div class="cart-panel-header">',
		'        <div class="cart-panel-heading">',
		'            <p class="cart-kicker">Shopping cart</p>',
		'            <h2 id="cart-title">Your selections</h2>',
		'        </div>',
		'        <div class="cart-panel-actions">',
		'            <button type="button" class="cart-close" aria-label="Close cart" data-cart-close="true">',
		'                <span aria-hidden="true">&times;</span>',
		'            </button>',
		'            <button type="button" class="cart-checkout-button" data-cart-action="checkout">Go to Checkout</button>',
		'        </div>',
		'    </div>',
		'    <div class="cart-summary"></div>',
		'    <div class="cart-items"></div>',
		'</aside>'
	].join("");

	cartItems         = cartOverlay.querySelector(".cart-items");
	cartSummary       = cartOverlay.querySelector(".cart-summary");
	cartCheckoutButton = cartOverlay.querySelector(".cart-checkout-button");
	document.body.appendChild(cartOverlay);

	// Open the panel when the header button is clicked
	cartButton.addEventListener("click", openCart);

	// Delegated listener: handles all button clicks inside the overlay.
	// Checks data-cart-close to close, data-cart-action to dispatch actions.
	cartOverlay.addEventListener("click", function (event) {
		var closeTarget = event.target.closest("[data-cart-close='true']");
		if (closeTarget) { closeCart(); return; }

		var actionButton = event.target.closest("[data-cart-action]");
		if (!actionButton) { return; }

		var itemId = actionButton.getAttribute("data-item-id");
		var action = actionButton.getAttribute("data-cart-action");

		if (action === "increase")                    { changeQuantity(itemId, 1); }
		if (action === "decrease")                    { changeQuantity(itemId, -1); }
		if (action === "remove")                      { removeItem(itemId); }
		if (action === "view")                        { navigateToProduct(itemId); }
		if (action === "checkout" && cart.length)     { window.location.href = withBasePath("checkout"); }
	});

	// Close the cart panel when the user presses Escape
	document.addEventListener("keydown", function (event) {
		if (event.key === "Escape" && cartOverlay && !cartOverlay.hidden) { closeCart(); }
	});
}

// ─── Cart mutation actions ─────────────────────────────────────────────────────

// Adds an item to the cart. If the same item ID already exists (same artwork
// AND same size), increments its quantity instead of adding a duplicate.
// Then saves, re-renders, and opens the cart panel.
function addItem(item) {
	var existingItem = cart.find(function (entry) { return entry.id === item.id; });

	if (existingItem) {
		existingItem.quantity += 1;
	} else {
		cart.push(item);
	}

	persistCart();
	renderCart();
	openCart();
}

// Adjusts the quantity of a cart item by `amount` (+1 or -1).
// Items whose quantity drops to 0 are automatically removed via .filter().
function changeQuantity(itemId, amount) {
	var updatedCart = [];
	var index;
	var entry;

	for (index = 0; index < cart.length; index += 1) {
		entry = cart[index];

		if (entry.id === itemId) {
			entry.quantity += amount;
		}

		if (entry.quantity > 0) {
			updatedCart.push(entry);
		}
	}

	cart = updatedCart;

	persistCart();
	renderCart();
}

// Removes an item from the cart entirely, regardless of quantity.
function removeItem(itemId) {
	var updatedCart = [];
	var index;

	for (index = 0; index < cart.length; index += 1) {
		if (cart[index].id !== itemId) {
			updatedCart.push(cart[index]);
		}
	}

	cart = updatedCart;
	persistCart();
	renderCart();
}

// Navigates to the source product page of a cart item.
// The `page` field on each item is the filename of the artwork page
// (e.g. "piece3") stored when the item was added.
function navigateToProduct(itemId) {
	var item = cart.find(function (entry) { return entry.id === itemId; });
	var page;

	if (!item || !item.page) { return; }

	page = String(item.page).replace(/\.html$/i, "").replace(/^\/+/, "");
	window.location.href = withBasePath(page);
}

// ─── Cart rendering ────────────────────────────────────────────────────────────

// Re-renders the entire cart panel to reflect the current state of the cart array.
// Also updates the header badge count.
// Called after every mutation and on initial page load.
function renderCart() {
	// Calculate totals for the summary bar
	var totalItems = 0;
	var artworkCount = cart.length; // Number of distinct artworks (not total qty)
	var totalPrice = 0;
	var index;

	for (index = 0; index < cart.length; index += 1) {
		totalItems += cart[index].quantity;
		totalPrice += getItemTotal(cart[index]);
	}

	// Update the header badge — visible on every page
	if (cartCount) {
		cartCount.textContent = String(totalItems);
		cartCount.classList.toggle("has-items", totalItems > 0); // CSS hook for styling
	}

	// cartItems/cartSummary only exist on pages that have the cart panel
	if (!cartItems || !cartSummary) { return; }

	// Disable the checkout button if the cart is empty
	if (cartCheckoutButton) { cartCheckoutButton.disabled = !cart.length; }

	// Render the summary bar (item count / artwork count / total price)
	cartSummary.innerHTML = [
		'<p><strong>' + totalItems + '</strong> item' + pluralize(totalItems) + '</p>',
		'<p><strong>' + artworkCount + '</strong> artwork' + pluralize(artworkCount) + '</p>',
		'<p><strong>' + formatPrice(totalPrice) + '</strong> total</p>'
	].join("");

	// Show an empty-state message when the cart has no items
	if (!cart.length) {
		cartItems.innerHTML = [
			'<div class="cart-empty-state">',
			'    <p>Your cart is empty.</p>',
			'    <span>Add a piece from an artwork page and it will appear here with its details.</span>',
			'</div>'
		].join("");
		return;
	}

	// Build one <article> per cart item and inject all of them at once
	cartItems.innerHTML = cart.map(function (entry) {
		var unitPrice = getUnitPrice(entry);
		var lineTotal = getItemTotal(entry);

		return [
			'<article class="cart-item">',
			'    <div class="cart-item-visual">' + getCartItemVisualMarkup(entry) + '</div>',
			'    <div class="cart-item-copy">',
			'        <div class="cart-item-heading">',
			'            <h3>' + escapeHtml(entry.title) + '</h3>',
			'            <div class="cart-item-actions">',
			// data-cart-action and data-item-id are picked up by the delegated listener above
			'                <button type="button" class="cart-item-remove" data-cart-action="remove" data-item-id="' + escapeAttribute(entry.id) + '">Remove</button>',
			'            </div>',
			'        </div>',
			'        <div class="cart-item-meta">',
			'            <span class="cart-item-size">Size: ' + escapeHtml(entry.size || "Medium") + '</span>',
			'            <span class="cart-item-price">Price: ' + formatPrice(unitPrice) + '</span>',
			'            <span class="cart-item-page">Source: ' + escapeHtml(entry.page) + '</span>',
			'        </div>',
			'        <p>' + escapeHtml(entry.description) + '</p>',
			'        <p class="cart-item-total">Line total: <strong>' + formatPrice(lineTotal) + '</strong></p>',
			'        <div class="cart-item-footer">',
			'            <div class="cart-item-controls">',
			'            <button type="button" data-cart-action="decrease" data-item-id="' + escapeAttribute(entry.id) + '" aria-label="Decrease quantity for ' + escapeAttribute(entry.title) + '">-</button>',
			'            <span>Qty ' + entry.quantity + '</span>',
			'            <button type="button" data-cart-action="increase" data-item-id="' + escapeAttribute(entry.id) + '" aria-label="Increase quantity for ' + escapeAttribute(entry.title) + '">+</button>',
			'            </div>',
			'            <button type="button" class="cart-item-view" data-cart-action="view" data-item-id="' + escapeAttribute(entry.id) + '">View Product</button>',
			'        </div>',
			'    </div>',
			'</article>'
		].join("");
	}).join("");
}

// ─── Panel visibility ──────────────────────────────────────────────────────────

// Reveals the cart overlay and adds a CSS class to <body> that can be used
// to prevent background scrolling while the panel is open.
function openCart() {
	if (!cartOverlay) { return; }
	cartOverlay.hidden = false;
	document.body.classList.add("cart-open");
}

// Hides the cart overlay and removes the scroll-lock class from <body>.
function closeCart() {
	if (!cartOverlay) { return; }
	cartOverlay.hidden = true;
	document.body.classList.remove("cart-open");
}
