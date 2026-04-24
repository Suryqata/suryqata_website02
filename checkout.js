// =============================================================================
// checkout.js — Checkout form, order placement, invoice, and thank-you page
//
// Depends on: utils.js, cart.js (cart array and helpers must be loaded first)
// Used on: /checkout and /thank-you
//
// Responsibilities:
//   - Save and restore the in-progress checkout form state across page reloads
//   - Drive the multi-step checkout UI (step navigation, validation, review)
//   - Build and save the final order when the customer places it
//   - Generate a printable PDF invoice using jsPDF (loaded via CDN in layout)
//   - Display the order confirmation and invoice on the thank-you page
// =============================================================================

// ─── Checkout persistence ──────────────────────────────────────────────────────────────

// Reads the saved checkout form values from localStorage.
// Returns an empty object if nothing is saved, so populateCheckoutForm()
// is always given a usable value.
function loadCheckoutState() {
	try {
		var savedState = window.localStorage.getItem(checkoutStateKey);
		return savedState ? JSON.parse(savedState) : {};
	} catch (error) {
		return {};
	}
}

// Saves the current form values to localStorage so they survive page refreshes.
// Called on every input/change event in the checkout form.
function persistCheckoutState(state) {
	try {
		window.localStorage.setItem(checkoutStateKey, JSON.stringify(state));
	} catch (error) {
		return;
	}
}

// Reads the most recently placed order from localStorage.
// Used by the thank-you page to show the order number and build the invoice.
// Returns null if no order has been placed yet.
function loadLatestOrder() {
	try {
		var savedOrder = window.localStorage.getItem(latestOrderKey);
		return savedOrder ? JSON.parse(savedOrder) : null;
	} catch (error) {
		return null;
	}
}

// Saves the placed order object to localStorage immediately after submission.
// This is read by the thank-you page via loadLatestOrder().
function persistLatestOrder(order) {
	try {
		window.localStorage.setItem(latestOrderKey, JSON.stringify(order));
	} catch (error) {
		return;
	}
}

// ─── Form helpers ────────────────────────────────────────────────────────────────────

// Extracts all field values from the checkout form into a plain object.
// Uses FormData for standard fields, then manually reads the checkbox states
// (FormData omits unchecked checkboxes, so they must be handled separately).
function collectCheckoutData(form) {
	var data = {};
	var formData;
	var giftMessageField;
	var acceptTermsField;

	if (!form) { return data; }

	formData = new FormData(form);
	formData.forEach(function (value, key) { data[key] = value; });

	giftMessageField = form.querySelector('[name="giftMessage"]');
	acceptTermsField = form.querySelector('[name="acceptTerms"]');

	if (giftMessageField) {
		data.giftMessage = giftMessageField.checked;
	} else {
		data.giftMessage = false;
	}

	if (acceptTermsField) {
		data.acceptTerms = acceptTermsField.checked;
	} else {
		data.acceptTerms = false;
	}

	return data;
}

// Fills a form's fields with values from a saved state object.
// Handles text/select fields, radio buttons, and checkboxes separately
// since each needs a different property set (value vs checked).
// Skips any field whose name isn't present in the state object.
function populateCheckoutForm(form, state) {
	var fields;
	var index;
	var field;
	var fieldValue;

	if (!form || !state) { return; }

	fields = Array.prototype.slice.call(form.querySelectorAll('input, select, textarea'));

	for (index = 0; index < fields.length; index += 1) {
		field = fields[index];

		if (!Object.prototype.hasOwnProperty.call(state, field.name)) {
			continue;
		}

		fieldValue = state[field.name];

		if (field.type === 'radio') {
			field.checked = fieldValue === field.value;
			continue;
		}

		if (field.type === 'checkbox') {
			field.checked = Boolean(fieldValue);
			continue;
		}

		field.value = fieldValue;
	}
}

// ─── Invoice filename ─────────────────────────────────────────────────────────

// Generates the download filename for the invoice PDF.
// Example: "suryqata-invoice-jane-doe-SQ-482031.pdf"
function getInvoiceFilenameFromOrder(order) {
	var customerSlug = order && order.formData && order.formData.fullName ? slugify(order.formData.fullName) : "customer";
	var orderRef = order && order.orderNumber ? order.orderNumber : generateOrderNumber();
	return "suryqata-invoice-" + customerSlug + "-" + orderRef + ".pdf";
}

// ─── Invoice document builder (shared) ───────────────────────────────────────

// Builds a jsPDF document from a placed order object.
// Used by both the thank-you page and the checkout page's invoice preview.
// Returns null if jsPDF isn't loaded or if the order has no items.
//
// Layout: Suryqata branding + invoice number in the header, billing details
// on the left, delivery/payment on the right, line items table, then totals.
// Automatically adds a new page if the item list runs off the bottom.
function createInvoiceDocumentFromOrder(order) {
	var jsPDFRef = window.jspdf && window.jspdf.jsPDF;
	var doc;
	var sourceItems;
	var formData;
	var totals;
	var totalsAccumulator;
	var orderReference;
	var orderDateText;
	var index;
	var entry;
	var y = 74;
	var pageWidth = 595;
	var bottomLimit = 780;

	if (!jsPDFRef || !order || !order.items || !order.items.length) { return null; }

	doc = new jsPDFRef({ unit: "pt", format: "a4" });
	sourceItems = order.items;
	formData = order.formData || {};
	totalsAccumulator = { itemCount: 0, subtotal: 0 };
	for (index = 0; index < sourceItems.length; index += 1) {
		entry = sourceItems[index];
		if (entry && entry.quantity) {
			totalsAccumulator.itemCount += entry.quantity;
		}
		totalsAccumulator.subtotal += getItemTotal(entry);
	}
	totals = totalsAccumulator;
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
		formData.addressLine1, formData.addressLine2,
		formData.city, formData.postcode, formData.country
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
		var description = [(entry.title || "Artwork"), "(" + (entry.size || "Medium") + ")", "x" + (entry.quantity || 1)].join(" ");
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
	if (y + 72 > bottomLimit) { doc.addPage(); y = 72; }

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
		if (y + 48 > bottomLimit) { doc.addPage(); y = 72; }
		doc.setFontSize(11);
		doc.text("Order note", 48, y);
		y += 14;
		doc.setFontSize(10);
		doc.text(doc.splitTextToSize(formData.orderNotes, pageWidth - 96), 48, y);
	}

	return doc;
}

// ─── Checkout page ─────────────────────────────────────────────────────────────
// Wires up the entire multi-step checkout page.
// Called from script.js only if [data-checkout-page] exists in the DOM.
//
// Steps are hidden/shown by toggling the hidden attribute and is-active class.
// The form auto-saves on every input event so the customer never loses progress.
// On submit, a placed order object is written to localStorage and the cart is
// cleared before redirecting to the thank-you page.
function initializeCheckout() {
	var checkoutPage = document.querySelector("[data-checkout-page]");
	if (!checkoutPage) { return; }

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
			if (event.target.name === "paymentMethod") { updatePaymentFields(); }
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
			if (!invoiceDocument) { return; }
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
			if (!validateCheckoutStep(currentStepIndex)) { return; }
			currentStepIndex = Math.min(currentStepIndex + 1, steps.length - 1);
			renderCheckoutReview();
			updateCheckoutStep();
		});
	}

	if (submitButton) {
		submitButton.addEventListener("click", function () {
			var stepIndex;
			var checkoutData;

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

			checkoutData = collectCheckoutData(form);
			submitButton.disabled = true;
			setCheckoutMessage("Placing your order...");

			placedOrder = {
				orderNumber: generateOrderNumber(),
				placedAt: new Date().toISOString(),
				formData: checkoutData,
				items: cart.map(function (entry) { return normalizeCartItem(entry); })
			};

			persistLatestOrder(placedOrder);
			cart = [];
			persistCart();
			renderCart();
			persistCheckoutState({});
			window.location.href = withBasePath("thank-you");
		});
	}

	indicators.forEach(function (indicator, index) {
		indicator.addEventListener("click", function () {
			if (index < currentStepIndex) { currentStepIndex = index; updateCheckoutStep(); return; }
			if (index === currentStepIndex) { return; }
			if (!validateCheckoutStep(currentStepIndex)) { return; }
			currentStepIndex = index;
			renderCheckoutReview();
			updateCheckoutStep();
		});
	});

	// ── Local helpers ──────────────────────────────────────────────────────────
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

		if (backButton) { backButton.hidden = currentStepIndex === 0; }
		if (nextButton) { nextButton.hidden = currentStepIndex === steps.length - 1; }
		if (submitButton) { submitButton.hidden = false; submitButton.disabled = !canPlaceOrder; }

		clearCheckoutMessage();
	}

	function canSubmitCheckout() {
		var index;
		var step;
		var fields;

		if (!cart.length) { return false; }

		for (index = 0; index < steps.length; index += 1) {
			step = steps[index];
			if (!step) { continue; }

			fields = Array.prototype.slice.call(step.querySelectorAll("input, select, textarea"))
				.filter(function (field) { return !field.disabled; });

			if (fields.some(function (field) { return !field.checkValidity(); })) { return false; }
		}

		return true;
	}

	function validateCheckoutStep(stepIndex) {
		var step = steps[stepIndex];
		var fields;
		var index;

		if (!step) { return true; }
		if (stepIndex === 2) { updatePaymentFields(); }

		fields = Array.prototype.slice.call(step.querySelectorAll("input, select, textarea"))
			.filter(function (field) { return !field.disabled; });

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
		var subtotal = 0;
		var index;
		var entry;
		var itemsHtml = "";

		for (index = 0; index < cart.length; index += 1) {
			subtotal += getItemTotal(cart[index]);
		}

		if (!summaryItems || !summaryTotals) { return; }

		if (!cart.length) {
			summaryItems.innerHTML = [
				'<div class="checkout-empty">',
				'    <p>Your cart is empty.</p>',
				'    <a href="' + withBasePath("gallery") + '">Go back to the gallery</a>',
				'</div>'
			].join("");
			summaryTotals.innerHTML = '<p><strong>Total</strong><span>' + formatPrice(0) + '</span></p>';
			return;
		}

		for (index = 0; index < cart.length; index += 1) {
			entry = cart[index];
			itemsHtml += [
				'<article class="checkout-summary-item">',
				'    <div>',
				'        <h4>' + escapeHtml(entry.title) + '</h4>',
				'        <p>' + escapeHtml(entry.size) + ' / Qty ' + entry.quantity + '</p>',
				'    </div>',
				'    <strong>' + formatPrice(getItemTotal(entry)) + '</strong>',
				'</article>'
			].join("");
		}

		summaryItems.innerHTML = itemsHtml;

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
		var itemCount = 0;
		var subtotal = 0;
		var index;
		var entry;

		for (index = 0; index < lineItems.length; index += 1) {
			entry = lineItems[index];
			if (entry && entry.quantity) {
				itemCount += entry.quantity;
			}
			subtotal += getItemTotal(entry);
		}

		return {
			itemCount: itemCount,
			subtotal: subtotal
		};
	}

	function setInvoiceStatus(message) {
		if (invoiceStatus) { invoiceStatus.textContent = message; }
	}

	function getInvoiceFilename(formData) {
		var customerSlug = formData && formData.fullName ? slugify(formData.fullName) : "customer";
		var orderRef = invoiceNumber || (placedOrder && placedOrder.orderNumber) || generateOrderNumber();
		return "suryqata-invoice-" + customerSlug + "-" + orderRef + ".pdf";
	}

	function updateInvoiceActionState() {
		var canGenerate = Boolean(placedOrder && placedOrder.items && placedOrder.items.length);
		if (invoicePreviewButton) { invoicePreviewButton.disabled = !canGenerate; }
		if (invoiceDownloadButton) { invoiceDownloadButton.disabled = !canGenerate; }
	}

	function resetInvoicePreview() {
		if (invoicePreviewUrl) { window.URL.revokeObjectURL(invoicePreviewUrl); invoicePreviewUrl = ""; }
		if (invoiceFrame) { invoiceFrame.hidden = true; invoiceFrame.removeAttribute("src"); }
		if (invoicePlaceholder) { invoicePlaceholder.hidden = false; }
		setInvoiceStatus("Your invoice is ready to preview and download.");
	}

	function renderInvoicePreview() {
		var invoiceDocument = buildInvoiceDocument();
		var blob;

		if (!invoiceDocument || !invoiceFrame) { return; }

		blob = invoiceDocument.output("blob");
		if (invoicePreviewUrl) { window.URL.revokeObjectURL(invoicePreviewUrl); }

		invoicePreviewUrl = window.URL.createObjectURL(blob);
		invoiceFrame.src = invoicePreviewUrl;
		invoiceFrame.hidden = false;
		if (invoicePlaceholder) { invoicePlaceholder.hidden = true; }
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

		doc = new jsPDFRef({ unit: "pt", format: "a4" });
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
			formData.addressLine1, formData.addressLine2,
			formData.city, formData.postcode, formData.country
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
			var description = [(entry.title || "Artwork"), "(" + (entry.size || "Medium") + ")", "x" + (entry.quantity || 1)].join(" ");
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
		if (y + 72 > bottomLimit) { doc.addPage(); y = 72; }

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
			if (y + 48 > bottomLimit) { doc.addPage(); y = 72; }
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

		if (cardFields) { cardFields.hidden = !requiresCard; }

		cardInputs.forEach(function (input) {
			input.disabled = !requiresCard;
			input.required = requiresCard;
		});
	}

	function setCheckoutMessage(message) {
		if (checkoutMessage) { checkoutMessage.textContent = message; }
	}

	function clearCheckoutMessage() {
		if (checkoutMessage) { checkoutMessage.textContent = ''; }
	}
}

// ─── Thank-you page ────────────────────────────────────────────────────────────
// Wires up the thank-you / order confirmation page.
// Called from script.js only if [data-thank-you-page] exists in the DOM.
//
// Reads the latest order from localStorage (written by initializeCheckout on submit).
// If no valid order is found, shows a friendly "no order" message.
// The invoice preview and download buttons use createInvoiceDocumentFromOrder().
function initializeThankYouPage() {
	var thankYouPage = document.querySelector("[data-thank-you-page]");
	if (!thankYouPage) { return; }

	var orderReference = thankYouPage.querySelector("[data-confirmation-order]");
	var invoicePreviewButton = thankYouPage.querySelector("[data-invoice-preview]");
	var invoiceDownloadButton = thankYouPage.querySelector("[data-invoice-download]");
	var invoiceStatus = thankYouPage.querySelector("[data-invoice-status]");
	var invoicePlaceholder = thankYouPage.querySelector("[data-invoice-placeholder]");
	var invoiceFrame = thankYouPage.querySelector("[data-invoice-frame]");
	var order = loadLatestOrder();
	var sessionId = new URLSearchParams(window.location.search).get("session_id") || "";
	var invoicePreviewUrl = "";

	function setThankYouUnavailable(statusText, placeholderText) {
		if (orderReference) { orderReference.textContent = "Unavailable"; }
		if (invoiceStatus) { invoiceStatus.textContent = statusText; }
		if (invoicePlaceholder) { invoicePlaceholder.textContent = placeholderText; }
		if (invoicePreviewButton) { invoicePreviewButton.disabled = true; }
		if (invoiceDownloadButton) { invoiceDownloadButton.disabled = true; }
	}

	function setThankYouReady(statusText) {
		if (orderReference) { orderReference.textContent = order.orderNumber || generateOrderNumber(); }
		if (invoiceStatus) { invoiceStatus.textContent = statusText; }
		if (invoicePreviewButton) { invoicePreviewButton.disabled = false; }
		if (invoiceDownloadButton) { invoiceDownloadButton.disabled = false; }
	}

	if (!order || !order.items || !order.items.length) {
		setThankYouUnavailable(
			"No recent order was found. Place a new order to generate an invoice.",
			"No invoice is available yet."
		);
	} else {
		if (sessionId && invoiceStatus) {
			invoiceStatus.textContent = "Session IDs are no longer used. Showing your latest local order.";
		}
		setThankYouReady("Your invoice is ready to preview and download.");
	}

	if (invoicePreviewButton) {
		invoicePreviewButton.addEventListener("click", function () {
			var invoiceDocument = createInvoiceDocumentFromOrder(order);
			var blob;

			if (!invoiceDocument || !invoiceFrame) {
				if (invoiceStatus) { invoiceStatus.textContent = "Unable to generate invoice preview right now."; }
				return;
			}

			blob = invoiceDocument.output("blob");
			if (invoicePreviewUrl) { window.URL.revokeObjectURL(invoicePreviewUrl); }

			invoicePreviewUrl = window.URL.createObjectURL(blob);
			invoiceFrame.src = invoicePreviewUrl;
			invoiceFrame.hidden = false;
			if (invoicePlaceholder) { invoicePlaceholder.hidden = true; }
			if (invoiceStatus) { invoiceStatus.textContent = "Invoice preview updated."; }
		});
	}

	if (invoiceDownloadButton) {
		invoiceDownloadButton.addEventListener("click", function () {
			var invoiceDocument = createInvoiceDocumentFromOrder(order);

			if (!invoiceDocument) {
				if (invoiceStatus) { invoiceStatus.textContent = "Unable to generate invoice download right now."; }
				return;
			}

			invoiceDocument.save(getInvoiceFilenameFromOrder(order));
			if (invoiceStatus) { invoiceStatus.textContent = "Invoice downloaded."; }
		});
	}
}
