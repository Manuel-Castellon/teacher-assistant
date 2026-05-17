import NextAuth from 'next-auth';
import type { Provider } from 'next-auth/providers';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import PostgresAdapter from '@auth/pg-adapter';
import { pool } from '@/lib/db';

const configuredAuthSecret = process.env.AUTH_SECRET?.trim();
const authSecret = configuredAuthSecret
  || (process.env.NODE_ENV === 'development' ? 'teacher-assistant-dev-only-auth-secret' : undefined);

// Dev-only passwordless email sign-in: bypasses Google OAuth so the signed-in
// flow can be exercised end-to-end without Google Cloud credentials. Production
// must use Google OAuth (see CLAUDE.md Service Decision #6).
const devCredentials = Credentials({
  id: 'dev-email',
  name: 'Dev email',
  credentials: {
    email: { label: 'Email', type: 'email' },
    name: { label: 'Display name', type: 'text' },
  },
  async authorize(credentials) {
    const email = String(credentials?.email ?? '').trim().toLowerCase();
    if (!email) return null;
    const name: string = String(credentials?.name ?? '').trim() || email.split('@')[0] || email;
    const existing = await pool.query<{ id: string; email: string; name: string | null }>(
      'SELECT id, email, name FROM users WHERE email = $1',
      [email],
    );
    const row = existing.rows[0];
    if (row) {
      return { id: row.id, email: row.email, name: row.name };
    }
    const inserted = await pool.query<{ id: string }>(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id',
      [email, name],
    );
    const insertedRow = inserted.rows[0];
    if (!insertedRow) return null;
    return { id: insertedRow.id, email, name };
  },
});

const providers: Provider[] = [
  Google({ allowDangerousEmailAccountLinking: true }),
];
if (process.env.NODE_ENV !== 'production') {
  providers.push(devCredentials);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...(authSecret ? { secret: authSecret } : {}),
  adapter: PostgresAdapter(pool),
  session: { strategy: 'jwt' },
  providers,
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.userId === 'string') {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
