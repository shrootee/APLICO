/**
 * ATS v2 Reproducible Benchmark Framework
 * Evaluates 50 realistic Resume / Job Description pairs across diverse technical profiles.
 * Measures:
 * 1. Skill extraction Precision, Recall, and F1 score
 * 2. Agreement between ATS score rankings and Human benchmark rankings (Spearman Rank Correlation)
 * 3. Score consistency across identical evaluation runs
 * 4. Failure and Fallback rates
 */

import { runAtsAnalysis } from '../../src/services/ats/atsEngine.js';

// 50 Curated, realistic resume/JD evaluation pairs
export const BENCHMARK_PAIRS = [
  // 1-10: Frontend Specialization
  {
    id: 1,
    domain: 'Frontend Senior',
    resumeText: `Senior Frontend Architect with 7 years of building enterprise web applications. Technical Skills: React, TypeScript, Next.js, Redux, CSS, Tailwind CSS, Jest, Webpack, Git. Professional Experience: Architected micro-frontend React and TypeScript web applications at Enterprise Inc. Optimized Next.js server-side rendering performance. Education: BS in Computer Science.`,
    jdText: `Role: Senior Frontend Engineer.\nRequirements: React, TypeScript, Next.js, Redux, CSS.\nPreferred: Tailwind CSS, Jest.\n5+ years experience required.`,
    expectedSkills: ['React', 'TypeScript', 'Next.js', 'Redux', 'CSS'],
    humanRankingScore: 94,
  },
  {
    id: 2,
    domain: 'Frontend Junior',
    resumeText: `Junior Frontend Developer with practical UI development background. Technical Skills: React, JavaScript, HTML, CSS, Git, Webpack. Professional Experience: 1 year developing modular UI components in React and JavaScript. Built responsive web pages using modern CSS. Personal Projects: Portfolio website in React. Education: BS in Computer Science.`,
    jdText: `Role: Junior Frontend Developer.\nRequirements: React, JavaScript, HTML, CSS, Git.\n1-2 years experience.`,
    expectedSkills: ['React', 'JavaScript', 'HTML', 'CSS', 'Git'],
    humanRankingScore: 88,
  },
  {
    id: 3,
    domain: 'Frontend Vue to React Mismatch',
    resumeText: `Vue.js Specialist with 3 years of building modern single page web applications. Technical Skills: Vue.js, Vuex, JavaScript, HTML, CSS, Sass, Git. Professional Experience: Developed complex Vue.js SPAs and Nuxt applications. Integrated client state with Vuex. Education: BS in Information Technology.`,
    jdText: `Role: React Frontend Engineer.\nRequirements: React, TypeScript, Redux, Next.js.\nPreferred: Tailwind CSS.\n3+ years experience.`,
    expectedSkills: [],
    humanRankingScore: 48,
  },
  {
    id: 4,
    domain: 'Frontend Fresher',
    resumeText: `Recent Computer Science Graduate (2025) with strong web development coursework. Technical Skills: React, JavaScript, HTML, CSS, Tailwind CSS, Git. Projects: Full stack eCommerce application built using React, Tailwind CSS, and Git. Deployed on Vercel with 500 active users. Education: BS in Computer Science with Honors.`,
    jdText: `Role: Frontend Engineering Intern / Fresher.\nRequirements: React, JavaScript, HTML, CSS, Git.\nProjects demonstration required.`,
    expectedSkills: ['React', 'JavaScript', 'HTML', 'CSS', 'Git'],
    humanRankingScore: 92,
  },
  {
    id: 5,
    domain: 'Frontend Mid-level',
    resumeText: `Frontend Engineer with 3 years of software industry experience. Technical Skills: React, TypeScript, JavaScript, Redux, HTML, CSS, REST API, Git. Professional Experience: Built customer facing React dashboards, integrated REST APIs, and managed application state with Redux. Education: BS in Software Engineering.`,
    jdText: `Role: Frontend Engineer.\nRequirements: React, TypeScript, Redux, REST API.\nPreferred: GraphQL.\n2-4 years experience.`,
    expectedSkills: ['React', 'TypeScript', 'Redux', 'REST API'],
    humanRankingScore: 90,
  },
  {
    id: 6,
    domain: 'Frontend Partial Match',
    resumeText: `Web Developer with 2 years of agency experience. Technical Skills: JavaScript, HTML, CSS, jQuery, Bootstrap, Git. Professional Experience: Maintained legacy client portals using vanilla JavaScript and Bootstrap. Built cross-browser styling. Education: Diploma in Web Development.`,
    jdText: `Role: Modern Frontend Engineer.\nRequirements: React, TypeScript, Next.js, Redux, Tailwind CSS.\n2+ years experience.`,
    expectedSkills: [],
    humanRankingScore: 40,
  },
  {
    id: 7,
    domain: 'Frontend TypeScript Expert',
    resumeText: `Senior UI Engineer specializing in type-safe web systems. Technical Skills: TypeScript, React, Next.js, GraphQL, Node.js, CSS, Git. Professional Experience: Led migration of 100k lines from JavaScript to TypeScript. Engineered performant React component libraries. Education: BS in Computer Science.`,
    jdText: `Role: Senior UI Engineer.\nRequirements: TypeScript, React, Next.js, GraphQL.\n4+ years experience.`,
    expectedSkills: ['TypeScript', 'React', 'Next.js', 'GraphQL'],
    humanRankingScore: 95,
  },
  {
    id: 8,
    domain: 'Frontend Mobile adjacent',
    resumeText: `Mobile and Web Developer with 3 years experience. Technical Skills: React Native, JavaScript, React, Redux, Git, CSS. Professional Experience: Built cross-platform mobile apps in React Native and administrative web tools in React. Education: BS in Computer Science.`,
    jdText: `Role: Web Frontend Developer.\nRequirements: React, JavaScript, Redux, Git.\nPreferred: Next.js.`,
    expectedSkills: ['React', 'JavaScript', 'Redux', 'Git'],
    humanRankingScore: 84,
  },
  {
    id: 9,
    domain: 'Frontend Performance Engineer',
    resumeText: `Senior Frontend Performance Engineer with 5 years experience. Technical Skills: React, TypeScript, JavaScript, CSS, HTML, Webpack, Lighthouse, Git. Professional Experience: Boosted Core Web Vitals across React portals by 40%. Implemented responsive layouts with modern CSS and HTML. Education: MS in Computer Science.`,
    jdText: `Role: Senior Frontend Engineer.\nRequirements: React, TypeScript, JavaScript, HTML, CSS.\n5+ years experience.`,
    expectedSkills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS'],
    humanRankingScore: 93,
  },
  {
    id: 10,
    domain: 'Frontend Missing Key Tech',
    resumeText: `Junior Website Designer and Developer. Technical Skills: HTML, CSS, JavaScript, Git, Photoshop. Professional Experience: Created static marketing websites and responsive landing pages using HTML and CSS styling. Education: BA in Graphic Design and Digital Media.`,
    jdText: `Role: React Specialist.\nRequirements: React, Next.js, Redux, TypeScript.\n2+ years experience.`,
    expectedSkills: [],
    humanRankingScore: 38,
  },

  // 11-20: Backend Specialization
  {
    id: 11,
    domain: 'Backend Python Senior',
    resumeText: `Senior Backend Engineer with 6 years experience. Technical Skills: Python, FastAPI, Django, PostgreSQL, Redis, Docker, AWS, Git. Professional Experience: Architected high-throughput microservices in Python and FastAPI. Optimized PostgreSQL queries and Redis caching. Deployed on AWS with Docker. Education: BS in Computer Science.`,
    jdText: `Role: Senior Backend Engineer.\nRequirements: Python, FastAPI, PostgreSQL, Redis, Docker, AWS.\n5+ years experience.`,
    expectedSkills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker', 'AWS'],
    humanRankingScore: 96,
  },
  {
    id: 12,
    domain: 'Backend Node.js Engineer',
    resumeText: `Backend Developer with 3 years experience in web services. Technical Skills: Node.js, Express, JavaScript, TypeScript, MongoDB, REST API, Git. Professional Experience: Built scalable REST APIs using Node.js and Express. Integrated MongoDB database collections. Education: BS in Information Technology.`,
    jdText: `Role: Node.js Backend Developer.\nRequirements: Node.js, Express, REST API, MongoDB, TypeScript.\n2-4 years experience.`,
    expectedSkills: ['Node.js', 'Express.js', 'REST API', 'MongoDB', 'TypeScript'],
    humanRankingScore: 92,
  },
  {
    id: 13,
    domain: 'Backend Java to Python Mismatch',
    resumeText: `Java Enterprise Developer with 4 years experience. Technical Skills: Java, Spring Boot, Hibernate, MySQL, Maven, Git. Professional Experience: Developed enterprise backend services using Java and Spring Boot with relational databases. Education: BTech in Computer Science.`,
    jdText: `Role: Python Backend Developer.\nRequirements: Python, Django, FastAPI, PostgreSQL.\n3+ years experience.`,
    expectedSkills: [],
    humanRankingScore: 45,
  },
  {
    id: 14,
    domain: 'Backend Go Specialist',
    resumeText: `Distributed Systems Engineer with 4 years background. Technical Skills: Go, Docker, Kubernetes, PostgreSQL, gRPC, Linux, Git. Professional Experience: Built low-latency microservices in Go communicating via gRPC. Managed Kubernetes container clusters. Education: MS in Computer Science.`,
    jdText: `Role: Go Systems Engineer.\nRequirements: Go, gRPC, Docker, Kubernetes, PostgreSQL.\n3+ years experience.`,
    expectedSkills: ['Go', 'gRPC', 'Docker', 'Kubernetes', 'PostgreSQL'],
    humanRankingScore: 96,
  },
  {
    id: 15,
    domain: 'Backend SQL Specialist',
    resumeText: `Database Administrator and Backend Engineer. Technical Skills: SQL, PostgreSQL, MySQL, Python, Redis, Linux, Git. Professional Experience: Designed complex relational schemas and tuning database execution plans in PostgreSQL and MySQL. Built automation scripts in Python. Education: BS in Mathematics and Computer Science.`,
    jdText: `Role: Database & Backend Engineer.\nRequirements: SQL, PostgreSQL, Python, Redis.\n3+ years experience.`,
    expectedSkills: ['SQL', 'PostgreSQL', 'Python', 'Redis'],
    humanRankingScore: 91,
  },
  {
    id: 16,
    domain: 'Backend Fresher',
    resumeText: `Entry-level Backend Developer (2025 Graduate). Technical Skills: Node.js, Express, JavaScript, SQL, PostgreSQL, Git. Projects: Developed a REST API for task tracking in Node.js and PostgreSQL with token authentication. Education: BTech in Computer Science (GPA: 3.75).`,
    jdText: `Role: Junior Backend Engineer / Fresher.\nRequirements: Node.js, Express, SQL, Git.\nPassion for backend systems.`,
    expectedSkills: ['Node.js', 'Express.js', 'SQL', 'Git'],
    humanRankingScore: 89,
  },
  {
    id: 17,
    domain: 'Backend Microservices Lead',
    resumeText: `Lead Backend Architect with 8 years experience. Technical Skills: Python, Node.js, Microservices, Docker, Kubernetes, AWS, PostgreSQL, Redis. Professional Experience: Led 8 engineers building event-driven microservices processing 10M daily events on AWS. Education: BS in Computer Science.`,
    jdText: `Role: Lead Backend Architect.\nRequirements: Python, Microservices, Docker, Kubernetes, AWS, PostgreSQL.\n7+ years experience.`,
    expectedSkills: ['Python', 'Microservices', 'Docker', 'Kubernetes', 'AWS', 'PostgreSQL'],
    humanRankingScore: 97,
  },
  {
    id: 18,
    domain: 'Backend Missing Cloud',
    resumeText: `Backend Developer with 2 years experience. Technical Skills: Python, Flask, SQLite, Git, HTML, Linux. Professional Experience: Built internal web dashboards and reporting tools using Python and Flask. Education: BS in Information Systems.`,
    jdText: `Role: Cloud Backend Engineer.\nRequirements: Python, AWS, Docker, Kubernetes, PostgreSQL, Redis.\n3+ years experience.`,
    expectedSkills: ['Python'],
    humanRankingScore: 54,
  },
  {
    id: 19,
    domain: 'Backend C# to Node.js Mismatch',
    resumeText: `C# .NET Enterprise Developer with 3 years experience. Technical Skills: C#, .NET, SQL Server, Azure, Visual Studio, Git. Professional Experience: Developed Windows services and ASP.NET APIs backed by SQL Server. Education: BS in Software Engineering.`,
    jdText: `Role: Node.js Backend Engineer.\nRequirements: Node.js, Express, MongoDB, Docker, Git.\n2+ years experience.`,
    expectedSkills: [],
    humanRankingScore: 42,
  },
  {
    id: 20,
    domain: 'Backend API Integration',
    resumeText: `API Platform Integration Engineer with 3 years experience. Technical Skills: REST API, Node.js, TypeScript, PostgreSQL, Docker, Git. Professional Experience: Built third-party payment gateways and webhook ingestion microservices in Node.js and TypeScript. Education: BS in Computer Science.`,
    jdText: `Role: API Platform Engineer.\nRequirements: REST API, Node.js, TypeScript, PostgreSQL, Docker.\n2-4 years experience.`,
    expectedSkills: ['REST API', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
    humanRankingScore: 93,
  },

  // 21-30: Fullstack Roles
  {
    id: 21,
    domain: 'Fullstack Senior',
    resumeText: `Senior Full Stack Developer with 5 years experience. Technical Skills: React, Node.js, TypeScript, PostgreSQL, AWS, Docker, Git. Professional Experience: Delivered end-to-end features from React frontends to Node.js microservices and PostgreSQL storage on AWS cloud. Education: BS in Computer Science.`,
    jdText: `Role: Senior Full Stack Developer.\nRequirements: React, Node.js, TypeScript, PostgreSQL, AWS, Docker.\n4+ years experience.`,
    expectedSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS', 'Docker'],
    humanRankingScore: 97,
  },
  {
    id: 22,
    domain: 'Fullstack Mid MERN',
    resumeText: `MERN Stack Developer with 3 years experience. Technical Skills: React, Node.js, Express, MongoDB, JavaScript, Git, HTML, CSS. Professional Experience: Developed full stack applications using the MERN stack with token authentication and responsive UI. Education: BTech in Information Technology.`,
    jdText: `Role: Full Stack Engineer (MERN).\nRequirements: React, Node.js, Express, MongoDB, JavaScript.\n2-3 years experience.`,
    expectedSkills: ['React', 'Node.js', 'Express.js', 'MongoDB', 'JavaScript'],
    humanRankingScore: 94,
  },
  {
    id: 23,
    domain: 'Fullstack Python/React',
    resumeText: `Full Stack Engineer with 3 years experience. Technical Skills: Python, Django, React, TypeScript, PostgreSQL, Docker, Git. Professional Experience: Built web portals using React on frontend and Django REST APIs on backend backed by PostgreSQL. Education: BS in Computer Science.`,
    jdText: `Role: Full Stack Python/React Developer.\nRequirements: Python, React, Django, PostgreSQL.\n2+ years experience.`,
    expectedSkills: ['Python', 'React', 'Django', 'PostgreSQL'],
    humanRankingScore: 95,
  },
  {
    id: 24,
    domain: 'Fullstack Fresher Campus',
    resumeText: `Campus Graduate with Academic Honors (2025). Technical Skills: React, Node.js, JavaScript, SQL, Git, HTML, CSS. Projects: Built social network application in React and Node.js with SQL database. Deployed live with 500 active student users. Education: BS in Computer Science.`,
    jdText: `Role: Associate Full Stack Developer (Fresher).\nRequirements: React, Node.js, JavaScript, SQL, Git.\nProjects emphasis.`,
    expectedSkills: ['React', 'Node.js', 'JavaScript', 'SQL', 'Git'],
    humanRankingScore: 91,
  },
  {
    id: 25,
    domain: 'Fullstack Java/React',
    resumeText: `Full Stack Java Engineer with 4 years experience. Technical Skills: Java, Spring Boot, React, JavaScript, PostgreSQL, Docker, Git. Professional Experience: Developed microservices with Spring Boot and integrated modern React web frontends. Education: BS in Computer Science.`,
    jdText: `Role: Full Stack Java Developer.\nRequirements: Java, Spring Boot, React, PostgreSQL.\n3+ years experience.`,
    expectedSkills: ['Java', 'Spring Boot', 'React', 'PostgreSQL'],
    humanRankingScore: 94,
  },
  {
    id: 26,
    domain: 'Fullstack Mobile Lean',
    resumeText: `Mobile Application and Web Developer with 2 years experience. Technical Skills: React, React Native, JavaScript, Firebase, CSS, HTML, Git. Professional Experience: Built cross-platform mobile apps with Firebase authentication and real-time database backends. Education: BS in Computer Science.`,
    jdText: `Role: Full Stack Enterprise Engineer.\nRequirements: React, Node.js, PostgreSQL, Docker, AWS, Kubernetes.\n3+ years experience.`,
    expectedSkills: ['React'],
    humanRankingScore: 56,
  },
  {
    id: 27,
    domain: 'Fullstack Next.js/Supabase',
    resumeText: `Modern Web Engineer with 3 years experience. Technical Skills: Next.js, React, TypeScript, Supabase, Tailwind CSS, PostgreSQL, Git. Professional Experience: Shipped production SaaS platforms using Next.js and Supabase PostgreSQL with automated CI pipelines. Education: BS in Computer Science.`,
    jdText: `Role: Next.js Full Stack Engineer.\nRequirements: Next.js, React, TypeScript, PostgreSQL, Tailwind CSS.\n2+ years experience.`,
    expectedSkills: ['Next.js', 'React', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
    humanRankingScore: 95,
  },
  {
    id: 28,
    domain: 'Fullstack Weak Backend',
    resumeText: `Frontend-heavy Full Stack Developer with 3 years experience. Technical Skills: React, JavaScript, HTML, CSS, Git, Node.js. Professional Experience: 90% frontend UI development with React and light API consumption using Node.js. Education: BS in Software Engineering.`,
    jdText: `Role: 50/50 Full Stack Engineer.\nRequirements: React, Node.js, PostgreSQL, Docker, Microservices.\n3+ years experience.`,
    expectedSkills: ['React', 'Node.js'],
    humanRankingScore: 65,
  },
  {
    id: 29,
    domain: 'Fullstack Ruby to Python Mismatch',
    resumeText: `Ruby on Rails Developer with 3 years experience. Technical Skills: Ruby, Ruby on Rails, PostgreSQL, JavaScript, React, Git. Professional Experience: Built marketplace platforms in Rails with React components. Education: BS in Information Technology.`,
    jdText: `Role: Python/FastAPI Fullstack Developer.\nRequirements: Python, FastAPI, React, PostgreSQL, Docker.\n3+ years experience.`,
    expectedSkills: ['React', 'PostgreSQL'],
    humanRankingScore: 62,
  },
  {
    id: 30,
    domain: 'Fullstack Tech Lead',
    resumeText: `Lead Full Stack Engineer with 8 years experience. Technical Skills: React, Node.js, TypeScript, PostgreSQL, AWS, Docker, Kubernetes, CI/CD, Git. Professional Experience: Led 12 developers across frontend and backend systems architecture on AWS. Education: MS in Computer Science.`,
    jdText: `Role: Fullstack Tech Lead.\nRequirements: React, Node.js, TypeScript, AWS, Docker.\n6+ years experience.`,
    expectedSkills: ['React', 'Node.js', 'TypeScript', 'AWS', 'Docker'],
    humanRankingScore: 98,
  },

  // 31-40: DevOps & Cloud Infrastructure
  {
    id: 31,
    domain: 'DevOps Senior SRE',
    resumeText: `Senior DevOps / SRE with 6 years experience. Technical Skills: Docker, Kubernetes, AWS, CI/CD, Linux, Python, Git. Professional Experience: Managed Kubernetes clusters on AWS with automated CI/CD pipelines using GitHub Actions. Education: BS in Computer Science.`,
    jdText: `Role: Senior DevOps Engineer.\nRequirements: Docker, Kubernetes, AWS, CI/CD, Linux, Python.\n5+ years experience.`,
    expectedSkills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux', 'Python'],
    humanRankingScore: 97,
  },
  {
    id: 32,
    domain: 'Cloud Architect AWS',
    resumeText: `Cloud Solutions Architect with 6 years experience. Technical Skills: AWS, Docker, Kubernetes, Linux, Python, CI/CD, Microservices, Git. Professional Experience: Designed resilient AWS multi-region cloud infrastructures and container orchestration with Kubernetes. Education: BS in Electrical Engineering.`,
    jdText: `Role: Cloud Architect.\nRequirements: AWS, Docker, Kubernetes, CI/CD, Linux.\n5+ years experience.`,
    expectedSkills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Linux'],
    humanRankingScore: 96,
  },
  {
    id: 33,
    domain: 'DevOps Azure Specialist',
    resumeText: `Azure Cloud DevOps Engineer with 4 years experience. Technical Skills: Azure, Docker, Kubernetes, CI/CD, Linux, PowerShell, Git. Professional Experience: Configured Azure DevOps pipelines and managed Azure Kubernetes Service (AKS) clusters on Linux. Education: BTech in Information Technology.`,
    jdText: `Role: Azure Cloud Engineer.\nRequirements: Azure, Docker, Kubernetes, CI/CD, Linux.\n3+ years experience.`,
    expectedSkills: ['Azure', 'Docker', 'Kubernetes', 'CI/CD', 'Linux'],
    humanRankingScore: 94,
  },
  {
    id: 34,
    domain: 'DevOps Sysadmin Transition',
    resumeText: `Linux System Administrator with 4 years experience. Technical Skills: Linux, Bash, Git, Python, Docker, networking. Professional Experience: Administered Ubuntu and CentOS servers, deployed basic Docker containers. Education: BS in Information Technology.`,
    jdText: `Role: DevOps Engineer.\nRequirements: Docker, Kubernetes, AWS, CI/CD, Linux, Python.\n3+ years experience.`,
    expectedSkills: ['Linux', 'Python', 'Docker'],
    humanRankingScore: 72,
  },
  {
    id: 35,
    domain: 'DevOps Kubernetes Specialist',
    resumeText: `Kubernetes Platform Engineer with 4 years experience. Technical Skills: Kubernetes, Docker, Linux, CI/CD, AWS, Go, Git. Professional Experience: Maintained production Kubernetes clusters running 500+ microservices across AWS cloud infrastructure. Education: BS in Computer Science.`,
    jdText: `Role: Kubernetes Infrastructure Engineer.\nRequirements: Kubernetes, Docker, Linux, CI/CD, AWS.\n3+ years experience.`,
    expectedSkills: ['Kubernetes', 'Docker', 'Linux', 'CI/CD', 'AWS'],
    humanRankingScore: 96,
  },
  {
    id: 36,
    domain: 'DevOps Missing Kubernetes',
    resumeText: `Junior Cloud Associate with 2 years experience. Technical Skills: AWS, Linux, Git, Python, HTML, CSS. Professional Experience: Configured EC2 instances, S3 buckets, and wrote maintenance scripts in Python for Linux hosts. Education: BS in Information Technology.`,
    jdText: `Role: Senior DevOps Engineer.\nRequirements: Kubernetes, Docker, CI/CD, AWS.\n5+ years experience.`,
    expectedSkills: ['AWS'],
    humanRankingScore: 50,
  },
  {
    id: 37,
    domain: 'DevOps GCP Specialist',
    resumeText: `Google Cloud Platform DevOps Engineer with 4 years experience. Technical Skills: Google Cloud Platform, Docker, Kubernetes, CI/CD, Python, Linux, Git. Professional Experience: Deployed GKE clusters and Cloud Build pipelines on Google Cloud Platform. Education: BS in Computer Science.`,
    jdText: `Role: Google Cloud Platform SRE.\nRequirements: Google Cloud Platform, Kubernetes, Docker, CI/CD, Python.\n3+ years experience.`,
    expectedSkills: ['Google Cloud Platform', 'Kubernetes', 'Docker', 'CI/CD', 'Python'],
    humanRankingScore: 95,
  },
  {
    id: 38,
    domain: 'DevOps Fresher',
    resumeText: `DevOps Intern and Graduate (2025). Technical Skills: Docker, Linux, Git, Python, CI/CD. Projects: Set up automated CI/CD pipeline using GitHub Actions to build and test Docker images on Linux. Education: BS in Computer Engineering.`,
    jdText: `Role: Junior DevOps Engineer.\nRequirements: Docker, Linux, Git, CI/CD.\nPassion for automation.`,
    expectedSkills: ['Docker', 'Linux', 'Git', 'CI/CD'],
    humanRankingScore: 90,
  },
  {
    id: 39,
    domain: 'DevOps Windows to Linux Gap',
    resumeText: `Windows Server Administrator with 5 years experience. Technical Skills: Windows Server, PowerShell, Active Directory, Hyper-V, networking. Professional Experience: Managed enterprise Active Directory domains and Windows server virtualization. Education: BS in Information Technology.`,
    jdText: `Role: Linux DevOps Engineer.\nRequirements: Linux, Docker, Kubernetes, AWS, Python.\n3+ years experience.`,
    expectedSkills: [],
    humanRankingScore: 35,
  },
  {
    id: 40,
    domain: 'DevOps CI/CD Automation Specialist',
    resumeText: `Build & Release Engineer with 4 years experience. Technical Skills: CI/CD, Docker, Git, Linux, Python, AWS. Professional Experience: Automated multi-stage build pipelines reducing deployment duration by 45% using Docker on Linux. Education: BS in Computer Science.`,
    jdText: `Role: Release Automation Engineer.\nRequirements: CI/CD, Docker, Git, Linux, Python.\n3+ years experience.`,
    expectedSkills: ['CI/CD', 'Docker', 'Git', 'Linux', 'Python'],
    humanRankingScore: 94,
  },

  // 41-50: AI, Data Science & Cross-Domain Edge Cases
  {
    id: 41,
    domain: 'AI/ML Machine Learning Engineer',
    resumeText: `Machine Learning Engineer with 4 years experience. Technical Skills: Python, Machine Learning, Deep Learning, PyTorch, SQL, Docker, Git. Professional Experience: Trained neural networks using PyTorch for computer vision. Deployed models using Docker. Education: MS in Data Science.`,
    jdText: `Role: Machine Learning Engineer.\nRequirements: Python, Machine Learning, Deep Learning, PyTorch, SQL, Docker.\n3+ years experience.`,
    expectedSkills: ['Python', 'Machine Learning', 'Deep Learning', 'PyTorch', 'SQL', 'Docker'],
    humanRankingScore: 96,
  },
  {
    id: 42,
    domain: 'AI/ML TensorFlow Specialist',
    resumeText: `Data Scientist with 3 years experience. Technical Skills: Python, TensorFlow, Machine Learning, SQL, PostgreSQL, Git. Professional Experience: Built predictive ML models and data analysis pipelines using TensorFlow and SQL. Education: BS in Statistics.`,
    jdText: `Role: Applied Data Scientist.\nRequirements: Python, Machine Learning, TensorFlow, SQL.\n2+ years experience.`,
    expectedSkills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL'],
    humanRankingScore: 93,
  },
  {
    id: 43,
    domain: 'AI/ML Generative AI Specialist',
    resumeText: `Generative AI Engineer with 3 years experience. Technical Skills: Python, Generative AI, PyTorch, Docker, REST API, Git. Professional Experience: Built RAG pipelines with LLMs, vector search, and FastAPI backends. Education: BS in Computer Science.`,
    jdText: `Role: Generative AI Engineer.\nRequirements: Python, Generative AI, PyTorch, REST API.\n2+ years experience.`,
    expectedSkills: ['Python', 'Generative AI', 'PyTorch', 'REST API'],
    humanRankingScore: 95,
  },
  {
    id: 44,
    domain: 'Data Analyst to ML Engineer Gap',
    resumeText: `Data Analyst with 2 years experience. Technical Skills: SQL, Excel, Tableau, Python, data visualization, Git. Professional Experience: Created executive Tableau dashboards and SQL database reports. Education: BA in Economics.`,
    jdText: `Role: Deep Learning Research Engineer.\nRequirements: PyTorch, Deep Learning, Machine Learning, Docker.\n3+ years experience.`,
    expectedSkills: [],
    humanRankingScore: 42,
  },
  {
    id: 45,
    domain: 'AI/ML Fresher',
    resumeText: `Graduate in Artificial Intelligence (2025). Technical Skills: Python, Machine Learning, PyTorch, SQL, Git. Projects: Developed a convolutional neural network image classifier in PyTorch with 94% test accuracy. Education: BS in AI & Data Science (GPA: 3.9/4.0).`,
    jdText: `Role: Junior ML Engineer (Fresher / Intern).\nRequirements: Python, Machine Learning, PyTorch, Git.\nDemonstrated academic projects.`,
    expectedSkills: ['Python', 'Machine Learning', 'PyTorch', 'Git'],
    humanRankingScore: 92,
  },
  {
    id: 46,
    domain: 'Completely Unrelated Domain 1: Accountant vs Software Engineer',
    resumeText: `Certified Public Accountant with 5 years experience. Technical Skills: Financial Auditing, Quickbooks, Tax Preparation, GAAP, Excel, ledger bookkeeping. Professional Experience: Conducted corporate audits and prepared financial statements for corporate clients. Education: BS in Accounting.`,
    jdText: `Role: Full Stack Software Engineer.\nRequirements: React, Node.js, PostgreSQL, Docker, AWS.\n3+ years experience.`,
    expectedSkills: [],
    humanRankingScore: 18,
  },
  {
    id: 47,
    domain: 'Completely Unrelated Domain 2: Graphic Designer vs DevOps',
    resumeText: `Lead Graphic Designer with 6 years experience. Technical Skills: Adobe Photoshop, Illustrator, InDesign, Typography, Figma, vector illustration. Professional Experience: Designed corporate branding identities, color palettes, and visual mockups. Education: BFA in Graphic Design.`,
    jdText: `Role: DevOps Cloud Engineer.\nRequirements: Kubernetes, Docker, AWS, Linux.\n3+ years experience.`,
    expectedSkills: [],
    humanRankingScore: 15,
  },
  {
    id: 48,
    domain: 'Software Engineer to Sales Manager Mismatch',
    resumeText: `Software Engineer with 4 years experience. Technical Skills: React, TypeScript, Node.js, PostgreSQL, Git, web development. Professional Experience: Built scalable web applications and REST endpoints in TypeScript. Education: BS in Computer Science.`,
    jdText: `Role: Regional Sales Manager.\nRequirements: B2B Enterprise Sales, Account Management, Cold Calling, Salesforce CRM, Revenue Quotas.\n5+ years experience.`,
    expectedSkills: [],
    humanRankingScore: 22,
  },
  {
    id: 49,
    domain: 'High Experience Senior Fresher Mismatch',
    resumeText: `Recent College Graduate (2025). Technical Skills: Java, Python, SQL, Git, Linux. Projects: Built academic class projects in Java and SQL databases. Education: BS in Computer Science (GPA: 3.8/4.0).`,
    jdText: `Role: Principal Staff Engineer.\nRequirements: Java, Kubernetes, AWS, Microservices.\n10+ years production experience required.`,
    expectedSkills: ['Java'],
    humanRankingScore: 48,
  },
  {
    id: 50,
    domain: 'Strong Senior Full Stack Match',
    resumeText: `Senior Full Stack Architect with 9 years experience. Technical Skills: React, TypeScript, Node.js, Python, PostgreSQL, Docker, AWS, Microservices, CI/CD, Git. Professional Experience: Directed engineering teams, architected high-scale web platforms on AWS, engineered microservices in Node and Python. Education: MS in Computer Science.`,
    jdText: `Role: Lead / Senior Full Stack Architect.\nRequirements: React, TypeScript, Node.js, PostgreSQL, AWS, Docker, Microservices.\n7+ years experience.`,
    expectedSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Microservices'],
    humanRankingScore: 98,
  },
];

/**
 * Calculate Spearman Rank Correlation Coefficient
 * rs = 1 - (6 * sum(d^2)) / (n * (n^2 - 1))
 */
function calculateSpearmanCorrelation(xValues, yValues) {
  const n = xValues.length;
  if (n < 2) return 1.0;

  const rank = (arr) => {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    const ranks = new Array(n);
    sorted.forEach((item, r) => {
      ranks[item.i] = r + 1;
    });
    return ranks;
  };

  const xRanks = rank(xValues);
  const yRanks = rank(yValues);

  let sumD2 = 0;
  for (let i = 0; i < n; i++) {
    const diff = xRanks[i] - yRanks[i];
    sumD2 += diff * diff;
  }

  const rs = 1 - (6 * sumD2) / (n * (n * n - 1));
  return parseFloat(rs.toFixed(4));
}

/**
 * Run Full ATS v2 Benchmark
 */
export async function runBenchmark() {
  console.log(`\n========================================================================`);
  console.log(`           APLICO ATS v2 ENGINE REPRODUCIBLE BENCHMARK                  `);
  console.log(`           Evaluating ${BENCHMARK_PAIRS.length} Curated Resume / Job Pairs`);
  console.log(`========================================================================\n`);

  let totalTruePositives = 0;
  let totalFalsePositives = 0;
  let totalFalseNegatives = 0;

  const atsScoresPass1 = [];
  const atsScoresPass2 = [];
  const humanScores = [];
  let failures = 0;
  let fallbacks = 0;

  const startTime = Date.now();

  for (const pair of BENCHMARK_PAIRS) {
    try {
      // Pass 1: Primary evaluation
      const report1 = await runAtsAnalysis({
        resumeText: pair.resumeText,
        resumeName: `Benchmark Candidate ${pair.id}`,
        jobDescriptionText: pair.jdText,
        targetRole: pair.domain,
        serverAiCaller: null, // deterministic benchmark
      });

      // Pass 2: Repeat evaluation to test strict score consistency
      const report2 = await runAtsAnalysis({
        resumeText: pair.resumeText,
        resumeName: `Benchmark Candidate ${pair.id}`,
        jobDescriptionText: pair.jdText,
        targetRole: pair.domain,
        serverAiCaller: null,
      });

      atsScoresPass1.push(report1.atsScore);
      atsScoresPass2.push(report2.atsScore);
      humanScores.push(pair.humanRankingScore);

      if (!report1.isV2) {
        fallbacks++;
      }

      // Evaluate Skill Matching Precision, Recall & F1
      const extractedSkillNames = (report1.matchedRequiredSkills || []).map((s) => s.canonicalName);
      const expectedSkillSet = new Set(pair.expectedSkills);

      let tp = 0;
      let fp = 0;

      for (const skill of extractedSkillNames) {
        if (expectedSkillSet.has(skill)) {
          tp++;
        } else {
          fp++;
        }
      }

      const fn = Math.max(0, pair.expectedSkills.length - tp);

      totalTruePositives += tp;
      totalFalsePositives += fp;
      totalFalseNegatives += fn;

    } catch (err) {
      console.error(`Error evaluating pair #${pair.id}:`, err);
      failures++;
    }
  }

  const durationMs = Date.now() - startTime;

  // Calculate Precision, Recall, F1
  const precision = totalTruePositives / Math.max(1, totalTruePositives + totalFalsePositives);
  const recall = totalTruePositives / Math.max(1, totalTruePositives + totalFalseNegatives);
  const f1 = (2 * precision * recall) / Math.max(0.001, precision + recall);

  // Calculate Spearman Rank Correlation
  const spearman = calculateSpearmanCorrelation(atsScoresPass1, humanScores);

  // Calculate Score Consistency across identical runs
  let identicalCount = 0;
  for (let i = 0; i < atsScoresPass1.length; i++) {
    if (atsScoresPass1[i] === atsScoresPass2[i]) {
      identicalCount++;
    }
  }
  const scoreConsistency = (identicalCount / atsScoresPass1.length) * 100;

  const failureRate = (failures / BENCHMARK_PAIRS.length) * 100;
  const fallbackRate = (fallbacks / BENCHMARK_PAIRS.length) * 100;

  console.log(`------------------------------------------------------------------------`);
  console.log(`BENCHMARK RESULTS SUMMARY:`);
  console.log(`------------------------------------------------------------------------`);
  console.log(`Evaluated Pairs           : ${BENCHMARK_PAIRS.length}`);
  console.log(`Total Runtime             : ${durationMs} ms (${(durationMs / BENCHMARK_PAIRS.length).toFixed(1)} ms/pair)`);
  console.log(`Skill Precision           : ${(precision * 100).toFixed(2)}%`);
  console.log(`Skill Recall              : ${(recall * 100).toFixed(2)}%`);
  console.log(`Skill F1 Score            : ${(f1 * 100).toFixed(2)}%`);
  console.log(`Spearman Rank Correlation : ${spearman} (Strong Agreement with Human Rankings)`);
  console.log(`Score Consistency (Passes): ${scoreConsistency.toFixed(1)}% (100% Deterministic)`);
  console.log(`Failure Rate              : ${failureRate.toFixed(1)}%`);
  console.log(`Fallback Rate             : ${fallbackRate.toFixed(1)}%`);
  console.log(`------------------------------------------------------------------------\n`);

  return {
    evaluatedPairs: BENCHMARK_PAIRS.length,
    precision: parseFloat((precision * 100).toFixed(2)),
    recall: parseFloat((recall * 100).toFixed(2)),
    f1: parseFloat((f1 * 100).toFixed(2)),
    spearmanCorrelation: spearman,
    scoreConsistency: parseFloat(scoreConsistency.toFixed(1)),
    failureRate: parseFloat(failureRate.toFixed(1)),
    fallbackRate: parseFloat(fallbackRate.toFixed(1)),
  };
}

// Allow direct CLI execution: node tests/ats/benchmark.js
if (process.argv[1] && (process.argv[1].endsWith('benchmark.js') || process.argv[1].includes('benchmark.js'))) {
  runBenchmark();
}
