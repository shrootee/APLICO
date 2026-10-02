/**
 * AI Job Description Extraction Service
 * Powered by Google Gemini 2.5 Flash via OpenRouter
 * Extracts strictly factual structured role information without hallucinating outside skills.
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = 'google/gemini-2.5-flash';

/**
 * Extracts structured application details from raw job description text using Gemini 2.5 Flash.
 * @param {string} rawJd - The raw job description text pasted by the user.
 * @param {boolean} alreadyApplied - User selection (Yes / No) on whether they have already applied.
 * @returns {Promise<object>} Extracted structured data for the editable review form.
 */
export async function extractDataFromJdWithGemini(rawJd, alreadyApplied = false) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  const systemPrompt = `You are an extremely strict, factual Job Description information extractor. Your task is to extract structured fields from the provided Job Description (JD).

STRICT EXTRACTION RULES:
1. Extract ONLY information explicitly present in the supplied JD text.
2. NEVER use outside knowledge.
3. NEVER infer skills from the job title (e.g., do NOT add React, JavaScript, TypeScript, or GraphQL unless those exact words literally appear in the JD text).
4. NEVER invent missing information.
5. NEVER use information from previous JDs or previous requests.
6. If a piece of information is NOT present in the JD, return null for string fields, or an empty array [] for list fields. Do NOT guess default values!
7. Extract all relevant skills explicitly mentioned in the JD. Keep requiredSkills (mandatory/essential) and preferredSkills (nice-to-have/bonus) separate based strictly on JD wording.
8. Preserve the actual wording and meaning of the JD where appropriate.

CRITICAL EXAMPLE:
If the JD says: "Skills: Flutter", then requiredSkills MUST BE ["Flutter"] and preferredSkills MUST BE [].
Do NOT add JavaScript, React, TypeScript, GraphQL, HTML, CSS or any unmentioned technology!

RETURN A STRICT JSON OBJECT ONLY MATCHING THIS SCHEMA:
{
  "company": "string or null",
  "role": "string or null",
  "location": "string or null",
  "jobType": "Full-time | Part-time | Internship | Contract | Remote | Hybrid or null",
  "salary": "string or null",
  "applicationUrl": "string or null",
  "applicationDeadline": "string or null",
  "requiredSkills": ["array of strings explicitly in JD"],
  "preferredSkills": ["array of strings explicitly in JD"],
  "experienceRequirement": "string or null",
  "educationRequirement": "string or null",
  "keywords": ["array of key terms explicitly in JD"],
  "responsibilities": ["array of duty strings explicitly in JD"],
  "qualifications": ["array of qualification strings explicitly in JD"]
}`;

  const userPrompt = `JOB DESCRIPTION TEXT TO EXTRACT:
---
${rawJd}
---

Extract structured fields according to strict rules. Return JSON only.`;

  // ----------------------------------------------------------------------
  // DEBUG LOG 1: Exact JD sent to Gemini
  // ----------------------------------------------------------------------
  console.log('[DEBUG 1] Exact JD sent to Gemini:\n', rawJd);

  // ----------------------------------------------------------------------
  // DEBUG LOG 2: Exact prompt sent to Gemini
  // ----------------------------------------------------------------------
  console.log('[DEBUG 2] Exact prompt sent to Gemini:\n', {
    systemPrompt,
    userPrompt,
  });

  let geminiExtractedJson = null;

  if (apiKey && !apiKey.includes('YOUR_KEY')) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
          'X-Title': 'Aplico AI JD Extractor',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 2500,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawContentStr = data.choices?.[0]?.message?.content || '';

        // ----------------------------------------------------------------------
        // DEBUG LOG 3: Raw Gemini response
        // ----------------------------------------------------------------------
        console.log('[DEBUG 3] Raw Gemini response:\n', rawContentStr);

        const cleanJsonStr = rawContentStr.replace(/```json\n?|\n?```/g, '').trim();
        geminiExtractedJson = JSON.parse(cleanJsonStr);

        // ----------------------------------------------------------------------
        // DEBUG LOG 4: Final parsed JSON
        // ----------------------------------------------------------------------
        console.log('[DEBUG 4] Final parsed JSON:\n', geminiExtractedJson);
      } else {
        const errText = await response.text();
        console.warn(`[OpenRouter AI] Gemini 2.5 Flash returned status ${response.status}:`, errText);
      }
    } catch (err) {
      console.error('[OpenRouter AI] Error querying Gemini 2.5 Flash:', err);
    }
  } else {
    console.warn('[OpenRouter AI] No valid VITE_OPENROUTER_API_KEY found. Falling back to local regex parser.');
  }

  // If Gemini extraction succeeded, validate & format Gemini results (NO LOCAL MERGING)
  if (geminiExtractedJson) {
    const validatedData = validateGeminiOutput(geminiExtractedJson, rawJd, alreadyApplied);

    // ----------------------------------------------------------------------
    // DEBUG LOG 5: Final data sent to UI
    // ----------------------------------------------------------------------
    console.log('[DEBUG 5] Final data sent to UI:\n', validatedData);

    return validatedData;
  }

  // Factual Local Regex Parser (No hardcoded skill hallucination)
  console.info('[JD Extraction] Using factual local regex extraction.');
  const fallbackData = extractDataFactualLocal(rawJd, alreadyApplied);

  console.log('[DEBUG 5] Final data sent to UI (Local Factual Fallback):\n', fallbackData);
  return fallbackData;
}

/**
 * Validates Gemini 2.5 Flash JSON output and attaches non-AI system/user fields.
 */
function validateGeminiOutput(aiJson, rawJd, alreadyApplied) {
  const sanitizeList = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((item) => String(item).trim()).filter(Boolean);
  };

  const sanitizeString = (val, fallback = '') => {
    if (!val || val === 'null' || val === 'N/A' || val === 'undefined') return fallback;
    return String(val).trim();
  };

  // System/User fields (NOT AI extracted)
  const userSystemFields = {
    alreadyApplied: Boolean(alreadyApplied),
    status: alreadyApplied ? 'Applied' : 'Saved',
    source: 'manual',
    resumeUsed: 'Standard_Resume_2026.pdf',
    appliedDate: new Date().toISOString().split('T')[0],
    rawJd: rawJd,
  };

  // AI-extracted fields validated against schema
  const aiExtractedFields = {
    company: sanitizeString(aiJson.company, 'Company Name'),
    role: sanitizeString(aiJson.role, 'Job Role'),
    location: sanitizeString(aiJson.location, 'Not specified'),
    jobType: sanitizeString(aiJson.jobType, 'Full-time'),
    salary: sanitizeString(aiJson.salary, ''),
    applicationUrl: sanitizeString(aiJson.applicationUrl, ''),
    applicationDeadline: sanitizeString(aiJson.applicationDeadline, ''),
    requiredSkills: sanitizeList(aiJson.requiredSkills),
    preferredSkills: sanitizeList(aiJson.preferredSkills),
    experienceRequirement: sanitizeString(aiJson.experienceRequirement, 'Not specified'),
    educationRequirement: sanitizeString(aiJson.educationRequirement, 'Not specified'),
    keywords: sanitizeList(aiJson.keywords),
    responsibilities: sanitizeList(aiJson.responsibilities),
    qualifications: sanitizeList(aiJson.qualifications),
  };

  return {
    ...aiExtractedFields,
    ...userSystemFields,
  };
}

/**
 * Factual Local Parser (Strictly extracts words found in JD without hardcoded fake skills)
 */
function extractDataFactualLocal(rawJd, alreadyApplied) {
  const lines = rawJd.split('\n').map((l) => l.trim()).filter(Boolean);
  const fullText = rawJd;

  // Extract Company
  let company = '';
  const compMatch = fullText.match(/(?:company|organization|at|about)[:\s]+([A-Za-z0-9\s&.-]{1,30})/i);
  if (compMatch) company = compMatch[1].trim();

  // Extract Role
  let role = '';
  const roleMatch = fullText.match(/(?:role|position|title|job title)[:\s]+([^\n\r,]+)/i);
  if (roleMatch) role = roleMatch[1].trim();

  // Extract Location
  let location = '';
  const locMatch = fullText.match(/(?:location|based in|office)[:\s]+([^\n\r.]+)/i);
  if (locMatch) location = locMatch[1].trim();

  // Extract Salary
  let salary = '';
  const salMatch = fullText.match(/(?:salary|comp|compensation|pay|stipend)[:\s]*([^\n\r.]+)|(?:[₹\$][\d,]+(?:\s*-\s*[₹\$]?[\d,]+)?(?:\s*[a-zA-Z\/]+)?)/i);
  if (salMatch) salary = salMatch[0].trim();

  // Extract Experience
  let exp = '';
  const expMatch = fullText.match(/\d+\+?\s*(?:-\s*\d+)?\s*years?\s*(?:of\s*)?(?:experience|working)?/i);
  if (expMatch) exp = expMatch[0].trim();

  // Strictly extract explicitly mentioned skills
  const knownSkillList = [
    'Flutter', 'React', 'React Native', 'Swift', 'Kotlin', 'Android', 'iOS', 'Dart',
    'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'C++', 'SQL', 'PostgreSQL',
    'MongoDB', 'Docker', 'AWS', 'Figma', 'Git', 'GraphQL', 'REST API'
  ];

  const foundSkills = knownSkillList.filter((s) =>
    new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(fullText)
  );

  return {
    company: company || (lines[0] ? lines[0].slice(0, 30) : 'Company Name'),
    role: role || (lines[1] ? lines[1].slice(0, 30) : 'Job Role'),
    location: location || (/remote/i.test(fullText) ? 'Remote' : 'Gurugram'),
    jobType: /intern/i.test(fullText) ? 'Internship' : 'Full-time',
    salary: salary || '',
    applicationUrl: '',
    applicationDeadline: '',
    requiredSkills: foundSkills, // ONLY skills found in text
    preferredSkills: [],
    experienceRequirement: exp || 'Not specified',
    educationRequirement: 'Not specified',
    keywords: foundSkills,
    responsibilities: [],
    qualifications: [],
    alreadyApplied: Boolean(alreadyApplied),
    status: alreadyApplied ? 'Applied' : 'Saved',
    source: 'manual',
    resumeUsed: 'Standard_Resume_2026.pdf',
    appliedDate: new Date().toISOString().split('T')[0],
    rawJd: rawJd,
  };
}
