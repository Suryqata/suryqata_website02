<script>
  import { onMount } from 'svelte';
  import { hasSupabaseEnv } from '$lib/supabaseClient';

  let mode = 'login';
  let fullName = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let message = '';
  let isError = false;
  let loading = false;

  let authenticated = false;
  let sessionMode = '';
  let sessionDisplayName = '';
  let sessionEmail = '';
  let returnTo = '/';

  onMount(() => {
    returnTo = getSafeReturnPath(new URLSearchParams(window.location.search).get('returnTo'));
    loadAuthSessionState();
  });

  function setMessage(text, error) {
    message = text;
    isError = Boolean(error);
  }

  function getSafeReturnPath(value) {
    if (!value) {
      return '/';
    }

    if (value.startsWith('/') && !value.startsWith('//')) {
      return value;
    }

    return '/';
  }

  async function requestJson(url, options = {}) {
    const fetchOptions = {
      method: options.method || 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json'
      }
    };

    if (options.body) {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);
    const payload = await response.json().catch(() => ({}));

    return {
      ok: response.ok,
      data: payload?.data || payload,
      error: payload?.error || ''
    };
  }

  async function loadAuthSessionState() {
    const response = await requestJson('/api/auth/session');
    const session = response.data || { authenticated: false };

    authenticated = Boolean(session.authenticated);
    sessionMode = session.mode || '';
    sessionDisplayName = session.displayName || '';
    sessionEmail = session.email || '';
  }

  async function handleLogin(event) {
    event.preventDefault();

    if (!hasSupabaseEnv) {
      setMessage('Supabase env vars are missing. Configure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.', true);
      return;
    }

    loading = true;
    setMessage('Signing in...', false);

    const response = await requestJson('/api/auth/login', {
      method: 'POST',
      body: {
        email,
        password
      }
    });

    loading = false;

    if (!response.ok) {
      setMessage(response.error || 'Unable to sign in right now.', true);
      return;
    }

    await loadAuthSessionState();
    setMessage('Signed in. Redirecting...', false);
    window.location.href = returnTo;
  }

  async function handleRegister(event) {
    event.preventDefault();

    if (!hasSupabaseEnv) {
      setMessage('Supabase env vars are missing. Configure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.', true);
      return;
    }

    if (password.length < 8) {
      setMessage('Use a password with at least 8 characters.', true);
      return;
    }

    if (password !== confirmPassword) {
      setMessage('The passwords do not match.', true);
      return;
    }

    loading = true;
    setMessage('Creating account...', false);

    const response = await requestJson('/api/auth/register', {
      method: 'POST',
      body: {
        name: fullName,
        email,
        password
      }
    });

    loading = false;

    if (!response.ok) {
      setMessage(response.error || 'Unable to create account right now.', true);
      return;
    }

    if (response.data?.requiresEmailConfirmation) {
      setMessage('Account created. Check your email to confirm your account.', false);
      fullName = '';
      email = '';
      password = '';
      confirmPassword = '';
      mode = 'login';
      return;
    }

    await loadAuthSessionState();
    setMessage('Account created. Redirecting...', false);
    window.location.href = returnTo;
  }

  async function handleSignOut() {
    loading = true;

    const response = await requestJson('/api/auth/logout', {
      method: 'POST'
    });

    loading = false;

    if (!response.ok) {
      setMessage(response.error || 'Unable to sign out right now.', true);
      return;
    }

    await loadAuthSessionState();
    setMessage('Signed out.', false);
  }

  function handleContinue() {
    window.location.href = returnTo;
  }
</script>

<section id="auth">
  <div class="auth-shell">
    <div class="auth-main">
      <p class="auth-kicker">Supabase Auth</p>
      <h2>Sign in or create an account</h2>
      <p>Use your account to securely access your saved details and checkout progress.</p>

      <div class="auth-switcher" role="tablist" aria-label="Choose authentication mode">
        <button
          type="button"
          class:is-active={mode === 'login'}
          on:click={() => {
            mode = 'login';
            setMessage('', false);
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          class:is-active={mode === 'register'}
          on:click={() => {
            mode = 'register';
            setMessage('', false);
          }}
        >
          Create Account
        </button>
      </div>

      {#if mode === 'login'}
        <form class="auth-form" on:submit={handleLogin}>
          <label class="auth-field">
            <span>Email address</span>
            <input type="email" bind:value={email} placeholder="name@example.com" required disabled={loading} />
          </label>
          <label class="auth-field">
            <span>Password</span>
            <input type="password" bind:value={password} placeholder="Your password" required disabled={loading} />
          </label>
          <button type="submit" class="auth-submit" disabled={loading || !hasSupabaseEnv}>
            {loading ? 'Please wait...' : 'Sign In'}
          </button>
        </form>
      {:else}
        <form class="auth-form" on:submit={handleRegister}>
          <label class="auth-field">
            <span>Full name</span>
            <input type="text" bind:value={fullName} placeholder="Your full name" required disabled={loading} />
          </label>
          <label class="auth-field">
            <span>Email address</span>
            <input type="email" bind:value={email} placeholder="name@example.com" required disabled={loading} />
          </label>
          <label class="auth-field">
            <span>Password</span>
            <input
              type="password"
              bind:value={password}
              placeholder="At least 8 characters"
              required
              minlength="8"
              disabled={loading}
            />
          </label>
          <label class="auth-field">
            <span>Confirm password</span>
            <input
              type="password"
              bind:value={confirmPassword}
              placeholder="Repeat your password"
              required
              minlength="8"
              disabled={loading}
            />
          </label>
          <button type="submit" class="auth-submit" disabled={loading || !hasSupabaseEnv}>
            {loading ? 'Please wait...' : 'Create Account'}
          </button>
        </form>
      {/if}

      <p class="auth-message" class:is-error={isError}>{message}</p>
    </div>

    <aside class="auth-side">
      <div class="auth-side-card">
        <p class="auth-kicker">Connection</p>
        <h3>Environment status</h3>
        {#if hasSupabaseEnv}
          <p>Supabase credentials are loaded from environment variables.</p>
        {:else}
          <p>Add Supabase credentials to your .env file before using this login.</p>
        {/if}
      </div>

      <div class="auth-session-card" hidden={!authenticated}>
        <p class="auth-kicker">Current session</p>
        {#if sessionMode === 'guest'}
          <p>You are continuing as {sessionDisplayName}.</p>
        {:else}
          <p>Signed in as {sessionDisplayName} ({sessionEmail}).</p>
        {/if}
        <div class="auth-session-actions">
          <button type="button" class="auth-session-button is-secondary" on:click={handleContinue} disabled={loading}>
            Continue
          </button>
          <button type="button" class="auth-session-button" on:click={handleSignOut} disabled={loading}>
            {loading ? 'Please wait...' : 'Log Out'}
          </button>
        </div>
      </div>
    </aside>
  </div>
</section>
