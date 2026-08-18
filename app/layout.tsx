import type { Metadata } from 'next';
import { Providers } from '../components/Providers';

export const metadata: Metadata = {
  title: 'MockPrep',
  description: 'Government and private exam preparation platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f6f7fb' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}