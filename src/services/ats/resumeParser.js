/**
 * Resume Parser & Section Segmenter
 * Robust parsing, scanned PDF detection, and structured section extraction.
 */

export class UnreadableResumeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnreadableResumeError';
  }
}

/**
 * Standard section heading recognition patterns
 */
const SECTION_PATTERNS = {
  skills: [
    /^(?:technical\s+)?skills(?:\s*[:&]|\s+and\s+competencies|\s+summary)?/i,
    /^(?:technologies|tech\s+stack|tools\s+and\s+technologies|core\s+competencies)/i,
    /^programming\s+languages/i,
  ],
  experience: [
    /^(?:work|professional|employment)\s+experience/i,
    /^(?:experience|work\s+history|career\s+history)\s*[:]?/i,
    /^(?:internships|internship\s+experience)/i,
  ],
  projects: [
    /^(?:academic\s+|personal\s+|key\s+)?projects\s*[:]?/i,
    /^(?:technical\s+projects|open\s+source|portfolio)/i,
  ],
  education: [
    /^education(?:\s+and\s+qualifications)?\s*[:]?/i,
    /^(?:academic\s+background|academics|qualifications)/i,
  ],
  certifications: [
    /^(?:licenses\s+and\s+)?certifications\s*[:]?/i,
    /^(?:certificates|professional\s+certifications)/i,
  ],
  achievements: [
    /^(?:honors\s+and\s+)?awards/i,
    /^(?:achievements|accomplishments|publications)/i,
  ],
};

/**
 * Validate readability of extracted resume text.
 * Detects scanned PDFs, OCR failure, or corrupted binary extractions.
 */
export function validateResumeReadability(rawText = '') {
  if (!rawText || typeof rawText !== 'string') {
    throw new UnreadableResumeError(
      'Resume content is completely empty. Please ensure the file contains text.'
    );
  }

  const cleaned = rawText.trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  // Less than 25 words indicates a scanned image, blank document, or failed extraction
  if (words.length < 25) {
    throw new UnreadableResumeError(
      'Could not extract readable text from this document. The file appears to be a scanned image or photo PDF. Please upload a standard text-based PDF or DOCX file.'
    );
  }

  // Check character diversity to detect corrupted binary or non-text extraction
  const alphaChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
  const ratio = alphaChars / Math.max(1, cleaned.length);

  if (ratio < 0.45 && words.length < 80) {
    throw new UnreadableResumeError(
      'Extracted text contains mostly unreadable or corrupted characters. Please upload a clean, text-based PDF or Word document.'
    );
  }

  return true;
}

/**
 * Parse resume text into structured sections and individual sentences/bullets.
 */
export function parseResumeSections(rawText = '') {
  validateResumeReadability(rawText);

  // Normalize text by splitting on newlines and colon section indicators
  let normalizedText = rawText;
  // If the text has inline section headers like "Skills: ... Experience: ...", normalize them to new lines
  normalizedText = normalizedText.replace(/\s+(Skills|Experience|Projects|Education|Certifications):\s+/gi, '\n$1:\n');

  const lines = normalizedText.split(/\r?\n/).map((l) => l.trim());

  const sections = {
    contact: [],
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    achievements: [],
    other: [],
  };

  let currentSection = 'other';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Check if line looks like a section header (short, title-like, e.g. "TECHNICAL SKILLS" or "Skills:")
    const isPotentialHeader =
      line.length < 50 &&
      !line.endsWith(';') &&
      !line.includes(', ') &&
      /^[A-Za-z\s/&:-]+$/i.test(line);

    let detectedSection = null;

    if (isPotentialHeader) {
      for (const [sectionKey, patterns] of Object.entries(SECTION_PATTERNS)) {
        if (patterns.some((p) => p.test(line))) {
          detectedSection = sectionKey;
          break;
        }
      }
    }

    if (detectedSection) {
      currentSection = detectedSection;
    } else {
      sections[currentSection].push(line);
    }
  }

  // Convert line arrays to text blocks and segmented sentences/bullets
  const result = {
    rawText,
    wordCount: rawText.split(/\s+/).filter(Boolean).length,
    sections: {
      skillsText: sections.skills.join('\n'),
      experienceText: sections.experience.join('\n'),
      projectsText: sections.projects.join('\n'),
      educationText: sections.education.join('\n'),
      certificationsText: sections.certifications.join('\n'),
      achievementsText: sections.achievements.join('\n'),
      otherText: sections.other.join('\n'),
    },
    // Extracted individual evidence units (bullet points / sentences)
    evidencePool: extractEvidenceUnits(rawText),
  };

  return result;
}

/**
 * Extract discrete sentences or bullet points with their enclosing section context.
 */
function extractEvidenceUnits(text = '') {
  const lines = text.split(/\r?\n/);
  const units = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 15) continue;

    // Split on bullet points or strong sentence boundaries
    const subClauses = trimmed
      .split(/(?:^[•\-*▪►\d+.]\s*|\.\s+(?=[A-Z]))/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 15);

    if (subClauses.length > 0) {
      for (const clause of subClauses) {
        units.push(clause);
      }
    } else {
      units.push(trimmed);
    }
  }

  return units;
}
