'use client';

import { useEffect, useState } from 'react';

type CheckResult = { checked: boolean; new: string[]; lost: string[] };

type ConnectionsData = {
  username: string;
  followers: string[];
  following: string[];
};

type Tab = 'followers' | 'following';

export default function Home() {
  // Auth state
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggedUsername, setLoggedUsername] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Connections state
  const [connections, setConnections] = useState<ConnectionsData | null>(null);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('followers');

  // Tracking state
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    void checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await fetch('/api/session');
      const data = (await res.json()) as { configured: boolean; defaultUsername?: string };
      if (res.ok && data.configured) {
        setLoggedIn(true);
        if (data.defaultUsername) setLoggedUsername(data.defaultUsername);
        void loadConnections();
      }
    } catch {
      // no-op
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) return;
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
      });
      const data = (await res.json()) as { username?: string; error?: string };
      if (!res.ok) {
        setLoginError(data.error ?? 'Erreur de connexion');
      } else {
        setLoggedUsername(data.username ?? loginUsername.trim());
        setLoggedIn(true);
        void loadConnections();
      }
    } catch {
      setLoginError('Erreur réseau');
    } finally {
      setLoginLoading(false);
    }
  }

  async function loadConnections() {
    setConnectionsLoading(true);
    setConnectionsError(null);
    setConnections(null);
    setSelectedTarget(null);
    setCheckResult(null);
    try {
      const res = await fetch('/api/connections');
      const data = (await res.json()) as ConnectionsData & { error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          setLoggedIn(false);
          setLoggedUsername('');
        }
        setConnectionsError(data.error ?? 'Erreur lors du chargement');
      } else {
        setConnections(data);
        if (data.username) setLoggedUsername(data.username);
      }
    } catch {
      setConnectionsError('Erreur réseau');
    } finally {
      setConnectionsLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // no-op
    }
    setLoggedIn(false);
    setLoggedUsername('');
    setConnections(null);
    setSelectedTarget(null);
    setCheckResult(null);
    setCheckError(null);
    setLoginUsername('');
    setLoginPassword('');
    setLoginError(null);
  }

  async function handleTrack() {
    if (!selectedTarget) return;
    setCheckLoading(true);
    setCheckResult(null);
    setCheckError(null);
    try {
      const res = await fetch(`/api/check?username=${encodeURIComponent(selectedTarget)}`);
      const data = (await res.json()) as CheckResult & { error?: string };
      if (!res.ok) {
        setCheckError(data.error ?? 'Une erreur est survenue');
      } else {
        setCheckResult(data);
      }
    } catch {
      setCheckError('Erreur réseau');
    } finally {
      setCheckLoading(false);
    }
  }

  const listToShow =
    activeTab === 'followers'
      ? (connections?.followers ?? [])
      : (connections?.following ?? []);

  /* ─────────────── LOGIN PAGE ─────────────── */
  if (!loggedIn) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          padding: 16,
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '40px 32px',
            width: '100%',
            maxWidth: 380,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          {/* Instagram wordmark */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: 32,
              fontFamily: '"Billabong", "Dancing Script", cursive',
              fontSize: 48,
              letterSpacing: -1,
              background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Instagram
          </div>

          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Nom d'utilisateur"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              disabled={loginLoading}
              autoComplete="username"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              disabled={loginLoading}
              autoComplete="current-password"
              style={{ ...inputStyle, marginTop: 8 }}
            />
            {loginError && (
              <p style={{ color: '#ed4956', fontSize: 13, margin: '8px 0 0', textAlign: 'center' }}>
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loginLoading || !loginUsername.trim() || !loginPassword.trim()}
              style={{
                ...btnPrimary,
                marginTop: 16,
                opacity:
                  loginLoading || !loginUsername.trim() || !loginPassword.trim() ? 0.6 : 1,
              }}
            >
              {loginLoading ? 'Connexion\u2026' : 'Se connecter'}
            </button>
          </form>

          <p
            style={{
              fontSize: 12,
              color: '#8e8e8e',
              textAlign: 'center',
              marginTop: 20,
              lineHeight: 1.5,
            }}
          >
            Vos identifiants sont utilisés uniquement pour accéder à votre liste de contacts Instagram.
          </p>
        </div>
      </div>
    );
  }

  /* ─────────────── CONNECTED PAGE ─────────────── */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fafafa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid #dbdbdb',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 600,
          margin: '0 auto',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 18, color: '#262626' }}>
          Instagram Monitor
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: '#262626' }}>@{loggedUsername}</span>
          <button onClick={handleLogout} style={btnSecondary}>
            Déconnexion
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 16px 80px' }}>
        {/* Connections section */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #dbdbdb',
            overflow: 'hidden',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #dbdbdb' }}>
            {(['followers', 'following'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedTarget(null);
                  setCheckResult(null);
                  setCheckError(null);
                }}
                style={{
                  flex: 1,
                  padding: '14px 0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? 700 : 400,
                  fontSize: 14,
                  color: activeTab === tab ? '#262626' : '#8e8e8e',
                  borderBottom: activeTab === tab ? '2px solid #262626' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {tab === 'followers'
                  ? `Abonnés (${connections?.followers.length ?? '\u2026'})`
                  : `Abonnements (${connections?.following.length ?? '\u2026'})`}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid #dbdbdb',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={loadConnections}
              disabled={connectionsLoading}
              style={{ ...btnSecondary, fontSize: 12 }}
            >
              {connectionsLoading ? 'Chargement\u2026' : '\u21bb Actualiser'}
            </button>
          </div>

          {/* Error */}
          {connectionsError && (
            <p style={{ padding: 16, color: '#ed4956', fontSize: 14, textAlign: 'center' }}>
              {'\u274c'} {connectionsError}
            </p>
          )}

          {/* Loading skeleton */}
          {connectionsLoading && !connections && (
            <div style={{ padding: 16 }}>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#efefef',
                    }}
                  />
                  <div
                    style={{ height: 14, background: '#efefef', borderRadius: 6, flex: 1 }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* User list */}
          {connections && !connectionsLoading && (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                maxHeight: 400,
                overflowY: 'auto',
              }}
            >
              {listToShow.length === 0 && (
                <li
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    color: '#8e8e8e',
                    fontSize: 14,
                  }}
                >
                  Aucun utilisateur trouvé
                </li>
              )}
              {listToShow.map((username) => (
                <li
                  key={username}
                  onClick={() => {
                    setSelectedTarget(username);
                    setCheckResult(null);
                    setCheckError(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: selectedTarget === username ? '#eff6ff' : 'transparent',
                    borderLeft:
                      selectedTarget === username
                        ? '3px solid #0095f6'
                        : '3px solid transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  {/* Avatar placeholder */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {username[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: selectedTarget === username ? 700 : 400,
                      color: '#262626',
                    }}
                  >
                    @{username}
                  </span>
                  {selectedTarget === username && (
                    <span style={{ marginLeft: 'auto', fontSize: 18 }}>{'\u2713'}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Track section */}
        {selectedTarget && (
          <div
            style={{
              marginTop: 16,
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #dbdbdb',
              padding: 20,
            }}
          >
            <p style={{ margin: '0 0 12px', fontSize: 15, color: '#262626' }}>
              Cible sélectionnée : <strong>@{selectedTarget}</strong>
            </p>
            <button
              onClick={handleTrack}
              disabled={checkLoading}
              style={{ ...btnPrimary, opacity: checkLoading ? 0.6 : 1 }}
            >
              {checkLoading
                ? 'Vérification en cours\u2026'
                : `Tracker @${selectedTarget}`}
            </button>

            {checkError && (
              <p style={{ marginTop: 12, color: '#ed4956', fontSize: 14 }}>
                {'\u274c'} {checkError}
              </p>
            )}

            {checkResult && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: '#fafafa',
                  borderRadius: 8,
                  border: '1px solid #dbdbdb',
                }}
              >
                <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 14 }}>
                  Résultats :
                </p>
                <p style={{ margin: '0 0 4px', fontSize: 14, color: '#262626' }}>
                  {'\u2705'} Nouveaux followers :{' '}
                  {checkResult.new.length > 0 ? checkResult.new.join(', ') : '—'}
                </p>
                <p style={{ margin: 0, fontSize: 14, color: '#262626' }}>
                  {'\u274c'} Départs :{' '}
                  {checkResult.lost.length > 0 ? checkResult.lost.join(', ') : '—'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: 14,
  borderRadius: 8,
  border: '1px solid #dbdbdb',
  background: '#fafafa',
  boxSizing: 'border-box',
  outline: 'none',
  color: '#262626',
};

const btnPrimary: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '12px 0',
  background: '#0095f6',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  textAlign: 'center',
};

const btnSecondary: React.CSSProperties = {
  padding: '6px 14px',
  background: 'none',
  color: '#0095f6',
  border: '1px solid #0095f6',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};
