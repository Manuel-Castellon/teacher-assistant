import { signIn } from '@/auth';

export default function SignInPage() {
  return (
    <main
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1rem',
      }}
    >
      <h1>עוזר המורה למתמטיקה</h1>
      <form
        action={async () => {
          'use server';
          await signIn('google', { redirectTo: '/' });
        }}
      >
        <button type="submit">כניסה עם Google</button>
      </form>
    </main>
  );
}
