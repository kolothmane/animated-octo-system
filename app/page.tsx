'use client';

import { useState } from 'react';

export default function Home() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ new: string[]; lost: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`/api/check?username=${encodeURIComponent(username.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Une erreur est survenue');
      } else {
        setResult(data);
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
      <h1>Insta-Private-Monitor</h1>
      <p>Vérifiez les changements de followers d&apos;un compte Instagram privé.</p>
      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
        <input
          id="username"
          type="text"
          placeholder="Nom d'utilisateur Instagram"
          aria-label="Nom d'utilisateur Instagram"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            padding: '10px 16px',
            fontSize: 16,
            borderRadius: 6,
            border: '1px solid #ccc',
            width: '100%',
            boxSizing: 'border-box',
            marginBottom: 12,
          }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !username.trim()}
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: loading ? '#999' : '#0070f3',
            color: '#fff',
            borderRadius: 6,
            border: 'none',
            fontWeight: 600,
            fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {loading ? 'Vérification…' : 'Lancer la vérification'}
        </button>
      </form>

      {error && (
        <p style={{ marginTop: 20, color: '#d00', fontWeight: 600 }}>
          ❌ {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: 24, textAlign: 'left', background: '#f5f5f5', borderRadius: 8, padding: 16 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Résultat pour @{username} :</p>
          <p>✅ Nouveaux followers : {result.new.length > 0 ? result.new.join(', ') : '—'}</p>
          <p>❌ Départs : {result.lost.length > 0 ? result.lost.join(', ') : '—'}</p>
        </div>
      )}
    </main>
  );
}

