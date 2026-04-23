const BACKEND_URL = 'https://animated-octo-system-ashy.vercel.app/api/session';
const INSTAGRAM_URL = 'https://www.instagram.com/';

function normalizeCookie(cookie) {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    expirationDate: cookie.expirationDate,
    sameSite: cookie.sameSite,
  };
}

async function collectInstagramCookies() {
  const allCookies = await chrome.cookies.getAll({ url: INSTAGRAM_URL });
  const sessionCookie = allCookies.find(c => c.name === 'sessionid');
  const userCookie = allCookies.find(c => c.name === 'ds_user_id');

  if (!sessionCookie) {
    throw new Error('Cookie sessionid introuvable. Connecte-toi d’abord à Instagram dans Chrome.');
  }

  if (!userCookie) {
    throw new Error('Cookie ds_user_id introuvable. La session est peut-être incomplète. Reconnecte-toi à Instagram.');
  }

  return [sessionCookie, userCookie].map(normalizeCookie);
}

async function sendCookiesToBackend(cookies) {
  const response = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cookies }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Instagram Session Bridge installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'CONNECT_INSTAGRAM') {
    return false;
  }

  (async () => {
    try {
      const cookies = await collectInstagramCookies();
      const result = await sendCookiesToBackend(cookies);
      sendResponse({ ok: true, username: result.username ?? null });
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Erreur inconnue' });
    }
  })();

  return true;
});
