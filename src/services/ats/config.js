/**
 * ATS v2 Configuration
 * Configurable weights, runtime modes, and OpenRouter model fallback chains.
 */

export const ATS_CONFIG = {
  // Current operating mode: 'v2' (default), 'shadow', or 'v1'
  mode: 'v2',

  // Base scoring weights for standard roles (total = 1.0)
  baseWeights: {
    requiredSkills: 0.40,
    experience: 0.25,
    projects: 0.20,
    education: 0.10,
    certifications: 0.05,
  },

  // Seniority-adapted scoring weights
  seniorityWeights: {
    fresher: {
      requiredSkills: 0.45,
      projects: 0.35,
      experience: 0.10,
      education: 0.10,
      certifications: 0.00,
    },
    intern: {
      requiredSkills: 0.45,
      projects: 0.35,
      experience: 0.10,
      education: 0.10,
      certifications: 0.00,
    },
    junior: {
      requiredSkills: 0.40,
      projects: 0.25,
      experience: 0.20,
      education: 0.10,
      certifications: 0.05,
    },
    mid: {
      requiredSkills: 0.40,
      experience: 0.25,
      projects: 0.20,
      education: 0.10,
      certifications: 0.05,
    },
    senior: {
      experience: 0.40,
      requiredSkills: 0.35,
      projects: 0.10,
      education: 0.10,
      certifications: 0.05,
    },
    lead: {
      experience: 0.45,
      requiredSkills: 0.30,
      projects: 0.10,
      education: 0.10,
      certifications: 0.05,
    },
  },

  // Credit awards by match type
  matchCredit: {
    exact: 1.0,
    alias: 0.95,
    fuzzy: 0.85,
    equivalentVerified: 0.65,
    unsupported: 0.0,
  },

  // Multiplier for demonstration in projects or experience vs skills list
  demonstratedMultiplier: 1.25,

  // Free OpenRouter model fallback chain
  freeModels: [
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen-2.5-72b-instruct:free',
    'deepseek/deepseek-r1:free',
    'mistralai/mistral-small-24b-instruct-2501:free',
    'google/gemini-2.5-flash',
  ],

  // Rate limiting (per user, per 24 hours)
  dailyRateLimit: 30,

  // Max characters to send for analysis
  maxResumeLength: 15000,
  maxJdLength: 15000,
};
