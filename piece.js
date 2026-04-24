// =============================================================================
// piece.js — Individual artwork page: size selector, add-to-cart, magnifier
//
// Depends on: utils.js, cart.js
// Used on: /[artwork] pages only (piece1, clothing01, etc.)
//
// Responsibilities:
//   - Inject the size picker and "Add to Cart" button into the piece info panel
//   - Read artwork metadata from the DOM and build a cart item object
//   - Run the hover magnifier on the artwork image
// =============================================================================

// ─── Add-to-cart button ─────────────────────────────────────────────────────────────

// Dynamically builds and injects the size picker + "Add to Cart" button
// into the .piece-info panel. Called once per artwork page load.
//
// The size selector uses a radiogroup of styled buttons. Clicking a size
// updates the displayed price and the selection state. Clicking "Add to Cart"
// reads the current piece metadata from the DOM and calls addItem() (cart.js).
function createAddToCartButton() {
	var pieceInfo = document.querySelector("#piece-detail .piece-info");
	if (!pieceInfo) { return; }

	var actions = document.createElement("div");
	var sizeSelector = document.createElement("div");
	var priceNote = document.createElement("p");
	var addButton = document.createElement("button");

	actions.className = "piece-actions";
	sizeSelector.className = "size-selector";
	sizeSelector.innerHTML = [
		'<span class="size-selector-label">Artwork size</span>',
		'<div class="size-options" role="radiogroup" aria-label="Artwork size">',
		'    <button type="button" class="size-option" data-size-option="Small" aria-pressed="false"><span class="size-option-label">Small</span><span class="size-option-dims">' + sizeDimensions.Small + '</span><span class="size-option-price">€20</span></button>',
		'    <button type="button" class="size-option" data-size-option="Medium" aria-pressed="true"><span class="size-option-label">Medium</span><span class="size-option-dims">' + sizeDimensions.Medium + '</span><span class="size-option-price">€45</span></button>',
		'    <button type="button" class="size-option" data-size-option="Large" aria-pressed="false"><span class="size-option-label">Large</span><span class="size-option-dims">' + sizeDimensions.Large + '</span><span class="size-option-price">€110</span></button>',
		'</div>'
	].join("");

	priceNote.className = "size-price-note";
	addButton.type = "button";
	addButton.className = "add-to-cart-button";
	addButton.textContent = "Add to Cart";

	sizeSelector.addEventListener("click", function (event) {
		var option = event.target.closest("[data-size-option]");
		if (!option) { return; }
		setSelectedSize(sizeSelector, option.getAttribute("data-size-option") || "Medium");
		updateDisplayedPrice(priceNote, getSelectedSize(sizeSelector));
	});

	addButton.addEventListener("click", function () {
		var item = getCurrentPieceDetails(getSelectedSize(sizeSelector));
		if (!item) { return; }

	// Brief visual confirmation: button text changes to "Added to Cart" for 1.6s
		addItem(item);
		addButton.textContent = "Added to Cart";
		addButton.classList.add("is-added");
		window.setTimeout(function () {
			addButton.textContent = "Add to Cart";
			addButton.classList.remove("is-added");
		}, 1600);
	});

	actions.appendChild(sizeSelector);
	actions.appendChild(priceNote);
	actions.appendChild(addButton);
	setSelectedSize(sizeSelector, "Medium");
	updateDisplayedPrice(priceNote, "Medium");
	pieceInfo.appendChild(actions);
}

// ─── Piece data ────────────────────────────────────────────────────────────────────

// Reads the artwork title, description, image, and page filename from the DOM
// and bundles them into a cart item object for the given size.
// Returns null if the required elements are missing (guards against errors
// on pages that don't have a #piece-detail section).
function getCurrentPieceDetails(selectedSize) {
	var title       = document.querySelector("#piece-detail .piece-info h2");
	var description = document.querySelector("#piece-detail .piece-info p");
	var visual      = document.querySelector("#piece-detail .piece-image");
	var pagePath    = window.location.pathname.split("/").pop() || "";
	var size        = selectedSize || "Medium";

	if (!title || !description) { return null; }

	return {
		id: (pagePath || slugify(title.textContent)) + "-" + slugify(size),
		artworkId: pagePath || slugify(title.textContent),
		title: title.textContent.trim(),
		description: description.textContent.trim(),
		visual: visual ? (visual.getAttribute("data-visual") || visual.textContent.trim() || "Artwork") : "Artwork",
		image: getArtworkImagePath({
			artworkId: pagePath || slugify(title.textContent),
			page: pagePath || "",
			title: title.textContent.trim()
		}),
		page: pagePath || "Current page",
		size: size,
		price: getPriceForSize(size),
		quantity: 1
	};
}

// ─── Size selector helpers ─────────────────────────────────────────────────────
function getSelectedSize(sizeSelector) {
	var selectedOption = sizeSelector.querySelector(".size-option.is-selected");
	return selectedOption ? selectedOption.getAttribute("data-size-option") || "Medium" : "Medium";
}

function setSelectedSize(sizeSelector, size) {
	var options = sizeSelector.querySelectorAll(".size-option");

	options.forEach(function (option) {
		var isSelected = option.getAttribute("data-size-option") === size;
		option.classList.toggle("is-selected", isSelected);
		option.setAttribute("aria-pressed", isSelected ? "true" : "false");
	});
}

function updateDisplayedPrice(priceElement, size) {
	priceElement.innerHTML = [
		'<span class="size-price-label">Selected price</span>',
		'<strong>' + formatPrice(getPriceForSize(size)) + '</strong>'
	].join(" ");
}

// ─── Image magnifier ───────────────────────────────────────────────────────────

// Adds a hover magnifier lens to the artwork image on piece detail pages.
// The lens is a <div> with a background-image showing the image at 2.2x zoom,
// repositioned on mousemove to follow the cursor.
//
// The lens is constrained inside the artwork frame using clamp() (from utils.js)
// and is hidden (no is-visible class) when the cursor leaves the rendered
// image area (important when the image doesn't fill its container).
function initializePieceMagnifier() {
	var artworkFrame = document.querySelector("#piece-detail .piece-image-artwork");
	var artworkImage = artworkFrame ? artworkFrame.querySelector("img") : null;
	var lens;
	var lensSize = 150; // Width and height of the magnifier lens in pixels
	var zoom     = 2.2; // Zoom factor applied to the background image

	if (!artworkFrame || !artworkImage) { return; }

	lens = document.createElement("div");
	lens.className = "piece-magnifier-lens";
	lens.setAttribute("aria-hidden", "true");
	artworkFrame.appendChild(lens);

	function hideLens() {
		lens.classList.remove("is-visible");
	}

	// Positions the lens under the cursor and updates its zoomed background.
	// The position is computed relative to the rendered image area (not the
	// container), so it stays accurate when the image doesn't fill the frame.
	function updateLens(event) {
		var renderedBounds = getRenderedImageBounds(artworkImage);
		var frameRect = artworkFrame.getBoundingClientRect();
		var relativeX;
		var relativeY;
		var lensLeft;
		var lensTop;

		if (!renderedBounds) { hideLens(); return; }

		if (
			event.clientX < renderedBounds.left ||
			event.clientX > renderedBounds.left + renderedBounds.width ||
			event.clientY < renderedBounds.top ||
			event.clientY > renderedBounds.top + renderedBounds.height
		) {
			hideLens();
			return;
		}

		relativeX = event.clientX - renderedBounds.left;
		relativeY = event.clientY - renderedBounds.top;
		lensLeft = clamp(event.clientX - frameRect.left - lensSize / 2, 0, frameRect.width - lensSize);
		lensTop = clamp(event.clientY - frameRect.top - lensSize / 2, 0, frameRect.height - lensSize);

		lens.style.left = lensLeft + "px";
		lens.style.top = lensTop + "px";
		lens.style.backgroundImage = 'url("' + artworkImage.getAttribute("src") + '")';
		lens.style.backgroundSize = renderedBounds.width * zoom + "px " + renderedBounds.height * zoom + "px";
		lens.style.backgroundPosition = [
			-relativeX * zoom + lensSize / 2 + "px",
			-relativeY * zoom + lensSize / 2 + "px"
		].join(" ");
		lens.classList.add("is-visible");
	}

	artworkFrame.addEventListener("mouseenter", updateLens);
	artworkFrame.addEventListener("mousemove", updateLens);
	artworkFrame.addEventListener("mouseleave", hideLens);
	artworkImage.addEventListener("load", hideLens);
}

// Calculates the actual displayed pixel dimensions and offset of an <img>
// element inside its container, accounting for object-fit: contain behaviour.
// Returns null if the image hasn't loaded yet (naturalWidth is 0).
// Used by the magnifier to know exactly where the image pixels are.
function getRenderedImageBounds(image) {
	var imageRect;
	var naturalRatio;
	var boxRatio;
	var renderedWidth;
	var renderedHeight;
	var offsetX = 0;
	var offsetY = 0;

	if (!image || !image.naturalWidth || !image.naturalHeight) { return null; }

	imageRect = image.getBoundingClientRect();
	naturalRatio = image.naturalWidth / image.naturalHeight;
	boxRatio = imageRect.width / imageRect.height;

	if (naturalRatio > boxRatio) {
		renderedWidth = imageRect.width;
		renderedHeight = imageRect.width / naturalRatio;
		offsetY = (imageRect.height - renderedHeight) / 2;
	} else {
		renderedHeight = imageRect.height;
		renderedWidth = imageRect.height * naturalRatio;
		offsetX = (imageRect.width - renderedWidth) / 2;
	}

	return {
		left: imageRect.left + offsetX,
		top: imageRect.top + offsetY,
		width: renderedWidth,
		height: renderedHeight
	};
}
