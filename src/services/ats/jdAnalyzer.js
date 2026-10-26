/**
 * Job Description Analyzer
 * Extracts structured requirements: required skills, preferred skills, seniority, experience, education.
 * Uses content-hash caching, at most 1 AI call, and robust deterministic rule-based fallback.
 */

import { hashText } from './textSanitizer.js';
import { TAXONOMY } from './skillTaxonomy.js';
import { ATS_CONFIG } from './config.js';

// In-memory cache for analyzed job descriptions (keyed by content hash)
const JD_CACHE = new Map();

/**
 * Analyze a job description text, returning structured requirements.
 * 
 * @param {string} rawJdText - Raw job description text
 * @param {Function} serverAiCaller - Server-side AI caller (optional, falls back to rule-based if null/fails)
 * @returns {Promise<Object>} Structured JD requirements
 */
export async function analyzeJobDescription(rawJdText = '', serverAiCaller = null) {
  const cleaned = (rawJdText || '').trim();
  if (!cleaned) {
    return getEmptyJdAnalysis();
  }

  const jdHash = hashText(cleaned);

  // Check cache first
  if (JD_CACHE.has(jdHash)) {
    return { ...JD_CACHE.get(jdHash), cached: true, hash: jdHash };
  }

  let result = null;

  // Attempt structured AI extraction (at most 1 AI call)
  if (serverAiCaller) {
    try {
      result = await extractJdWithAI(cleaned, serverAiCaller);
    } catch (err) {
      console.warn('[JDAnalyzer] AI analysis failed, switching to rule-based fallback:', err.message);
    }
  }

  // If AI extraction failed or wasn't provided, use deterministic rule-based fallback
  if (!result || !validateJdSchema(result)) {
    result = extractJdRuleBasedFallback(cleaned);
  }

  result.hash = jdHash;

  // Save to cache
  JD_CACHE.set(jdHash, result);

  return result;
}

/**
 * AI-assisted extraction using strict prompt & schema
 */
async function extractJdWithAI(rawJdText, serverAiCaller) {
  const truncatedJd = rawJdText.substring(0, ATS_CONFIG.maxJdLength);

  const systemPrompt = `You are an expert Job Description parser and recruiter. Extract structured technical requirements from the Job Description.

STRICT RULES:
1. ONLY extract skills, technologies, and requirements explicitly mentioned in the text.
2. Separate "requiredSkills" (mandatory, core, must-have) from "preferredSkills" (nice-to-have, bonus, plus, preferred).
3. Identify the "seniority": one of "fresher", "intern", "junior", "mid", "senior", or "lead".
4. Identify minimum experience years as a number (0 if fresher/not specified).
5. Extract education requirement (e.g. "Bachelor's in Computer Science or equivalent") and certification requirements.
6. Return STRICT JSON matching this schema:
{
  "jobTitle": "string",
  "roleType": "string (e.g. Full-time, Internship, Contract)",
  "seniority": "fresher | intern | junior | mid | senior | lead",
  "minExperienceYears": number,
  "requiredSkills": ["skill1", "skill2"],
  "preferredSkills": ["skill3", "skill4"],
  "educationRequirement": "string or null",
  "certificationsRequired": ["cert1"],
  "responsibilities": ["duty1", "duty2"]
}`;

  const userPrompt = `JOB DESCRIPTION TEXT:
${truncatedJd}

Extract structured fields according to strict rules. Return JSON only.`;

  const aiData = await serverAiCaller(systemPrompt, userPrompt);
  if (!aiData) return null;

  return normalizeExtractedJd(aiData);
}

/**
 * Validate AI schema
 */
function validateJdSchema(data) {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.requiredSkills) &&
    Array.isArray(data.preferredSkills) &&
    typeof data.seniority === 'string'
  );
}

/**
 * Clean & normalize extracted JD data
 */
function normalizeExtractedJd(data) {
  const sanitizeList = (arr) => {
    if (!Array.isArray(arr)) return [];
    return [...new Set(arr.map((s) => String(s).trim()).filter((s) => s.length >= 2 && s.length <= 50))];
  };

  const validSeniority = ['fresher', 'intern', 'junior', 'mid', 'senior', 'lead'];
  let seniority = String(data.seniority || '').toLowerCase().trim();
  if (!validSeniority.includes(seniority)) {
    seniority = 'mid';
  }

  return {
    jobTitle: String(data.jobTitle || 'Software Engineer').trim(),
    roleType: String(data.roleType || 'Full-time').trim(),
    seniority,
    minExperienceYears: typeof data.minExperienceYears === 'number' ? Math.max(0, data.minExperienceYears) : 0,
    requiredSkills: sanitizeList(data.requiredSkills),
    preferredSkills: sanitizeList(data.preferredSkills),
    educationRequirement: data.educationRequirement ? String(data.educationRequirement).trim() : null,
    certificationsRequired: sanitizeList(data.certificationsRequired),
    responsibilities: sanitizeList(data.responsibilities).slice(0, 8),
    aiExtracted: true,
  };
}

/**
 * Deterministic Rule-Based Fallback for Job Description Extraction
 */
export function extractJdRuleBasedFallback(rawJdText = '') {
  const lines = rawJdText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const text = rawJdText.toLowerCase();

  // 1. Detect Job Title
  let jobTitle = 'Software Engineer';
  const titleMatch = rawJdText.match(/(?:job title|role|position|title)[:\s]+([^\n\r,.]+)/i);
  if (titleMatch) {
    jobTitle = titleMatch[1].trim();
  } else if (lines.length > 0 && lines[0].length < 60) {
    jobTitle = lines[0].replace(/[.:].*$/, '').trim();
  }

  // 2. Detect Seniority Level
  let seniority = 'mid';
  if (/\b(?:intern|internship|trainee)\b/i.test(text)) {
    seniority = 'intern';
  } else if (/\b(?:fresher|entry[\s-]level|graduate|campus|0-1\s*years?)\b/i.test(text)) {
    seniority = 'fresher';
  } else if (/\b(?:junior|associate|1-3\s*years?)\b/i.test(text)) {
    seniority = 'junior';
  } else if (/\b(?:lead|principal|staff|architect|director|head of)\b/i.test(text)) {
    seniority = 'lead';
  } else if (/\b(?:senior|sr\.?|5\+\s*years?|7\+\s*years?)\b/i.test(text)) {
    seniority = 'senior';
  }

  // 3. Detect Minimum Experience
  let minExperienceYears = 0;
  const expMatch = text.match(/(\d+)\+?\s*(?:-\s*\d+)?\s*years?(?:\s*of)?\s*(?:experience|working)/i);
  if (expMatch) {
    minExperienceYears = parseInt(expMatch[1], 10) || 0;
  }

  // 4. Split JD into "Required" vs "Preferred" sections
  const reqSection = [];
  const prefSection = [];
  let inPref = false;

  for (const line of lines) {
    if (/^(?:preferred|nice\s+to\s+have|bonus|plus|desirable|optional)/i.test(line)) {
      inPref = true;
      continue;
    }
    if (/^(?:required|must\s+have|qualifications|requirements|key\s+skills|responsibilities)/i.test(line)) {
      inPref = false;
      continue;
    }

    if (inPref) {
      prefSection.push(line);
    } else {
      reqSection.push(line);
    }
  }

  const reqText = reqSection.join(' ').toLowerCase();
  const prefText = prefSection.join(' ').toLowerCase();

  const requiredSkills = [];
  const preferredSkills = [];

  const testAlias = (alias, targetStr) => {
    if (alias === 'js') return /(?:^|[^a-zA-Z0-9.-])js(?![a-zA-Z0-9])/i.test(targetStr);
    if (alias === 'c') return /(?:^|[^a-zA-Z0-9+#])c(?![a-zA-Z0-9+#])/i.test(targetStr);
    return new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i').test(targetStr);
  };

  // Match against canonical taxonomy
  for (const entry of TAXONOMY) {
    const isMatchedInReq = entry.aliases.some((alias) => testAlias(alias, reqText));
    const isMatchedInPref = entry.aliases.some((alias) => testAlias(alias, prefText));

    if (isMatchedInReq) {
      requiredSkills.push(entry.canonical);
    } else if (isMatchedInPref) {
      preferredSkills.push(entry.canonical);
    } else {
      // Check full text fallback
      const inFull = entry.aliases.some((alias) => testAlias(alias, text));
      if (inFull) {
        requiredSkills.push(entry.canonical);
      }
    }
  }

  // Education requirement
  let educationRequirement = null;
  const eduMatch = rawJdText.match(/(?:bachelor|master|phd|b\.?s\.?|b\.?tech|m\.?s\.?|degree\s+in\s+computer\s+science)[^\n.]*/i);
  if (eduMatch) {
    educationRequirement = eduMatch[0].trim();
  }

  // Certifications
  const certificationsRequired = [];
  if (/\b(?:aws certified|azure certified|gcp certified|pmp|cissp|scrum master)\b/i.test(text)) {
    const certMatch = text.match(/\b(?:aws certified|azure certified|gcp certified|pmp|cissp|scrum master)[^\n,]*/i);
    if (certMatch) certificationsRequired.push(certMatch[0].trim());
  }

  return {
    jobTitle,
    roleType: seniority === 'intern' ? 'Internship' : 'Full-time',
    seniority,
    minExperienceYears,
    requiredSkills: [...new Set(requiredSkills)],
    preferredSkills: [...new Set(preferredSkills)],
    educationRequirement,
    certificationsRequired,
    responsibilities: [],
    aiExtracted: false,
  };
}

function getEmptyJdAnalysis() {
  return {
    jobTitle: 'General Technical Role',
    roleType: 'Full-time',
    seniority: 'mid',
    minExperienceYears: 0,
    requiredSkills: [],
    preferredSkills: [],
    educationRequirement: null,
    certificationsRequired: [],
    responsibilities: [],
    aiExtracted: false,
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
