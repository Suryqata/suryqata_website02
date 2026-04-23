<script>
  export let data;
</script>

<svelte:head>
  <title>{data.artwork.title} - Suryqata Art</title>
</svelte:head>

<section id="piece-detail">
  <div class="piece-container">
    <div class="piece-image piece-image-artwork" data-visual={data.artwork.visual}>
      <img src={data.artwork.image} alt={data.artwork.alt} />
    </div>
    <div class="piece-info">
      <h2>{data.artwork.title}</h2>
      <p>{data.artwork.description}</p>
    </div>
  </div>
</section>
