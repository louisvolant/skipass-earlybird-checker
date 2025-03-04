// src/app/links.ts
export interface LinkItem {
  label: string;
  href: string;
}

export const internalLinks: LinkItem[] = [
  { label: 'Home', href: '/' },
];

export const externalLinks: LinkItem[] = [
  { label: 'Personal Page', href: 'https://www.louisvolant.com' },
  { label: 'Password Keeper', href: 'https://www.securaised.net' },
  { label: 'QR Code Tool', href: 'https://qr-code-tool.louisvolant.com' },
  { label: 'MP3 Tool', href: 'https://mp3-tool.louisvolant.com' },
  { label: 'Random Text Generator', href: 'https://random-text-generator.louisvolant.com' },
  { label: 'My 20 years old blog', href: 'https://www.abricocotier.fr' },
];