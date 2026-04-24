// =============================================================================
// gallery.js — Gallery filter buttons
//
// Depends on: nothing (no utils.js calls needed here)
// Used on: /gallery only
//
// Each filter button has a [data-gallery-filter] attribute whose value matches
// the [data-category] attribute on gallery cards. Clicking a filter hides all
// cards that don't belong to that category.
// =============================================================================

// Wires up the category filter buttons on the gallery page.
// Called from script.js; exits silently if there are no filter buttons or cards
// (so it's safe to call on pages that don't have a gallery).
function initializeGalleryFilters() {
	var galleryFilters = Array.prototype.slice.call(document.querySelectorAll("[data-gallery-filter]"));
	var galleryCards   = Array.prototype.slice.call(document.querySelectorAll("#gallery .card[data-category]"));

	if (!galleryFilters.length || !galleryCards.length) { return; }

	galleryFilters.forEach(function (button) {
		button.addEventListener("click", function () {
			// The filter value is the category string (e.g. "paintings", "clothing")
			var selectedFilter = button.getAttribute("data-gallery-filter") || "";

			// Mark the clicked button active; deactivate all others
			galleryFilters.forEach(function (item) {
				var isActive = item === button;
				item.classList.toggle("is-active", isActive);
				item.setAttribute("aria-pressed", isActive ? "true" : "false");
			});

			// Show only cards whose data-category matches the selected filter;
			// hide everything else using the native hidden attribute
			galleryCards.forEach(function (card) {
				var matches = card.getAttribute("data-category") === selectedFilter;
				card.hidden = !matches;
			});
		});

		// All buttons start unselected
		button.setAttribute("aria-pressed", "false");
	});
}
