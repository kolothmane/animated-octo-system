import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instagram Session Monitor',
  description: 'Monitor Instagram follower changes with a Chrome extension session bridge',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
