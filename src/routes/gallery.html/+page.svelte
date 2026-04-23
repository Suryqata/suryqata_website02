<script>
  import { artworks } from '$lib/artworks';
</script>

<section id="gallery">
  <h2>Gallery</h2>
  <div class="gallery-filters" role="group" aria-label="Filter gallery items by category">
    <button type="button" class="gallery-filter-button" data-gallery-filter="clothes">Clothes</button>
    <button type="button" class="gallery-filter-button" data-gallery-filter="prints">Prints</button>
  </div>

  <div class="gallery-grid">
    {#each artworks as item}
      <a class="card" data-category={item.category} href={`/${item.slug}.html`}>
        <div class="card-image card-image-artwork card-image-foil">
          <img src={item.image} alt={item.alt} />
          <img src="/images/foil.png" alt="" class="card-foil-overlay" aria-hidden="true" />
        </div>
        <div class="card-content">
          <h3>{item.title}</h3>
        </div>
      </a>
    {/each}
  </div>
</section>
