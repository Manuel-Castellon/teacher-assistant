import type { Session } from 'next-auth';
import type { IAuthProvider, AuthSession } from '../interfaces/IAuthProvider';

type AuthFn = () => Promise<Session | null>;

export class NextAuthProvider implements IAuthProvider {
  constructor(private readonly authFn: AuthFn) {}

  async getSession(): Promise<AuthSession | null> {
    const session = await this.authFn();
    const email = session?.user?.email;
    if (!email) return null;
    return {
      user: {
        id: session!.user!.id ?? email,
        email,
        name: session!.user!.name ?? null,
        image: session!.user!.image ?? null,
      },
      expires: session!.expires,
    };
  }
}
