document.addEventListener("DOMContentLoaded", function () {
	var storageKey = "suryqata-cart";
	var checkoutStateKey = "suryqata-checkout-state";
	var latestOrderKey = "suryqata-latest-order";
	var sizePrices = {
		Small: 20,
		Medium: 45,
		Large: 110
	};
	var sizeDimensions = {
		Small: '5×7 in',
		Medium: '11×14 in',
		Large: '24×36 in'
	};
	var cart = loadCart();
	var headerNav = document.querySelector(".header-nav");
	var pieceInfo = document.querySelector("#piece-detail .piece-info");
	var checkoutPage = document.querySelector("[data-checkout-page]");
	var thankYouPage = document.querySelector("[data-thank-you-page]");
	var authPage = document.querySelector("[data-auth-page]");
	var galleryFilters = Array.prototype.slice.call(document.querySelectorAll("[data-gallery-filter]"));
	var galleryCards = Array.prototype.slice.call(document.querySelectorAll("#gallery .card[data-category]"));
	var authLink;
	var authLogoutButton;
	var cartButton;
	var cartCount;
	var cartOverlay;
	var cartItems;
	var cartSummary;
	var cartCheckoutButton;

	if (headerNav) {
		createAuthInterface();
		createCartInterface();
		renderCart();
		refreshAuthInterface();
	}

	if (pieceInfo) {
		createAddToCartButton();
	}

	if (galleryFilters.length && galleryCards.length) {
		initializeGalleryFilters();
	}

	initializePieceMagnifier();

	if (checkoutPage) {
		initializeCheckout();
	}

	if (thankYouPage) {
		initializeThankYouPage();
	}

	if (authPage) {
		initializeAuthPage();
	}

	function createAuthInterface() {
		authLink = document.createElement("a");
		authLink.className = "auth-entry-link";
		authLink.href = getAuthRedirectHref();
		authLink.textContent = "Sign In";
		headerNav.appendChild(authLink);

		authLogoutButton = document.createElement("button");
		authLogoutButton.type = "button";
		authLogoutButton.className = "auth-logout-button";
		authLogoutButton.textContent = "Log Out";
		authLogoutButton.hidden = true;
		authLogoutButton.addEventListener("click", function () {
			logoutCurrentSession();
		});
		headerNav.appendChild(authLogoutButton);
	}

	function createCartInterface() {
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

		cartOverlay = document.createElement("div");
		cartOverlay.className = "cart-overlay";
		cartOverlay.hidden = true;
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

		cartItems = cartOverlay.querySelector(".cart-items");
		cartSummary = cartOverlay.querySelector(".cart-summary");
		cartCheckoutButton = cartOverlay.querySelector(".cart-checkout-button");
		document.body.appendChild(cartOverlay);

		cartButton.addEventListener("click", openCart);
		cartOverlay.addEventListener("click", function (event) {
			var closeTarget = event.target.closest("[data-cart-close='true']");
			if (closeTarget) {
				closeCart();
				return;
			}

			var actionButton = event.target.closest("[data-cart-action]");
			if (!actionButton) {
				return;
			}

			var itemId = actionButton.getAttribute("data-item-id");
			var action = actionButton.getAttribute("data-cart-action");

			if (action === "increase") {
				changeQuantity(itemId, 1);
			}

			if (action === "decrease") {
				changeQuantity(itemId, -1);
			}

			if (action === "remove") {
				removeItem(itemId);
			}

			if (action === "view") {
				navigateToProduct(itemId);
			}

			if (action === "checkout" && cart.length) {
				window.location.href = "checkout.html";
			}
		});

		document.addEventListener("keydown", function (event) {
			if (event.key === "Escape" && cartOverlay && !cartOverlay.hidden) {
				closeCart();
			}
		});
	}

	function createAddToCartButton() {
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
			if (!option) {
				return;
			}

			setSelectedSize(sizeSelector, option.getAttribute("data-size-option") || "Medium");
			updateDisplayedPrice(priceNote, getSelectedSize(sizeSelector));
		});

		addButton.addEventListener("click", function () {
			var item = getCurrentPieceDetails(getSelectedSize(sizeSelector));

			if (!item) {
				return;
			}

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

	function initializePieceMagnifier() {
		var artworkFrame = document.querySelector("#piece-detail .piece-image-artwork");
		var artworkImage = artworkFrame ? artworkFrame.querySelector("img") : null;
		var lens;
		var lensSize = 150;
		var zoom = 2.2;

		if (!artworkFrame || !artworkImage) {
			return;
		}

		lens = document.createElement("div");
		lens.className = "piece-magnifier-lens";
		lens.setAttribute("aria-hidden", "true");
		artworkFrame.appendChild(lens);

		function hideLens() {
			lens.classList.remove("is-visible");
		}

		function updateLens(event) {
			var renderedBounds = getRenderedImageBounds(artworkImage);
			var frameRect = artworkFrame.getBoundingClientRect();
			var relativeX;
			var relativeY;
			var lensLeft;
			var lensTop;

			if (!renderedBounds) {
				hideLens();
				return;
			}

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

	function initializeGalleryFilters() {
		galleryFilters.forEach(function (button) {
			button.addEventListener("click", function () {
				var selectedFilter = button.getAttribute("data-gallery-filter") || "";

				galleryFilters.forEach(function (item) {
					var isActive = item === button;
					item.classList.toggle("is-active", isActive);
					item.setAttribute("aria-pressed", isActive ? "true" : "false");
				});

				galleryCards.forEach(function (card) {
					var matches = card.getAttribute("data-category") === selectedFilter;
					card.hidden = !matches;
				});
			});

			button.setAttribute("aria-pressed", "false");
		});
	}

	function getCurrentPieceDetails(selectedSize) {
		var title = document.querySelector("#piece-detail .piece-info h2");
		var description = document.querySelector("#piece-detail .piece-info p");
		var visual = document.querySelector("#piece-detail .piece-image");
		var pagePath = window.location.pathname.split("/").pop() || "";
		var size = selectedSize || "Medium";

		if (!title || !description) {
			return null;
		}

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

	function addItem(item) {
		var existingItem = cart.find(function (entry) {
			return entry.id === item.id;
		});

		if (existingItem) {
			existingItem.quantity += 1;
		} else {
			cart.push(item);
		}

		persistCart();
		renderCart();
		openCart();
	}

	function changeQuantity(itemId, amount) {
		cart = cart
			.map(function (entry) {
				if (entry.id === itemId) {
					entry.quantity += amount;
				}

				return entry;
			})
			.filter(function (entry) {
				return entry.quantity > 0;
			});

		persistCart();
		renderCart();
	}

	function removeItem(itemId) {
		cart = cart.filter(function (entry) {
			return entry.id !== itemId;
		});

		persistCart();
		renderCart();
	}

	function renderCart() {
		var totalItems = cart.reduce(function (sum, entry) {
			return sum + entry.quantity;
		}, 0);
		var artworkCount = cart.length;
		var totalPrice = cart.reduce(function (sum, entry) {
			return sum + getItemTotal(entry);
		}, 0);

		if (cartCount) {
			cartCount.textContent = String(totalItems);
			cartCount.classList.toggle("has-items", totalItems > 0);
		}

		if (!cartItems || !cartSummary) {
			return;
		}

		if (cartCheckoutButton) {
			cartCheckoutButton.disabled = !cart.length;
		}

		cartSummary.innerHTML = [
			'<p><strong>' + totalItems + '</strong> item' + pluralize(totalItems) + '</p>',
			'<p><strong>' + artworkCount + '</strong> artwork' + pluralize(artworkCount) + '</p>',
			'<p><strong>' + formatPrice(totalPrice) + '</strong> total</p>'
		].join("");

		if (!cart.length) {
			cartItems.innerHTML = [
				'<div class="cart-empty-state">',
				'    <p>Your cart is empty.</p>',
				'    <span>Add a piece from an artwork page and it will appear here with its details.</span>',
				'</div>'
			].join("");
			return;
		}

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

	function navigateToProduct(itemId) {
		var item = cart.find(function (entry) {
			return entry.id === itemId;
		});

		if (!item || !item.page) {
			return;
		}

		window.location.href = item.page;
	}

	function initializeCheckout() {
		var checkoutLayout = checkoutPage.querySelector(".checkout-layout");
		var confirmationPanel = checkoutPage.querySelector("[data-checkout-confirmation]");
		var form = checkoutPage.querySelector(".checkout-form");
		var steps = Array.prototype.slice.call(checkoutPage.querySelectorAll(".checkout-step"));
		var indicators = Array.prototype.slice.call(checkoutPage.querySelectorAll("[data-step-indicator]"));
		var backButton = checkoutPage.querySelector("[data-checkout-back]");
		var nextButton = checkoutPage.querySelector("[data-checkout-next]");
		var submitButton = checkoutPage.querySelector("[data-checkout-submit]");
		var summaryItems = checkoutPage.querySelector("[data-checkout-summary-items]");
		var summaryTotals = checkoutPage.querySelector("[data-checkout-summary-totals]");
		var reviewBilling = checkoutPage.querySelector("[data-review-billing]");
		var reviewDelivery = checkoutPage.querySelector("[data-review-delivery]");
		var reviewPayment = checkoutPage.querySelector("[data-review-payment]");
		var reviewNotes = checkoutPage.querySelector("[data-review-notes]");
		var invoicePreviewButton = checkoutPage.querySelector("[data-invoice-preview]");
		var invoiceDownloadButton = checkoutPage.querySelector("[data-invoice-download]");
		var invoiceStatus = checkoutPage.querySelector("[data-invoice-status]");
		var invoicePlaceholder = checkoutPage.querySelector("[data-invoice-placeholder]");
		var invoiceFrame = checkoutPage.querySelector("[data-invoice-frame]");
		var cardFields = checkoutPage.querySelector("[data-card-fields]");
		var cardInputs = cardFields ? Array.prototype.slice.call(cardFields.querySelectorAll("input, select, textarea")) : [];
		var checkoutMessage = checkoutPage.querySelector("[data-checkout-message]");
		var confirmationOrder = checkoutPage.querySelector("[data-confirmation-order]");
		var currentStepIndex = 0;
		var invoicePreviewUrl = "";
		var invoiceNumber = "";
		var placedOrder = null;

		populateCheckoutForm(form, loadCheckoutState());
		updatePaymentFields();
		renderCheckoutSummary();
		renderCheckoutReview();
		resetInvoicePreview();
		updateInvoiceActionState();
		updateCheckoutStep();

		if (form) {
			form.addEventListener("input", function () {
				persistCheckoutState(collectCheckoutData(form));
				renderCheckoutReview();
				updateInvoiceActionState();
				updateCheckoutStep();
			});

			form.addEventListener("change", function (event) {
				if (event.target.name === "paymentMethod") {
					updatePaymentFields();
				}

				persistCheckoutState(collectCheckoutData(form));
				renderCheckoutReview();
				updateInvoiceActionState();
				updateCheckoutStep();
			});
		}

		if (invoicePreviewButton) {
			invoicePreviewButton.addEventListener("click", function () {
				if (!placedOrder || !placedOrder.items.length) {
					setInvoiceStatus("Invoice will become available after placing your order.");
					return;
				}

				clearCheckoutMessage();
				renderInvoicePreview();
			});
		}

		if (invoiceDownloadButton) {
			invoiceDownloadButton.addEventListener("click", function () {
				var invoiceDocument = buildInvoiceDocument();
				var formData = placedOrder ? placedOrder.formData : collectCheckoutData(form);

				if (!invoiceDocument) {
					return;
				}

				invoiceDocument.save(getInvoiceFilename(formData));
				setInvoiceStatus("Invoice downloaded.");
			});
		}

		if (backButton) {
			backButton.addEventListener("click", function () {
				if (currentStepIndex > 0) {
					currentStepIndex -= 1;
					updateCheckoutStep();
				}
			});
		}

		if (nextButton) {
			nextButton.addEventListener("click", function () {
				if (!validateCheckoutStep(currentStepIndex)) {
					return;
				}

				currentStepIndex = Math.min(currentStepIndex + 1, steps.length - 1);
				renderCheckoutReview();
				updateCheckoutStep();
			});
		}

		if (submitButton) {
			submitButton.addEventListener("click", function () {
				var stepIndex;
				var finalizedOrderNumber;

				for (stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
					if (!validateCheckoutStep(stepIndex)) {
						currentStepIndex = stepIndex;
						updateCheckoutStep();
						return;
					}
				}

				if (!cart.length) {
					setCheckoutMessage("Your cart is empty. Add an artwork before placing the order.");
					return;
				}

				finalizedOrderNumber = generateOrderNumber();
				placedOrder = {
					orderNumber: finalizedOrderNumber,
					placedAt: new Date().toISOString(),
					formData: collectCheckoutData(form),
					items: cart.map(function (entry) {
						return Object.assign({}, entry);
					})
				};
				invoiceNumber = finalizedOrderNumber;
				persistLatestOrder(placedOrder);

				if (confirmationOrder) {
					confirmationOrder.textContent = finalizedOrderNumber;
				}

				cart = [];
				persistCart();
				persistCheckoutState({});
				resetInvoicePreview();
				updateInvoiceActionState();
				renderCart();
				renderCheckoutSummary();
				clearCheckoutMessage();
				window.location.href = "thank-you.html";
			});
		}

		indicators.forEach(function (indicator, index) {
			indicator.addEventListener("click", function () {
				if (index < currentStepIndex) {
					currentStepIndex = index;
					updateCheckoutStep();
					return;
				}

				if (index === currentStepIndex) {
					return;
				}

				if (!validateCheckoutStep(currentStepIndex)) {
					return;
				}

				currentStepIndex = index;
				renderCheckoutReview();
				updateCheckoutStep();
			});
		});

		function updateCheckoutStep() {
			var isReviewStep = currentStepIndex === steps.length - 1;
			var canPlaceOrder = isReviewStep && canSubmitCheckout();

			steps.forEach(function (step, index) {
				var isActive = index === currentStepIndex;
				step.hidden = !isActive;
				step.classList.toggle("is-active", isActive);
			});

			indicators.forEach(function (indicator, index) {
				indicator.classList.toggle("is-active", index === currentStepIndex);
				indicator.classList.toggle("is-complete", index < currentStepIndex);
				indicator.setAttribute("aria-current", index === currentStepIndex ? "step" : "false");
			});

			if (backButton) {
				backButton.hidden = currentStepIndex === 0;
			}

			if (nextButton) {
				nextButton.hidden = currentStepIndex === steps.length - 1;
			}

			if (submitButton) {
				submitButton.hidden = false;
				submitButton.disabled = !canPlaceOrder;
			}

			clearCheckoutMessage();
		}

		function canSubmitCheckout() {
			var index;
			var step;
			var fields;

			if (!cart.length) {
				return false;
			}

			for (index = 0; index < steps.length; index += 1) {
				step = steps[index];

				if (!step) {
					continue;
				}

				fields = Array.prototype.slice.call(step.querySelectorAll("input, select, textarea"))
					.filter(function (field) {
						return !field.disabled;
					});

				if (fields.some(function (field) {
					return !field.checkValidity();
				})) {
					return false;
				}
			}

			return true;
		}

		function validateCheckoutStep(stepIndex) {
			var step = steps[stepIndex];
			var fields;
			var index;

			if (!step) {
				return true;
			}

			if (stepIndex === 2) {
				updatePaymentFields();
			}

			fields = Array.prototype.slice.call(step.querySelectorAll("input, select, textarea"))
				.filter(function (field) {
					return !field.disabled;
				});

			for (index = 0; index < fields.length; index += 1) {
				if (!fields[index].checkValidity()) {
					fields[index].reportValidity();
					setCheckoutMessage("Please complete the required fields before continuing.");
					return false;
				}
			}

			if (stepIndex === 3 && !cart.length) {
				setCheckoutMessage("Your cart is empty. Add an artwork before placing the order.");
				return false;
			}

			clearCheckoutMessage();
			return true;
		}

		function renderCheckoutSummary() {
			var subtotal = cart.reduce(function (sum, entry) {
				return sum + getItemTotal(entry);
			}, 0);

			if (!summaryItems || !summaryTotals) {
				return;
			}

			if (!cart.length) {
				summaryItems.innerHTML = [
					'<div class="checkout-empty">',
					'    <p>Your cart is empty.</p>',
					'    <a href="gallery.html">Go back to the gallery</a>',
					'</div>'
				].join("");
				summaryTotals.innerHTML = '<p><strong>Total</strong><span>' + formatPrice(0) + '</span></p>';
				return;
			}

			summaryItems.innerHTML = cart.map(function (entry) {
				return [
					'<article class="checkout-summary-item">',
					'    <div>',
					'        <h4>' + escapeHtml(entry.title) + '</h4>',
					'        <p>' + escapeHtml(entry.size) + ' / Qty ' + entry.quantity + '</p>',
					'    </div>',
					'    <strong>' + formatPrice(getItemTotal(entry)) + '</strong>',
					'</article>'
				].join("");
			}).join("");

			summaryTotals.innerHTML = [
				'<p><strong>Items</strong><span>' + cart.length + '</span></p>',
				'<p><strong>Subtotal</strong><span>' + formatPrice(subtotal) + '</span></p>',
				'<p><strong>Total</strong><span>' + formatPrice(subtotal) + '</span></p>'
			].join("");
		}

		function renderCheckoutReview() {
			var formData = collectCheckoutData(form);

			if (reviewBilling) {
				reviewBilling.innerHTML = [
					'<p>' + escapeHtml(formData.fullName || 'Not filled in yet') + '</p>',
					'<p>' + escapeHtml(formData.email || 'No email yet') + '</p>',
					'<p>' + escapeHtml(joinValues([formData.addressLine1, formData.addressLine2], ', ') || 'No address yet') + '</p>',
					'<p>' + escapeHtml(joinValues([formData.city, formData.postcode, formData.country], ', ') || 'No city or country yet') + '</p>'
				].join('');
			}

			if (reviewDelivery) {
				reviewDelivery.innerHTML = [
					'<p><strong>Method:</strong> ' + escapeHtml(formData.shippingMethod || 'Not selected yet') + '</p>',
					'<p><strong>Phone:</strong> ' + escapeHtml(formData.phone || 'Not added yet') + '</p>'
				].join('');
			}

			if (reviewPayment) {
				reviewPayment.innerHTML = [
					'<p><strong>Method:</strong> ' + escapeHtml(formData.paymentMethod || 'Not selected yet') + '</p>',
					'<p><strong>Card holder:</strong> ' + escapeHtml(formData.cardHolder || 'Not needed or not added') + '</p>'
				].join('');
			}

			if (reviewNotes) {
				reviewNotes.innerHTML = [
					'<p><strong>Order note:</strong> ' + escapeHtml(formData.orderNotes || 'No note added') + '</p>',
					'<p><strong>Gift option:</strong> ' + escapeHtml(formData.giftMessage ? 'Gift message included' : 'No gift message') + '</p>'
				].join('');
			}
		}

		function getInvoiceTotals(items) {
			var lineItems = items || [];

			return {
				itemCount: lineItems.reduce(function (sum, entry) {
					return sum + (entry && entry.quantity ? entry.quantity : 0);
				}, 0),
				subtotal: lineItems.reduce(function (sum, entry) {
					return sum + getItemTotal(entry);
				}, 0)
			};
		}

		function setInvoiceStatus(message) {
			if (invoiceStatus) {
				invoiceStatus.textContent = message;
			}
		}

		function getInvoiceFilename(formData) {
			var customerSlug = formData && formData.fullName ? slugify(formData.fullName) : "customer";
			var orderRef = invoiceNumber || (placedOrder && placedOrder.orderNumber) || generateOrderNumber();
			return "suryqata-invoice-" + customerSlug + "-" + orderRef + ".pdf";
		}

		function updateInvoiceActionState() {
			var canGenerate = Boolean(placedOrder && placedOrder.items && placedOrder.items.length);

			if (invoicePreviewButton) {
				invoicePreviewButton.disabled = !canGenerate;
			}

			if (invoiceDownloadButton) {
				invoiceDownloadButton.disabled = !canGenerate;
			}
		}

		function resetInvoicePreview() {
			if (invoicePreviewUrl) {
				window.URL.revokeObjectURL(invoicePreviewUrl);
				invoicePreviewUrl = "";
			}

			if (invoiceFrame) {
				invoiceFrame.hidden = true;
				invoiceFrame.removeAttribute("src");
			}

			if (invoicePlaceholder) {
				invoicePlaceholder.hidden = false;
			}

			setInvoiceStatus("Your invoice is ready to preview and download.");
		}

		function renderInvoicePreview() {
			var invoiceDocument = buildInvoiceDocument();
			var blob;

			if (!invoiceDocument || !invoiceFrame) {
				return;
			}

			blob = invoiceDocument.output("blob");

			if (invoicePreviewUrl) {
				window.URL.revokeObjectURL(invoicePreviewUrl);
			}

			invoicePreviewUrl = window.URL.createObjectURL(blob);
			invoiceFrame.src = invoicePreviewUrl;
			invoiceFrame.hidden = false;

			if (invoicePlaceholder) {
				invoicePlaceholder.hidden = true;
			}

			setInvoiceStatus("Invoice preview updated.");
		}

		function buildInvoiceDocument() {
			var jsPDFRef = window.jspdf && window.jspdf.jsPDF;
			var doc;
			var sourceOrder = placedOrder;
			var sourceItems;
			var formData;
			var totals;
			var orderReference;
			var orderDateText;
			var y = 74;
			var pageWidth = 595;
			var bottomLimit = 780;

			if (!jsPDFRef) {
				setInvoiceStatus("Invoice preview is unavailable because jsPDF failed to load.");
				setCheckoutMessage("Unable to generate invoice preview right now.");
				return null;
			}

			if (!sourceOrder || !sourceOrder.items || !sourceOrder.items.length) {
				setInvoiceStatus("Place an order first to generate the final invoice.");
				return null;
			}

			doc = new jsPDFRef({
				unit: "pt",
				format: "a4"
			});
			sourceItems = sourceOrder.items;
			formData = sourceOrder.formData || {};
			totals = getInvoiceTotals(sourceItems);
			orderReference = sourceOrder.orderNumber || invoiceNumber || generateOrderNumber();
			orderDateText = sourceOrder.placedAt ? new Date(sourceOrder.placedAt).toLocaleDateString("en-IE") : new Date().toLocaleDateString("en-IE");

			doc.setFontSize(22);
			doc.text("Suryqata", 48, y);
			doc.setFontSize(12);
			doc.text("Invoice", 48, y + 20);
			doc.setFontSize(10);
			doc.text("Invoice #: " + orderReference, pageWidth - 48, y, { align: "right" });
			doc.text("Date: " + orderDateText, pageWidth - 48, y + 16, { align: "right" });

			y += 56;
			doc.setDrawColor(210, 210, 210);
			doc.line(48, y, pageWidth - 48, y);
			y += 26;

			doc.setFontSize(11);
			doc.text("Billing details", 48, y);
			y += 16;
			doc.setFontSize(10);
			doc.text(doc.splitTextToSize(formData.fullName || "Not provided", 250), 48, y);
			y += 14;
			doc.text(doc.splitTextToSize(formData.email || "No email provided", 250), 48, y);
			y += 14;
			doc.text(doc.splitTextToSize(formData.phone || "No phone provided", 250), 48, y);
			y += 14;
			doc.text(doc.splitTextToSize(joinValues([
				formData.addressLine1,
				formData.addressLine2,
				formData.city,
				formData.postcode,
				formData.country
			], ", ") || "No address provided", 250), 48, y);

			doc.setFontSize(11);
			doc.text("Delivery", 330, y - 42);
			doc.setFontSize(10);
			doc.text(doc.splitTextToSize(formData.shippingMethod || "Not selected", 200), 330, y - 26);
			doc.text(doc.splitTextToSize("Payment: " + (formData.paymentMethod || "Not selected"), 200), 330, y - 10);

			y += 30;
			doc.line(48, y, pageWidth - 48, y);
			y += 22;

			doc.setFontSize(11);
			doc.text("Items", 48, y);
			doc.text("Amount", pageWidth - 48, y, { align: "right" });
			y += 14;
			doc.line(48, y, pageWidth - 48, y);
			y += 16;

			sourceItems.forEach(function (entry) {
				var description = [
					(entry.title || "Artwork"),
					"(" + (entry.size || "Medium") + ")",
					"x" + (entry.quantity || 1)
				].join(" ");
				var descriptionLines = doc.splitTextToSize(description, 360);
				var blockHeight = descriptionLines.length * 14 + 6;

				if (y + blockHeight > bottomLimit) {
					doc.addPage();
					y = 72;
					doc.setFontSize(11);
					doc.text("Items (continued)", 48, y);
					doc.text("Amount", pageWidth - 48, y, { align: "right" });
					y += 14;
					doc.line(48, y, pageWidth - 48, y);
					y += 16;
				}

				doc.setFontSize(10);
				doc.text(descriptionLines, 48, y);
				doc.text(formatPrice(getItemTotal(entry)), pageWidth - 48, y, { align: "right" });
				y += blockHeight;
			});

			y += 8;
			if (y + 72 > bottomLimit) {
				doc.addPage();
				y = 72;
			}

			doc.line(48, y, pageWidth - 48, y);
			y += 18;
			doc.setFontSize(10);
			doc.text("Items count: " + totals.itemCount, 48, y);
			doc.text("Subtotal: " + formatPrice(totals.subtotal), pageWidth - 48, y, { align: "right" });
			y += 18;
			doc.setFontSize(12);
			doc.text("Total: " + formatPrice(totals.subtotal), pageWidth - 48, y, { align: "right" });

			if (formData.orderNotes) {
				y += 28;
				if (y + 48 > bottomLimit) {
					doc.addPage();
					y = 72;
				}

				doc.setFontSize(11);
				doc.text("Order note", 48, y);
				y += 14;
				doc.setFontSize(10);
				doc.text(doc.splitTextToSize(formData.orderNotes, pageWidth - 96), 48, y);
			}

			return doc;
		}

		function updatePaymentFields() {
			var selectedMethod = form && form.querySelector('input[name="paymentMethod"]:checked');
			var requiresCard = selectedMethod && selectedMethod.value === 'Card';

			if (cardFields) {
				cardFields.hidden = !requiresCard;
			}

			cardInputs.forEach(function (input) {
				input.disabled = !requiresCard;
				input.required = requiresCard;
			});
		}

		function setCheckoutMessage(message) {
			if (checkoutMessage) {
				checkoutMessage.textContent = message;
			}
		}

		function clearCheckoutMessage() {
			if (checkoutMessage) {
				checkoutMessage.textContent = '';
			}
		}
	}

	function initializeThankYouPage() {
		var orderReference = thankYouPage.querySelector("[data-confirmation-order]");
		var invoicePreviewButton = thankYouPage.querySelector("[data-invoice-preview]");
		var invoiceDownloadButton = thankYouPage.querySelector("[data-invoice-download]");
		var invoiceStatus = thankYouPage.querySelector("[data-invoice-status]");
		var invoicePlaceholder = thankYouPage.querySelector("[data-invoice-placeholder]");
		var invoiceFrame = thankYouPage.querySelector("[data-invoice-frame]");
		var order = loadLatestOrder();
		var invoicePreviewUrl = "";

		if (!order || !order.items || !order.items.length) {
			if (orderReference) {
				orderReference.textContent = "Unavailable";
			}

			if (invoiceStatus) {
				invoiceStatus.textContent = "No recent order was found. Place a new order to generate an invoice.";
			}

			if (invoicePlaceholder) {
				invoicePlaceholder.textContent = "No invoice is available yet.";
			}

			if (invoicePreviewButton) {
				invoicePreviewButton.disabled = true;
			}

			if (invoiceDownloadButton) {
				invoiceDownloadButton.disabled = true;
			}

			return;
		}

		if (orderReference) {
			orderReference.textContent = order.orderNumber || generateOrderNumber();
		}

		if (invoiceStatus) {
			invoiceStatus.textContent = "Your invoice is ready to preview and download.";
		}

		if (invoicePreviewButton) {
			invoicePreviewButton.addEventListener("click", function () {
				var invoiceDocument = createInvoiceDocumentFromOrder(order);
				var blob;

				if (!invoiceDocument || !invoiceFrame) {
					if (invoiceStatus) {
						invoiceStatus.textContent = "Unable to generate invoice preview right now.";
					}
					return;
				}

				blob = invoiceDocument.output("blob");

				if (invoicePreviewUrl) {
					window.URL.revokeObjectURL(invoicePreviewUrl);
				}

				invoicePreviewUrl = window.URL.createObjectURL(blob);
				invoiceFrame.src = invoicePreviewUrl;
				invoiceFrame.hidden = false;

				if (invoicePlaceholder) {
					invoicePlaceholder.hidden = true;
				}

				if (invoiceStatus) {
					invoiceStatus.textContent = "Invoice preview updated.";
				}
			});
		}

		if (invoiceDownloadButton) {
			invoiceDownloadButton.addEventListener("click", function () {
				var invoiceDocument = createInvoiceDocumentFromOrder(order);

				if (!invoiceDocument) {
					if (invoiceStatus) {
						invoiceStatus.textContent = "Unable to generate invoice download right now.";
					}
					return;
				}

				invoiceDocument.save(getInvoiceFilenameFromOrder(order));
				if (invoiceStatus) {
					invoiceStatus.textContent = "Invoice downloaded.";
				}
			});
		}
	}

	function openCart() {
		if (!cartOverlay) {
			return;
		}

		cartOverlay.hidden = false;
		document.body.classList.add("cart-open");
	}

	function closeCart() {
		if (!cartOverlay) {
			return;
		}

		cartOverlay.hidden = true;
		document.body.classList.remove("cart-open");
	}

	function loadCart() {
		try {
			var savedCart = window.localStorage.getItem(storageKey);
			return savedCart ? JSON.parse(savedCart).map(normalizeCartItem) : [];
		} catch (error) {
			return [];
		}
	}

	function persistCart() {
		try {
			window.localStorage.setItem(storageKey, JSON.stringify(cart));
		} catch (error) {
			return;
		}
	}

	function pluralize(count) {
		return count === 1 ? "" : "s";
	}

	function loadCheckoutState() {
		try {
			var savedState = window.localStorage.getItem(checkoutStateKey);
			return savedState ? JSON.parse(savedState) : {};
		} catch (error) {
			return {};
		}
	}

	function persistCheckoutState(state) {
		try {
			window.localStorage.setItem(checkoutStateKey, JSON.stringify(state));
		} catch (error) {
			return;
		}
	}

	function loadLatestOrder() {
		try {
			var savedOrder = window.localStorage.getItem(latestOrderKey);
			return savedOrder ? JSON.parse(savedOrder) : null;
		} catch (error) {
			return null;
		}
	}

	function persistLatestOrder(order) {
		try {
			window.localStorage.setItem(latestOrderKey, JSON.stringify(order));
		} catch (error) {
			return;
		}
	}

	function getInvoiceFilenameFromOrder(order) {
		var customerSlug = order && order.formData && order.formData.fullName ? slugify(order.formData.fullName) : "customer";
		var orderRef = order && order.orderNumber ? order.orderNumber : generateOrderNumber();
		return "suryqata-invoice-" + customerSlug + "-" + orderRef + ".pdf";
	}

	function createInvoiceDocumentFromOrder(order) {
		var jsPDFRef = window.jspdf && window.jspdf.jsPDF;
		var doc;
		var sourceItems;
		var formData;
		var totals;
		var orderReference;
		var orderDateText;
		var y = 74;
		var pageWidth = 595;
		var bottomLimit = 780;

		if (!jsPDFRef || !order || !order.items || !order.items.length) {
			return null;
		}

		doc = new jsPDFRef({
			unit: "pt",
			format: "a4"
		});
		sourceItems = order.items;
		formData = order.formData || {};
		totals = sourceItems.reduce(function (acc, entry) {
			acc.itemCount += entry && entry.quantity ? entry.quantity : 0;
			acc.subtotal += getItemTotal(entry);
			return acc;
		}, { itemCount: 0, subtotal: 0 });
		orderReference = order.orderNumber || generateOrderNumber();
		orderDateText = order.placedAt ? new Date(order.placedAt).toLocaleDateString("en-IE") : new Date().toLocaleDateString("en-IE");

		doc.setFontSize(22);
		doc.text("Suryqata", 48, y);
		doc.setFontSize(12);
		doc.text("Invoice", 48, y + 20);
		doc.setFontSize(10);
		doc.text("Invoice #: " + orderReference, pageWidth - 48, y, { align: "right" });
		doc.text("Date: " + orderDateText, pageWidth - 48, y + 16, { align: "right" });

		y += 56;
		doc.setDrawColor(210, 210, 210);
		doc.line(48, y, pageWidth - 48, y);
		y += 26;

		doc.setFontSize(11);
		doc.text("Billing details", 48, y);
		y += 16;
		doc.setFontSize(10);
		doc.text(doc.splitTextToSize(formData.fullName || "Not provided", 250), 48, y);
		y += 14;
		doc.text(doc.splitTextToSize(formData.email || "No email provided", 250), 48, y);
		y += 14;
		doc.text(doc.splitTextToSize(formData.phone || "No phone provided", 250), 48, y);
		y += 14;
		doc.text(doc.splitTextToSize(joinValues([
			formData.addressLine1,
			formData.addressLine2,
			formData.city,
			formData.postcode,
			formData.country
		], ", ") || "No address provided", 250), 48, y);

		doc.setFontSize(11);
		doc.text("Delivery", 330, y - 42);
		doc.setFontSize(10);
		doc.text(doc.splitTextToSize(formData.shippingMethod || "Not selected", 200), 330, y - 26);
		doc.text(doc.splitTextToSize("Payment: " + (formData.paymentMethod || "Not selected"), 200), 330, y - 10);

		y += 30;
		doc.line(48, y, pageWidth - 48, y);
		y += 22;

		doc.setFontSize(11);
		doc.text("Items", 48, y);
		doc.text("Amount", pageWidth - 48, y, { align: "right" });
		y += 14;
		doc.line(48, y, pageWidth - 48, y);
		y += 16;

		sourceItems.forEach(function (entry) {
			var description = [
				(entry.title || "Artwork"),
				"(" + (entry.size || "Medium") + ")",
				"x" + (entry.quantity || 1)
			].join(" ");
			var descriptionLines = doc.splitTextToSize(description, 360);
			var blockHeight = descriptionLines.length * 14 + 6;

			if (y + blockHeight > bottomLimit) {
				doc.addPage();
				y = 72;
				doc.setFontSize(11);
				doc.text("Items (continued)", 48, y);
				doc.text("Amount", pageWidth - 48, y, { align: "right" });
				y += 14;
				doc.line(48, y, pageWidth - 48, y);
				y += 16;
			}

			doc.setFontSize(10);
			doc.text(descriptionLines, 48, y);
			doc.text(formatPrice(getItemTotal(entry)), pageWidth - 48, y, { align: "right" });
			y += blockHeight;
		});

		y += 8;
		if (y + 72 > bottomLimit) {
			doc.addPage();
			y = 72;
		}

		doc.line(48, y, pageWidth - 48, y);
		y += 18;
		doc.setFontSize(10);
		doc.text("Items count: " + totals.itemCount, 48, y);
		doc.text("Subtotal: " + formatPrice(totals.subtotal), pageWidth - 48, y, { align: "right" });
		y += 18;
		doc.setFontSize(12);
		doc.text("Total: " + formatPrice(totals.subtotal), pageWidth - 48, y, { align: "right" });

		if (formData.orderNotes) {
			y += 28;
			if (y + 48 > bottomLimit) {
				doc.addPage();
				y = 72;
			}

			doc.setFontSize(11);
			doc.text("Order note", 48, y);
			y += 14;
			doc.setFontSize(10);
			doc.text(doc.splitTextToSize(formData.orderNotes, pageWidth - 96), 48, y);
		}

		return doc;
	}

	function collectCheckoutData(form) {
		var data = {};
		var formData;

		if (!form) {
			return data;
		}

		formData = new FormData(form);
		formData.forEach(function (value, key) {
			data[key] = value;
		});

		data.giftMessage = form.querySelector('[name="giftMessage"]') ? form.querySelector('[name="giftMessage"]').checked : false;
		data.acceptTerms = form.querySelector('[name="acceptTerms"]') ? form.querySelector('[name="acceptTerms"]').checked : false;
		return data;
	}

	function populateCheckoutForm(form, state) {
		var fields;

		if (!form || !state) {
			return;
		}

		fields = Array.prototype.slice.call(form.querySelectorAll('input, select, textarea'));

		fields.forEach(function (field) {
			if (!Object.prototype.hasOwnProperty.call(state, field.name)) {
				return;
			}

			if (field.type === 'radio') {
				field.checked = state[field.name] === field.value;
				return;
			}

			if (field.type === 'checkbox') {
				field.checked = Boolean(state[field.name]);
				return;
			}

			field.value = state[field.name];
		});
	}

	function normalizeCartItem(entry) {
		var normalizedSize = entry && entry.size ? entry.size : "Medium";
		var artworkId = entry && entry.artworkId ? entry.artworkId : entry.id;

		return {
			id: entry && entry.id ? entry.id : artworkId + "-" + slugify(normalizedSize),
			artworkId: artworkId,
			title: entry && entry.title ? entry.title : "Artwork",
			description: entry && entry.description ? entry.description : "",
			visual: entry && entry.visual ? entry.visual : "Artwork",
			image: refreshLegacyImagePath(entry && entry.image ? entry.image : getArtworkImagePath(entry)),
			page: entry && entry.page ? entry.page : "Current page",
			size: normalizedSize,
			price: entry && entry.price ? entry.price : getPriceForSize(normalizedSize),
			quantity: entry && entry.quantity ? entry.quantity : 1
		};
	}

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

	function getPriceForSize(size) {
		return sizePrices[size] || sizePrices.Medium;
	}

	function getArtworkImagePath(entry) {
		var source = [
			entry && entry.page ? entry.page : "",
			entry && entry.artworkId ? entry.artworkId : "",
			entry && entry.title ? entry.title : ""
		].join(" ");
		var clothingMatch = source.match(/clothing\s*0*(\d+)|clothing0*(\d+)\.html/i);
		var match = source.match(/piece\s*0*(\d+)|piece0*(\d+)\.html/i);
		var clothingNumber;
		var pieceNumber;

		if (clothingMatch) {
			clothingNumber = clothingMatch[1] || clothingMatch[2];

			if (!clothingNumber) {
				return "";
			}

			return getClothingImagePath(clothingNumber);
		}

		if (!match) {
			return "";
		}

		pieceNumber = match[1] || match[2];

		if (!pieceNumber) {
			return "";
		}

		return "/gallerycontent/piece" + String(pieceNumber).padStart(2, "0") + ".avif";
	}

	function refreshLegacyImagePath(imagePath) {
		var normalizedPath;

		if (!imagePath) {
			return imagePath;
		}

		normalizedPath = String(imagePath).replace(/(\/)?gallerycontent\/piece(\d{2})\.jpg$/i, "/gallerycontent/piece$2.avif");

		if (!/^\//.test(normalizedPath) && /^gallerycontent\//i.test(normalizedPath)) {
			normalizedPath = "/" + normalizedPath;
		}

		return normalizedPath;
	}

	function getClothingImagePath(clothingNumber) {
		var paddedNumber = String(clothingNumber).padStart(2, "0");
		var extensionMap = {
			"01": ".avif",
			"02": ".avif",
			"03": ".jpg"
		};

		if (!extensionMap[paddedNumber]) {
			return "";
		}

		return "/gallerycontent/clothing" + paddedNumber + extensionMap[paddedNumber];
	}

	function getCartItemVisualMarkup(entry) {
		if (entry && entry.image) {
			return '<img src="' + escapeAttribute(entry.image) + '" alt="' + escapeAttribute((entry.title || "Artwork") + ' preview') + '">';
		}

		return escapeHtml(entry && entry.visual ? entry.visual : "Artwork");
	}

	function getRenderedImageBounds(image) {
		var imageRect;
		var naturalRatio;
		var boxRatio;
		var renderedWidth;
		var renderedHeight;
		var offsetX = 0;
		var offsetY = 0;

		if (!image || !image.naturalWidth || !image.naturalHeight) {
			return null;
		}

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

	function getUnitPrice(entry) {
		return entry && entry.price ? entry.price : getPriceForSize(entry && entry.size ? entry.size : "Medium");
	}

	function getItemTotal(entry) {
		return getUnitPrice(entry) * (entry && entry.quantity ? entry.quantity : 1);
	}

	function formatPrice(value) {
		return new Intl.NumberFormat("en-IE", {
			style: "currency",
			currency: "EUR"
		}).format(value);
	}

	function initializeAuthPage() {
		var modeButtons = Array.prototype.slice.call(authPage.querySelectorAll("[data-auth-mode]"));
		var forms = {
			login: authPage.querySelector('[data-auth-form="login"]'),
			register: authPage.querySelector('[data-auth-form="register"]')
		};
		var message = authPage.querySelector("[data-auth-message]");
		var guestButton = authPage.querySelector("[data-auth-guest]");
		var guestName = authPage.querySelector('[name="guestName"]');
		var sessionCard = authPage.querySelector("[data-auth-session]");
		var sessionText = authPage.querySelector("[data-auth-session-copy]");
		var sessionContinue = authPage.querySelector("[data-auth-session-continue]");
		var sessionLogout = authPage.querySelector("[data-auth-session-logout]");
		var activeMode = "login";

		setAuthMode(activeMode);
		loadAuthSessionState();

		modeButtons.forEach(function (button) {
			button.addEventListener("click", function () {
				setAuthMode(button.getAttribute("data-auth-mode") || "login");
			});
		});

		if (forms.login) {
			forms.login.addEventListener("submit", function (event) {
				event.preventDefault();
				submitAuthForm("/api/auth/login", forms.login, function (values) {
					return {
						email: values.email || "",
						password: values.password || ""
					};
				});
			});
		}

		if (forms.register) {
			forms.register.addEventListener("submit", function (event) {
				var values = getFormValues(forms.register);

				event.preventDefault();

				if ((values.password || "").length < 8) {
					setMessage("Use a password with at least 8 characters.", true);
					return;
				}

				if (values.password !== values.confirmPassword) {
					setMessage("The passwords do not match.", true);
					return;
				}

				submitAuthForm("/api/auth/register", forms.register, function () {
					return {
						name: values.name || "",
						email: values.email || "",
						password: values.password || ""
					};
				});
			});
		}

		if (guestButton) {
			guestButton.addEventListener("click", function () {
				guestButton.disabled = true;
				setMessage("Creating guest session...", false);
				requestJson("/api/auth/guest", {
					method: "POST",
					body: {
						displayName: guestName && guestName.value ? guestName.value : ""
					}
				}).then(function (response) {
					if (!response.ok) {
						setMessage(response.error || "Unable to continue as guest right now.", true);
						guestButton.disabled = false;
						return;
					}

					setMessage("Guest session ready. Redirecting...", false);
					refreshAuthInterface();
					loadAuthSessionState();
					window.setTimeout(function () {
						window.location.href = getAuthReturnPath();
					}, 350);
				}).catch(function () {
					setMessage("The auth server is unavailable. Start the Node server first.", true);
					guestButton.disabled = false;
				});
			});
		}

		if (sessionContinue) {
			sessionContinue.addEventListener("click", function () {
				window.location.href = getAuthReturnPath();
			});
		}

		if (sessionLogout) {
			sessionLogout.addEventListener("click", function () {
				sessionLogout.disabled = true;
				logoutCurrentSession().finally(function () {
					sessionLogout.disabled = false;
					loadAuthSessionState();
					setAuthMode(activeMode);
				});
			});
		}

		function setAuthMode(mode) {
			activeMode = mode;
			modeButtons.forEach(function (button) {
				var isActive = button.getAttribute("data-auth-mode") === mode;
				button.classList.toggle("is-active", isActive);
			});

			Object.keys(forms).forEach(function (key) {
				var isActive = key === mode;
				var fields;

				if (!forms[key]) {
					return;
				}

				forms[key].hidden = !isActive;
				forms[key].setAttribute("aria-hidden", isActive ? "false" : "true");
				fields = Array.prototype.slice.call(forms[key].querySelectorAll("input, select, textarea, button"));
				fields.forEach(function (field) {
					field.disabled = !isActive;
				});
			});

			setMessage("", false);
		}

		function submitAuthForm(endpoint, form, buildPayload) {
			var submitButton = form.querySelector('button[type="submit"]');

			if (!form.reportValidity()) {
				return;
			}

			if (submitButton) {
				submitButton.disabled = true;
			}

			setMessage("Working...", false);
			requestJson(endpoint, {
				method: "POST",
				body: buildPayload(getFormValues(form))
			}).then(function (response) {
				if (!response.ok) {
					setMessage(response.error || "We could not complete that request.", true);
					return;
				}

				setMessage("Success. Redirecting...", false);
				refreshAuthInterface();
				loadAuthSessionState();
				window.setTimeout(function () {
					window.location.href = getAuthReturnPath();
				}, 350);
			}).catch(function () {
				setMessage("The auth server is unavailable. Start the Node server first.", true);
			}).finally(function () {
				if (submitButton) {
					submitButton.disabled = false;
				}
			});
		}

		function loadAuthSessionState() {
			requestJson("/api/auth/session").then(function (response) {
				var session = response.data || { authenticated: false };

				if (!sessionCard || !sessionText) {
					return;
				}

				sessionCard.hidden = !session.authenticated;
				if (!session.authenticated) {
					return;
				}

				sessionText.textContent = session.mode === "guest"
					? "You are continuing as " + session.displayName + "."
					: "Signed in as " + session.displayName + " (" + session.email + ").";
			}).catch(function () {
				setMessage("The auth server is unavailable. Start the Node server first.", true);
			});
		}

		function setMessage(text, isError) {
			if (!message) {
				return;
			}

			message.textContent = text;
			message.classList.toggle("is-error", Boolean(isError));
		}
	}

	function refreshAuthInterface() {
		if (!authLink) {
			return;
		}

		requestJson("/api/auth/session").then(function (response) {
			var session = response.data || { authenticated: false };

			if (!session.authenticated) {
				authLink.textContent = "Sign In";
				authLink.href = getAuthRedirectHref();
				if (authLogoutButton) {
					authLogoutButton.hidden = true;
				}
				return;
			}

			authLink.textContent = session.mode === "guest"
				? "Guest: " + session.displayName
				: "Account: " + session.displayName;
			authLink.href = "auth.html";
			if (authLogoutButton) {
				authLogoutButton.hidden = false;
			}
		}).catch(function () {
			authLink.textContent = "Sign In";
			authLink.href = getAuthRedirectHref();
			if (authLogoutButton) {
				authLogoutButton.hidden = true;
			}
		});
	}

	function logoutCurrentSession() {
		return requestJson("/api/auth/logout", {
			method: "POST"
		}).finally(function () {
			refreshAuthInterface();
		});
	}

	function requestJson(url, options) {
		var requestOptions = options || {};
		var fetchOptions = {
			method: requestOptions.method || "GET",
			credentials: "same-origin",
			headers: {
				Accept: "application/json"
			}
		};

		if (requestOptions.body) {
			fetchOptions.headers["Content-Type"] = "application/json";
			fetchOptions.body = JSON.stringify(requestOptions.body);
		}

		return window.fetch(url, fetchOptions).then(function (response) {
			return response.json().catch(function () {
				return {};
			}).then(function (payload) {
				return {
					ok: response.ok,
					status: response.status,
					data: payload && payload.data ? payload.data : payload,
					error: payload && payload.error ? payload.error : ""
				};
			});
		});
	}

	function getFormValues(form) {
		var values = {};
		var formData = new FormData(form);

		formData.forEach(function (value, key) {
			values[key] = value;
		});

		return values;
	}

	function getAuthRedirectHref() {
		return "auth.html?returnTo=" + encodeURIComponent(getAuthReturnPath());
	}

	function getAuthReturnPath() {
		var params = new URLSearchParams(window.location.search);
		var returnTo = params.get("returnTo");
		var currentPage = getCurrentPagePath();

		if (returnTo && /^[a-zA-Z0-9._\/-]+\.html$/.test(returnTo)) {
			return returnTo;
		}

		return currentPage === "auth.html" ? "gallery.html" : currentPage;
	}

	function getCurrentPagePath() {
		var path = window.location.pathname.split("/").pop();
		return path || "main.html";
	}

	function slugify(value) {
		return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
	}

	function joinValues(values, separator) {
		return values.filter(function (value) {
			return Boolean(value);
		}).join(separator || ' ');
	}

	function generateOrderNumber() {
		return 'SQ-' + String(Date.now()).slice(-6);
	}

	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	function escapeAttribute(value) {
		return escapeHtml(value);
	}
});
