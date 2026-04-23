'use client';

import { useEffect, useState } from 'react';

type CheckResult = { checked: boolean; new: string[]; lost: string[] };

type ConnectionsData = {
  username: string;
  followers: string[];
  following: string[];
};

type Tab = 'followers' | 'following';
type SessionStatus = 'checking' | 'waiting' | 'connected' | 'error';

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggedUsername, setLoggedUsername] = useState('');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('checking');
  const [sessionMessage, setSessionMessage] = useState(
    'En attente d’une session Instagram active dans Chrome...'
  );
  const [sessionChecking, setSessionChecking] = useState(false);

  const [connections, setConnections] = useState<ConnectionsData | null>(null);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('followers');

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    void refreshSession(false);
  }, []);

  useEffect(() => {
    if (loggedIn) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshSession(true);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [loggedIn]);

  async function refreshSession(showLoader: boolean) {
    if (showLoader) {
      setSessionChecking(true);
    }

    try {
      const res = await fetch('/api/session', { cache: 'no-store' });
      const data = (await res.json()) as {
        configured: boolean;
        username?: string | null;
        defaultUsername?: string;
      };

      if (res.ok && data.configured) {
        setSessionStatus('connected');
        setSessionMessage(
          data.username
            ? `Session Instagram détectée pour @${data.username}. Chargement des connexions...`
            : 'Session Instagram détectée. Chargement des connexions...'
        );
        setLoggedIn(true);
        setLoggedUsername(data.username ?? data.defaultUsername ?? '');
        void loadConnections();
        return;
      }

      setLoggedIn(false);
      setSessionStatus('waiting');
      setSessionMessage(
        'Installe l’extension Chrome, ouvre Instagram, puis clique sur “Connecter mon compte Instagram”.'
      );
    } catch {
      setLoggedIn(false);
      setSessionStatus('error');
      setSessionMessage(
        'Impossible de joindre le backend. Vérifiez votre connexion et que le service est en ligne.'
      );
    } finally {
      if (showLoader) {
        setSessionChecking(false);
      }
    }
  }

  async function loadConnections() {
    setConnectionsLoading(true);
    setConnectionsError(null);
    setConnections(null);
    setSelectedTarget(null);
    setCheckResult(null);

    try {
      const res = await fetch('/api/connections', { cache: 'no-store' });
      const data = (await res.json()) as ConnectionsData & { error?: string };

      if (!res.ok) {
        if (res.status === 401) {
          setLoggedIn(false);
          setSessionStatus('waiting');
          setSessionMessage(
            'La session Instagram n’est plus valide. Récupère une nouvelle session via l’extension.'
          );
          setLoggedUsername('');
        }

        setConnectionsError(data.error ?? 'Erreur lors du chargement');
        return;
      }

      setConnections(data);
      if (data.username) {
        setLoggedUsername(data.username);
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
    setSessionStatus('waiting');
    setSessionMessage(
      'Installe l’extension Chrome, ouvre Instagram, puis clique sur “Connecter mon compte Instagram”.'
    );
    setLoggedUsername('');
    setConnections(null);
    setSelectedTarget(null);
    setCheckResult(null);
    setCheckError(null);
  }

  async function handleTrack() {
    if (!selectedTarget) return;

    setCheckLoading(true);
    setCheckResult(null);
    setCheckError(null);

    try {
      const res = await fetch(`/api/check?username=${encodeURIComponent(selectedTarget)}`, {
        cache: 'no-store',
      });
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
    activeTab === 'followers' ? (connections?.followers ?? []) : (connections?.following ?? []);

  if (!loggedIn) {
    return (
      <div style={loginShellStyle}>
        <div style={loginBlobOneStyle} />
        <div style={loginBlobTwoStyle} />

        <main style={loginGridStyle}>
          <section style={heroStyle}>
            <div style={eyebrowStyle}>Chrome extension bridge</div>
            <h1 style={heroTitleStyle}>Connexion Instagram sans mot de passe</h1>
            <p style={heroTextStyle}>
              L’application récupère la session Instagram active depuis une extension Chrome, puis
              charge automatiquement les abonnés et abonnements sans demander d’identifiants.
            </p>

            <div style={statusCardStyle}>
              <div style={statusHeaderStyle}>
                <span style={statusLabelStyle}>État de la session</span>
                <span style={statusPillStyle(sessionStatus)}>{sessionStatusLabel(sessionStatus)}</span>
              </div>

              <p style={statusMessageStyle}>{sessionMessage}</p>

              <div style={actionRowStyle}>
                <button
                  onClick={() => void refreshSession(true)}
                  disabled={sessionChecking}
                  style={{ ...primaryButtonStyle, opacity: sessionChecking ? 0.7 : 1 }}
                >
                  {sessionChecking ? 'Vérification...' : 'Rafraîchir la détection'}
                </button>
                <span style={endpointHintStyle}>API: {process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/api/session` : 'https://animated-octo-system-ashy.vercel.app/api/session'}</span>
              </div>

              {sessionStatus === 'error' && (
                <p style={statusFootnoteStyle}>
                  Vérifie que le backend Next.js tourne bien en local et que l’extension cible le
                  même port.
                </p>
              )}
            </div>
          </section>

          <aside style={stepsCardStyle}>
            <div style={stepsTitleStyle}>Étapes</div>

            <ol style={stepsListStyle}>
              <li>
                Charge le dossier <strong>chrome-extension/</strong> dans Chrome via le mode
                développeur.
              </li>
              <li>
                Ouvre Instagram dans Chrome et connecte-toi normalement si nécessaire.
              </li>
              <li>
                Clique sur <strong>Connecter mon compte Instagram</strong> dans le popup de
                l’extension.
              </li>
              <li>
                Reviens ici. La page se connecte automatiquement dès que la session est reçue.
              </li>
            </ol>

            <div style={noteCardStyle}>
              L’extension envoie les cookies Instagram actifs au backend local. Le mot de passe
              n’est jamais demandé dans cette interface.
            </div>
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div style={connectedShellStyle}>
      <header style={headerStyle}>
        <div>
          <div style={headerEyebrowStyle}>Session active</div>
          <div style={headerTitleStyle}>Instagram Monitor</div>
        </div>

        <div style={headerActionsStyle}>
          <span style={usernameBadgeStyle}>@{loggedUsername || 'session'}</span>
          <button onClick={handleLogout} style={secondaryButtonStyle}>
            Déconnexion
          </button>
        </div>
      </header>

      <main style={connectedContentStyle}>
        <section style={panelStyle}>
          <div style={tabsRowStyle}>
            {(['followers', 'following'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedTarget(null);
                  setCheckResult(null);
                  setCheckError(null);
                }}
                style={tabButtonStyle(activeTab === tab)}
              >
                {tab === 'followers'
                  ? `Abonnés (${connections?.followers.length ?? '...'})`
                  : `Abonnements (${connections?.following.length ?? '...'})`}
              </button>
            ))}
          </div>

          <div style={toolbarStyle}>
            <button onClick={loadConnections} disabled={connectionsLoading} style={secondaryButtonStyle}>
              {connectionsLoading ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>

          {connectionsError && <p style={errorTextStyle}>{connectionsError}</p>}

          {connectionsLoading && !connections && (
            <div style={skeletonListStyle}>
              {[...Array(6)].map((_, index) => (
                <div key={index} style={skeletonRowStyle}>
                  <div style={skeletonAvatarStyle} />
                  <div style={skeletonLineStyle} />
                </div>
              ))}
            </div>
          )}

          {connections && !connectionsLoading && (
            <ul style={userListStyle}>
              {listToShow.length === 0 && <li style={emptyStateStyle}>Aucun utilisateur trouvé</li>}

              {listToShow.map((username) => (
                <li
                  key={username}
                  onClick={() => {
                    setSelectedTarget(username);
                    setCheckResult(null);
                    setCheckError(null);
                  }}
                  style={userRowStyle(selectedTarget === username)}
                >
                  <div style={avatarStyle}>{username[0]?.toUpperCase() ?? '?'}</div>
                  <span style={usernameStyle(selectedTarget === username)}>@{username}</span>
                  {selectedTarget === username && <span style={selectedCheckStyle}>✓</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {selectedTarget && (
          <section style={trackingCardStyle}>
            <p style={trackingTitleStyle}>
              Cible sélectionnée : <strong>@{selectedTarget}</strong>
            </p>
            <button onClick={handleTrack} disabled={checkLoading} style={primaryButtonStyle}>
              {checkLoading ? 'Vérification en cours...' : `Tracker @${selectedTarget}`}
            </button>

            {checkError && <p style={errorTextStyle}>{checkError}</p>}

            {checkResult && (
              <div style={resultsCardStyle}>
                <p style={resultsTitleStyle}>Résultats</p>
                <p style={resultsLineStyle}>
                  Nouveaux followers: {checkResult.new.length > 0 ? checkResult.new.join(', ') : '—'}
                </p>
                <p style={resultsLineStyle}>
                  Départs: {checkResult.lost.length > 0 ? checkResult.lost.join(', ') : '—'}
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function sessionStatusLabel(status: SessionStatus): string {
  switch (status) {
    case 'checking':
      return 'Vérification';
    case 'connected':
      return 'Connecté';
    case 'error':
      return 'Erreur';
    case 'waiting':
    default:
      return 'En attente';
  }
}

function statusPillStyle(status: SessionStatus): React.CSSProperties {
  const palette: Record<SessionStatus, { background: string; color: string }> = {
    checking: { background: 'rgba(255, 255, 255, 0.16)', color: '#fde68a' },
    waiting: { background: 'rgba(255, 255, 255, 0.16)', color: '#e5e7eb' },
    connected: { background: 'rgba(34, 197, 94, 0.16)', color: '#dcfce7' },
    error: { background: 'rgba(239, 68, 68, 0.16)', color: '#fecaca' },
  };

  return {
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.04,
    background: palette[status].background,
    color: palette[status].color,
  };
}

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '14px 0',
    background: active ? 'rgba(15, 23, 42, 0.04)' : 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontWeight: active ? 700 : 500,
    fontSize: 14,
    color: active ? '#0f172a' : '#64748b',
    borderBottom: active ? '2px solid #0f172a' : '2px solid transparent',
    transition: 'all 0.15s ease',
  };
}

function userRowStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    cursor: 'pointer',
    background: active ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
    borderLeft: active ? '3px solid #2563eb' : '3px solid transparent',
    transition: 'background 0.15s ease',
  };
}

function usernameStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 14,
    fontWeight: active ? 700 : 500,
    color: '#0f172a',
  };
}

const loginShellStyle: React.CSSProperties = {
  minHeight: '100vh',
  position: 'relative',
  overflow: 'hidden',
  background:
    'radial-gradient(circle at top left, rgba(14, 165, 233, 0.28), transparent 30%), radial-gradient(circle at top right, rgba(249, 115, 22, 0.22), transparent 32%), linear-gradient(180deg, #081120 0%, #0f172a 100%)',
  color: '#e2e8f0',
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  padding: 24,
};

const loginBlobOneStyle: React.CSSProperties = {
  position: 'absolute',
  inset: '10% auto auto 8%',
  width: 260,
  height: 260,
  borderRadius: '50%',
  background: 'rgba(56, 189, 248, 0.12)',
  filter: 'blur(8px)',
};

const loginBlobTwoStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 'auto 8% 10% auto',
  width: 320,
  height: 320,
  borderRadius: '50%',
  background: 'rgba(251, 146, 60, 0.10)',
  filter: 'blur(12px)',
};

const loginGridStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  maxWidth: 1120,
  margin: '0 auto',
  minHeight: 'calc(100vh - 48px)',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.9fr)',
  gap: 24,
  alignItems: 'center',
};

const heroStyle: React.CSSProperties = {
  padding: '32px 12px',
};

const eyebrowStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.08)',
  color: '#7dd3fc',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.08,
  textTransform: 'uppercase',
};

const heroTitleStyle: React.CSSProperties = {
  margin: '18px 0 0',
  fontSize: 'clamp(40px, 6vw, 72px)',
  lineHeight: 0.96,
  letterSpacing: '-0.05em',
  color: '#f8fafc',
  maxWidth: 760,
};

const heroTextStyle: React.CSSProperties = {
  margin: '20px 0 0',
  maxWidth: 680,
  fontSize: 18,
  lineHeight: 1.7,
  color: '#cbd5e1',
};

const statusCardStyle: React.CSSProperties = {
  marginTop: 28,
  padding: 24,
  borderRadius: 24,
  background: 'rgba(15, 23, 42, 0.72)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  boxShadow: '0 24px 80px rgba(2, 6, 23, 0.45)',
  backdropFilter: 'blur(14px)',
};

const statusHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
};

const statusLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#cbd5e1',
  textTransform: 'uppercase',
  letterSpacing: 0.08,
};

const statusMessageStyle: React.CSSProperties = {
  margin: '16px 0 0',
  fontSize: 16,
  lineHeight: 1.7,
  color: '#f8fafc',
};

const actionRowStyle: React.CSSProperties = {
  marginTop: 20,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 12,
};

const endpointHintStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#94a3b8',
};

const statusFootnoteStyle: React.CSSProperties = {
  margin: '16px 0 0',
  fontSize: 13,
  lineHeight: 1.6,
  color: '#fca5a5',
};

const stepsCardStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 28,
  background: 'rgba(248, 250, 252, 0.96)',
  color: '#0f172a',
  boxShadow: '0 24px 80px rgba(2, 6, 23, 0.28)',
};

const stepsTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 0.12,
  color: '#0ea5e9',
};

const stepsListStyle: React.CSSProperties = {
  margin: '18px 0 0',
  paddingLeft: 20,
  display: 'grid',
  gap: 14,
  lineHeight: 1.6,
  color: '#334155',
};

const noteCardStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  borderRadius: 18,
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 14,
  lineHeight: 1.65,
};

const connectedShellStyle: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at top left, rgba(14, 165, 233, 0.16), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
};

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  maxWidth: 1120,
  margin: '0 auto',
  padding: '18px 20px',
  background: 'rgba(248, 250, 252, 0.82)',
  backdropFilter: 'blur(14px)',
  borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
};

const headerEyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.12,
  textTransform: 'uppercase',
  color: '#2563eb',
};

const headerTitleStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 22,
  fontWeight: 800,
  color: '#0f172a',
};

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
};

const usernameBadgeStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 999,
  background: 'rgba(37, 99, 235, 0.12)',
  color: '#1d4ed8',
  fontWeight: 700,
  fontSize: 13,
};

const connectedContentStyle: React.CSSProperties = {
  maxWidth: 1120,
  margin: '0 auto',
  padding: '20px 20px 80px',
};

const panelStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.82)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  borderRadius: 28,
  overflow: 'hidden',
  boxShadow: '0 24px 80px rgba(2, 6, 23, 0.12)',
};

const tabsRowStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  padding: 12,
  borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
};

const userListStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  maxHeight: 420,
  overflowY: 'auto',
};

const emptyStateStyle: React.CSSProperties = {
  padding: 28,
  textAlign: 'center',
  color: '#64748b',
  fontSize: 14,
};

const avatarStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #0ea5e9, #2563eb, #7c3aed)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontWeight: 800,
  fontSize: 16,
  flexShrink: 0,
};

const selectedCheckStyle: React.CSSProperties = {
  marginLeft: 'auto',
  color: '#2563eb',
  fontWeight: 800,
  fontSize: 18,
};

const trackingCardStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 24,
  borderRadius: 24,
  background: 'rgba(255, 255, 255, 0.84)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  boxShadow: '0 24px 80px rgba(2, 6, 23, 0.10)',
};

const trackingTitleStyle: React.CSSProperties = {
  margin: '0 0 14px',
  fontSize: 16,
  color: '#0f172a',
};

const resultsCardStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 16,
  borderRadius: 16,
  background: '#f8fafc',
  border: '1px solid rgba(148, 163, 184, 0.18)',
};

const resultsTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 14,
  fontWeight: 800,
  color: '#0f172a',
};

const resultsLineStyle: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: 14,
  color: '#334155',
};

const errorTextStyle: React.CSSProperties = {
  margin: '14px 0 0',
  color: '#dc2626',
  fontSize: 14,
};

const skeletonListStyle: React.CSSProperties = {
  padding: 16,
};

const skeletonRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 12,
};

const skeletonAvatarStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  background: '#e2e8f0',
};

const skeletonLineStyle: React.CSSProperties = {
  height: 14,
  background: '#e2e8f0',
  borderRadius: 999,
  flex: 1,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '12px 18px',
  borderRadius: 14,
  border: 'none',
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
  color: '#fff',
  fontWeight: 800,
  fontSize: 14,
  boxShadow: '0 14px 30px rgba(37, 99, 235, 0.24)',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 14,
  border: '1px solid rgba(148, 163, 184, 0.28)',
  cursor: 'pointer',
  background: 'rgba(255, 255, 255, 0.82)',
  color: '#0f172a',
  fontWeight: 700,
  fontSize: 14,
};
