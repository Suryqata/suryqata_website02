<script>
  import { page } from '$app/stores';

  $: isHome = $page.url.pathname === '/';
</script>

<svelte:head>
  <title>Suryqata Art</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="/style.css" />
  <link rel="stylesheet" href="/cards.css" />
  <link rel="stylesheet" href="/header.css" />
  <link rel="stylesheet" href="/responsivity.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="/script.js"></script>
</svelte:head>

<div class="header">
  <h1><a href="/">Suryqata</a></h1>
  <nav class={`header-nav ${isHome ? 'is-home' : ''}`}>
    {#if isHome}
      <a href="/gallery.html">Store</a>
    {/if}
  </nav>
</div>

<div class="page-fade">
  <slot />
</div>
