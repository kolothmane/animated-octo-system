'use client';

import { useEffect, useState } from 'react';

type CheckResult = { checked: boolean; new: string[]; lost: string[] };

type SessionStatus = {
  configured: boolean;
  defaultUsername: string;
};

export default function Home() {
  const [username, setUsername] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [sessionConfigured, setSessionConfigured] = useState(false);

  useEffect(() => {
    void loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const res = await fetch('/api/session');
      const data = (await res.json()) as SessionStatus & { error?: string };
      if (res.ok) {
        setSessionConfigured(data.configured);
        if (data.defaultUsername) setUsername(data.defaultUsername);
      }
    } catch {
      // no-op
    }
  }

  async function handleSaveSession(e: React.FormEvent) {
    e.preventDefault();
    setSavingSession(true);
    setSessionMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId.trim() }),
      });

      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Impossible d’enregistrer la session');
      } else {
        setSessionConfigured(true);
        setSessionId('');
        setSessionMessage(data.message ?? 'Session enregistrée');
      }
    } catch {
      setError('Erreur réseau pendant l’enregistrement de la session');
    } finally {
      setSavingSession(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`/api/check?username=${encodeURIComponent(username.trim())}`);
      const data = (await res.json()) as CheckResult & { error?: string };
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
    <main
      style={{
        fontFamily: 'sans-serif',
        maxWidth: 760,
        margin: '40px auto',
        padding: '0 16px 48px',
        color: '#111',
      }}
    >
      <h1 style={{ marginBottom: 8 }}>Instagram Private Monitor</h1>
      <p style={{ lineHeight: 1.5 }}>
        Cette version fonctionne avec une session Instagram existante. Connecte-toi à Instagram sur ton téléphone,
        récupère la valeur du cookie <code>sessionid</code>, puis colle-la ici pour activer le monitoring.
      </p>

      <section style={{ marginTop: 28, background: '#f6f7f9', borderRadius: 12, padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>1. Activer la session Instagram</h2>
        <p style={{ lineHeight: 1.5 }}>
          Depuis ton téléphone ou ton navigateur connecté à Instagram, récupère la valeur <code>sessionid</code> puis colle-la ci-dessous.
        </p>
        <form onSubmit={handleSaveSession}>
          <textarea
            placeholder="Colle ici la valeur sessionid"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            rows={4}
            disabled={savingSession}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #ccc',
              fontSize: 14,
              resize: 'vertical',
            }}
          />
          <button
            type="submit"
            disabled={savingSession || !sessionId.trim()}
            style={{
              marginTop: 12,
              padding: '12px 18px',
              borderRadius: 8,
              border: 'none',
              background: savingSession ? '#999' : '#111',
              color: '#fff',
              cursor: savingSession ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {savingSession ? 'Enregistrement…' : 'Enregistrer la session'}
          </button>
        </form>
        <p style={{ marginTop: 12, color: sessionConfigured ? 'green' : '#555' }}>
          {sessionMessage ?? (sessionConfigured ? '✅ Session Instagram configurée' : 'Aucune session enregistrée pour le moment')}
        </p>
      </section>

      <section style={{ marginTop: 24, background: '#f6f7f9', borderRadius: 12, padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>2. Lancer une vérification</h2>
        <form onSubmit={handleSubmit}>
          <input
            id="username"
            type="text"
            placeholder="Nom d'utilisateur Instagram à surveiller"
            aria-label="Nom d'utilisateur Instagram"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              padding: '12px 14px',
              fontSize: 16,
              borderRadius: 8,
              border: '1px solid #ccc',
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: 12,
            }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !username.trim() || !sessionConfigured}
            style={{
              display: 'inline-block',
              padding: '12px 18px',
              background: loading || !sessionConfigured ? '#999' : '#0070f3',
              color: '#fff',
              borderRadius: 8,
              border: 'none',
              fontWeight: 600,
              fontSize: 16,
              cursor: loading || !sessionConfigured ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {loading ? 'Vérification…' : 'Lancer la vérification'}
          </button>
        </form>
      </section>

      {error && <p style={{ marginTop: 20, color: '#d00', fontWeight: 600 }}>❌ {error}</p>}

      {result && (
        <div style={{ marginTop: 24, textAlign: 'left', background: '#f5f5f5', borderRadius: 12, padding: 16 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Résultat pour @{username} :</p>
          <p>✅ Nouveaux followers : {result.new.length > 0 ? result.new.join(', ') : '—'}</p>
          <p>❌ Départs : {result.lost.length > 0 ? result.lost.join(', ') : '—'}</p>
        </div>
      )}
    </main>
  );
}
