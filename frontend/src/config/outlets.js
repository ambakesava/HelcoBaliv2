/**
 * Retail outlet / partner data.
 *
 * Each entry represents a physical location where HelcoBali products
 * are available. The `branches` array supports outlets that have
 * multiple storefronts.
 *
 * NOTE: Description text is NOT stored here because it varies by
 * language. Instead, translations are keyed by outlet `id` in
 * `src/locales.js` → `outlets[id]`.
 */
export const OUTLETS = [
  {
    id: 1,
    name: 'Bintang Supermarket',
    location: 'Seminyak & Ubud, Bali',
    image:
      'https://images.unsplash.com/photo-1601599561096-f87c95fff1e9?auto=format&fit=crop&w=800&q=80',
    branches: [
      {
        name: 'Seminyak',
        mapsLink:
          'https://www.google.com/maps/search/?api=1&query=Bintang+Supermarket+Seminyak+Bali',
      },
      {
        name: 'Ubud',
        mapsLink:
          'https://www.google.com/maps/search/?api=1&query=Bintang+Supermarket+Ubud+Bali',
      },
    ],
  },
  {
    id: 2,
    name: 'Uncle Joe Market - Blok A & B',
    location: 'Nusa Dua, Bali',
    image:
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
    branches: [
      {
        name: 'Blok A',
        mapsLink:
          'https://www.google.com/maps/search/?api=1&query=Uncle+Joe+Market+Nusa+Dua+Bali+Blok+A',
      },
      {
        name: 'Blok B',
        mapsLink:
          'https://www.google.com/maps/search/?api=1&query=Uncle+Joe+Market+Nusa+Dua+Bali+Blok+B',
      },
    ],
  },
  {
    id: 3,
    name: 'Bali International Hospital',
    location: 'Sanur, Bali',
    image:
      'https://storage.googleapis.com/web-bih-bh-devel/articles/28b38580-0686-49a0-8f81-4f87c6bbd1bf.jpg',
    branches: [
      {
        name: 'Sanur',
        mapsLink: 'https://maps.app.goo.gl/gFPu6REW6Z48RqCEA',
      },
    ],
  },
];
