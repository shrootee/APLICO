/**
 * Vercel Serverless Function: POST /api/ats/ai
 * Proxies AI queries server-side without exposing API keys to the browser.
 */

import { callOpenRouterServer, checkRateLimit } from './openrouter-client.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { systemPrompt, userPrompt, userId } = req.body || {};

    if (!systemPrompt || !userPrompt) {
      return res.status(400).json({ error: 'Missing systemPrompt or userPrompt' });
    }

    // Rate limit check
    const userIdentifier = userId || req.headers['x-forwarded-for'] || 'client-ip';
    const rateCheck = checkRateLimit(userIdentifier);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Daily rate limit reached. Please try again tomorrow.',
        rateLimited: true,
      });
    }

    const aiResult = await callOpenRouterServer(systemPrompt, userPrompt);

    if (!aiResult) {
      return res.status(503).json({
        error: 'AI service temporarily unavailable. Falling back to deterministic engine.',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: aiResult,
    });
  } catch (error) {
    console.error('[API /api/ats/ai Error]:', error);
    // Don't expose internal stack traces
    return res.status(500).json({
      error: 'Internal server error processing AI request',
      data: null,
    });
  }
}
