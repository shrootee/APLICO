/**
 * AI-Assisted Skill Equivalence Verifier
 * Used ONLY when deterministic matching cannot resolve a required skill.
 * Implements strict quote-checking against resume text to reject AI hallucinations.
 */

import { sanitizeResumeText } from './textSanitizer.js';
import { ATS_CONFIG } from './config.js';

/**
 * Verify missing required skills using AI assistance with strict quote verification.
 * 
 * @param {Array} missingRequiredSkills - List of missing required skill match objects
 * @param {string} rawResumeText - Full extracted resume text
 * @param {Function} serverAiCaller - Server-side AI caller function
 * @returns {Promise<Array>} Resolved matches (some may now be verified equivalents)
 */
export async function verifyEquivalencesWithAI(
  missingRequiredSkills = [],
  rawResumeText = '',
  serverAiCaller = null
) {
  if (!missingRequiredSkills || missingRequiredSkills.length === 0 || !serverAiCaller) {
    return missingRequiredSkills;
  }

  // Limit to at most 6 required skills to keep prompt concise
  const skillsToCheck = missingRequiredSkills.slice(0, 6).map((s) => s.requirement);

  const sanitizedResume = sanitizeResumeText(rawResumeText).substring(0, ATS_CONFIG.maxResumeLength);

  const systemPrompt = `You are a strict, skeptical technical recruiter verifying candidate qualifications.
Your task is to determine whether a candidate has demonstrated an equivalent technology or capability for a requested skill.

CRITICAL RULES:
1. ONLY declare an equivalent if the candidate explicitly mentions an established equivalent technology, framework, or capability in their resume.
2. For every equivalent, you MUST supply an "exactQuote": a verbatim, contiguous phrase of at least 4 words copied directly from the candidate's resume.
3. If no equivalent is demonstrated, set "equivalentFound" to false and "exactQuote" to "".
4. Never invent, rephrase, or infer quotes not literally present in the text.
5. Return JSON ONLY matching this exact schema:
{
  "results": [
    {
      "skill": "skill name",
      "equivalentFound": true or false,
      "equivalentSkill": "name of candidate skill or tool",
      "exactQuote": "verbatim quote from resume",
      "explanation": "brief explanation"
    }
  ]
}`;

  const userPrompt = `MISSING REQUIRED SKILLS TO VERIFY:
${JSON.stringify(skillsToCheck)}

CANDIDATE RESUME TEXT:
${sanitizedResume}

Evaluate each missing skill strictly against the resume text. Return JSON only.`;

  try {
    const aiResponse = await serverAiCaller(systemPrompt, userPrompt);
    if (!aiResponse || !Array.isArray(aiResponse.results)) {
      return missingRequiredSkills;
    }

    const lowerRawResume = rawResumeText.toLowerCase();

    // Map through missing skills and update if verified
    return missingRequiredSkills.map((missingSkill) => {
      const matchInAi = aiResponse.results.find(
        (r) => r.skill?.toLowerCase() === missingSkill.requirement?.toLowerCase()
      );

      if (!matchInAi || !matchInAi.equivalentFound) {
        return missingSkill;
      }

      const quote = (matchInAi.exactQuote || '').trim();
      const lowerQuote = quote.toLowerCase();

      // STRICT VERIFICATION: The quote MUST exist verbatim in the resume text!
      const quoteExistsInResume =
        quote.length >= 10 &&
        (lowerRawResume.includes(lowerQuote) ||
          fuzzyQuoteInText(lowerQuote, lowerRawResume));

      if (quoteExistsInResume) {
        // Award verified equivalent partial credit
        return {
          ...missingSkill,
          matched: true,
          matchType: 'equivalent',
          canonicalName: matchInAi.equivalentSkill || missingSkill.canonicalName,
          evidence: quote,
          confidence: 75,
          credit: ATS_CONFIG.matchCredit.equivalentVerified, // Partial credit
          isDemonstrated: true,
          verificationNote: `Verified equivalent: ${matchInAi.explanation || 'Demonstrated equivalent capability'}`,
        };
      } else {
        // AI returned a quote that does not exist in the resume text -> REJECT hallucination!
        console.warn(`[EquivalenceVerifier] Rejected hallucinated AI quote for "${missingSkill.requirement}": "${quote}"`);
        return missingSkill;
      }
    });
  } catch (err) {
    console.warn('[EquivalenceVerifier] AI equivalence verification failed; falling back to deterministic only:', err.message);
    return missingRequiredSkills;
  }
}

/**
 * Secondary check for quotes with slight whitespace/punctuation differences
 */
function fuzzyQuoteInText(quote, text) {
  const normQuote = quote.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const normText = text.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ');
  return normQuote.length >= 15 && normText.includes(normQuote);
}
