/**
 * Confidence Calculator
 * Evaluates the reliability and evidentiary backing of the ATS evaluation.
 * Calculated strictly by deterministic code, not invented by AI.
 */

/**
 * Calculate confidence level and diagnostic factors
 * 
 * @param {Object} params
 * @param {Object} params.parsedResume - Parsed resume sections & metadata
 * @param {Object} params.jdAnalysis - Structured JD analysis
 * @param {Array} params.matchedRequiredSkills - Matched required skills
 * @param {Array} params.missingRequiredSkills - Missing required skills
 * @param {boolean} params.usedAiFallback - Whether JD or equivalence verification used fallback
 * @returns {Object} { level: 'High' | 'Medium' | 'Low', score: number, reasons: Array<string> }
 */
export function calculateMatchConfidence({
  parsedResume,
  jdAnalysis,
  matchedRequiredSkills = [],
  usedAiFallback = false,
}) {
  let confidenceScore = 100;
  const reasons = [];

  // 1. Resume Parsing Quality
  const wordCount = parsedResume?.wordCount || 0;
  if (wordCount < 150) {
    confidenceScore -= 30;
    reasons.push('Resume word count is low (under 150 words), limiting evidentiary depth.');
  } else if (wordCount < 250) {
    confidenceScore -= 15;
    reasons.push('Resume is relatively brief.');
  }

  // Section completeness
  const sections = parsedResume?.sections || {};
  let presentSections = 0;
  if (sections.skillsText) presentSections++;
  if (sections.experienceText) presentSections++;
  if (sections.projectsText) presentSections++;
  if (sections.educationText) presentSections++;

  if (presentSections < 3) {
    confidenceScore -= 20;
    reasons.push('Resume is missing standard section headings (e.g. Experience or Projects).');
  }

  // 2. Job Description Quality
  const totalSkillsInJd =
    (jdAnalysis?.requiredSkills || []).length +
    (jdAnalysis?.preferredSkills || []).length;

  if (totalSkillsInJd === 0) {
    confidenceScore -= 35;
    reasons.push('Job description did not specify technical skills.');
  } else if (totalSkillsInJd < 3) {
    confidenceScore -= 15;
    reasons.push('Job description has very few stated skill requirements.');
  }

  // 3. Match Quality & Evidentiary Backing
  const allMatched = matchedRequiredSkills;
  const fuzzyOrEquivCount = allMatched.filter(
    (m) => m.matchType === 'fuzzy' || m.matchType === 'equivalent'
  ).length;

  if (allMatched.length > 0) {
    const fuzzyRatio = fuzzyOrEquivCount / allMatched.length;
    if (fuzzyRatio > 0.4) {
      confidenceScore -= 15;
      reasons.push('High proportion of matches rely on fuzzy or equivalent interpretations.');
    }
  }

  // 4. Fallback Usage
  if (usedAiFallback) {
    confidenceScore -= 10;
    reasons.push('Deterministic fallback parsing was used.');
  }

  // Normalize confidence score
  const finalScore = Math.max(0, Math.min(100, confidenceScore));

  let level = 'High';
  if (finalScore < 60) {
    level = 'Low';
  } else if (finalScore < 80) {
    level = 'Medium';
  }

  if (reasons.length === 0) {
    reasons.push('Resume contains comprehensive text with direct verifiable evidence matching target job requirements.');
  }

  return {
    level,
    score: finalScore,
    reasons,
  };
}
