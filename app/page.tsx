export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
      <h1>Insta-Private-Monitor</h1>
      <p>Monitoring Instagram follower changes and sending Telegram notifications.</p>
      <a
        href="/api/check"
        style={{
          display: 'inline-block',
          marginTop: 24,
          padding: '12px 28px',
          background: '#0070f3',
          color: '#fff',
          borderRadius: 6,
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Trigger Check Now
      </a>
    </main>
  );
}
