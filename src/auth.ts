import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import PostgresAdapter from '@auth/pg-adapter';
import { pool } from '@/lib/db';

const configuredAuthSecret = process.env.AUTH_SECRET?.trim();
const authSecret = configuredAuthSecret
  || (process.env.NODE_ENV === 'development' ? 'teacher-assistant-dev-only-auth-secret' : undefined);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...(authSecret ? { secret: authSecret } : {}),
  adapter: PostgresAdapter(pool),
  providers: [
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
