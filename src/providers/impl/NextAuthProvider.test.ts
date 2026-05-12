import type { Session } from 'next-auth';
import { NextAuthProvider } from './NextAuthProvider';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
const fakeAuth = (s: DeepPartial<Session> | null) => async () => s as Session | null;

describe('NextAuthProvider', () => {
  it('returns null when authFn returns null', async () => {
    const provider = new NextAuthProvider(fakeAuth(null));
    expect(await provider.getSession()).toBeNull();
  });

  it('returns null when session has no email', async () => {
    const provider = new NextAuthProvider(fakeAuth({ expires: '2099-01-01', user: {} }));
    expect(await provider.getSession()).toBeNull();
  });

  it('maps a full session to AuthSession', async () => {
    const provider = new NextAuthProvider(
      fakeAuth({
        expires: '2099-01-01',
        user: { id: 'u-123', email: 'teacher@example.com', name: 'מורה', image: 'https://example.com/photo.jpg' },
      }),
    );
    const session = await provider.getSession();
    expect(session).toEqual({
      user: { id: 'u-123', email: 'teacher@example.com', name: 'מורה', image: 'https://example.com/photo.jpg' },
      expires: '2099-01-01',
    });
  });

  it('falls back to email when user.id is absent', async () => {
    const provider = new NextAuthProvider(
      fakeAuth({ expires: '2099-01-01', user: { email: 'teacher@example.com' } }),
    );
    const session = await provider.getSession();
    expect(session?.user.id).toBe('teacher@example.com');
  });

  it('sets name and image to null when absent', async () => {
    const provider = new NextAuthProvider(
      fakeAuth({ expires: '2099-01-01', user: { id: 'u-1', email: 'a@b.com' } }),
    );
    const session = await provider.getSession();
    expect(session?.user.name).toBeNull();
    expect(session?.user.image).toBeNull();
  });
});
