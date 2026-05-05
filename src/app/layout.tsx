// RTL shell — Hebrew-first. Do not remove dir="rtl" or lang="he".
// Font must support Hebrew glyphs (e.g. Noto Sans Hebrew, Rubik, or system-ui with Hebrew fallback).

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'עוזר המורה למתמטיקה',
  description: 'כלי AI לתכנון שיעורים, יצירת תרגילים ומעקב ציונים',
  // TODO: add Open Graph, favicon
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        {/* TODO MVP 0: add auth session provider, global nav, Hebrew font */}
        {children}
      </body>
    </html>
  );
}
