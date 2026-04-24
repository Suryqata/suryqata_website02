// =============================================================================
// auth.js — User authentication (login, register, guest) and header session UI
//
// Depends on: utils.js
// Used on: every page (header Sign In link) + /auth (the full auth page)
//
// All account data is stored in localStorage — this is a client-side demo.
// There is no real server verification; passwords are stored as plain text.
// =============================================================================

// ─── Module-level variables ───────────────────────────────────────────────────
// DOM nodes for the auth controls injected into the shared header.
// Set by createAuthInterface() and read by refreshAuthInterface().
var authLink;         // <a> element: "Sign In" or "Account: Name"
var authLogoutButton; // <button> element: "Log Out" (hidden when signed out)

// ─── Header auth interface ─────────────────────────────────────────────────────
// Injects the "Sign In" link and hidden "Log Out" button into the header nav.
// Called once on every page load (from script.js) if a header nav exists.
function createAuthInterface(headerNav) {
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

// Updates the header link text and shows/hides the Log Out button
// to reflect the current session state. Called after login, logout,
// or any page that changes the session (e.g. auth page).
function refreshAuthInterface() {
	var session;

	if (!authLink) { return; }

	session = getLocalAuthSession();

	if (!session.authenticated) {
		authLink.textContent = "Sign In";
		authLink.href = getAuthRedirectHref();
		if (authLogoutButton) { authLogoutButton.hidden = true; }
		return;
	}

	if (session.mode === "guest") {
		authLink.textContent = "Guest: " + session.displayName;
	} else {
		authLink.textContent = "Account: " + session.displayName;
	}

	authLink.href = withBasePath("auth");
	if (authLogoutButton) { authLogoutButton.hidden = false; }
}

// Clears the session from localStorage and refreshes the header UI.
// Returns a resolved Promise so callers can use .finally() if needed.
function logoutCurrentSession() {
	setLocalAuthSession({ authenticated: false });
	refreshAuthInterface();
	return Promise.resolve();
}

// ─── Auth page ─────────────────────────────────────────────────────────────────
// Wires up the full login/register/guest page (/auth).
// Called from script.js only if [data-auth-page] exists in the DOM.
//
// The page has two forms (login / register) that are toggled by mode buttons.
// Inner functions (setAuthMode, submitLoginForm, etc.) are scoped here
// so they can access the local form variables without polluting global scope.
function initializeAuthPage() {
	var authPage = document.querySelector("[data-auth-page]");
	if (!authPage) { return; }

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
			submitLoginForm(forms.login);
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

			submitRegisterForm(forms.register);
		});
	}

	if (guestButton) {
		guestButton.addEventListener("click", function () {
			guestButton.disabled = true;
			setLocalAuthSession({
				authenticated: true,
				mode: "guest",
				displayName: sanitizeAuthName(guestName && guestName.value ? guestName.value : "") || "Guest",
				email: ""
			});

			setMessage("Guest session ready. Redirecting...", false);
			refreshAuthInterface();
			loadAuthSessionState();
			window.setTimeout(function () {
				window.location.href = withBasePath(getAuthReturnPath());
			}, 350);
		});
	}

	if (sessionContinue) {
		sessionContinue.addEventListener("click", function () {
			window.location.href = withBasePath(getAuthReturnPath());
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

	// Switches which form is visible and active (login or register).
	// Disables fields in the hidden form so they don't interfere with validation.
	function setAuthMode(mode) {
		activeMode = mode;

		modeButtons.forEach(function (button) {
			var isActive = button.getAttribute("data-auth-mode") === mode;
			button.classList.toggle("is-active", isActive);
		});

		Object.keys(forms).forEach(function (key) {
			var isActive = key === mode;
			var fields;

			if (!forms[key]) { return; }

			forms[key].hidden = !isActive;
			forms[key].setAttribute("aria-hidden", isActive ? "false" : "true");
			fields = Array.prototype.slice.call(forms[key].querySelectorAll("input, select, textarea, button"));
			fields.forEach(function (field) {
				field.disabled = !isActive;
			});
		});

		setMessage("", false);
	}

	// Validates the login form and checks the submitted email + password
	// against the accounts saved in localStorage. On success, creates a session
	// and redirects to the return page.
	function submitLoginForm(form) {
		var submitButton = form.querySelector('button[type="submit"]');
		var values;
		var accounts;
		var account;
		var email;

		if (!form.reportValidity()) { return; }

		if (submitButton) { submitButton.disabled = true; }

		setMessage("Working...", false);
		values = getFormValues(form);
		email = normalizeAuthEmail(values.email || "");
		accounts = loadAuthAccounts();
		account = accounts[email];

		if (!account || account.password !== (values.password || "")) {
			setMessage("Incorrect email or password.", true);
			if (submitButton) { submitButton.disabled = false; }
			return;
		}

		setLocalAuthSession({ authenticated: true, mode: "user", displayName: account.name, email: email });
		setMessage("Success. Redirecting...", false);
		refreshAuthInterface();
		loadAuthSessionState();
		window.setTimeout(function () { window.location.href = withBasePath(getAuthReturnPath()); }, 350);

		if (submitButton) { submitButton.disabled = false; }
	}

	// Validates the register form, checks the email is not already taken,
	// saves the new account to localStorage, and creates a session immediately.
	function submitRegisterForm(form) {
		var submitButton = form.querySelector('button[type="submit"]');
		var values;
		var accounts;
		var email;
		var name;

		if (!form.reportValidity()) { return; }

		if (submitButton) { submitButton.disabled = true; }

		setMessage("Working...", false);
		values = getFormValues(form);
		email = normalizeAuthEmail(values.email || "");
		name = sanitizeAuthName(values.name || "");
		accounts = loadAuthAccounts();

		if (!name || !email) {
			setMessage("Please enter your name and a valid email.", true);
			if (submitButton) { submitButton.disabled = false; }
			return;
		}

		if (accounts[email]) {
			setMessage("An account already exists for that email.", true);
			if (submitButton) { submitButton.disabled = false; }
			return;
		}

		accounts[email] = { name: name, email: email, password: values.password || "" };
		persistAuthAccounts(accounts);
		setLocalAuthSession({ authenticated: true, mode: "user", displayName: name, email: email });
		setMessage("Success. Redirecting...", false);
		refreshAuthInterface();
		loadAuthSessionState();
		window.setTimeout(function () { window.location.href = withBasePath(getAuthReturnPath()); }, 350);

		if (submitButton) { submitButton.disabled = false; }
	}

	// Reads the current session and shows/updates the "already signed in" card
	// at the top of the auth page (used to let the user continue or log out).
	function loadAuthSessionState() {
		var session = getLocalAuthSession();

		if (!sessionCard || !sessionText) { return; }

		sessionCard.hidden = !session.authenticated;
		if (!session.authenticated) { return; }

		if (session.mode === "guest") {
			sessionText.textContent = "You are continuing as " + session.displayName + ".";
		} else {
			sessionText.textContent = "Signed in as " + session.displayName + " (" + session.email + ").";
		}
	}

	// Displays a status message below the form.
	// isError=true adds the "is-error" CSS class (typically red text).
	function setMessage(text, isError) {
		if (!message) { return; }
		message.textContent = text;
		message.classList.toggle("is-error", Boolean(isError));
	}
}

// ─── Auth session helpers ─────────────────────────────────────────────────────

// Reads and validates the session object from localStorage.
// Always returns a well-shaped object (never null/undefined) so callers
// don't need to guard against missing fields.
function getLocalAuthSession() {
	var parsed = null;
	var session;

	try {
		parsed = JSON.parse(window.localStorage.getItem(authSessionKey) || "null");
	} catch (error) {
		parsed = null;
	}

	if (!parsed || !parsed.authenticated) {
		return { authenticated: false, mode: "guest", displayName: "", email: "" };
	}

	session = {
		authenticated: true,
		mode: "guest",
		displayName: sanitizeAuthName(parsed.displayName) || "Guest",
		email: ""
	};

	if (parsed.mode === "user") {
		session.mode = "user";
		session.email = normalizeAuthEmail(parsed.email);
	}

	return session;
}

// Writes a normalized session object to localStorage.
// Sanitizes displayName and email before saving to strip whitespace.
// Pass { authenticated: false } to clear the session.
function setLocalAuthSession(session) {
	var normalized;

	if (session && session.authenticated) {
		normalized = {
			authenticated: true,
			mode: "guest",
			displayName: sanitizeAuthName(session.displayName) || "Guest",
			email: ""
		};

		if (session.mode === "user") {
			normalized.mode = "user";
			normalized.email = normalizeAuthEmail(session.email);
		}
	} else {
		normalized = { authenticated: false };
	}

	try {
		window.localStorage.setItem(authSessionKey, JSON.stringify(normalized));
	} catch (error) {
		return;
	}
}

// Reads the accounts dictionary from localStorage.
// Returns an empty object if nothing is stored or parsing fails.
function loadAuthAccounts() {
	try {
		return JSON.parse(window.localStorage.getItem(authAccountsKey) || "{}");
	} catch (error) {
		return {};
	}
}

// Saves the entire accounts dictionary back to localStorage.
// Called after registering a new account.
function persistAuthAccounts(accounts) {
	try {
		window.localStorage.setItem(authAccountsKey, JSON.stringify(accounts));
	} catch (error) {
		return;
	}
}

// ─── Auth helpers ──────────────────────────────────────────────────────────────

// Trims and lowercases an email string for consistent storage and comparison.
function normalizeAuthEmail(value) {
	return String(value || "").trim().toLowerCase();
}

// Trims a display name string to remove accidental leading/trailing whitespace.
function sanitizeAuthName(value) {
	return String(value || "").trim();
}

// Builds the href for the "Sign In" link, including a returnTo query param
// so the user is redirected back to the page they came from after signing in.
function getAuthRedirectHref() {
	return withBasePath("auth") + "?returnTo=" + encodeURIComponent(getAuthReturnPath());
}

// Returns the page to redirect to after a successful auth action.
// Reads "returnTo" from the URL query string, validates it as a local path,
// and falls back to "gallery" if the current page is "auth".
function getAuthReturnPath() {
	var params = new URLSearchParams(window.location.search);
	var returnTo = params.get("returnTo");
	var currentPage = getCurrentPagePath();

	if (returnTo && /^[a-zA-Z0-9._\/-]+$/.test(returnTo)) {
		return returnTo.replace(/^\/+/, "");
	}

	if (currentPage === "auth") {
		return "gallery";
	}

	return currentPage;
}

// Returns the current page path without the leading slash (e.g. "gallery").
// Used as the default return destination when no returnTo param is set.
function getCurrentPagePath() {
	var path = window.location.pathname || "/";
	var basePath = getSiteBasePath();

	if (basePath && path.indexOf(basePath) === 0) {
		path = path.slice(basePath.length) || "/";
	}

	var cleanedPath = path.replace(/^\/+/, "");

	if (!cleanedPath) {
		return "gallery";
	}

	return cleanedPath;
}

// Extracts all form field values into a plain object using the FormData API.
// Useful as a quick snapshot of any form without manually querying each field.
function getFormValues(form) {
	var values = {};
	var formData = new FormData(form);
	formData.forEach(function (value, key) { values[key] = value; });
	return values;
}

// A thin wrapper around window.fetch for JSON API calls.
// Automatically sets Content-Type and serializes the request body.
// Returns a normalised result object: { ok, status, data, error }.
// Currently unused in the demo (all auth is local) but kept for future use.
function requestJson(url, options) {
	var requestOptions = options || {};
	var fetchOptions = {
		method: requestOptions.method || "GET",
		credentials: "same-origin",
		headers: { Accept: "application/json" }
	};

	if (requestOptions.body) {
		fetchOptions.headers["Content-Type"] = "application/json";
		fetchOptions.body = JSON.stringify(requestOptions.body);
	}

	return window.fetch(url, fetchOptions).then(function (response) {
		return response.json().catch(function () { return {}; }).then(function (payload) {
			return {
				ok: response.ok,
				status: response.status,
				data: payload && payload.data ? payload.data : payload,
				error: payload && payload.error ? payload.error : ""
			};
		});
	});
}
