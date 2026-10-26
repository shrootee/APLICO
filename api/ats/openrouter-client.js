/**
 * Server-Side OpenRouter Integration for ATS v2
 * Keeps API keys strictly on the server.
 * Implements free models fallback chain, server-side caching, retries, and rate limiting.
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Configurable free models fallback chain
const FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'deepseek/deepseek-r1:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
  'google/gemini-2.5-flash',
];

// In-memory server-side cache for AI completions
const SERVER_CACHE = new Map();

// In-memory rate limiting map: userId/ip -> { count, resetAt }
const RATE_LIMIT_MAP = new Map();
const DAILY_LIMIT = 40;

/**
 * Check and record user rate limit
 */
export function checkRateLimit(identifier = 'anon') {
  const now = Date.now();
  const userRecord = RATE_LIMIT_MAP.get(identifier);

  if (!userRecord || now > userRecord.resetAt) {
    RATE_LIMIT_MAP.set(identifier, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return { allowed: true, remaining: DAILY_LIMIT - 1 };
  }

  if (userRecord.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0, resetInMs: userRecord.resetAt - now };
  }

  userRecord.count += 1;
  return { allowed: true, remaining: DAILY_LIMIT - userRecord.count };
}

/**
 * Server-Side Call to OpenRouter with automatic fallback and retry
 */
export async function callOpenRouterServer(systemPrompt, userPrompt, apiKeyOverride = null) {
  const apiKey =
    apiKeyOverride ||
    process.env.OPENROUTER_API_KEY ||
    process.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey || apiKey.includes('YOUR_KEY')) {
    console.warn('[Server OpenRouter] No valid OPENROUTER_API_KEY configured on server.');
    return null;
  }

  // Fast cache check
  const cacheKey = fastHash(`${systemPrompt}|${userPrompt}`);
  if (SERVER_CACHE.has(cacheKey)) {
    return SERVER_CACHE.get(cacheKey);
  }

  let lastError = null;

  for (const model of FREE_MODELS) {
    // Attempt with retry (up to 2 tries per model)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://aplico.app',
            'X-Title': 'Aplico ATS v2 Server',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1, // low randomness for deterministic consistency
            max_tokens: 3000,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[Server OpenRouter] Model ${model} returned HTTP ${response.status}`);
          lastError = new Error(`HTTP ${response.status}`);
          break; // Switch to next model
        }

        const data = await response.json();
        const contentStr = data.choices?.[0]?.message?.content;

        if (!contentStr) {
          throw new Error('Empty response from model');
        }

        const cleanJson = contentStr.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        // Cache successful response
        SERVER_CACHE.set(cacheKey, parsed);
        return parsed;
      } catch (err) {
        lastError = err;
        if (attempt === 1) {
          // Brief pause before retry
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
    }
  }

  console.warn('[Server OpenRouter] All free models failed or timed out:', lastError?.message);
  return null;
}

function fastHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
