export default function Home() {
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.9rem' }}>עוזר המורה למתמטיקה</h1>
      <p style={{ color: '#4b5563', lineHeight: 1.6, marginTop: '0.5rem' }}>
        MVP פנימי ליצירת מערכי שיעור ומבחנים בעברית, עם התאמה לתכנית הלימודים המקומית ויצוא למסמכי Word.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
        <a href="/lesson-plan" style={tileStyle}>
          <strong style={tileTitleStyle}>יצירת מערך שיעור</strong>
          <span style={tileTextStyle}>בקשה חופשית מהמורה, בחירת שכבה ונושא בתכנית, תצוגה מקדימה והורדת DOCX.</span>
        </a>
        <a href="/exam" style={tileStyle}>
          <strong style={tileTitleStyle}>יצירת מבחן</strong>
          <span style={tileTextStyle}>בניית מבחן לפי חלקים ושאלות, אימות מתמטי, פתרון ויצוא.</span>
        </a>
      </div>
    </main>
  );
}

const tileStyle: React.CSSProperties = {
  display: 'block',
  minHeight: 120,
  padding: '1rem',
  border: '1px solid #d7dee8',
  borderRadius: 8,
  color: '#111827',
  textDecoration: 'none',
  background: '#fff',
};

const tileTitleStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '1.1rem',
  marginBottom: '0.5rem',
};

const tileTextStyle: React.CSSProperties = {
  display: 'block',
  color: '#4b5563',
  lineHeight: 1.55,
};
