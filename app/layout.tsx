import type { Metadata } from 'next';
import './globals.css';
import { SiteFrame } from '@/components/site-frame';

export const metadata: Metadata = {
  metadataBase: new URL('https://civicslenz.com'),
  title: {
    default: 'CivicLenZ — See clearly. Hold accountable.',
    template: '%s | CivicLenZ',
  },
  description: 'Find your elected officials, understand the public record, and take informed civic action.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'CivicLenZ — See clearly. Hold accountable.',
    description: 'Find your elected officials. Monitor the record. Make your voice count.',
    type: 'website',
    url: '/',
    images: [{ url: '/brand/civicslenz-social.svg', width: 1200, height: 630, alt: 'CivicLenZ — See Clearly. Hold Accountable.' }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteFrame><main id="main-content">{children}</main></SiteFrame>
      </body>
    </html>
  );
}
