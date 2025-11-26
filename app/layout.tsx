import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HS Gym Rancakihiyang',
  description: 'Sistem manajemen kebugaran',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  );
}