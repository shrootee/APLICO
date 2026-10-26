import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { runAtsAnalysis, generateLegacyReportFallback } from '../../src/services/ats/atsEngine.js';
import { parseResumeSections, UnreadableResumeError, validateResumeReadability } from '../../src/services/ats/resumeParser.js';
import { isSafeFuzzyMatch } from '../../src/services/ats/skillTaxonomy.js';
import { matchSkillAgainstResume, matchAllSkills } from '../../src/services/ats/skillMatcher.js';
import { calculateAtsScore } from '../../src/services/ats/scoringEngine.js';
import { verifyEquivalencesWithAI } from '../../src/services/ats/equivalenceVerifier.js';
import { analyzeJobDescription, extractJdRuleBasedFallback } from '../../src/services/ats/jdAnalyzer.js';
import { checkRateLimit } from '../../api/ats/openrouter-client.js';

describe('ATS v2 Core Engine Tests', () => {
  const sampleResumeText = `
Alex Mercer
Software Engineer
alex.mercer@example.com | +1 555-0199 | San Francisco, CA

PROFESSIONAL SUMMARY
Full-stack software engineer with 4 years of experience architecting scalable web applications.

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, SQL, HTML, CSS
Frameworks & Libraries: React, Node.js, Express, Next.js, Tailwind CSS
Databases & Cloud: PostgreSQL, MongoDB, Redis, Docker, AWS (S3, EC2, Lambda)
Developer Tools: Git, GitHub Actions, CI/CD, Linux

WORK EXPERIENCE
Senior Frontend Engineer | TechCorp Inc. (2022 - Present)
- Engineered scalable micro-frontends using React, TypeScript, and Next.js, serving 250,000+ monthly active users.
- Optimized REST API endpoints and state management, reducing round-trip latency by 32%.
- Built automated CI/CD pipelines using GitHub Actions and Docker containerization.

Software Developer | WebFlow Solutions (2020 - 2022)
- Developed backend microservices using Node.js and Express with PostgreSQL and Redis caching.
- Designed database schemas and optimized complex SQL queries for high-throughput transactions.

PROJECTS
Cloud Platform Dashboard
- Developed a full-stack telemetry monitoring dashboard using React, Python, and AWS Lambda.
- Deployed containerized services with Docker to production cluster.

EDUCATION
Bachelor of Science in Computer Science | University of California, Berkeley (2016 - 2020)
`;

  const sampleJdText = `
Job Title: Senior Full Stack Engineer
Role Type: Full-time
Seniority: Senior
Minimum Experience: 3+ years

Job Requirements:
- 3+ years of professional software development experience.
- Strong proficiency in React, TypeScript, and Node.js.
- Solid experience with relational databases like PostgreSQL.
- Experience with cloud platforms (AWS) and containerization using Docker.

Preferred Qualifications:
- Experience with Next.js, Redis, and automated CI/CD pipelines.
- Bachelor's degree in Computer Science or equivalent.
`;

  test('Exact, Alias, and Canonical Skill Matches', () => {
    const parsed = parseResumeSections(sampleResumeText);

    // Exact match
    const reactMatch = matchSkillAgainstResume('React', parsed, true);
    assert.equal(reactMatch.matched, true);
    assert.equal(reactMatch.canonicalName, 'React');
    assert.equal(reactMatch.isDemonstrated, true);

    // Alias match (e.g. Postgres -> PostgreSQL)
    const postgresMatch = matchSkillAgainstResume('Postgres', parsed, true);
    assert.equal(postgresMatch.matched, true);
    assert.equal(postgresMatch.canonicalName, 'PostgreSQL');

    // JS -> JavaScript alias
    const jsMatch = matchSkillAgainstResume('JS', parsed, true);
    assert.equal(jsMatch.matched, true);
    assert.equal(jsMatch.canonicalName, 'JavaScript');
  });

  test('Fuzzy Collision Safety: distinct languages must never cross-match', () => {
    // Java vs JavaScript must NOT match
    assert.equal(isSafeFuzzyMatch('java', 'javascript', ['java', 'javascript']), false);
    // TypeScript vs JavaScript must NOT match
    assert.equal(isSafeFuzzyMatch('typescript', 'javascript', ['javascript', 'typescript']), false);
    // C vs C++ must NOT match
    assert.equal(isSafeFuzzyMatch('c', 'c++', ['c', 'c++']), false);
    // Rust vs Ruby must NOT match
    assert.equal(isSafeFuzzyMatch('rust', 'ruby', ['rust', 'ruby']), false);
  });

  test('Demonstrated Skills vs Skills Section: demonstrated receives higher credit', () => {
    const parsed = parseResumeSections(sampleResumeText);

    // React is demonstrated in Work Experience
    const demonstratedSkill = matchSkillAgainstResume('React', parsed, true);
    // HTML is only mentioned in Technical Skills section
    const listedSkill = matchSkillAgainstResume('HTML', parsed, true);

    assert.equal(demonstratedSkill.isDemonstrated, true);
    assert.equal(listedSkill.isDemonstrated, false);
    assert.ok(demonstratedSkill.credit >= listedSkill.credit);
  });

  test('Missing Required Skills Penalty & Preferred Skills Handling', () => {
    const parsed = parseResumeSections(sampleResumeText);

    // Matches with complete skills
    const goodMatches = matchAllSkills(['React', 'TypeScript', 'Node.js'], ['Next.js'], parsed);
    assert.equal(goodMatches.matchedRequired.length, 3);
    assert.equal(goodMatches.missingRequired.length, 0);

    // Matches with absent skills
    const missingMatches = matchAllSkills(['React', 'Golang', 'Kubernetes', 'GraphQL'], [], parsed);
    assert.equal(missingMatches.matchedRequired.length, 1);
    assert.equal(missingMatches.missingRequired.length, 3);
  });

  test('Seniority Adaptation: Fresher vs Senior roles calculate different weights', () => {
    const parsed = parseResumeSections(sampleResumeText);
    const mockSkills = [
      { canonicalName: 'React', credit: 1.0, isDemonstrated: true, section: 'experience' },
      { canonicalName: 'Node.js', credit: 1.0, isDemonstrated: true, section: 'experience' },
    ];

    const fresherScore = calculateAtsScore({
      matchedRequiredSkills: mockSkills,
      missingRequiredSkills: [],
      matchedPreferredSkills: [],
      missingPreferredSkills: [],
      parsedResume: parsed,
      jdAnalysis: { seniority: 'fresher', minExperienceYears: 0 },
    });

    const seniorScore = calculateAtsScore({
      matchedRequiredSkills: mockSkills,
      missingRequiredSkills: [],
      matchedPreferredSkills: [],
      missingPreferredSkills: [],
      parsedResume: parsed,
      jdAnalysis: { seniority: 'senior', minExperienceYears: 5 },
    });

    assert.equal(fresherScore.seniorityMode, 'fresher');
    assert.equal(seniorScore.seniorityMode, 'senior');
    assert.ok(fresherScore.weightsApplied.projects > seniorScore.weightsApplied.projects);
    assert.ok(seniorScore.weightsApplied.experience > fresherScore.weightsApplied.experience);
  });

  test('Scanned or Unreadable PDFs throw UnreadableResumeError', () => {
    // Blank or short text
    assert.throws(() => validateResumeReadability(''), UnreadableResumeError);
    assert.throws(() => validateResumeReadability('Resume text only five words.'), UnreadableResumeError);

    // Corrupted binary or unreadable characters
    const binaryGarbage = '%PDF-1.4 1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj 2 0 obj << /Count 1 >>';
    assert.throws(() => validateResumeReadability(binaryGarbage), UnreadableResumeError);
  });

  test('Empty and Very Long Job Descriptions are safely handled', async () => {
    // Empty JD falls back cleanly
    const emptyJd = extractJdRuleBasedFallback('');
    assert.ok(emptyJd.jobTitle);
    assert.ok(Array.isArray(emptyJd.requiredSkills));

    // Extremely long JD is truncated safely without crashing
    const longJdText = 'Software Engineer needed. Skills: React, Python. '.repeat(1000);
    const analyzed = await analyzeJobDescription(longJdText, null);
    assert.ok(analyzed.requiredSkills.includes('React'));
  });

  test('AI Quote Verification: rejects hallucinated quotes not in resume text', async () => {
    const missing = [
      { requirement: 'Kubernetes', canonicalName: 'Kubernetes', matched: false },
    ];

    // Mock AI returns a quote that does NOT exist in resume
    const fakeAiCaller = async () => ({
      results: [
        {
          skill: 'Kubernetes',
          equivalentFound: true,
          equivalentSkill: 'K8s Cluster Management',
          exactQuote: 'Architected enterprise multi-region Kubernetes clusters on EKS',
          explanation: 'Demonstrates K8s experience',
        },
      ],
    });

    const verified = await verifyEquivalencesWithAI(missing, sampleResumeText, fakeAiCaller);

    // Because the quote does NOT exist in sampleResumeText, it must be rejected!
    assert.equal(verified[0].matched, false);
    assert.equal(verified[0].matchType, undefined);
  });

  test('Determinism: identical inputs produce identical scores', async () => {
    const report1 = await runAtsAnalysis({
      resumeText: sampleResumeText,
      resumeName: 'Alex Mercer',
      jobDescriptionText: sampleJdText,
      targetRole: 'Senior Full Stack Engineer',
      serverAiCaller: null, // deterministic engine
    });

    const report2 = await runAtsAnalysis({
      resumeText: sampleResumeText,
      resumeName: 'Alex Mercer',
      jobDescriptionText: sampleJdText,
      targetRole: 'Senior Full Stack Engineer',
      serverAiCaller: null,
    });

    assert.equal(report1.atsScore, report2.atsScore);
    assert.equal(report1.grade, report2.grade);
    assert.equal(report1.confidence, report2.confidence);
    assert.deepEqual(report1.scoringBreakdown, report2.scoringBreakdown);
    assert.equal(report1.matchedRequiredSkills.length, report2.matchedRequiredSkills.length);
  });

  test('Backward Compatibility: response contains all legacy and v2 fields', async () => {
    const report = await runAtsAnalysis({
      resumeText: sampleResumeText,
      resumeName: 'Alex Mercer',
      jobDescriptionText: sampleJdText,
      targetRole: 'Senior Full Stack Engineer',
      serverAiCaller: null,
    });

    // Primary v2 fields
    assert.equal(report.version, '2.0');
    assert.equal(report.isV2, true);
    assert.ok(typeof report.atsScore === 'number');
    assert.ok(report.confidence);
    assert.ok(Array.isArray(report.matchedRequiredSkills));
    assert.ok(Array.isArray(report.missingRequiredSkills));
    assert.ok(Array.isArray(report.improvementSuggestions));

    // Legacy fields
    assert.ok(Array.isArray(report.categories));
    assert.equal(report.categories.length, 15);
    assert.ok(Array.isArray(report.strengths));
    assert.ok(Array.isArray(report.weaknesses));
    assert.ok(Array.isArray(report.aiSuggestions));
    assert.ok(report.recruiterFeedback);
    assert.ok(report.summary);
    assert.ok(report.evaluatedAt);
  });

  test('Legacy Fallback Safeguard operates cleanly when v2 fails', () => {
    const fallback = generateLegacyReportFallback(sampleResumeText, 'Fallback Test', 'General Role');
    assert.equal(fallback.isV2, false);
    assert.ok(fallback.atsScore > 0);
    assert.ok(fallback.categories.length > 0);
  });

  test('Per-user daily rate limiting enforces request limits', () => {
    const userId = 'rate-test-user-' + Date.now();
    let allowedCount = 0;
    for (let i = 0; i < 45; i++) {
      const res = checkRateLimit(userId);
      if (res.allowed) allowedCount++;
    }
    // Limit is 40 per day
    assert.equal(allowedCount, 40);
  });
});
