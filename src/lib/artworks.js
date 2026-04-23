const pieceTitles = [
  'Violence',
  'King',
  'Abandoned',
  'Screaming Rain',
  'Broken Life',
  'Comfort',
  'Dreaming',
  'GONE',
  'Hesitation',
  'Burning',
  'The Top',
  'Pain of Love',
  'Rich in Heart',
  'Mean to Bleed',
  'Choke',
  'Boxed Life',
  'Loyal Angel',
  'Does Love Conquer?',
  'Innocent Play'
];

const printItems = Array.from({ length: 19 }, (_, index) => {
  const number = String(index + 1);
  const padded = number.padStart(2, '0');
  const title = pieceTitles[index] || `Piece ${number}`;

  return {
    slug: `piece${number}`,
    title,
    category: 'prints',
    visual: `Art ${number}`,
    image: `/gallerycontent/piece${padded}.avif`,
    alt: `${title} artwork`,
    description: `An Art print made of an acid-free archival paper (100% Cotton)`,
    sizes: [
      { label: 'Small', dimensions: '5×7 in', price: '€20' },
      { label: 'Medium', dimensions: '11×14 in', price: '€45' },
      { label: 'Large', dimensions: '24×36 in', price: '€110' }
    ]
  };
});

const clothingItems = [
  {
    slug: 'clothing01',
    title: 'Clothing 01',
    category: 'clothes',
    visual: 'Clothing 01',
    image: '/gallerycontent/clothing01.avif',
    alt: 'Clothing 01 artwork',
    description:
      'This is a detailed description for Clothing 01. You can add information about the garment, design concept, materials, fit, and any special finishing details here.'
  },
  {
    slug: 'clothing02',
    title: 'Clothing 02',
    category: 'clothes',
    visual: 'Clothing 02',
    image: '/gallerycontent/clothing02.avif',
    alt: 'Clothing 02 artwork',
    description:
      'This is a detailed description for Clothing 02. You can add information about the garment, design concept, materials, fit, and any special finishing details here.'
  },
  {
    slug: 'clothing03',
    title: 'Clothing 03',
    category: 'clothes',
    visual: 'Clothing 03',
    image: '/gallerycontent/clothing03.jpg',
    alt: 'Clothing 03 artwork',
    description:
      'This is a detailed description for Clothing 03. You can add information about the garment, design concept, materials, fit, and any special finishing details here.'
  }
];

export const artworks = [...printItems, ...clothingItems];

export function getArtworkBySlug(slug) {
  return artworks.find((item) => item.slug.toLowerCase() === String(slug || '').toLowerCase()) || null;
}
