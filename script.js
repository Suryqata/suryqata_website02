// script.js
// Main page setup. This runs once the page HTML is ready.

document.addEventListener("DOMContentLoaded", function () {
	// Always load cart state first.
	loadAndInitCart();

	// If a shared header exists, add auth and cart controls.
	var headerNav = document.querySelector(".header-nav");
	if (headerNav) {
		createAuthInterface(headerNav);
		createCartInterface(headerNav);
		renderCart();
		refreshAuthInterface();
	}

	// Artwork page: show add-to-cart button when piece info exists.
	var pieceInfo = document.querySelector("#piece-detail .piece-info");
	if (pieceInfo) {
		createAddToCartButton();
	}

	// Safe to call on every page.
	initializePieceMagnifier();
	initializeGalleryFilters();

	// Checkout page setup.
	var checkoutPage = document.querySelector("[data-checkout-page]");
	if (checkoutPage) {
		initializeCheckout();
	}

	// Thank-you page setup.
	var thankYouPage = document.querySelector("[data-thank-you-page]");
	if (thankYouPage) {
		initializeThankYouPage();
	}

	// Auth page setup.
	var authPage = document.querySelector("[data-auth-page]");
	if (authPage) {
		initializeAuthPage();
	}
});
