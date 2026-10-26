/**
 * Deterministic Scoring Engine
 * Pure code scoring algorithm. AI NEVER generates or directly controls the score.
 * Features: Seniority weight adaptation, missing must-have penalties,
 * weight redistribution for inapplicable components, and 0-100 normalization.
 */

import { ATS_CONFIG } from './config.js';

/**
 * Calculate deterministic ATS score
 * 
 * @param {Object} params
 * @param {Array} params.matchedRequiredSkills - List of matched required skill objects
 * @param {Array} params.missingRequiredSkills - List of missing required skill objects
 * @param {Array} params.matchedPreferredSkills - List of matched preferred skill objects
 * @param {Array} params.missingPreferredSkills - List of missing preferred skill objects
 * @param {Object} params.parsedResume - Parsed resume sections & metadata
 * @param {Object} params.jdAnalysis - Structured JD requirements
 * @returns {Object} Comprehensive scoring result
 */
export function calculateAtsScore({
  matchedRequiredSkills = [],
  missingRequiredSkills = [],
  matchedPreferredSkills = [],
  missingPreferredSkills = [],
  parsedResume,
  jdAnalysis,
}) {
  const seniority = (jdAnalysis?.seniority || 'mid').toLowerCase();
  const rawWeights =
    ATS_CONFIG.seniorityWeights[seniority] || ATS_CONFIG.baseWeights;

  // 1. Identify which components are applicable
  const hasCertRequirement = (jdAnalysis?.certificationsRequired || []).length > 0;

  // If certifications are not required by JD, redistribute certification weight
  let adjustedWeights = { ...rawWeights };
  if (!hasCertRequirement) {
    const certWeight = adjustedWeights.certifications;
    adjustedWeights.certifications = 0;
    // Redistribute to required skills and experience/projects
    adjustedWeights.requiredSkills += certWeight * 0.6;
    if (seniority === 'fresher' || seniority === 'intern') {
      adjustedWeights.projects += certWeight * 0.4;
    } else {
      adjustedWeights.experience += certWeight * 0.4;
    }
  }

  // Ensure weights sum to 1.0
  const weightSum =
    adjustedWeights.requiredSkills +
    adjustedWeights.experience +
    adjustedWeights.projects +
    adjustedWeights.education +
    adjustedWeights.certifications;

  const normalizedWeights = {
    requiredSkills: adjustedWeights.requiredSkills / weightSum,
    experience: adjustedWeights.experience / weightSum,
    projects: adjustedWeights.projects / weightSum,
    education: adjustedWeights.education / weightSum,
    certifications: adjustedWeights.certifications / weightSum,
  };

  // 2. Component Score: Required Skills (0 - 100)
  const totalRequired = matchedRequiredSkills.length + missingRequiredSkills.length;
  let requiredSkillsScore;

  if (totalRequired > 0) {
    const totalCreditEarned = matchedRequiredSkills.reduce(
      (sum, item) => sum + (item.credit || 1.0),
      0
    );
    const rawRatio = totalCreditEarned / totalRequired;

    // Meaningful penalty for missing must-have skills
    const missingPenalty = (missingRequiredSkills.length / totalRequired) * 15;
    requiredSkillsScore = Math.max(0, Math.round(rawRatio * 100 - missingPenalty));
  } else {
    // If no required skills specified in JD, default to solid baseline
    requiredSkillsScore = 80;
  }

  // Bonus for preferred skills (up to +10 points added to skills score, capped at 100)
  const totalPreferred = matchedPreferredSkills.length + missingPreferredSkills.length;
  if (totalPreferred > 0 && matchedPreferredSkills.length > 0) {
    const prefRatio = matchedPreferredSkills.length / totalPreferred;
    const prefBonus = Math.round(prefRatio * 10);
    requiredSkillsScore = Math.min(100, requiredSkillsScore + prefBonus);
  }

  // 3. Component Score: Relevant Experience (0 - 100)
  const experienceScore = evaluateExperienceScore(
    parsedResume.sections.experienceText,
    jdAnalysis,
    matchedRequiredSkills,
    seniority
  );

  // 4. Component Score: Relevant Projects (0 - 100)
  const projectsScore = evaluateProjectsScore(
    parsedResume.sections.projectsText,
    jdAnalysis,
    matchedRequiredSkills,
    seniority
  );

  // 5. Component Score: Education (0 - 100)
  const educationScore = evaluateEducationScore(
    parsedResume.sections.educationText,
    jdAnalysis?.educationRequirement
  );

  // 6. Component Score: Certifications (0 - 100)
  const certificationsScore = evaluateCertificationsScore(
    parsedResume.sections.certificationsText,
    jdAnalysis?.certificationsRequired || []
  );

  // 7. Weighted Composite Score Calculation
  const compositeScore =
    requiredSkillsScore * normalizedWeights.requiredSkills +
    experienceScore * normalizedWeights.experience +
    projectsScore * normalizedWeights.projects +
    educationScore * normalizedWeights.education +
    certificationsScore * normalizedWeights.certifications;

  // Normalized final score between 0 and 100
  const atsScore = Math.min(100, Math.max(0, Math.round(compositeScore)));

  // Derive Grade and CGPA
  const { grade, cgpa, hiringProbability } = deriveGradeAndProbability(atsScore);

  return {
    atsScore,
    grade,
    cgpa,
    hiringProbability,
    componentScores: {
      requiredSkills: requiredSkillsScore,
      experience: experienceScore,
      projects: projectsScore,
      education: educationScore,
      certifications: certificationsScore,
    },
    weightsApplied: normalizedWeights,
    seniorityMode: seniority,
  };
}

/**
 * Evaluate Experience Score
 */
function evaluateExperienceScore(expText = '', jdAnalysis, matchedSkills, seniority) {
  if (seniority === 'fresher' || seniority === 'intern') {
    // Freshers are not penalized for lack of corporate experience
    return expText && expText.length > 80 ? 90 : 78;
  }

  if (!expText || expText.length < 50) {
    // Missing experience for mid/senior role
    return seniority === 'senior' || seniority === 'lead' ? 35 : 50;
  }

  let score = 70;

  // Check years of experience mentioned in resume
  const candidateYearsMatch = expText.match(/(\d+)\+?\s*years?/i);
  const candidateYears = candidateYearsMatch ? parseInt(candidateYearsMatch[1], 10) : 1;
  const requiredYears = jdAnalysis?.minExperienceYears || 1;

  if (candidateYears >= requiredYears) {
    score += 15;
  } else {
    score -= Math.min(25, (requiredYears - candidateYears) * 10);
  }

  // Check for demonstrated skills inside experience section
  const demonstratedCount = matchedSkills.filter(
    (s) => s.matched && s.section === 'experience'
  ).length;
  score += Math.min(15, demonstratedCount * 3);

  return Math.min(100, Math.max(30, score));
}

/**
 * Evaluate Projects Score
 */
function evaluateProjectsScore(projectsText = '', jdAnalysis, matchedSkills, seniority) {
  if (!projectsText || projectsText.length < 40) {
    // Missing projects is harsher for freshers/juniors than seniors
    if (seniority === 'fresher' || seniority === 'intern') return 45;
    return 65;
  }

  let score = 70;

  // Demonstrated skills in projects
  const demonstratedInProjects = matchedSkills.filter(
    (s) => s.matched && s.section === 'projects'
  ).length;
  score += Math.min(20, demonstratedInProjects * 4);

  // Indicators of high quality projects (github, deployed, users, api, database)
  const qualityKeywords = ['github', 'deployed', 'users', 'database', 'api', 'performance', 'frontend', 'backend'];
  let kwCount = 0;
  const lowerProjects = projectsText.toLowerCase();
  for (const kw of qualityKeywords) {
    if (lowerProjects.includes(kw)) kwCount++;
  }
  score += Math.min(10, kwCount * 2);

  return Math.min(100, Math.max(40, score));
}

/**
 * Evaluate Education Score
 */
function evaluateEducationScore(eduText = '', requiredEdu = null) {
  if (!eduText || eduText.length < 20) {
    return requiredEdu ? 55 : 75;
  }

  const lowerEdu = eduText.toLowerCase();
  const hasDegree = /\b(?:bachelor|master|b\.?s\.?|b\.?tech|m\.?s\.?|m\.?tech|phd|degree)\b/i.test(lowerEdu);
  const hasCsField = /\b(?:computer science|software|information technology|computer engineering|data science)\b/i.test(lowerEdu);

  let score = 75;
  if (hasDegree) score += 15;
  if (hasCsField) score += 10;

  return Math.min(100, Math.max(50, score));
}

/**
 * Evaluate Certifications Score
 */
function evaluateCertificationsScore(certText = '', requiredCerts = []) {
  if (requiredCerts.length === 0) {
    // If no certifications required, candidate having any certification is a nice bonus
    return certText && certText.length > 20 ? 95 : 85;
  }

  if (!certText || certText.length < 15) {
    return 40;
  }

  const lowerCert = certText.toLowerCase();
  let matches = 0;
  for (const cert of requiredCerts) {
    if (lowerCert.includes(cert.toLowerCase())) matches++;
  }

  const ratio = matches / requiredCerts.length;
  return Math.min(100, Math.max(40, Math.round(ratio * 60 + 40)));
}

/**
 * Derive Grade, CGPA, and Hiring Probability from Score
 */
function deriveGradeAndProbability(score) {
  let grade;
  if (score >= 93) grade = 'A+';
  else if (score >= 86) grade = 'A';
  else if (score >= 80) grade = 'B+';
  else if (score >= 74) grade = 'B';
  else if (score >= 68) grade = 'C+';
  else if (score >= 60) grade = 'C';
  else grade = 'D';

  const cgpa = (score / 10).toFixed(1) + ' / 10';

  let hiringProbability = 'Medium';
  if (score >= 85) {
    hiringProbability = 'Very High';
  } else if (score >= 75) {
    hiringProbability = 'High';
  } else if (score < 65) {
    hiringProbability = 'Low';
  }

  return { grade, cgpa, hiringProbability };
}
