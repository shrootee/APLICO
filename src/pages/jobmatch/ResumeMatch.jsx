import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/Supabase';
import { useAuth } from '../../context/AuthContext';
import ResumeCard, { COLORS } from '../../components/resume/ResumeCard';
import { extractTextFromFile } from '../../services/resumeTextExtractor';
import { evaluateResumeJobMatch } from '../../services/openRouterService';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  UploadOutlined,
  BulbOutlined,
  TrophyOutlined,
  PlusOutlined,
  SwapOutlined,
  CheckOutlined,
  CloseOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  ReadOutlined,
  ExperimentOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  SolutionOutlined,
  FireOutlined,
} from '@ant-design/icons';
import {
  Button,
  Input,
  Upload,
  message,
  Progress,
  Tag,
  Spin,
  Modal,
  Tabs,
  Badge,
} from 'antd';

const { TextArea } = Input;
const BUCKET_NAME = 'MyResume';

const ResumeMatch = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(true);

  // Input states
  const [jdText, setJdText] = useState('');
  const [uploadedJdFile, setUploadedJdFile] = useState(null);

  // Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStatusText, setAnalyzingStatusText] = useState('');
  const [matchResults, setMatchResults] = useState(null);
  const [selectedResumeId, setSelectedResumeId] = useState(null);

  // Upload modal state
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [newResumeName, setNewResumeName] = useState('');
  const [newTargetRole, setNewTargetRole] = useState('');
  const [newSelectedFile, setNewSelectedFile] = useState(null);

  // Fetch Resumes from Supabase
  const fetchResumes = useCallback(async () => {
    if (!userId) {
      setLoadingResumes(false);
      return;
    }
    try {
      setLoadingResumes(true);
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const resumesWithUrls = await Promise.all(
        (data || []).map(async (res) => {
          try {
            const { data: signedData } = await supabase.storage
              .from(BUCKET_NAME)
              .createSignedUrl(res.file_path, 60);
            return { ...res, signedUrl: signedData?.signedUrl || null };
          } catch (e) {
            return { ...res, signedUrl: null };
          }
        })
      );

      setResumes(resumesWithUrls || []);
    } catch (err) {
      console.error('Error fetching resumes:', err);
    } finally {
      setLoadingResumes(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  // Clear selection when user clicks anywhere outside a resume card
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.resume-card')) {
        setSelectedResumeId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick, true);
    return () => document.removeEventListener('click', handleOutsideClick, true);
  }, []);

  const handleCardClick = (resume, e) => {
    if (e) e.stopPropagation();
    setSelectedResumeId((prevId) => (prevId === resume.id ? null : resume.id));
  };

  const handleJdFileSelect = (file) => {
    const valid = file.type === 'application/pdf' ||
      file.type.includes('word') ||
      file.type === 'text/plain' ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.pdf') ||
      file.name.endsWith('.docx');

    if (!valid) {
      message.error('Please upload PDF, DOCX, or TXT file only');
      return false;
    }

    setUploadedJdFile(file);
    return false;
  };

  // Helper to extract text from a stored resume record
  const extractTextFromSavedResume = async (resumeRecord) => {
    if (resumeRecord.fileObj) {
      return await extractTextFromFile(resumeRecord.fileObj);
    }
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(resumeRecord.file_path, 120);

      if (error || !data?.signedUrl) {
        return `${resumeRecord.resume_name} ${resumeRecord.target_role || ''}`;
      }

      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const fileObj = new File([blob], resumeRecord.file_name || resumeRecord.resume_name, { type: blob.type });
      return await extractTextFromFile(fileObj);
    } catch (err) {
      console.warn('Failed to extract saved resume text from storage:', err);
      return `${resumeRecord.resume_name} ${resumeRecord.target_role || ''}`;
    }
  };

  // OpenRouter AI Job Match Analysis
  const handleAnalyzeJobMatch = async () => {
    const textInput = jdText.trim();
    if (!textInput && !uploadedJdFile) {
      message.warning('Please paste a job description or upload a JD file.');
      return;
    }

    if (resumes.length === 0) {
      message.warning('No stored resumes found in Aplico. Please upload a resume first.');
      return;
    }

    setIsAnalyzing(true);
    setMatchResults(null);
    setAnalyzingStatusText('Reading Job Description...');

    try {
      let effectiveJdText = textInput;
      if (uploadedJdFile) {
        setAnalyzingStatusText('Parsing uploaded Job Description file...');
        effectiveJdText = await extractTextFromFile(uploadedJdFile);
      }

      setAnalyzingStatusText('Connecting to OpenRouter AI Pipeline...');

      const rankedResumes = [];
      for (let i = 0; i < resumes.length; i++) {
        const res = resumes[i];
        setAnalyzingStatusText(`Analyzing resume ${i + 1} of ${resumes.length}: "${res.resume_name}" with OpenRouter AI...`);

        const resumeText = await extractTextFromSavedResume(res);
        const aiAnalysis = await evaluateResumeJobMatch(resumeText, res.resume_name, effectiveJdText);

        rankedResumes.push({
          resume: res,
          resumeText,
          ...aiAnalysis,
          overallScore: aiAnalysis.overallMatchScore,
        });
      }

      // Sort candidate resumes by AI overall match score
      rankedResumes.sort((a, b) => b.overallMatchScore - a.overallMatchScore);

      const best = rankedResumes[0];

      setMatchResults({
        rankedResumes,
        bestMatch: best,
        jdText: effectiveJdText,
      });
      setSelectedResumeId(best.resume.id);

      message.success('OpenRouter AI Semantic Match Analysis Complete!');
    } catch (err) {
      console.error('Job match analysis error:', err);
      message.error(err.message || 'Failed to complete job match analysis.');
    } finally {
      setIsAnalyzing(false);
      setAnalyzingStatusText('');
    }
  };

  const handleViewResume = async (resume) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(resume.file_path, 120);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('View URL error:', err);
      message.error('Failed to open resume file.');
    }
  };

  const handleUploadModalSubmit = async () => {
    if (!newSelectedFile) {
      message.warning('Please select a file');
      return;
    }
    if (!newResumeName.trim()) {
      message.warning('Please enter a resume name');
      return;
    }

    try {
      setUploadingResume(true);
      const fileExt = newSelectedFile.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, newSelectedFile, { cacheControl: '3600', upsert: false });

      if (storageError) throw storageError;

      const { data: insertedResume, error: dbError } = await supabase
        .from('resumes')
        .insert({
          user_id: userId,
          resume_name: newResumeName.trim(),
          file_name: newSelectedFile.name,
          file_path: filePath,
          file_size: newSelectedFile.size,
          file_type: newSelectedFile.type || 'application/pdf',
          target_role: newTargetRole.trim() || null,
          uploaded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) throw dbError;

      message.success('Resume uploaded successfully!');
      setUploadModalVisible(false);
      setNewResumeName('');
      setNewTargetRole('');
      setNewSelectedFile(null);

      await fetchResumes();
    } catch (err) {
      console.error('Upload error:', err);
      message.error('Failed to upload resume: ' + err.message);
    } finally {
      setUploadingResume(false);
    }
  };

  const activeMatch = matchResults?.rankedResumes?.find((r) => r.resume.id === selectedResumeId) || matchResults?.bestMatch;

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', paddingBottom: 32 }}>
      {/* Page Title & Subtitle */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: COLORS.textPrimary,
              margin: 0,
              letterSpacing: '-0.5px',
            }}
          >
            AI Semantic Resume Matcher
          </h1>
          <p style={{ color: COLORS.textSecondary, margin: '4px 0 0 0', fontSize: 14 }}>
            Powered by  AI recruiter pipeline for production-grade semantic matching & technology equivalency evaluation.
          </p>
        </div>


      </div>

      {/* Input Section — Job Description Paste & File Upload */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 16,
            marginBottom: 16,
          }}
        >
          {/* Left Column: Paste Job Description */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Job Description Text
            </label>
            <TextArea
              rows={6}
              placeholder="Paste full job description here (e.g., We are looking for a Senior Full Stack Engineer with React, TypeScript, FastAPI, PostgreSQL, and AWS Bedrock experience...)"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              style={{ borderRadius: 8, fontSize: 13, minHeight: 140 }}
            />
          </div>

          {/* Right Column: Upload JD File */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                Upload Job Description File
              </label>
              <span style={{ fontSize: 11, color: COLORS.textLight }}>
                PDF • DOCX • TXT
              </span>
            </div>
            <Upload.Dragger
              beforeUpload={handleJdFileSelect}
              fileList={uploadedJdFile ? [uploadedJdFile] : []}
              onRemove={() => {
                setUploadedJdFile(null);
                setJdText('');
              }}
              maxCount={1}
              style={{
                borderRadius: 8,
                padding: '16px',
                height: 140,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fafafa',
                border: `1px dashed ${COLORS.border}`,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <UploadOutlined style={{ fontSize: 22, color: COLORS.secondary }} />
                <span style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: 500 }}>
                  {uploadedJdFile ? uploadedJdFile.name : 'Click or drag Job Description file'}
                </span>
                {!uploadedJdFile && (
                  <span style={{ fontSize: 11, color: COLORS.textLight }}>
                    Supports PDF, DOCX, or TXT (Max 10MB)
                  </span>
                )}
              </div>
            </Upload.Dragger>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <Button
            type="primary"
            loading={isAnalyzing}
            onClick={handleAnalyzeJobMatch}
            style={{
              height: 42,
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              background: COLORS.primary,
              border: 'none',
              padding: '0 28px',

            }}
          >
            Analyze Job Match with OpenRouter AI
          </Button>
        </div>
      </div>

      {/* Loading Progress State */}
      {isAnalyzing && (
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            textAlign: 'center',
            padding: '32px 24px',
            marginBottom: 24,
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}
        >
          <Spin size="large" />
          <p style={{ marginTop: 14, color: COLORS.textPrimary, fontSize: 14, fontWeight: 600, margin: '14px 0 4px 0' }}>
            {analyzingStatusText || 'Evaluating Resumes with OpenRouter AI Pipeline...'}
          </p>
          <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
            Performing deep semantic matching, technology equivalency parsing, and recruiter scoring.
          </span>
        </div>
      )}

      {/* Match Results Section */}
      {matchResults && !isAnalyzing && (
        <>
          {/* Top Best Resume Summary Panel */}
          <div
            style={{
              background: 'linear-gradient(135deg, #FCFAFF 0%, #F5F3FF 100%)',
              border: `1px solid ${COLORS.primary}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
              boxShadow: '0 4px 16px rgba(189, 126, 254, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <TrophyOutlined style={{ fontSize: 16, color: '#6D28D9' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6D28D9' }}>
                    Top Recommended Resume Match
                  </span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>
                  {matchResults.bestMatch.resume.resume_name}
                </h2>
                {matchResults.bestMatch.resume.target_role && (
                  <Tag color="purple" style={{ marginTop: 6, fontSize: 12, borderRadius: 12, padding: '2px 10px' }}>
                    Target Role: {matchResults.bestMatch.resume.target_role}
                  </Tag>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#6D28D9', lineHeight: 1 }}>
                  {matchResults.bestMatch.overallMatchScore}%
                </div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4, fontWeight: 600 }}>
                  Overall Match Score
                </div>
              </div>
            </div>

            {/* Recruiter Insights Summary Banner */}
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                background: '#ffffff',
                border: '1px solid #E9D5FF',
                borderRadius: 8,
                fontSize: 13,
                color: '#4C1D95',
                lineHeight: 1.5,
              }}
            >
              <strong>Recruiter Insight:</strong> {matchResults.bestMatch.recruiterInsights}
            </div>

            {/* Secondary Action Controls */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                size="middle"
                onClick={() => message.success(`Selected "${matchResults.bestMatch.resume.resume_name}" for application!`)}
                style={{
                  borderRadius: 6,
                  background: COLORS.primary,
                  border: 'none',
                  fontWeight: 600,
                }}
              >
                Use Top Resume
              </Button>

              <Button
                icon={<SwapOutlined />}
                size="middle"
                onClick={() => {
                  const element = document.getElementById('resume-ranking-section');
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{ borderRadius: 6 }}
              >
                Compare All ({matchResults.rankedResumes.length}) Resumes
              </Button>

              <Button
                icon={<PlusOutlined />}
                size="middle"
                onClick={() => setUploadModalVisible(true)}
                style={{ borderRadius: 6 }}
              >
                Upload New Resume
              </Button>
            </div>
          </div>

          {/* Detailed Match Score Breakdown Grid */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12 }}>
              Detailed Compatibility Breakdown ({activeMatch?.resume?.resume_name})
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#ffffff', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '14px' }}>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: 600 }}>
                  Overall Compatibility
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 6 }}>
                  {activeMatch?.overallMatchScore}%
                </div>
                <Progress percent={activeMatch?.overallMatchScore} showInfo={false} size="small" strokeColor="#8B5CF6" />
              </div>

              <div style={{ background: '#ffffff', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '14px' }}>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: 600 }}>
                  Skills Match
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 6 }}>
                  {activeMatch?.skillsMatchScore}%
                </div>
                <Progress percent={activeMatch?.skillsMatchScore} showInfo={false} size="small" strokeColor="#6366F1" />
              </div>

              <div style={{ background: '#ffffff', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '14px' }}>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: 600 }}>
                  Experience Match
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 6 }}>
                  {activeMatch?.experienceMatchScore}%
                </div>
                <Progress percent={activeMatch?.experienceMatchScore} showInfo={false} size="small" strokeColor="#10B981" />
              </div>

              <div style={{ background: '#ffffff', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '14px' }}>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: 600 }}>
                  Education Match
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 6 }}>
                  {activeMatch?.educationMatchScore}%
                </div>
                <Progress percent={activeMatch?.educationMatchScore} showInfo={false} size="small" strokeColor="#3B82F6" />
              </div>

              <div style={{ background: '#ffffff', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '14px' }}>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: 600 }}>
                  Responsibility Match
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 6 }}>
                  {activeMatch?.responsibilityMatchScore}%
                </div>
                <Progress percent={activeMatch?.responsibilityMatchScore} showInfo={false} size="small" strokeColor="#F59E0B" />
              </div>
            </div>

            {/* Score Reasoning Box */}
            {activeMatch?.matchScoreReasoning && (
              <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#6D28D9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SolutionOutlined /> Score Evaluation & Reasoning
                </div>
                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                  {activeMatch.matchScoreReasoning}
                </div>
              </div>
            )}

            {/* Skill Classification Tabs & Cards (Present, Partial / Related, Missing) */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12 }}>
                Semantic Skill Classification & Technology Equivalencies
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
                {/* Present Skills */}
                <div style={{ background: '#ffffff', border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <CheckCircleOutlined style={{ color: '#10B981', fontSize: 16 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#065F46' }}>
                      Present Skills ({activeMatch?.presentSkills?.length || 0})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activeMatch?.presentSkills?.length > 0 ? (
                      activeMatch.presentSkills.map((sk, idx) => (
                        <div key={idx} style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '8px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: 13, color: '#166534' }}>{typeof sk === 'string' ? sk : sk.name}</strong>
                            {sk.category && <Tag color="green" style={{ fontSize: 10, margin: 0 }}>{sk.category}</Tag>}
                          </div>
                          {sk.note && <div style={{ fontSize: 11, color: '#15803D', marginTop: 2 }}>{sk.note}</div>}
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: 12, color: COLORS.textLight }}>No exact matches listed.</span>
                    )}
                  </div>
                </div>

                {/* Partial / Equivalent Skills */}
                <div style={{ background: '#ffffff', border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <ThunderboltOutlined style={{ color: '#8B5CF6', fontSize: 16 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#5B21B6' }}>
                      Equivalent & Related Experience ({activeMatch?.partialOrRelatedSkills?.length || 0})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activeMatch?.partialOrRelatedSkills?.length > 0 ? (
                      activeMatch.partialOrRelatedSkills.map((sk, idx) => (
                        <div key={idx} style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 6, padding: '8px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: 13, color: '#5B21B6' }}>{typeof sk === 'string' ? sk : sk.name}</strong>
                            {sk.resumeEquivalent && (
                              <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>
                                Equivalent: {sk.resumeEquivalent}
                              </Tag>
                            )}
                          </div>
                          {sk.note && <div style={{ fontSize: 11, color: '#6D28D9', marginTop: 2 }}>{sk.note}</div>}
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: 12, color: COLORS.textLight }}>No equivalent or partial skills detected.</span>
                    )}
                  </div>
                </div>

                {/* Genuinely Missing Skills */}
                <div style={{ background: '#ffffff', border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <CloseCircleOutlined style={{ color: '#EF4444', fontSize: 16 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#991B1B' }}>
                      Genuinely Missing Skills ({activeMatch?.genuinelyMissingSkills?.length || 0})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activeMatch?.genuinelyMissingSkills?.length > 0 ? (
                      activeMatch.genuinelyMissingSkills.map((sk, idx) => (
                        <div key={idx} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: 13, color: '#991B1B' }}>{typeof sk === 'string' ? sk : sk.name}</strong>
                            {sk.impact && <Tag color="red" style={{ fontSize: 10, margin: 0 }}>Impact: {sk.impact}</Tag>}
                          </div>
                          {sk.recommendation && <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 2 }}>{sk.recommendation}</div>}
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: 12, color: COLORS.textLight }}>Zero critical missing skills! Candidate possesses complete technology coverage.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recruiter Feedback & Actionable Recommendations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 24 }}>
              {/* Positive Contributions */}
              <div style={{ background: '#ffffff', border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckOutlined style={{ color: '#10B981' }} /> Key Positive Contributions
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                  {activeMatch?.positiveContributions?.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Actionable Improvement Tips */}
              <div style={{ background: '#ffffff', border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BulbOutlined style={{ color: '#F59E0B' }} /> Optimization Suggestions
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                  {activeMatch?.actionableImprovements?.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Section: Candidate Resume Ranking Grid */}
          <div id="resume-ranking-section" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>
                  Stored Resumes AI Ranking
                </h3>
                <p style={{ fontSize: 12, color: COLORS.textLight, margin: '2px 0 0 0' }}>
                  Ranked by OpenRouter AI semantic compatibility score. Select a card to view detailed report.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
              {matchResults.rankedResumes.map((item) => (
                <ResumeCard
                  key={item.resume.id}
                  resume={item.resume}
                  selected={selectedResumeId === item.resume.id}
                  badge={
                    <Tag
                      color={item.overallMatchScore >= 80 ? 'purple' : item.overallMatchScore >= 65 ? 'blue' : 'orange'}
                      style={{ fontSize: 11, fontWeight: 600 }}
                    >
                      {item.overallMatchScore}% Match
                    </Tag>
                  }
                  onClick={handleCardClick}
                  onView={handleViewResume}
                  onDownload={handleViewResume}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Upload New Resume Modal */}
      <Modal
        title={<span style={{ fontSize: 16, fontWeight: 700 }}>Upload Another Resume</span>}
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        onOk={handleUploadModalSubmit}
        confirmLoading={uploadingResume}
        okText="Upload & Save"
        okButtonProps={{ style: { background: COLORS.primary, border: 'none', height: 36, fontSize: 13, fontWeight: 600 } }}
        cancelButtonProps={{ style: { height: 36, fontSize: 13 } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' }}>
              Resume Name *
            </label>
            <Input
              placeholder="e.g., Senior FullStack Developer Resume 2026"
              value={newResumeName}
              onChange={(e) => setNewResumeName(e.target.value)}
              style={{ borderRadius: 6, fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' }}>
              Target Role (Optional)
            </label>
            <Input
              placeholder="e.g., Senior Software Engineer"
              value={newTargetRole}
              onChange={(e) => setNewTargetRole(e.target.value)}
              style={{ borderRadius: 6, fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#334155' }}>
              File (PDF or DOCX) *
            </label>
            <Upload.Dragger
              beforeUpload={(file) => {
                setNewSelectedFile(file);
                return false;
              }}
              fileList={newSelectedFile ? [newSelectedFile] : []}
              onRemove={() => setNewSelectedFile(null)}
              maxCount={1}
            >
              <div style={{ padding: '12px 0' }}>
                <UploadOutlined style={{ fontSize: 24, color: COLORS.secondary }} />
                <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 6, fontWeight: 500 }}>
                  {newSelectedFile ? newSelectedFile.name : 'Click or drag resume file to upload'}
                </div>
              </div>
            </Upload.Dragger>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ResumeMatch;
