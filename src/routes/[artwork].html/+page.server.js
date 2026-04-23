import { error } from '@sveltejs/kit';
import { getArtworkBySlug } from '$lib/artworks';

export function load({ params }) {
  const artwork = getArtworkBySlug(params.artwork);

  if (!artwork) {
    throw error(404, 'Artwork not found');
  }

  return {
    artwork
  };
}
