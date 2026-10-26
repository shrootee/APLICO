/**
 * Skill Taxonomy & Normalization Engine
 * Canonical skill dictionary, alias mapping, abbreviations, and collision-safe matching.
 */

// Canonical skill database with verified aliases and category
export const TAXONOMY = [
  // Programming Languages
  {
    canonical: 'JavaScript',
    category: 'Programming Languages',
    aliases: ['js', 'javascript', 'es6', 'ecmascript', 'vanilla js'],
    disallowedFuzzy: ['java', 'typescript', 'actionscript'],
  },
  {
    canonical: 'TypeScript',
    category: 'Programming Languages',
    aliases: ['ts', 'typescript'],
    disallowedFuzzy: ['javascript', 'type script'],
  },
  {
    canonical: 'Python',
    category: 'Programming Languages',
    aliases: ['python', 'py', 'python3', 'python2'],
    disallowedFuzzy: ['cython', 'jython'],
  },
  {
    canonical: 'Java',
    category: 'Programming Languages',
    aliases: ['java', 'core java', 'j2se', 'java 8', 'java 11', 'java 17', 'java 21'],
    disallowedFuzzy: ['javascript', 'js'],
  },
  {
    canonical: 'C++',
    category: 'Programming Languages',
    aliases: ['c++', 'cpp', 'c plus plus', 'cplusplus'],
    disallowedFuzzy: ['c', 'c#', 'c sharp'],
  },
  {
    canonical: 'C#',
    category: 'Programming Languages',
    aliases: ['c#', 'csharp', 'c sharp', '.net c#'],
    disallowedFuzzy: ['c', 'c++', 'cpp'],
  },
  {
    canonical: 'C',
    category: 'Programming Languages',
    aliases: ['c language', 'c programming', 'ansi c'],
    disallowedFuzzy: ['c++', 'c#', 'cpp'],
  },
  {
    canonical: 'Go',
    category: 'Programming Languages',
    aliases: ['golang', 'go lang', 'go'],
    disallowedFuzzy: ['godot', 'good'],
  },
  {
    canonical: 'Rust',
    category: 'Programming Languages',
    aliases: ['rust', 'rustlang', 'rust-lang'],
    disallowedFuzzy: ['ruby', 'rest'],
  },
  {
    canonical: 'Ruby',
    category: 'Programming Languages',
    aliases: ['ruby', 'ruby on rails', 'rails'],
    disallowedFuzzy: ['rust'],
  },
  {
    canonical: 'PHP',
    category: 'Programming Languages',
    aliases: ['php', 'php7', 'php8', 'modern php'],
  },
  {
    canonical: 'Swift',
    category: 'Programming Languages',
    aliases: ['swift', 'swiftui', 'swift 5'],
  },
  {
    canonical: 'Kotlin',
    category: 'Programming Languages',
    aliases: ['kotlin', 'kotlin multiplatform', 'kmp'],
  },
  {
    canonical: 'SQL',
    category: 'Databases & Query Languages',
    aliases: ['sql', 'ansi sql', 'structured query language'],
    disallowedFuzzy: ['sqlite', 'nosql', 'mysql'],
  },
  {
    canonical: 'HTML',
    category: 'Web Technologies',
    aliases: ['html', 'html5'],
  },
  {
    canonical: 'CSS',
    category: 'Web Technologies',
    aliases: ['css', 'css3', 'vanilla css'],
  },

  // Frontend Frameworks & Libraries
  {
    canonical: 'React',
    category: 'Frontend Frameworks',
    aliases: ['react', 'react.js', 'reactjs', 'react js'],
    disallowedFuzzy: ['react native', 'preact'],
  },
  {
    canonical: 'React Native',
    category: 'Mobile Development',
    aliases: ['react native', 'react-native', 'rn'],
    disallowedFuzzy: ['react'],
  },
  {
    canonical: 'Next.js',
    category: 'Frontend Frameworks',
    aliases: ['next.js', 'nextjs', 'next js', 'next'],
  },
  {
    canonical: 'Vue.js',
    category: 'Frontend Frameworks',
    aliases: ['vue', 'vue.js', 'vuejs', 'vue 3', 'vue 2'],
  },
  {
    canonical: 'Angular',
    category: 'Frontend Frameworks',
    aliases: ['angular', 'angular.js', 'angularjs', 'angular 2+'],
    disallowedFuzzy: ['angularjs'],
  },
  {
    canonical: 'Tailwind CSS',
    category: 'Frontend Frameworks',
    aliases: ['tailwind', 'tailwindcss', 'tailwind css'],
  },
  {
    canonical: 'Redux',
    category: 'Frontend State Management',
    aliases: ['redux', 'redux toolkit', 'rtk', 'redux-thunk'],
  },

  // Backend & APIs
  {
    canonical: 'Node.js',
    category: 'Backend Runtimes & Frameworks',
    aliases: ['node.js', 'nodejs', 'node js', 'node'],
  },
  {
    canonical: 'Express.js',
    category: 'Backend Runtimes & Frameworks',
    aliases: ['express', 'express.js', 'expressjs'],
  },
  {
    canonical: 'FastAPI',
    category: 'Backend Runtimes & Frameworks',
    aliases: ['fastapi', 'fast api'],
  },
  {
    canonical: 'Django',
    category: 'Backend Runtimes & Frameworks',
    aliases: ['django', 'django rest framework', 'drf'],
  },
  {
    canonical: 'Flask',
    category: 'Backend Runtimes & Frameworks',
    aliases: ['flask', 'flask api'],
  },
  {
    canonical: 'Spring Boot',
    category: 'Backend Runtimes & Frameworks',
    aliases: ['spring boot', 'springboot', 'spring framework', 'spring'],
  },
  {
    canonical: 'REST API',
    category: 'API & Integration',
    aliases: ['rest api', 'rest apis', 'restful api', 'restful apis', 'rest', 'restful'],
  },
  {
    canonical: 'GraphQL',
    category: 'API & Integration',
    aliases: ['graphql', 'gql', 'apollo graphql'],
  },
  {
    canonical: 'gRPC',
    category: 'API & Integration',
    aliases: ['grpc', 'protobuf', 'protocol buffers'],
  },
  {
    canonical: 'Microservices',
    category: 'Architecture',
    aliases: ['microservices', 'micro-services', 'microservice architecture'],
  },

  // Databases & Storage
  {
    canonical: 'PostgreSQL',
    category: 'Databases & Storage',
    aliases: ['postgresql', 'postgres', 'psql', 'pg'],
  },
  {
    canonical: 'MySQL',
    category: 'Databases & Storage',
    aliases: ['mysql'],
  },
  {
    canonical: 'MongoDB',
    category: 'Databases & Storage',
    aliases: ['mongodb', 'mongo', 'documentdb'],
  },
  {
    canonical: 'Redis',
    category: 'Databases & Storage',
    aliases: ['redis', 'redis cache'],
  },
  {
    canonical: 'Supabase',
    category: 'Databases & Storage',
    aliases: ['supabase', 'supabase db'],
  },
  {
    canonical: 'Firebase',
    category: 'Databases & Storage',
    aliases: ['firebase', 'firestore', 'firebase auth'],
  },

  // DevOps & Cloud
  {
    canonical: 'Docker',
    category: 'Cloud & DevOps',
    aliases: ['docker', 'containerization', 'containers', 'docker compose'],
  },
  {
    canonical: 'Kubernetes',
    category: 'Cloud & DevOps',
    aliases: ['kubernetes', 'k8s', 'kube', 'container orchestration'],
  },
  {
    canonical: 'AWS',
    category: 'Cloud & DevOps',
    aliases: ['aws', 'amazon web services', 'aws cloud', 's3', 'ec2', 'lambda'],
  },
  {
    canonical: 'Azure',
    category: 'Cloud & DevOps',
    aliases: ['azure', 'microsoft azure', 'azure cloud'],
  },
  {
    canonical: 'Google Cloud Platform',
    category: 'Cloud & DevOps',
    aliases: ['gcp', 'google cloud', 'google cloud platform', 'google cloud computing'],
  },
  {
    canonical: 'Git',
    category: 'Developer Tools',
    aliases: ['git', 'version control', 'github', 'gitlab', 'bitbucket'],
  },
  {
    canonical: 'CI/CD',
    category: 'Cloud & DevOps',
    aliases: ['ci/cd', 'ci cd', 'continuous integration', 'continuous deployment', 'github actions', 'jenkins', 'gitlab ci'],
  },
  {
    canonical: 'Linux',
    category: 'Operating Systems & Tools',
    aliases: ['linux', 'unix', 'bash', 'shell scripting', 'ubuntu'],
  },

  // AI & Data Science
  {
    canonical: 'Machine Learning',
    category: 'AI & Data Science',
    aliases: ['machine learning', 'ml', 'scikit-learn', 'sklearn'],
  },
  {
    canonical: 'Deep Learning',
    category: 'AI & Data Science',
    aliases: ['deep learning', 'dl', 'neural networks'],
  },
  {
    canonical: 'PyTorch',
    category: 'AI & Data Science',
    aliases: ['pytorch', 'torch'],
  },
  {
    canonical: 'TensorFlow',
    category: 'AI & Data Science',
    aliases: ['tensorflow', 'tf', 'keras'],
  },
  {
    canonical: 'Generative AI',
    category: 'AI & Data Science',
    aliases: ['generative ai', 'genai', 'gen ai', 'llm', 'large language models', 'langchain', 'rag', 'vector database'],
  },
];

// Pre-indexed lookup map by alias
const ALIAS_LOOKUP = new Map();
for (const entry of TAXONOMY) {
  for (const alias of entry.aliases) {
    ALIAS_LOOKUP.set(alias.toLowerCase().trim(), entry);
  }
}

/**
 * Clean and normalize a skill string
 */
export function normalizeSkillString(skill = '') {
  if (typeof skill !== 'string') return '';
  return skill
    .toLowerCase()
    .trim()
    // Strip trailing version numbers (e.g. "python 3.9" -> "python")
    .replace(/\s+v?\d+(?:\.\d+)*$/i, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ');
}

/**
 * Resolve a skill to its canonical taxonomy entry
 */
export function resolveCanonicalSkill(rawSkill = '') {
  const normalized = normalizeSkillString(rawSkill);
  if (!normalized) return null;

  // 1. Direct exact lookup
  if (ALIAS_LOOKUP.has(normalized)) {
    return ALIAS_LOOKUP.get(normalized);
  }

  // 2. Lookup with common punctuation variants (e.g. "node-js" -> "nodejs")
  const stripped = normalized.replace(/[-_.]/g, '');
  for (const [alias, entry] of ALIAS_LOOKUP.entries()) {
    if (alias.replace(/[-_.]/g, '') === stripped) {
      return entry;
    }
  }

  // 3. Fallback: treat raw skill as its own canonical entry
  return {
    canonical: rawSkill.trim(),
    category: 'General Technical Skill',
    aliases: [normalized],
    disallowedFuzzy: [],
  };
}

/**
 * Safe Levenshtein distance calculation
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Controlled Fuzzy Matcher
 * Strictly rejects collision risks (e.g. Java vs JavaScript, C vs C++, Rust vs Ruby)
 */
export function isSafeFuzzyMatch(candidate = '', target = '', disallowedList = []) {
  const c = normalizeSkillString(candidate);
  const t = normalizeSkillString(target);

  if (c === t) return true;

  // Never fuzzy match short strings (length < 4) to avoid fatal collisions
  if (c.length < 4 || t.length < 4) return false;

  // Check disallowed list
  if (disallowedList.includes(c) || disallowedList.includes(t)) {
    return false;
  }

  // If one is a prefix of another and lengths differ significantly, reject (e.g. java vs javascript)
  if (c.startsWith(t) || t.startsWith(c)) {
    const diff = Math.abs(c.length - t.length);
    if (diff > 2) return false;
  }

  const distance = levenshteinDistance(c, t);
  const maxLen = Math.max(c.length, t.length);
  const similarity = 1 - distance / maxLen;

  // Require high threshold (>= 0.85) and max 1-2 edit distance
  return distance <= 2 && similarity >= 0.85;
}
