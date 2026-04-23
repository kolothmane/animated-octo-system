import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insta-Private-Monitor',
  description: 'Monitor Instagram follower changes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
