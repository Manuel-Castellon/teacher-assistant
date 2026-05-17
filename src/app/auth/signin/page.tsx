import { signIn } from '@/auth';

const isDev = process.env.NODE_ENV !== 'production';

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
        gap: '1.5rem',
        padding: '2rem',
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

      {isDev && (
        <form
          action={async (formData: FormData) => {
            'use server';
            await signIn('dev-email', {
              email: formData.get('email'),
              name: formData.get('name'),
              redirectTo: '/',
            });
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            border: '1px dashed #999',
            padding: '1rem',
            borderRadius: '6px',
            minWidth: '280px',
          }}
        >
          <strong style={{ fontSize: '0.85rem', color: '#666' }}>
            כניסה זמנית למפתחים (Dev only)
          </strong>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span>אימייל</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue="dev@example.com"
              style={{ direction: 'ltr', padding: '0.4rem' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span>שם תצוגה (לא חובה)</span>
            <input
              name="name"
              type="text"
              autoComplete="name"
              style={{ padding: '0.4rem' }}
            />
          </label>
          <button type="submit">היכנס</button>
        </form>
      )}
    </main>
  );
}
