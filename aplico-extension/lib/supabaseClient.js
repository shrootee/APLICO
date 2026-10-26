/**
 * Aplico Chrome Extension - Supabase Client Module
 * Reuses existing Aplico Supabase Project, Auth, Storage bucket ('MyResume'), and RLS policies.
 */

const SUPABASE_URL = 'https://kxqzvqcpxkgmqbeidsup.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cXp2cWNweGtnbXFiZWlkc3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NTEwNDQsImV4cCI6MjA5NzAyNzA0NH0.rUYI_KN6wLViPFhWVGTg0ysz8yS9s63KoTncf10jW7U';
const BUCKET_NAME = 'MyResume';

const STORAGE_KEY = 'aplico_extension_session';

/**
 * Reads the stored session from chrome.storage.local
 */
async function getStoredSession() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || null);
    });
  });
}

/**
 * Saves the session into chrome.storage.local
 */
async function saveSession(session) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (_) {}
    return;
  }

  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: session }, () => {
      resolve();
    });
  });
}

/**
 * Clears the session from storage
 */
async function clearSession() {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    return;
  }

  return new Promise((resolve) => {
    chrome.storage.local.remove([STORAGE_KEY], () => {
      resolve();
    });
  });
}

/**
 * Refreshes an expired access token using the stored refresh token
 */
async function refreshAccessToken(refreshToken) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      await clearSession();
      return null;
    }

    const data = await response.json();
    const newSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      user: data.user
    };

    await saveSession(newSession);
    return newSession;
  } catch (err) {
    console.error('[Aplico Extension] Failed to refresh token:', err);
    await clearSession();
    return null;
  }
}

/**
 * Gets a valid authenticated session, auto-refreshing if expired
 */
async function getValidSession() {
  let session = await getStoredSession();
  if (!session || !session.access_token) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  // If token expires in less than 60 seconds, refresh it
  if (session.expires_at && session.expires_at - nowSeconds < 60) {
    if (session.refresh_token) {
      session = await refreshAccessToken(session.refresh_token);
    } else {
      await clearSession();
      return null;
    }
  }

  return session;
}

/**
 * Sign in with email and password using existing Aplico Supabase Auth
 */
async function signIn(email, password) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Please enter both email and password.');
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: cleanEmail,
      password: password
    })
  });

  const data = await response.json();

  if (!response.ok) {
    if (data?.error_code === 'email_not_confirmed' || data?.msg?.includes('Email not confirmed')) {
      throw new Error('Please verify your email address in Aplico before signing in.');
    }
    if (data?.error_description || data?.msg) {
      throw new Error(data.error_description || data.msg);
    }
    throw new Error('Invalid email or password. Please check your credentials.');
  }

  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: data.user
  };

  await saveSession(session);
  return session;
}

/**
 * Sign out
 */
async function signOut() {
  const session = await getStoredSession();
  if (session?.access_token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`
        }
      });
    } catch (_) {}
  }
  await clearSession();
}

/**
 * Fetch the authenticated user's resumes from public.resumes table
 */
async function fetchResumes() {
  const session = await getValidSession();
  if (!session) {
    throw new Error('AUTH_REQUIRED');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/resumes?select=*&order=uploaded_at.desc`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${session.access_token}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      await clearSession();
      throw new Error('AUTH_EXPIRED');
    }
    const errText = await response.text();
    throw new Error(`Failed to load resumes: ${errText}`);
  }

  const resumes = await response.json();
  return resumes || [];
}

/**
 * Downloads a resume file binary as a Blob using authenticated storage access
 */
async function downloadResumeBlob(filePath) {
  const session = await getValidSession();
  if (!session) {
    throw new Error('AUTH_REQUIRED');
  }

  // Use authenticated storage endpoint
  const url = `${SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET_NAME}/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    // Fallback: try create signed URL
    const signResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET_NAME}/${filePath}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiresIn: 120 })
    });

    if (signResponse.ok) {
      const signData = await signResponse.json();
      const signedUrl = signData.signedURL.startsWith('http')
        ? signData.signedURL
        : `${SUPABASE_URL}/storage/v1${signData.signedURL}`;
      const signedFetch = await fetch(signedUrl);
      if (signedFetch.ok) {
        return await signedFetch.blob();
      }
    }

    throw new Error(`Failed to download resume file (HTTP ${response.status})`);
  }

  return await response.blob();
}

/**
 * Converts a Blob to a base64 string so it can be messaged to the content script
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result is "data:<mime>;base64,<base64data>"
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Export as global or module depending on environment
if (typeof window !== 'undefined') {
  window.AplicoSupabase = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    BUCKET_NAME,
    getStoredSession,
    getValidSession,
    signIn,
    signOut,
    fetchResumes,
    downloadResumeBlob,
    blobToBase64
  };
}
