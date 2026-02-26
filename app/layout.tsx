import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YRPG - Dungeon Crawler',
  description: 'A party-based dungeon crawler with AI narration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}