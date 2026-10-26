import React, { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../lib/Supabase';
import { useAuth } from '../../context/AuthContext';
import ResumeCard from '../../components/resume/ResumeCard';
import { extractTextFromFile } from '../../services/resumeTextExtractor';
import { runAtsAnalysis, generateLegacyReportFallback } from '../../services/ats/atsEngine.js';
import { callServerAi } from '../../services/ats/atsApiClient.js';
import { UnreadableResumeError } from '../../services/ats/resumeParser.js';
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
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  CheckOutlined,
  CloseOutlined,
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
  Collapse,
} from 'antd';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';
import dayjs from 'dayjs';

// Configure PDF worker cleanly for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { colors } from '../../colors';

const { TextArea } = Input;
const COLORS = colors;
const BUCKET_NAME = 'MyResume';

const ATSChecker = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [activeTab, setActiveTab] = useState('analyzer');
  const [resumes, setResumes] = useState([]);
  const [resumesLoading, setResumesLoading] = useState(true);

  const [selectedResume, setSelectedResume] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [showJdInput, setShowJdInput] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatusText, setAnalysisStatusText] = useState('Analyzing Resume Content...');
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [unreadableErrorModal, setUnreadableErrorModal] = useState(null);

  // Active sub-tab inside the report view: 'skills' | 'breakdown' | 'suggestions' | 'categories'
  const [reportSubTab, setReportSubTab] = useState('skills');

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
  const jdFileInputRef = useRef(null);

  const getFileIcon = (fileType) => {
    if (fileType === 'application/pdf' || fileType?.endsWith?.('.pdf')) {
      return <FilePdfOutlined style={{ fontSize: 32, color: '#FF0000' }} />;
    }
    return <FileWordOutlined style={{ fontSize: 32, color: '#2B579A' }} />;
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
        console.warn('[Supabase Fetch Error]:', error);
      }

      if (data && data.report_data) {
        const parsed = typeof data.report_data === 'string' ? JSON.parse(data.report_data) : data.report_data;
        try {
          localStorage.setItem(`ats_report_${resumeId}_${userId}`, JSON.stringify(parsed));
        } catch (e) { }
        return parsed;
      }
    } catch (err) {
      console.warn('[Supabase Fetch Exception]:', err);
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
      console.warn('[Supabase Save Aborted]: missing userId or resumeId');
      return;
    }

    const payload = {
      user_id: userId,
      resume_id: resumeId.toString(),
      resume_name: resumeName || 'Untitled Resume',
      target_role: role || report?.jobTitle || 'General Role',
      ats_score: report?.atsScore ?? 0,
      grade: report?.grade || 'N/A',
      cgpa: report?.cgpa || 'N/A',
      hiring_probability: report?.hiringProbability || 'N/A',
      report_data: typeof report === 'string' ? JSON.parse(report) : report,
      updated_at: new Date().toISOString(),
    };

    try {
      const response = await supabase
        .from('resume_analyses')
        .upsert(payload, { onConflict: 'user_id,resume_id' })
        .select();

      if (response.error) {
        console.warn('[Supabase Upsert Warning]:', response.error.message);
      }
    } catch (dbErr) {
      console.warn('[Supabase Save Non-fatal]:', dbErr);
    }

    // Always update Local Cache
    try {
      localStorage.setItem(`ats_report_${resumeId}_${userId}`, JSON.stringify(report));
    } catch (e) { }
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

  // Extract text from File (PDF, DOCX, TXT)
  const extractTextFromUploadedFile = async (fileObj) => {
    return await extractTextFromFile(fileObj);
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
      return await extractTextFromUploadedFile(resumeRecord.fileObj);
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(resumeRecord.file_path, 90);

    if (error || !data?.signedUrl) {
      throw new Error('Failed to fetch resume file from storage.');
    }

    const response = await fetch(data.signedUrl);
    const blob = await response.blob();
    const fileObj = new File([blob], resumeRecord.file_name || resumeRecord.resume_name, { type: blob.type });
    return await extractTextFromUploadedFile(fileObj);
  };

  // Eye Icon Preview Resume Action
  const handlePreviewResume = async (resume, e) => {
    if (e) e.stopPropagation();

    setPreviewFileName(resume.resume_name);
    setPreviewFileType(resume.file_type || '');
    setPreviewLoading(true);
    setPreviewModalVisible(true);

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(resume.file_path, 300);

      if (error || !data?.signedUrl) {
        throw new Error('Failed to generate preview URL from storage');
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

  // Run ATS v2 Analysis
  const runAnalysis = async (targetResume, forceReanalyze = false) => {
    if (!targetResume) return;

    // Check if analysis already exists in DB / Cache (unless forced or new JD provided)
    if (!forceReanalyze && !jobDescriptionText.trim()) {
      const stored = await getStoredAnalysisFromDB(targetResume.id);
      if (stored) {
        setSelectedResume(targetResume);
        setCurrentAnalysis(stored);
        return;
      }
    }

    setIsAnalyzing(true);
    setAnalysisProgress(15);
    setAnalysisStatusText('Extracting readable text from document...');

    try {
      const extractedText = await extractTextFromSavedResume(targetResume);

      setAnalysisProgress(35);
      setAnalysisStatusText('Segmenting sections & analyzing job requirements...');

      setAnalysisProgress(60);
      setAnalysisStatusText('Executing deterministic skill matching engine...');

      // Execute ATS v2 Analysis Engine
      const v2Report = await runAtsAnalysis({
        resumeText: extractedText,
        resumeName: targetResume.resume_name,
        jobDescriptionText: jobDescriptionText.trim(),
        targetRole: targetRole || targetResume.target_role,
        serverAiCaller: callServerAi,
      });

      setAnalysisProgress(90);
      setAnalysisStatusText('Finalizing confidence diagnostics & scoring breakdown...');

      setAnalysisProgress(100);
      setSelectedResume(targetResume);
      setCurrentAnalysis(v2Report);

      // Save report to Supabase DB & local cache
      await saveStoredAnalysisToDB(
        targetResume.id,
        targetResume.resume_name,
        targetRole || targetResume.target_role,
        v2Report
      );
      loadHistoryFromDB();

      message.success('ATS v2 Evaluation Complete!');
    } catch (err) {
      console.error('ATS Analysis error:', err);
      if (err instanceof UnreadableResumeError) {
        setUnreadableErrorModal(err.message);
      } else {
        message.error(err.message || 'Failed to analyze resume text.');
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setAnalysisStatusText('');
    }
  };

  // View or Analyze Resume Card Action
  const handleViewOrAnalyzeResume = async (resume, e) => {
    if (e) e.stopPropagation();
    setSelectedResume(resume);

    // If user provided a JD, always analyze fresh against this JD
    if (jobDescriptionText.trim()) {
      runAnalysis(resume, true);
      return;
    }

    const stored = await getStoredAnalysisFromDB(resume.id);
    if (stored) {
      setCurrentAnalysis(stored);
    } else {
      runAnalysis(resume, false);
    }
  };

  // Clear selection when user clicks outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.resume-card') && !e.target.closest('.ats-control-bar')) {
        // preserve selection
      }
    };
    document.addEventListener('click', handleOutsideClick, true);
    return () => document.removeEventListener('click', handleOutsideClick, true);
  }, []);

  const handleCardSelectionToggle = (resume, e) => {
    if (e) e.stopPropagation();
    setSelectedResume((prev) => (prev?.id === resume.id ? null : resume));
  };

  const handleExplicitReanalyze = () => {
    if (selectedResume) {
      runAnalysis(selectedResume, true);
    }
  };

  const handleJdFileUpload = async (fileObj) => {
    try {
      const text = await extractTextFromFile(fileObj);
      if (text) {
        setJobDescriptionText(text);
        message.success('Job description file imported successfully!');
      }
    } catch (err) {
      message.error('Failed to read JD file: ' + err.message);
    }
    return false; // prevent default upload
  };

  const filteredResumes = resumes.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (r.resume_name || '').toLowerCase();
    const fileName = (r.file_name || '').toLowerCase();
    const role = (r.target_role || '').toLowerCase();
    return name.includes(q) || fileName.includes(q) || role.includes(q);
  });

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

  // Helper for confidence badge colors
  const getConfidenceBadgeColor = (level) => {
    if (level === 'High') return '#10b981';
    if (level === 'Medium') return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ padding: '0 20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.textPrimary,
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              ATS Match Engine
            </h1>
            <Tag color="cyan" style={{ fontSize: 12, fontWeight: 700, borderRadius: 6, margin: 0 }}>
              ATS v2 Engine
            </Tag>
          </div>
          <p style={{ color: COLORS.textSecondary, margin: '4px 0 0 0', fontSize: 14 }}>
            Deterministic Resume-to-Job Description matching with verifiable evidence
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
              label: <span>ATS Analyzer</span>,
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
        /* HISTORY TAB */
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

              {/* RENDER REPORT DETAILS */}
              {renderFullReportCard(historyReportView.report, historyReportView.resumeName, historyReportView.targetRole)}
            </div>
          ) : historyList.length === 0 ? (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '60px 20px' }}>
              <HistoryOutlined style={{ fontSize: 48, color: COLORS.textLight, marginBottom: 16 }} />
              <h3 style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: 600 }}>No Analysis History</h3>
              <p style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                Select a resume card to generate your first ATS v2 report card.
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
                    <div style={{ textAlign: 'right' }}>
                      <Tag color="purple-inverse" style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                        {item.grade} ({item.atsScore}%)
                      </Tag>
                      {item.report?.isV2 && (
                        <div style={{ marginTop: 4 }}>
                          <Tag color="cyan" style={{ fontSize: 10, borderRadius: 4, margin: 0 }}>
                            ATS v2
                          </Tag>
                        </div>
                      )}
                    </div>
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
        /* DETAILED REPORT VIEW (ATS v2 MAIN ANALYZER) */
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
                Reanalyze with Current Settings
              </Button>
              <Button
                type="primary"
                icon={<TrophyOutlined />}
                style={{ borderRadius: 12, background: COLORS.primary, border: 'none' }}
              >
                Saved in Database
              </Button>
            </div>
          </div>

          {renderFullReportCard(currentAnalysis, selectedResume?.resume_name, targetRole || selectedResume?.target_role)}
        </div>
      ) : (
        /* MAIN RESUME SELECTION & JD CONTROL PANEL */
        <div>
          {isAnalyzing ? (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: '60px 20px', marginBottom: 24 }}>
              <Spin size="large" />
              <h3 style={{ marginTop: 20, color: COLORS.textPrimary, fontSize: 18, fontWeight: 600 }}>
                {analysisStatusText || 'Evaluating Resume against Job Description...'}
              </h3>
              <div style={{ maxWidth: 380, margin: '16px auto 0 auto' }}>
                <Progress percent={analysisProgress} strokeColor={COLORS.primary} />
              </div>
            </Card>
          ) : (
            <div>
              {/* ATS v2 CONTROL PANEL: JOB DESCRIPTION & ROLE & SEARCH */}
              <Card
                className="ats-control-bar"
                style={{
                  borderRadius: 16,
                  marginBottom: 24,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
                styles={{ body: { padding: 20 } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>
                      Target Job Description & Role
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: 13, color: COLORS.textSecondary }}>
                      Provide the target job description to match your resume deterministically against role-specific requirements.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      size="small"
                      icon={<FileTextOutlined />}
                      onClick={() => setShowJdInput((prev) => !prev)}
                      style={{ borderRadius: 8, fontWeight: 600 }}
                    >
                      {showJdInput ? 'Hide JD Box' : jobDescriptionText ? 'Edit Stored JD' : 'Paste Job Description'}
                    </Button>
                    <Button
                      size="small"
                      icon={<UploadOutlined />}
                      onClick={() => jdFileInputRef.current?.click()}
                      style={{ borderRadius: 8 }}
                    >
                      Import JD File
                    </Button>
                    <input
                      type="file"
                      ref={jdFileInputRef}
                      style={{ display: 'none' }}
                      accept=".txt,.pdf,.docx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleJdFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Collapsible / Expandable Job Description Input */}
                {showJdInput && (
                  <div style={{ marginBottom: 16 }}>
                    <TextArea
                      rows={5}
                      placeholder="Paste the full job description text here (e.g. required skills, qualifications, responsibilities)..."
                      value={jobDescriptionText}
                      onChange={(e) => setJobDescriptionText(e.target.value)}
                      style={{ borderRadius: 10, fontSize: 13 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: COLORS.textLight }}>
                      <span>
                        {jobDescriptionText ? `${jobDescriptionText.split(/\s+/).filter(Boolean).length} words loaded` : 'No JD loaded yet'}
                      </span>
                      {jobDescriptionText && (
                        <Button type="link" size="small" onClick={() => setJobDescriptionText('')} style={{ padding: 0 }}>
                          Clear JD
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Active JD status banner if JD is loaded but box is closed */}
                {!showJdInput && jobDescriptionText && (
                  <Alert
                    type="success"
                    showIcon
                    message={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <strong>Target Job Description Active:</strong> {jobDescriptionText.substring(0, 100)}...
                        </span>
                        <Button type="link" size="small" onClick={() => setShowJdInput(true)}>
                          View / Edit
                        </Button>
                      </div>
                    }
                    style={{ marginBottom: 16, borderRadius: 10 }}
                  />
                )}

                {!jobDescriptionText && !showJdInput && (
                  <div style={{ padding: '8px 12px', background: COLORS.bgLight, borderRadius: 8, marginBottom: 16, fontSize: 12, color: COLORS.textSecondary }}>
                    <InfoCircleOutlined style={{ marginRight: 6, color: COLORS.primary }} />
                    <em>Tip: Providing a Job Description activates exact ATS v2 skill matching, traceable evidence, and gap scoring. Without a JD, a general role baseline will be used.</em>
                  </div>
                )}

                {/* CONTROLS: SEARCH & TARGET ROLE & ANALYZE BUTTON */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Input
                    placeholder="Search by resume name..."
                    prefix={<SearchOutlined style={{ color: COLORS.textLight }} />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    allowClear
                    size="large"
                    style={{ borderRadius: 10, flex: 1, minWidth: 240 }}
                  />

                  <Input
                    placeholder="Target Role (e.g. Frontend Engineer)"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    size="large"
                    style={{ borderRadius: 10, width: 230 }}
                  />

                  <Button
                    type="primary"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    disabled={!selectedResume}
                    onClick={() => handleViewOrAnalyzeResume(selectedResume)}
                    style={{
                      height: 42,
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      background: COLORS.primary,
                      border: 'none',
                      padding: '0 24px',
                    }}
                  >
                    Evaluate Selected Resume
                  </Button>
                </div>
              </Card>

              {/* RESUME SELECTION GRID */}
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
                  {/* UPLOAD NEW RESUME CARD */}
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
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${COLORS.primaryLight} 0%, ${COLORS.secondaryLight} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <UploadOutlined style={{ fontSize: 22, color: COLORS.secondary }} />
                    </div>
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                        margin: '0 0 4px 0',
                      }}
                    >
                      Upload New Resume
                    </h3>
                    <p
                      style={{
                        fontSize: 12,
                        color: COLORS.textLight,
                        margin: 0,
                        textAlign: 'center',
                      }}
                    >
                      Drag & Drop or Click to Upload (PDF / DOCX)
                    </p>
                  </Card>

                  {/* EXISTING RESUME CARDS */}
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
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <Tooltip title="Preview Original File (Eye)">
                              <Button
                                type="text"
                                icon={<EyeOutlined style={{ fontSize: 16 }} />}
                                size="small"
                                onClick={(e) => handlePreviewResume(resume, e)}
                                style={{ color: COLORS.textSecondary }}
                              />
                            </Tooltip>

                            <Button
                              type={isSelected ? 'primary' : 'default'}
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
                              Evaluate
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
                          Try searching for a different resume name or clear the query.
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

      {/* MODAL: UNREADABLE / SCANNED PDF GUIDANCE */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.red }}>
            <ExclamationCircleOutlined style={{ fontSize: 22 }} />
            <span>Readable Text Extraction Notice</span>
          </div>
        }
        open={Boolean(unreadableErrorModal)}
        onCancel={() => setUnreadableErrorModal(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setUnreadableErrorModal(null)}>
            Understood
          </Button>,
        ]}
      >
        <p style={{ fontSize: 14, color: COLORS.textPrimary, lineHeight: 1.6 }}>
          {unreadableErrorModal}
        </p>
        <Alert
          type="info"
          message="Why did this happen?"
          description="Standard ATS engines parse text streams inside PDFs. If a PDF was created via physical scanner, smartphone photo, or flattened graphics, text cannot be reliably extracted without OCR. Please re-export your resume directly from Word, Google Docs, or LaTeX as a text-based PDF."
          style={{ marginTop: 12, borderRadius: 8 }}
        />
      </Modal>

      {/* MODAL: FILE PREVIEW (EYE ICON) */}
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
                <h3>Word Document Preview</h3>
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

  /**
   * Helper to Render the Complete Report Card (used in both live view & history viewer)
   */
  function renderFullReportCard(report, resumeName, role) {
    if (!report) return null;

    const isV2 = report.isV2 || report.version === '2.0';
    const confidenceColor = getConfidenceBadgeColor(report.confidence);

    return (
      <div>
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
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <Tag color="cyan" style={{ fontSize: 12, borderRadius: 6 }}>
                  {isV2 ? 'ATS v2 DETERMINISTIC MATCH' : 'ATS REPORT CARD'}
                </Tag>
                {report.aiAvailability && (
                  <Tag color="blue" style={{ fontSize: 11, borderRadius: 6 }}>
                    {report.aiAvailability}
                  </Tag>
                )}
              </div>

              <h2 style={{ color: 'white', fontSize: 26, fontWeight: 700, margin: '0 0 6px 0' }}>
                {resumeName || 'Candidate Resume'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>
                Target Role: <strong style={{ color: '#5EEAD4' }}>{report.jobTitle || role || 'General Role'}</strong>
                {report.seniorityMode && (
                  <span style={{ marginLeft: 8, textTransform: 'capitalize' }}>
                    ({report.seniorityMode} Level)
                  </span>
                )}
              </p>

              <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <Tooltip title={report.confidenceReasons ? report.confidenceReasons.join(' ') : 'Match confidence evaluated by evidentiary backing'}>
                  <Badge
                    count={`Confidence: ${report.confidence || 'Medium'}`}
                    style={{ backgroundColor: confidenceColor, fontWeight: 600, padding: '0 8px' }}
                  />
                </Tooltip>
                <Badge count={`Hiring Odds: ${report.hiringProbability || 'Medium'}`} style={{ backgroundColor: '#10b981' }} />
                <Badge count={`CGPA: ${report.cgpa || 'N/A'}`} style={{ backgroundColor: '#6366f1' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={report.atsScore}
                  width={110}
                  strokeColor={{ '0%': '#5EEAD4', '100%': '#10b981' }}
                  trailColor="rgba(255,255,255,0.1)"
                  format={(percent) => <span style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>{percent}%</span>}
                />
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 8 }}>ATS Match Score</div>
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
                <div style={{ color: '#5EEAD4', fontSize: 42, fontWeight: 800, lineHeight: 1 }}>
                  {report.grade}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 }}>Resume Grade</div>
              </div>
            </div>
          </div>
        </Card>

        {/* MATCH SUMMARY BANNER */}
        <Card
          style={{
            borderRadius: 16,
            borderLeft: `5px solid ${COLORS.primary}`,
            backgroundColor: '#fafafa',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <SolutionOutlined style={{ fontSize: 28, color: COLORS.primary, marginTop: 2 }} />
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>
                Match Summary & Assessment
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                {report.matchSummary || report.summary || report.recruiterFeedback}
              </p>
            </div>
          </div>
        </Card>

        {/* V2 DETAILS OR V1 LEGACY BREAKDOWN TABS */}
        <Tabs
          activeKey={reportSubTab}
          onChange={setReportSubTab}
          style={{ marginBottom: 24 }}
          items={[
            ...(isV2
              ? [
                  {
                    key: 'skills',
                    label: (
                      <span>
                        <ThunderboltOutlined /> Skills Alignment ({report.matchedRequiredSkills?.length || 0} Matched)
                      </span>
                    ),
                    children: renderSkillsAlignmentTab(report),
                  },
                  {
                    key: 'breakdown',
                    label: (
                      <span>
                        <RadarChartOutlined /> Scoring Weights & Breakdown
                      </span>
                    ),
                    children: renderScoringBreakdownTab(report),
                  },
                ]
              : []),
            {
              key: 'suggestions',
              label: (
                <span>
                  <BulbOutlined /> Actionable Improvements ({report.improvementSuggestions?.length || report.aiSuggestions?.length || 0})
                </span>
              ),
              children: renderSuggestionsTab(report),
            },
            ...(report.categories
              ? [
                  {
                    key: 'categories',
                    label: (
                      <span>
                        <FileTextOutlined /> Section Scores ({report.categories.length})
                      </span>
                    ),
                    children: renderLegacyCategoriesTab(report),
                  },
                ]
              : []),
          ]}
        />
      </div>
    );
  }

  /**
   * Tab 1: Skills Alignment with Traceable Evidence & Badges
   */
  function renderSkillsAlignmentTab(report) {
    const matchedRequired = report.matchedRequiredSkills || [];
    const missingRequired = report.missingRequiredSkills || [];
    const matchedPreferred = report.matchedPreferredSkills || [];
    const missingPreferred = report.missingPreferredSkills || [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* MATCHED REQUIRED SKILLS */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircleOutlined style={{ color: COLORS.green, fontSize: 18 }} />
              <span style={{ fontSize: 16, fontWeight: 600 }}>Matched Required Skills ({matchedRequired.length})</span>
            </div>
          }
          style={{ borderRadius: 16 }}
        >
          {matchedRequired.length === 0 ? (
            <p style={{ color: COLORS.textLight, margin: 0 }}>No explicit required skills matched yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
              {matchedRequired.map((skill, i) => (
                <div
                  key={i}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: COLORS.bgLight,
                    border: `1px solid ${COLORS.borderLight}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.textPrimary }}>
                      {skill.canonicalName}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Tag color={skill.isDemonstrated ? 'green' : 'blue'} style={{ fontSize: 11, borderRadius: 4, margin: 0 }}>
                        {skill.section ? `In ${skill.section}` : 'Matched'}
                      </Tag>
                      <Tag color={skill.matchType === 'exact' ? 'cyan' : skill.matchType === 'equivalent' ? 'purple' : 'gold'} style={{ fontSize: 11, borderRadius: 4, margin: 0 }}>
                        {skill.matchType}
                      </Tag>
                    </div>
                  </div>

                  {skill.evidence ? (
                    <div style={{ fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                      "{skill.evidence}"
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: COLORS.textLight }}>Found in {skill.section || 'resume text'}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* MISSING REQUIRED SKILLS */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CloseCircleOutlined style={{ color: COLORS.red, fontSize: 18 }} />
              <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.red }}>
                Missing Required Skills ({missingRequired.length})
              </span>
            </div>
          }
          style={{ borderRadius: 16 }}
        >
          {missingRequired.length === 0 ? (
            <Alert type="success" message="All required technical skills from the job description are matched in candidate resume!" showIcon />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {missingRequired.map((skill, i) => (
                <Tag
                  key={i}
                  color="red"
                  style={{
                    fontSize: 13,
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CloseOutlined /> {skill.requirement || skill.canonicalName}
                </Tag>
              ))}
            </div>
          )}
        </Card>

        {/* PREFERRED SKILLS (BONUS) */}
        {(matchedPreferred.length > 0 || missingPreferred.length > 0) && (
          <Card
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>Preferred / Nice-to-Have Skills</span>}
            style={{ borderRadius: 16 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {matchedPreferred.length > 0 && (
                <div>
                  <h5 style={{ margin: '0 0 8px 0', color: COLORS.green, fontSize: 13 }}>Matched Preferred Skills:</h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {matchedPreferred.map((s, i) => (
                      <Tag key={i} color="green" style={{ borderRadius: 6, fontSize: 13, padding: '4px 10px' }}>
                        <CheckOutlined /> {s.canonicalName}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {missingPreferred.length > 0 && (
                <div>
                  <h5 style={{ margin: '8px 0 8px 0', color: COLORS.textSecondary, fontSize: 13 }}>Missing Preferred Skills (Bonus):</h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {missingPreferred.map((s, i) => (
                      <Tag key={i} style={{ borderRadius: 6, fontSize: 12, padding: '4px 10px', background: COLORS.bgLight }}>
                        {s.requirement || s.canonicalName}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  }

  /**
   * Tab 2: Scoring Breakdown & Weights Applied
   */
  function renderScoringBreakdownTab(report) {
    const breakdown = report.scoringBreakdown || {};
    const weights = report.weightsApplied || {};

    const components = [
      { key: 'requiredSkills', name: 'Required Skills', score: breakdown.requiredSkills ?? 0, weight: weights.requiredSkills },
      { key: 'experience', name: 'Relevant Experience', score: breakdown.experience ?? 0, weight: weights.experience },
      { key: 'projects', name: 'Relevant Projects', score: breakdown.projects ?? 0, weight: weights.projects },
      { key: 'education', name: 'Education Alignment', score: breakdown.education ?? 0, weight: weights.education },
      { key: 'certifications', name: 'Certifications', score: breakdown.certifications ?? 0, weight: weights.certifications },
    ];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {components.map((c, i) => (
          <Card key={i} style={{ borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: COLORS.textPrimary }}>{c.name}</span>
              <Tag color="blue" style={{ borderRadius: 6, margin: 0 }}>
                Weight: {c.weight ? `${Math.round(c.weight * 100)}%` : 'Adaptive'}
              </Tag>
            </div>
            <Progress
              percent={c.score}
              strokeColor={c.score >= 80 ? COLORS.green : c.score >= 60 ? COLORS.primary : COLORS.amber}
              status="active"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, color: COLORS.textSecondary }}>
              <span>Component Score</span>
              <strong>{c.score} / 100</strong>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  /**
   * Tab 3: Actionable Suggestions
   */
  function renderSuggestionsTab(report) {
    const suggestions = report.improvementSuggestions || [];
    const missingQualifications = report.importantMissingQualifications || [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {missingQualifications.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message="Important Missing Qualifications"
            description={
              <ul style={{ margin: '6px 0 0 0', paddingLeft: 20 }}>
                {missingQualifications.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            }
            style={{ borderRadius: 12 }}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {suggestions.map((sug, i) => {
            const isObj = typeof sug === 'object' && sug !== null;
            const title = isObj ? sug.title : `Recommendation #${i + 1}`;
            const desc = isObj ? sug.description : sug;
            const priority = isObj ? sug.priority : 'Medium';

            return (
              <Card
                key={i}
                style={{
                  borderRadius: 14,
                  borderLeft: `4px solid ${priority === 'High' ? COLORS.red : priority === 'Medium' ? COLORS.amber : COLORS.primary}`,
                }}
                styles={{ body: { padding: 18 } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BulbOutlined style={{ color: COLORS.amber, fontSize: 16 }} />
                    <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.textPrimary }}>{title}</span>
                  </div>
                  <Tag color={priority === 'High' ? 'red' : priority === 'Medium' ? 'orange' : 'green'} style={{ borderRadius: 6 }}>
                    {priority} Priority
                  </Tag>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.5 }}>
                  {desc}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  /**
   * Tab 4: Legacy 15 Categories (Retained for 100% backward compatibility)
   */
  function renderLegacyCategoriesTab(report) {
    const categories = report.categories || [];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {categories.map((cat, idx) => (
          <div key={idx} style={{ padding: 16, borderRadius: 12, background: COLORS.bgLight, border: `1px solid ${COLORS.borderLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 600, color: COLORS.textPrimary, fontSize: 14 }}>{cat.name}</span>
              <span style={{ fontWeight: 700, color: COLORS.primaryDark || COLORS.primary, fontSize: 14 }}>
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
    );
  }
};

export default ATSChecker;