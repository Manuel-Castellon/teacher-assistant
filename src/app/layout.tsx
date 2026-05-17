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
        <nav style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="/" style={{ color: '#111827', textDecoration: 'none', fontWeight: 700 }}>עוזר המורה למתמטיקה</a>
            <a href="/curriculum" style={{ color: '#374151', textDecoration: 'none' }}>תכנית לימודים</a>
            <a href="/lesson-plan" style={{ color: '#374151', textDecoration: 'none' }}>מערכי שיעור</a>
            <a href="/exam" style={{ color: '#374151', textDecoration: 'none' }}>מבחנים</a>
            <a href="/rubrics" style={{ color: '#374151', textDecoration: 'none' }}>מחוונים</a>
            <a href="/question-bank" style={{ color: '#374151', textDecoration: 'none' }}>בנק שאלות</a>
          </div>
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
