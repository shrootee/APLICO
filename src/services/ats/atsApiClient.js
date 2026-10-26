/**
 * Client-Side API Helper for ATS v2
 * Sends requests to the secure server-side endpoint (/api/ats/ai).
 * The OpenRouter API key is NEVER exposed to the browser or network tab.
 */

export async function callServerAi(systemPrompt, userPrompt, userId = null) {
  try {
    const response = await fetch('/api/ats/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        userId,
      }),
    });

    if (!response.ok) {
      console.warn(`[ATS Client] Server AI returned status ${response.status}`);
      return null;
    }

    const payload = await response.json();
    return payload?.data || null;
  } catch (err) {
    console.warn('[ATS Client] Could not reach server AI endpoint; falling back gracefully to deterministic engine:', err.message);
    return null;
  }
}
