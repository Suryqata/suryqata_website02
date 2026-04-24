// utils.js
// Shared keys and helper functions used by other static scripts.

// localStorage keys
var storageKey = "suryqata-cart";
var checkoutStateKey = "suryqata-checkout-state";
var latestOrderKey = "suryqata-latest-order";
var authSessionKey = "suryqata-auth-session";
var authAccountsKey = "suryqata-auth-accounts";

// Artwork price and size data
var sizePrices = {
	Small: 20,
	Medium: 45,
	Large: 110
};

var sizeDimensions = {
	Small: "5x7 in",
	Medium: "11x14 in",
	Large: "24x36 in"
};

function pluralize(count) {
	if (count === 1) {
		return "";
	}

	return "s";
}

function formatPrice(value) {
	var formatter = new Intl.NumberFormat("en-IE", {
		style: "currency",
		currency: "EUR"
	});

	return formatter.format(value);
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

function slugify(value) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

function joinValues(values, separator) {
	var safeSeparator = separator || " ";
	return values.filter(Boolean).join(safeSeparator);
}

function generateOrderNumber() {
	return "SQ-" + String(Date.now()).slice(-6);
}

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function getSiteBasePath() {
	var baseMeta = document.querySelector('meta[name="site-base"]');
	var configuredBase = baseMeta ? (baseMeta.getAttribute("content") || "") : "";

	if (!configuredBase || configuredBase === "/") {
		return "";
	}

	return "/" + configuredBase.replace(/^\/+|\/+$/g, "");
}

function withBasePath(path) {
	var normalizedPath = String(path || "").replace(/^\/+/, "");
	var basePath = getSiteBasePath();

	if (!normalizedPath) {
		return basePath || "/";
	}

	if (!basePath) {
		return "/" + normalizedPath;
	}

	return basePath + "/" + normalizedPath;
}
