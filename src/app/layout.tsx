// RTL shell — Hebrew-first. Do not remove dir="rtl" or lang="he".
// Font: Rubik (Google Fonts), self-hosted via next/font for Hebrew + Latin.

import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';
import { auth, signOut } from '@/auth';

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-rubik',
});

export const metadata: Metadata = {
  title: 'עוזר המורה למתמטיקה',
  description: 'כלי AI לתכנון שיעורים, יצירת תרגילים ומעקב ציונים',
  icons: {
    icon: '/icon.svg',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body style={{ fontFamily: 'var(--font-rubik), system-ui, sans-serif' }}>
        <nav style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>עוזר המורה למתמטיקה</span>
          {session?.user ? (
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/auth/signin' });
              }}
            >
              <span style={{ marginLeft: '1rem' }}>{session.user.name ?? session.user.email}</span>
              <button type="submit">יציאה</button>
            </form>
          ) : (
            <a href="/auth/signin">כניסה</a>
          )}
        </nav>
        {children}
      </body>
    </html>
  );
}
