/**
 * Social media links configuration.
 *
 * Update this file whenever a social profile URL changes.
 * Every component that renders social icons imports from here
 * so there is a single source of truth.
 */
export const SOCIAL_LINKS = [
  {
    id: 'instagram',
    label: 'Instagram',
    url: 'https://www.instagram.com/balicoffeesupplier/',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    url: 'https://www.tiktok.com/@balicoffeesupplier?lang=id-ID',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    url: 'https://wa.link/ypfw8a',
  },
];

/** WhatsApp link used for CTA buttons across the site. */
export const WHATSAPP_CTA = 'https://wa.link/ypfw8a';
