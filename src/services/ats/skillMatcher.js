/**
 * Skill Matching Engine
 * Matches JD requirements against resume sections, extracts traceable evidence,
 * and differentiates between demonstrated skills vs simple keyword mentions.
 */

import {
  resolveCanonicalSkill,
  isSafeFuzzyMatch,
  normalizeSkillString,
} from './skillTaxonomy.js';
import { ATS_CONFIG } from './config.js';

/**
 * Match a single skill requirement against parsed resume sections and evidence pool
 */
export function matchSkillAgainstResume(skillRequirement = '', parsedResume, isRequired = true) {
  const normTarget = normalizeSkillString(skillRequirement);
  if (!normTarget) return null;

  const taxonomyEntry = resolveCanonicalSkill(normTarget);
  const canonicalName = taxonomyEntry ? taxonomyEntry.canonical : skillRequirement.trim();
  const searchAliases = taxonomyEntry ? taxonomyEntry.aliases : [normTarget];
  const disallowedFuzzy = taxonomyEntry?.disallowedFuzzy || [];

  const { sections, evidencePool } = parsedResume;

  // Track the best match found across sections
  let bestMatch = {
    canonicalName,
    requirement: skillRequirement,
    matched: false,
    matchType: 'none', // 'exact' | 'alias' | 'fuzzy' | 'equivalent'
    section: 'none', // 'experience' | 'projects' | 'skills' | 'education' | 'certifications' | 'other'
    evidence: '',
    confidence: 0,
    isRequired,
    credit: 0,
  };

  // Section priority for demonstration credit: Experience > Projects > Certifications > Skills > Education > Other > General Text
  const sectionOrder = [
    { name: 'experience', text: sections.experienceText, isDemonstrated: true },
    { name: 'projects', text: sections.projectsText, isDemonstrated: true },
    { name: 'certifications', text: sections.certificationsText, isDemonstrated: false },
    { name: 'skills', text: sections.skillsText, isDemonstrated: false },
    { name: 'education', text: sections.educationText, isDemonstrated: false },
    { name: 'other', text: sections.otherText, isDemonstrated: false },
    { name: 'resume body', text: parsedResume.rawText, isDemonstrated: false },
  ];

  // 1. Check exact canonical & aliases across sections
  for (const sec of sectionOrder) {
    if (!sec.text) continue;
    const lowerSecText = sec.text.toLowerCase();

    for (const alias of searchAliases) {
      let regex;
      if (alias.toLowerCase() === 'js') {
        regex = /(?:^|[^a-zA-Z0-9.-])js(?![a-zA-Z0-9])/i;
      } else if (alias.toLowerCase() === 'c') {
        regex = /(?:^|[^a-zA-Z0-9+#])c(?![a-zA-Z0-9+#])/i;
      } else {
        regex = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i');
      }
      if (regex.test(lowerSecText)) {
        const matchType = alias === normTarget ? 'exact' : 'alias';
        const evidenceSentence = findEvidenceSentence(alias, sec.name, evidencePool, sec.text);

        const baseCredit =
          matchType === 'exact'
            ? ATS_CONFIG.matchCredit.exact
            : ATS_CONFIG.matchCredit.alias;

        const credit = sec.isDemonstrated
          ? Math.min(1.0, baseCredit * ATS_CONFIG.demonstratedMultiplier)
          : baseCredit;

        bestMatch = {
          canonicalName,
          requirement: skillRequirement,
          matched: true,
          matchType,
          section: sec.name,
          evidence: evidenceSentence,
          confidence: matchType === 'exact' ? 95 : 90,
          isRequired,
          credit,
          isDemonstrated: sec.isDemonstrated,
        };

        // Found in a demonstrated section (experience or projects) - highest tier match!
        if (sec.isDemonstrated) {
          return bestMatch;
        }
      }
    }
  }

  // If already matched in skills or other section, return it before trying fuzzy
  if (bestMatch.matched) {
    return bestMatch;
  }

  // 2. Safe Fuzzy Matching across sections
  for (const sec of sectionOrder) {
    if (!sec.text) continue;
    const words = sec.text.split(/[\s,;:|/()\n\r]+/).filter((w) => w.length >= 3);

    for (const word of words) {
      for (const alias of searchAliases) {
        if (isSafeFuzzyMatch(word, alias, disallowedFuzzy)) {
          const evidenceSentence = findEvidenceSentence(word, sec.name, evidencePool, sec.text);
          return {
            canonicalName,
            requirement: skillRequirement,
            matched: true,
            matchType: 'fuzzy',
            section: sec.name,
            evidence: evidenceSentence,
            confidence: 80,
            isRequired,
            credit: sec.isDemonstrated
              ? Math.min(1.0, ATS_CONFIG.matchCredit.fuzzy * 1.1)
              : ATS_CONFIG.matchCredit.fuzzy,
            isDemonstrated: sec.isDemonstrated,
          };
        }
      }
    }
  }

  // Not found deterministically
  return {
    canonicalName,
    requirement: skillRequirement,
    matched: false,
    matchType: 'unsupported',
    section: 'none',
    evidence: '',
    confidence: 0,
    isRequired,
    credit: 0,
    isDemonstrated: false,
  };
}

/**
 * Match a collection of skills (required and preferred) against the resume
 */
export function matchAllSkills(requiredSkills = [], preferredSkills = [], parsedResume) {
  const matchedRequired = [];
  const missingRequired = [];
  const matchedPreferred = [];
  const missingPreferred = [];

  for (const reqSkill of requiredSkills) {
    const match = matchSkillAgainstResume(reqSkill, parsedResume, true);
    if (match && match.matched) {
      matchedRequired.push(match);
    } else {
      missingRequired.push(match || {
        canonicalName: reqSkill,
        requirement: reqSkill,
        matched: false,
        matchType: 'unsupported',
        section: 'none',
        evidence: '',
        confidence: 0,
        isRequired: true,
        credit: 0,
      });
    }
  }

  for (const prefSkill of preferredSkills) {
    const match = matchSkillAgainstResume(prefSkill, parsedResume, false);
    if (match && match.matched) {
      matchedPreferred.push(match);
    } else {
      missingPreferred.push(match || {
        canonicalName: prefSkill,
        requirement: prefSkill,
        matched: false,
        matchType: 'unsupported',
        section: 'none',
        evidence: '',
        confidence: 0,
        isRequired: false,
        credit: 0,
      });
    }
  }

  return {
    matchedRequired,
    missingRequired,
    matchedPreferred,
    missingPreferred,
  };
}

/**
 * Find exact evidence sentence or bullet point from the resume containing the term
 */
function findEvidenceSentence(term, sectionName, evidencePool = [], sectionFallback = '') {
  const lowerTerm = term.toLowerCase();

  // Search discrete evidence pool first
  for (const unit of evidencePool) {
    if (new RegExp(`\\b${escapeRegExp(lowerTerm)}\\b`, 'i').test(unit)) {
      return unit.trim();
    }
  }

  // Fallback to searching the section block
  const lines = sectionFallback.split(/\r?\n/);
  for (const line of lines) {
    if (new RegExp(`\\b${escapeRegExp(lowerTerm)}\\b`, 'i').test(line)) {
      return line.trim();
    }
  }

  return `Mentioned in ${sectionName} section`;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
