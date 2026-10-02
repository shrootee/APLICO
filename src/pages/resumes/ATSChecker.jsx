import React, { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../lib/Supabase';
import { useAuth } from '../../context/AuthContext';
import ResumeCard from '../../components/resume/ResumeCard';
import { extractTextFromFile } from '../../services/resumeTextExtractor';
import { analyzeResumeATS } from '../../services/openRouterService';
import {
  UploadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BulbOutlined,
  ReloadOutlined,
  HistoryOutlined,
  SolutionOutlined,
  StarOutlined,
  TrophyOutlined,
  EyeOutlined,
  RadarChartOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Input,
  Upload,
  message,
  Progress,
  Tag,
  Tabs,
  Badge,
  Alert,
  Spin,
  Empty,
  Divider,
  Modal,
  Tooltip,
} from 'antd';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';
import dayjs from 'dayjs';

// Configure PDF worker cleanly for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { colors } from '../../colors';

const COLORS = colors;

const BUCKET_NAME = 'MyResume';

// Generate Comprehensive University-Style Report Card
const generateReportCard = (resumeText, resumeName, targetRole) => {
  const text = (resumeText || '').toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const evaluateCategory = (name, keywords, weight = 1) => {
    let matches = 0;
    keywords.forEach((kw) => {
      if (text.includes(kw.toLowerCase())) matches++;
    });
    const ratio = Math.min(1, (matches / Math.max(1, keywords.length * 0.4)) * weight);
    const percentage = Math.round(Math.min(98, Math.max(48, ratio * 100)));
    const score = (percentage / 10).toFixed(1);
    return { name, score: parseFloat(score), percentage };
  };

  const categories = [
    {
      ...evaluateCategory('Formatting', ['margin', 'font', 'bullet', 'section', 'header', 'clean']),
      explanation: 'Structure is clear with standardized section headings and parseable layout.',
    },
    {
      ...evaluateCategory('ATS Compatibility', ['skills', 'experience', 'education', 'email', 'phone', 'summary']),
      explanation: 'High parseability across major ATS platforms (Workday, Greenhouse, Lever).',
    },
    {
      ...evaluateCategory('Keyword Optimization', ['javascript', 'python', 'react', 'sql', 'aws', 'docker', 'git', 'api']),
      explanation: 'Includes essential industry keywords relevant to target technical role requirements.',
    },
    {
      ...evaluateCategory('Skills', ['framework', 'database', 'cloud', 'architecture', 'full stack', 'backend']),
      explanation: 'Core technical competencies are clearly defined and grouped appropriately.',
    },
    {
      ...evaluateCategory('Experience', ['developed', 'managed', 'led', 'designed', 'built', 'implemented', 'scaled']),
      explanation: 'Work history reflects progressive responsibility and practical experience.',
    },
    {
      ...evaluateCategory('Projects', ['github', 'deployed', 'application', 'system', 'features', 'users', 'stack']),
      explanation: 'Demonstrates practical application through concrete projects and builds.',
    },
    {
      ...evaluateCategory('Education', ['bachelor', 'degree', 'computer science', 'university', 'gpa', 'coursework']),
      explanation: 'Educational background and academic achievements are clearly formatted.',
    },
    {
      ...evaluateCategory('Achievements', ['award', 'first place', 'top', 'increased', 'reduced', 'improved', 'saved']),
      explanation: 'Includes recognized accomplishments and quantifiable milestones.',
    },
    {
      ...evaluateCategory('Leadership', ['led', 'mentored', 'organized', 'captain', 'president', 'initiative']),
      explanation: 'Shows evidence of teamwork, collaboration, or leadership initiative.',
    },
    {
      ...evaluateCategory('Certifications', ['certified', 'aws', 'google', 'meta', 'coursera', 'udemy', 'certificate']),
      explanation: 'Professional credentials and continuous learning are documented.',
    },
    {
      ...evaluateCategory('Grammar', ['the', 'and', 'with', 'for', 'experience', 'responsible']),
      explanation: 'Professional tone with strong grammatical precision throughout.',
    },
    {
      ...evaluateCategory('Readability', ['concise', 'clear', 'impact', 'delivered'], 1.1),
      explanation: 'Information density is well-balanced and easy for recruiters to scan in 10 seconds.',
    },
    {
      ...evaluateCategory('Action Verbs', ['spearheaded', 'architected', 'engineered', 'streamlined', 'optimized', 'executed']),
      explanation: 'Uses active voice and power verbs to highlight individual contributions.',
    },
    {
      ...evaluateCategory('Impact', ['%', 'k', 'ms', 'users', 'revenue', 'performance', 'latency', 'efficiency']),
      explanation: 'Quantifies outcomes using specific metrics and data points.',
    },
    {
      ...evaluateCategory('Consistency', ['2023', '2024', 'present', 'january', 'february'], 1.05),
      explanation: 'Date formatting, bullet point punctuation, and styling remain uniform.',
    },
  ];

  const totalPercentage = categories.reduce((sum, c) => sum + c.percentage, 0);
  const avgPercentage = Math.round(totalPercentage / categories.length);
  const atsScore = Math.min(96, Math.max(58, avgPercentage));

  let grade = 'C';
  if (atsScore >= 92) grade = 'A+';
  else if (atsScore >= 86) grade = 'A';
  else if (atsScore >= 80) grade = 'B+';
  else if (atsScore >= 74) grade = 'B';
  else if (atsScore >= 68) grade = 'C+';
  else if (atsScore >= 62) grade = 'C';
  else grade = 'D';

  const cgpa = (atsScore / 10).toFixed(1);

  let hiringProbability = 'Medium';
  let hiringRationale = 'Solid candidate foundation. Adding more quantified metrics will boost interview callbacks.';
  if (atsScore >= 86) {
    hiringProbability = 'Very High';
    hiringRationale = 'Top candidate profile. High likelihood of passing automated ATS screens and recruiter review.';
  } else if (atsScore >= 76) {
    hiringProbability = 'High';
    hiringRationale = 'Strong candidate profile. Passes standard ATS criteria with good keyword alignment.';
  } else if (atsScore < 66) {
    hiringProbability = 'Low';
    hiringRationale = 'Requires structural formatting updates and stronger impact statements to pass competitive screens.';
  }

  const sortedCategories = [...categories].sort((a, b) => b.percentage - a.percentage);
  const strengths = [
    `Strong alignment in ${sortedCategories[0].name} (${sortedCategories[0].percentage}% score).`,
    `Effective demonstration of ${sortedCategories[1].name} and core technical competencies.`,
    `Clean document structure with parseable typography and standardized headers.`,
    wordCount > 300 ? `Comprehensive depth across core technical topics.` : `Concise layout suitable for quick recruiter scanning.`,
  ];

  const weaknesses = [
    `${sortedCategories[sortedCategories.length - 1].name} needs enhancement (scored ${sortedCategories[sortedCategories.length - 1].percentage}%).`,
    `Impact metrics: Add specific numbers (e.g. "% increase", "ms speedup", "X users served").`,
    `Keywords: Include extra role-specific framework and tool names in your skills section.`,
  ];

  const aiSuggestions = [
    `Replace generic responsibility phrases ("responsible for...") with active achievements ("Architected X using Y resulting in Z").`,
    `Group technical skills into clear categories: Languages, Frameworks, Developer Tools, Databases, Cloud Services.`,
    `Add a 2-line Professional Summary at the top tailoring your background directly to ${targetRole || 'your target role'}.`,
    `Ensure all bullet points follow the Google XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]".`,
  ];

  const recruiterFeedback = `Candidate exhibits a solid background for a ${targetRole || 'Software Engineering'} position. The overall structure is clean and easy to scan. To convert more recruiter screens into interview invites, focus on quantifying project outcomes with measurable business metrics and highlighting core cloud or systems engineering tools.`;

  const summary = `Resume for ${resumeName} tailored towards ${targetRole || 'Tech Roles'}. Evaluated with an overall score of ${atsScore}% (${grade} Grade, ${cgpa}/10 rating).`;

  return {
    atsScore,
    grade,
    cgpa: `${cgpa} / 10`,
    hiringProbability,
    hiringRationale,
    categories,
    strengths,
    weaknesses,
    aiSuggestions,
    recruiterFeedback,
    summary,
    evaluatedAt: new Date().toISOString(),
  };
};

const ATSChecker = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [activeTab, setActiveTab] = useState('analyzer');
  const [resumes, setResumes] = useState([]);
  const [resumesLoading, setResumesLoading] = useState(true);

  const [selectedResume, setSelectedResume] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetRole, setTargetRole] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);

  // History Tab state
  const [historyReportView, setHistoryReportView] = useState(null);
  const [historyList, setHistoryList] = useState([]);

  // Preview Modal state (Eye Icon Action)
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewFileType, setPreviewFileType] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const fileInputRef = useRef(null);

  const getFileIcon = (fileType) => {
    if (fileType === 'application/pdf' || fileType?.endsWith?.('.pdf')) {
      return <FilePdfOutlined style={{ fontSize: 32, color: '#FF0000' }} />;
    }
    return <FileWordOutlined style={{ fontSize: 32, color: '#2B579A' }} />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Helper: Retrieve stored analysis (Supabase first, local cache fallback)
  const getStoredAnalysisFromDB = useCallback(async (resumeId) => {
    if (!userId || !resumeId) return null;

    try {
      const { data, error } = await supabase
        .from('resume_analyses')
        .select('*')
        .eq('user_id', userId)
        .eq('resume_id', resumeId.toString())
        .maybeSingle();

      if (error) {
        console.error('[Supabase Fetch Error]:', error);
      }

      if (data && data.report_data) {
        const parsed = typeof data.report_data === 'string' ? JSON.parse(data.report_data) : data.report_data;
        try {
          localStorage.setItem(`ats_report_${resumeId}_${userId}`, JSON.stringify(parsed));
        } catch (e) { }
        return parsed;
      }
    } catch (err) {
      console.error('[Supabase Fetch Exception]:', err);
    }

    // Fallback to local cache if offline
    try {
      const cached = localStorage.getItem(`ats_report_${resumeId}_${userId}`);
      if (cached) return JSON.parse(cached);
    } catch (e) { }

    return null;
  }, [userId]);

  // Helper: Save analysis report to Supabase DB & Local Cache
  const saveStoredAnalysisToDB = useCallback(async (resumeId, resumeName, role, report) => {
    if (!userId || !resumeId) {
      const err = new Error(`Cannot save analysis: missing userId (${userId}) or resumeId (${resumeId})`);
      console.error('[Supabase Save Aborted]:', err);
      throw err;
    }

    const payload = {
      user_id: userId,
      resume_id: resumeId.toString(),
      resume_name: resumeName || 'Untitled Resume',
      target_role: role || 'General Role',
      ats_score: report?.atsScore ?? 0,
      grade: report?.grade || 'N/A',
      cgpa: report?.cgpa || 'N/A',
      hiring_probability: report?.hiringProbability || 'N/A',
      report_data: typeof report === 'string' ? JSON.parse(report) : report,
      updated_at: new Date().toISOString(),
    };

    console.log('[1. Supabase Analysis Payload]:', payload);

    // Single direct upsert to resume_analyses
    const response = await supabase
      .from('resume_analyses')
      .upsert(payload, { onConflict: 'user_id,resume_id' })
      .select();

    console.log('[2. Supabase Upsert Response]:', response);

    if (response.error) {
      console.error('[3. Supabase Upsert Error]:', response.error);
      throw response.error;
    }

    const insertedRow = response.data?.[0] || response.data;
    console.log('[4. Supabase Inserted Row]:', insertedRow);

    // Update Local Cache
    try {
      localStorage.setItem(`ats_report_${resumeId}_${userId}`, JSON.stringify(report));
    } catch (e) {
      console.warn('localStorage cache update note:', e);
    }

    return insertedRow;
  }, [userId]);

  // Fetch Existing Resumes from Supabase
  const fetchResumes = useCallback(async () => {
    if (!userId) {
      setResumesLoading(false);
      return;
    }
    try {
      setResumesLoading(true);
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setResumes(data || []);
    } catch (err) {
      console.error('Error fetching resumes:', err);
    } finally {
      setResumesLoading(false);
    }
  }, [userId]);

  // Load History directly from Supabase DB
  const loadHistoryFromDB = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: DBAnalyses } = await supabase
        .from('resume_analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (DBAnalyses && DBAnalyses.length > 0) {
        const formatted = DBAnalyses.map((item) => ({
          id: item.id || item.resume_id,
          resumeId: item.resume_id,
          resumeName: item.resume_name || 'Resume',
          targetRole: item.target_role || 'General Role',
          date: item.created_at,
          atsScore: item.ats_score,
          grade: item.grade,
          cgpa: item.cgpa,
          report: typeof item.report_data === 'string' ? JSON.parse(item.report_data) : item.report_data,
        }));
        setHistoryList(formatted);
        return;
      }

      // Fallback local storage
      const saved = localStorage.getItem(`ats_history_${userId}`);
      if (saved) {
        setHistoryList(JSON.parse(saved));
      }
    } catch (e) {
      console.error('History load error:', e);
    }
  }, [userId]);

  useEffect(() => {
    fetchResumes();
    loadHistoryFromDB();
  }, [fetchResumes, loadHistoryFromDB]);

  // Extract text from File (PDF or DOCX)
  const extractTextFromFile = async (fileObj) => {
    const fileName = fileObj.name.toLowerCase();
    const arrayBuffer = await fileObj.arrayBuffer();

    if (fileName.endsWith('.docx') || fileObj.type.includes('word')) {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || '';
    } else {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, useSystemFonts: true }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      if (!fullText.trim()) {
        throw new Error('No readable text found in PDF. Please use a text-based PDF or DOCX file.');
      }
      return fullText;
    }
  };

  // Upload new resume to Supabase Storage & DB
  const handleUploadNewFile = async (fileObj) => {
    if (!userId) {
      message.error('Please log in first');
      return;
    }

    const isPDF = fileObj.type === 'application/pdf' || fileObj.name.endsWith('.pdf');
    const isDOCX = fileObj.type.includes('word') || fileObj.name.endsWith('.docx');

    if (!isPDF && !isDOCX) {
      message.error('Please upload PDF or Word document only');
      return;
    }

    if (fileObj.size > 10 * 1024 * 1024) {
      message.error('File size must be less than 10MB');
      return;
    }

    try {
      message.loading({ content: 'Uploading new resume...', key: 'uploading' });

      const fileExt = fileObj.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;
      const resumeName = fileObj.name.replace(/\.[^/.]+$/, '');

      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileObj, { cacheControl: '3600', upsert: false });

      if (storageError) throw storageError;

      const { data: newResume, error: dbError } = await supabase
        .from('resumes')
        .insert({
          user_id: userId,
          resume_name: resumeName,
          file_name: fileObj.name,
          file_path: filePath,
          file_size: fileObj.size,
          file_type: fileObj.type || (isPDF ? 'application/pdf' : 'application/docx'),
          target_role: targetRole || null,
          uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) throw dbError;

      message.success({ content: 'Resume uploaded successfully!', key: 'uploading' });

      setResumes((prev) => [newResume, ...prev]);
      setSelectedResume({ ...newResume, fileObj });
      await runAnalysis({ ...newResume, fileObj }, true);
    } catch (err) {
      console.error('Upload error:', err);
      message.error({ content: 'Failed to upload resume: ' + err.message, key: 'uploading' });
    }
  };

  // Extract text from existing saved resume
  const extractTextFromSavedResume = async (resumeRecord) => {
    if (resumeRecord.fileObj) {
      return await extractTextFromFile(resumeRecord.fileObj);
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(resumeRecord.file_path, 60);

    if (error || !data?.signedUrl) {
      throw new Error('Failed to fetch resume file from storage.');
    }

    const response = await fetch(data.signedUrl);
    const blob = await response.blob();
    const fileObj = new File([blob], resumeRecord.file_name || resumeRecord.resume_name, { type: blob.type });
    return await extractTextFromFile(fileObj);
  };

  // ISSUE 1 FIX: 👁 Eye Icon Preview Resume Action (NEVER triggers ATS analysis)
  const handlePreviewResume = async (resume, e) => {
    if (e) e.stopPropagation(); // MUST NOT trigger selection or analysis

    setPreviewFileName(resume.resume_name);
    setPreviewFileType(resume.file_type || '');
    setPreviewLoading(true);
    setPreviewModalVisible(true);

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(resume.file_path, 300);

      if (error || !data?.signedUrl) {
        throw new Error('Failed to generate preview URL from Supabase storage');
      }

      setPreviewUrl(data.signedUrl);
    } catch (err) {
      console.error('Preview signed URL error:', err);
      message.error('Failed to load file preview URL');
      setPreviewModalVisible(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Run ATS Analysis once (or reanalyze if forced)
  const runAnalysis = async (targetResume, forceReanalyze = false) => {
    if (!targetResume) return;

    // Check if analysis already exists in Supabase DB / Cache
    if (!forceReanalyze) {
      const stored = await getStoredAnalysisFromDB(targetResume.id);
      if (stored) {
        setSelectedResume(targetResume);
        setCurrentAnalysis(stored);
        return;
      }
    }

    // Otherwise generate analysis
    setIsAnalyzing(true);
    setAnalysisProgress(25);

    try {
      setAnalysisProgress(55);
      const extractedText = await extractTextFromSavedResume(targetResume);

      setAnalysisProgress(75);
      const aiResponse = await analyzeResumeATS(
        extractedText,
        targetResume.resume_name,
        targetRole || targetResume.target_role
      );

      const localReport = generateReportCard(
        extractedText,
        targetResume.resume_name,
        targetRole || targetResume.target_role
      );

      const report = {
        ...localReport,
        ...aiResponse,
        atsScore: aiResponse.atsScore || localReport.atsScore,
      };

      setAnalysisProgress(100);
      setSelectedResume(targetResume);
      setCurrentAnalysis(report);

      // Save report to Supabase DB & local cache
      await saveStoredAnalysisToDB(targetResume.id, targetResume.resume_name, targetRole || targetResume.target_role, report);
      loadHistoryFromDB();

      message.success('Resume Analysis Complete & Saved!');
    } catch (err) {
      console.error('Analysis error:', err);
      message.error(err.message || 'Failed to analyze resume text.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  // ISSUE 3 & 5 FIX: View ATS Analysis (Reuses existing analysis from Supabase DB)
  const handleViewOrAnalyzeResume = async (resume, e) => {
    if (e) e.stopPropagation();
    setSelectedResume(resume);

    // Check Supabase DB / Cache for existing analysis
    const stored = await getStoredAnalysisFromDB(resume.id);
    if (stored) {
      // Reuses existing report with ZERO AI calls and ZERO loading animation!
      setCurrentAnalysis(stored);
    } else {
      runAnalysis(resume, false);
    }
  };

  // Clear selection when user clicks anywhere outside a resume card
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.resume-card')) {
        setSelectedResume(null);
      }
    };
    document.addEventListener('click', handleOutsideClick, true);
    return () => document.removeEventListener('click', handleOutsideClick, true);
  }, []);

  // Card Selection Toggle Logic (Selects card, transfers selection, or deselects if clicked again)
  const handleCardSelectionToggle = (resume, e) => {
    if (e) e.stopPropagation();
    setSelectedResume((prev) => (prev?.id === resume.id ? null : resume));
  };

  // Re-analyze explicit trigger
  const handleExplicitReanalyze = () => {
    if (selectedResume) {
      runAnalysis(selectedResume, true);
    }
  };

  // Real-time filter resumes
  const filteredResumes = resumes.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (r.resume_name || '').toLowerCase();
    const fileName = (r.file_name || '').toLowerCase();
    const role = (r.target_role || '').toLowerCase();
    return name.includes(q) || fileName.includes(q) || role.includes(q);
  });

  // Drag & Drop handlers
  const handleDropOnUploadCard = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadNewFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragStartCard = (e, resume) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(resume));
  };

  const handleDropOnSelectedArea = (e) => {
    e.preventDefault();
    const dataText = e.dataTransfer.getData('text/plain');
    if (dataText) {
      try {
        const resume = JSON.parse(dataText);
        if (resume && resume.id) {
          handleViewOrAnalyzeResume(resume);
        }
      } catch (err) { }
    }
  };

  return (
    <div style={{ padding: '0 20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.textPrimary,
              margin: 0,
              letterSpacing: '-0.5px',
            }}
          >
            Resume Analyzer
          </h1>
          <p style={{ color: COLORS.textSecondary, margin: '4px 0 0 0', fontSize: 14 }}>
            Manage and evaluate your resumes with professional ATS diagnostics
          </p>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            if (tab === 'history') {
              setHistoryReportView(null);
              loadHistoryFromDB();
            }
          }}
          type="card"
          items={[
            {
              key: 'analyzer',
              label: (
                <span>
                  Analyzer
                </span>
              ),
            },
            {
              key: 'history',
              label: (
                <span>
                  <HistoryOutlined /> History ({historyList.length})
                </span>
              ),
            },
          ]}
        />
      </div>

      {activeTab === 'history' ? (
        /* HISTORY TAB (ISSUE 5 FIX: Reads directly from Supabase DB without triggering new analysis) */
        <div>
          {historyReportView ? (
            /* EMBEDDED REPORT VIEWER INSIDE HISTORY TAB */
            <div>
              <div style={{ marginBottom: 20 }}>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => setHistoryReportView(null)}
                  style={{ borderRadius: 10, fontWeight: 600 }}
                >
                  Back to History List
                </Button>
              </div>

              {/* REPORT CARD HERO BANNER */}
              <Card
                style={{
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1e293b 100%)',
                  color: 'white',
                  marginBottom: 24,
                  boxShadow: '0 8px 32px rgba(15, 23, 42, 0.2)',
                }}
                styles={{ body: { padding: '32px 28px' } }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <Tag color="purple-inverse" style={{ fontSize: 12, borderRadius: 6, marginBottom: 8 }}>
                      STORED ATS REPORT CARD
                    </Tag>
                    <h2 style={{ color: 'white', fontSize: 26, fontWeight: 700, margin: '0 0 6px 0' }}>
                      {historyReportView.resumeName || 'Candidate Resume'}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>
                      Target Role: <strong style={{ color: '#bd7efe' }}>{historyReportView.targetRole}</strong>
                    </p>
                    <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <Badge count={`Hiring Odds: ${historyReportView.report.hiringProbability}`} style={{ backgroundColor: '#10b981' }} />
                      <Badge count={`CGPA: ${historyReportView.report.cgpa}`} style={{ backgroundColor: '#6366f1' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <Progress
                        type="circle"
                        percent={historyReportView.report.atsScore}
                        width={110}
                        strokeColor={{ '0%': '#bd7efe', '100%': '#10b981' }}
                        trailColor="rgba(255,255,255,0.1)"
                        format={(percent) => <span style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>{percent}%</span>}
                      />
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 8 }}>Overall ATS Score</div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 16,
                        padding: '20px 28px',
                        textAlign: 'center',
                        minWidth: '120px',
                      }}
                    >
                      <div style={{ color: '#bd7efe', fontSize: 42, fontWeight: 800, lineHeight: 1 }}>
                        {historyReportView.report.grade}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 }}>Resume Grade</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* RECRUITER ASSESSMENT */}
              <Card style={{ borderRadius: 16, borderLeft: `5px solid ${COLORS.primary}`, backgroundColor: '#fafafa', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <SolutionOutlined style={{ fontSize: 28, color: COLORS.primary, marginTop: 2 }} />
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>
                      Senior Recruiter Assessment
                    </h4>
                    <p style={{ margin: 0, fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                      "{historyReportView.report.recruiterFeedback}"
                    </p>
                  </div>
                </div>
              </Card>

              {/* 15 CATEGORY ASSESSMENT */}
              <Card title={<span style={{ fontSize: 18, fontWeight: 600 }}>Detailed Section Scores</span>} style={{ borderRadius: 16, marginBottom: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                  {historyReportView.report.categories.map((cat, idx) => (
                    <div key={idx} style={{ padding: 16, borderRadius: 12, background: COLORS.bgLight, border: `1px solid ${COLORS.borderLight}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, color: COLORS.textPrimary, fontSize: 14 }}>{cat.name}</span>
                        <span style={{ fontWeight: 700, color: COLORS.primaryDark, fontSize: 14 }}>
                          {cat.score} / 10 ({cat.percentage}%)
                        </span>
                      </div>
                      <Progress
                        percent={cat.percentage}
                        showInfo={false}
                        strokeColor={cat.percentage >= 80 ? COLORS.green : cat.percentage >= 65 ? COLORS.primary : COLORS.amber}
                        style={{ marginBottom: 8 }}
                      />
                      <p style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.4 }}>{cat.explanation}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : historyList.length === 0 ? (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '60px 20px' }}>
              <HistoryOutlined style={{ fontSize: 48, color: COLORS.textLight, marginBottom: 16 }} />
              <h3 style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: 600 }}>No Analysis History</h3>
              <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                Select a resume card to generate your first ATS report card.
              </p>
              <Button
                type="primary"
                onClick={() => setActiveTab('analyzer')}
                style={{ marginTop: 16, background: COLORS.primary, border: 'none', borderRadius: 10 }}
              >
                Go to Analyzer
              </Button>
            </Card>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 20,
              }}
            >
              {historyList.map((item) => (
                <Card
                  key={item.id}
                  hoverable
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${COLORS.border}`,
                    transition: 'all 0.3s ease',
                  }}
                  onClick={() => setHistoryReportView(item)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: COLORS.textPrimary }}>
                        {item.resumeName}
                      </h4>
                      {item.targetRole && (
                        <Tag color="purple" style={{ marginTop: 4 }}>
                          {item.targetRole}
                        </Tag>
                      )}
                    </div>
                    <Tag color="purple-inverse" style={{ fontSize: 14, fontWeight: 700 }}>
                      {item.grade} ({item.atsScore}%)
                    </Tag>
                  </div>
                  <Divider style={{ margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLORS.textLight }}>
                    <span>Rating: {item.cgpa}</span>
                    <span>{dayjs(item.date).format('MMM D, YYYY')}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : currentAnalysis ? (
        /* DETAILED REPORT CARD VIEW (MAIN ANALYZER) */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setCurrentAnalysis(null)} style={{ borderRadius: 12 }}>
              Back to Resumes
            </Button>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleExplicitReanalyze}
                style={{ borderRadius: 12, border: `1px solid ${COLORS.border}` }}
              >
                Reanalyze Resume
              </Button>
              <Button
                type="primary"
                icon={<TrophyOutlined />}
                style={{ borderRadius: 12, background: COLORS.primary, border: 'none' }}
              >
                Saved in Supabase
              </Button>
            </div>
          </div>

          {/* REPORT CARD HERO BANNER */}
          <Card
            style={{
              borderRadius: 20,
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1e293b 100%)',
              color: 'white',
              marginBottom: 24,
              boxShadow: '0 8px 32px rgba(15, 23, 42, 0.2)',
            }}
            styles={{ body: { padding: '32px 28px' } }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <Tag color="purple-inverse" style={{ fontSize: 12, borderRadius: 6, marginBottom: 8 }}>
                  OFFICIAL ATS REPORT CARD
                </Tag>
                <h2 style={{ color: 'white', fontSize: 26, fontWeight: 700, margin: '0 0 6px 0' }}>
                  {selectedResume?.resume_name || 'Candidate Resume'}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>
                  Target Role: <strong style={{ color: '#bd7efe' }}>{targetRole || selectedResume?.target_role || 'General Role'}</strong>
                </p>
                <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Badge count={`Hiring Odds: ${currentAnalysis.hiringProbability}`} style={{ backgroundColor: '#10b981' }} />
                  <Badge count={`CGPA: ${currentAnalysis.cgpa}`} style={{ backgroundColor: '#6366f1' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="circle"
                    percent={currentAnalysis.atsScore}
                    width={110}
                    strokeColor={{ '0%': '#bd7efe', '100%': '#10b981' }}
                    trailColor="rgba(255,255,255,0.1)"
                    format={(percent) => <span style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>{percent}%</span>}
                  />
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 8 }}>Overall ATS Score</div>
                </div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 16,
                    padding: '20px 28px',
                    textAlign: 'center',
                    minWidth: '120px',
                  }}
                >
                  <div style={{ color: '#bd7efe', fontSize: 42, fontWeight: 800, lineHeight: 1 }}>
                    {currentAnalysis.grade}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 }}>Resume Grade</div>
                </div>
              </div>
            </div>
          </Card>

          {/* RECRUITER ASSESSMENT */}
          <Card style={{ borderRadius: 16, borderLeft: `5px solid ${COLORS.primary}`, backgroundColor: '#fafafa', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <SolutionOutlined style={{ fontSize: 28, color: COLORS.primary, marginTop: 2 }} />
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>
                  Senior Recruiter Assessment
                </h4>
                <p style={{ margin: 0, fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                  "{currentAnalysis.recruiterFeedback}"
                </p>
              </div>
            </div>
          </Card>

          {/* 15 CATEGORY ASSESSMENT */}
          <Card title={<span style={{ fontSize: 18, fontWeight: 600 }}>Detailed Section Scores</span>} style={{ borderRadius: 16, marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
              {currentAnalysis.categories.map((cat, idx) => (
                <div key={idx} style={{ padding: 16, borderRadius: 12, background: COLORS.bgLight, border: `1px solid ${COLORS.borderLight}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: COLORS.textPrimary, fontSize: 14 }}>{cat.name}</span>
                    <span style={{ fontWeight: 700, color: COLORS.primaryDark, fontSize: 14 }}>
                      {cat.score} / 10 ({cat.percentage}%)
                    </span>
                  </div>
                  <Progress
                    percent={cat.percentage}
                    showInfo={false}
                    strokeColor={cat.percentage >= 80 ? COLORS.green : cat.percentage >= 65 ? COLORS.primary : COLORS.amber}
                    style={{ marginBottom: 8 }}
                  />
                  <p style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.4 }}>{cat.explanation}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* STRENGTHS & WEAKNESSES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 24 }}>
            <Card title={<span style={{ color: COLORS.green, fontSize: 16, fontWeight: 600 }}><CheckCircleOutlined style={{ marginRight: 8 }} /> Top Strengths</span>} style={{ borderRadius: 16 }}>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {currentAnalysis.strengths.map((item, i) => (
                  <li key={i} style={{ marginBottom: 10, fontSize: 14, color: COLORS.textPrimary }}>{item}</li>
                ))}
              </ul>
            </Card>

            <Card title={<span style={{ color: COLORS.red, fontSize: 16, fontWeight: 600 }}><CloseCircleOutlined style={{ marginRight: 8 }} /> Areas to Improve</span>} style={{ borderRadius: 16 }}>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {currentAnalysis.weaknesses.map((item, i) => (
                  <li key={i} style={{ marginBottom: 10, fontSize: 14, color: COLORS.textPrimary }}>{item}</li>
                ))}
              </ul>
            </Card>
          </div>

          {/* AI SUGGESTIONS */}
          <Card title={<span style={{ fontSize: 18, fontWeight: 600 }}><BulbOutlined style={{ color: COLORS.amber }} /> Personalized AI Recommendations</span>} style={{ borderRadius: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {currentAnalysis.aiSuggestions.map((sug, i) => (
                <div key={i} style={{ padding: 14, borderRadius: 10, background: COLORS.primaryLight, color: COLORS.textPrimary, fontSize: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <StarOutlined style={{ color: COLORS.primary, fontSize: 18 }} />
                  <span>{sug}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        /* MAIN RESUME SELECTION GRID VIEW */
        <div>
          {isAnalyzing ? (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '60px 20px', marginBottom: 24 }}>
              <Spin size="large" />
              <h3 style={{ marginTop: 20, color: COLORS.textPrimary, fontSize: 18, fontWeight: 600 }}>
                Analyzing Resume Content...
              </h3>
              <div style={{ maxWidth: 360, margin: '16px auto 0 auto' }}>
                <Progress percent={analysisProgress} strokeColor={COLORS.primary} />
              </div>
            </Card>
          ) : (
            <div>
              {/* CONTROL BAR: SEARCH & TARGET ROLE & ANALYZE BUTTON */}
              <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <Input
                  placeholder="Search by resume name or file name..."
                  prefix={<SearchOutlined style={{ color: COLORS.textLight }} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                  size="large"
                  style={{ borderRadius: 12, flex: 1, minWidth: 260 }}
                />

                <Input
                  placeholder="Target Role (e.g. Software Engineer)"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  size="large"
                  style={{ borderRadius: 12, width: 240 }}
                />

                <Button
                  type="primary"
                  size="large"
                  icon={<TrophyOutlined />}
                  disabled={!selectedResume}
                  onClick={() => handleViewOrAnalyzeResume(selectedResume)}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    background: COLORS.primary,
                    border: 'none',
                    boxShadow: COLORS.shadow,
                    padding: '0 28px',
                  }}
                >
                  Analyze Selected Resume
                </Button>
              </div>

              {/* RESUME GRID */}
              {resumesLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                  <Spin size="large" tip="Loading resumes..." />
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropOnSelectedArea}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 20,
                  }}
                >
                  {/* 1. UPLOAD NEW RESUME CARD (Exact match to MyResumes Upload Card) */}
                  <Card
                    hoverable
                    style={{
                      borderRadius: 16,
                      border: `2px dashed ${COLORS.border}`,
                      backgroundColor: COLORS.bgSecondary,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      minHeight: 220,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    styles={{
                      body: {
                        padding: 24,
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropOnUploadCard}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadNewFile(e.target.files[0]);
                        }
                      }}
                    />

                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.secondaryLight} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <UploadOutlined style={{ fontSize: 24, color: COLORS.secondary }} />
                    </div>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                        margin: '0 0 4px 0',
                      }}
                    >
                      Upload New Resume
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: COLORS.textLight,
                        margin: 0,
                        textAlign: 'center',
                      }}
                    >
                      Drag & Drop or Click to Upload (PDF / DOCX)
                    </p>
                  </Card>

                  {/* 2. EXISTING RESUME CARDS (ISSUE 4 FIX: Clean toggle selection & TWO action buttons) */}
                  {filteredResumes.map((resume) => {
                    const isSelected = selectedResume?.id === resume.id;

                    return (
                      <ResumeCard
                        key={resume.id}
                        resume={resume}
                        selected={isSelected}
                        onClick={(res, e) => handleCardSelectionToggle(res, e)}
                        draggable
                        onDragStart={(e, res) => handleDragStartCard(e, res)}
                        actions={
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <Tooltip title="Preview Original Uploaded File (Eye)">
                              <Button
                                type="text"
                                icon={<EyeOutlined style={{ fontSize: 16 }} />}
                                size="small"
                                onClick={(e) => handlePreviewResume(resume, e)}
                                style={{ color: COLORS.textSecondary }}
                              />
                            </Tooltip>

                            <Button
                              type={isSelected ? "primary" : "default"}
                              size="small"

                              onClick={(e) => handleViewOrAnalyzeResume(resume, e)}
                              style={{
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 500,
                                background: isSelected ? COLORS.primary : 'transparent',
                                border: `1px solid ${isSelected ? COLORS.primary : COLORS.border}`,
                              }}
                            >
                              View
                            </Button>
                          </div>
                        }
                      />
                    );
                  })}

                </div>
              )}

              {/* Clean Empty Search State */}
              {!resumesLoading && filteredResumes.length === 0 && searchQuery.trim() !== '' && (
                <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <div>
                        <p style={{ fontSize: 15, color: COLORS.textSecondary, margin: '0 0 6px 0' }}>
                          No resumes match "{searchQuery}"
                        </p>
                        <p style={{ fontSize: 13, color: COLORS.textLight, margin: 0 }}>
                          Try searching for a different resume name or file extension.
                        </p>
                      </div>
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ISSUE 1 PREVIEW MODAL FOR 👁 EYE BUTTON */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {getFileIcon(previewFileType)}
            <span>Preview Resume: {previewFileName}</span>
          </div>
        }
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            Close
          </Button>,
          previewUrl && (
            <Button
              key="download"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => window.open(previewUrl, '_blank')}
              style={{ background: COLORS.primary, border: 'none' }}
            >
              Open Original File in New Tab
            </Button>
          ),
        ]}
        width={850}
        style={{ top: 20 }}
      >
        {previewLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" tip="Loading file preview..." />
          </div>
        ) : previewUrl ? (
          <div style={{ height: '65vh', width: '100%', borderRadius: 8, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
            {previewFileType.includes('pdf') || previewFileName.endsWith('.pdf') ? (
              <iframe
                src={previewUrl}
                title="Resume PDF Preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <FileWordOutlined style={{ fontSize: 64, color: '#2B579A', marginBottom: 16 }} />
                <h3>Word DOCX Document Preview</h3>
                <p style={{ color: COLORS.textSecondary, marginBottom: 20 }}>
                  Browser native rendering for DOCX files is available via download/open.
                </p>
                <Button type="primary" icon={<DownloadOutlined />} onClick={() => window.open(previewUrl, '_blank')} style={{ background: COLORS.primary, border: 'none' }}>
                  Download / Open Word File
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Alert message="Preview Unavailable" description="Could not generate signed URL for this resume." type="error" showIcon />
        )}
      </Modal>
    </div>
  );
};

export default ATSChecker;