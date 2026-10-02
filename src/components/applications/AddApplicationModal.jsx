import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRightOutlined,
  PlusOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { Modal, Button, Input, Select, Tag, message } from 'antd';
import { extractDataFromJdWithGemini } from '../../services/jdExtractionService';
import { saveApplicationToSupabase } from '../../services/applicationService';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/Supabase';

const { TextArea } = Input;

const DEFAULT_RESUMES = [
  { value: 'Software_Engineer_Resume_2026.pdf', label: 'Software_Engineer_Resume_2026.pdf (Default)' },
  { value: 'Frontend_Lead_Resume.pdf', label: 'Frontend_Lead_Resume.pdf' },
  { value: 'Fullstack_Developer_Resume.pdf', label: 'Fullstack_Developer_Resume.pdf' },
];

export default function AddApplicationModal({ open, onClose, onSaveSuccess }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Paste JD + Yes/No | 2: Editable Extracted Review Form
  const [rawJd, setRawJd] = useState('');
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Resume Options from Aplico Storage / DB
  const [resumeOptions, setResumeOptions] = useState(DEFAULT_RESUMES);

  // Extracted Data State
  const [formData, setFormData] = useState(null);

  // Tag inputs for skills editing
  const [newReqSkill, setNewReqSkill] = useState('');
  const [newPrefSkill, setNewPrefSkill] = useState('');

  // Fetch available resumes stored in Aplico storage/database
  useEffect(() => {
    const fetchUserResumes = async () => {
      try {
        if (!user?.id) return;
        const { data, error } = await supabase
          .from('resumes')
          .select('id, resume_name, file_name')
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: false });

        if (data && data.length > 0) {
          const userResumes = data.map((r) => ({
            value: r.file_name || r.resume_name,
            label: `${r.resume_name || r.file_name} (${r.file_name})`,
          }));
          setResumeOptions([...userResumes, ...DEFAULT_RESUMES]);
        }
      } catch (err) {
        console.warn('Could not fetch user resumes from Supabase:', err);
      }
    };

    fetchUserResumes();
  }, [user]);

  const resetModal = () => {
    setStep(1);
    setRawJd('');
    setAlreadyApplied(false);
    setIsExtracting(false);
    setIsSaving(false);
    setFormData(null);
    setNewReqSkill('');
    setNewPrefSkill('');
  };

  const handleClose = () => {
    resetModal();
    if (onClose) onClose();
  };

  // Step 1 -> Step 2: Trigger AI Extraction with Gemini 2.5 Flash or Manual Entry
  const handleTrackApplication = async () => {
    if (!rawJd.trim()) {
      // User didn't paste a JD -> Proceed to Step 2 with empty editable form for manual entry
      const emptyForm = {
        company: '',
        role: '',
        location: 'Remote',
        jobType: 'Full-time',
        salary: '',
        applicationUrl: '',
        applicationDeadline: '',
        requiredSkills: [],
        preferredSkills: [],
        experienceRequirement: 'Not specified',
        educationRequirement: 'Not specified',
        keywords: [],
        responsibilities: [],
        qualifications: [],
        alreadyApplied: Boolean(alreadyApplied),
        status: alreadyApplied ? 'Applied' : 'Saved',
        source: 'manual',
        resumeUsed: resumeOptions[0]?.value || 'Standard_Resume_2026.pdf',
        appliedDate: new Date().toISOString().split('T')[0],
        rawJd: '',
      };
      setFormData(emptyForm);
      setStep(2);
      message.info('Manual entry mode: Enter your application details below.');
      return;
    }

    setIsExtracting(true);

    try {
      const extracted = await extractDataFromJdWithGemini(rawJd, alreadyApplied);
      // Ensure initial resume choice uses first available resume in options
      if (resumeOptions.length > 0) {
        extracted.resumeUsed = resumeOptions[0].value;
      }
      setFormData(extracted);
      setIsExtracting(false);
      setStep(2);
      message.success('Information extracted automatically! You can review and edit below.');
    } catch (err) {
      console.error('Extraction error:', err);
      setIsExtracting(false);
      message.error('Failed to extract JD information.');
    }
  };

  // Step 2: Save to Supabase
  const handleSaveFinal = async () => {
    if (!formData.company || !formData.role) {
      message.error('Company and Role are required.');
      return;
    }

    setIsSaving(true);

    try {
      const savedRecord = await saveApplicationToSupabase(formData, user?.id);
      setIsSaving(false);

      if (onSaveSuccess) {
        onSaveSuccess(savedRecord);
      }
      message.success(`Application for ${formData.company} saved successfully!`);
      handleClose();
    } catch (err) {
      setIsSaving(false);
      console.error('❌ Application Save Error:', err);
      message.error(err.message || 'Failed to save application to database.', 6);
    }
  };

  // Tag helpers for editing extracted skills
  const handleAddRequiredSkill = () => {
    if (newReqSkill.trim() && !formData.requiredSkills.includes(newReqSkill.trim())) {
      setFormData({
        ...formData,
        requiredSkills: [...formData.requiredSkills, newReqSkill.trim()],
      });
      setNewReqSkill('');
    }
  };

  const handleRemoveRequiredSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      requiredSkills: formData.requiredSkills.filter((s) => s !== skillToRemove),
    });
  };

  const handleAddPreferredSkill = () => {
    if (newPrefSkill.trim() && !formData.preferredSkills.includes(newPrefSkill.trim())) {
      setFormData({
        ...formData,
        preferredSkills: [...formData.preferredSkills, newPrefSkill.trim()],
      });
      setNewPrefSkill('');
    }
  };

  const handleRemovePreferredSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      preferredSkills: formData.preferredSkills.filter((s) => s !== skillToRemove),
    });
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={step === 1 ? 620 : 820}
      style={{ top: step === 1 ? 80 : 36 }}
      destroyOnClose
      styles={{
        body: {
          padding: '24px 28px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
      }}
    >
      {/* STEP 1: ONLY JD TEXTAREA + YES/NO + TRACK APPLICATION BUTTON */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', letterSpacing: '-0.015em' }}>
            Add Application
          </h2>

          {/* 1. Large Text Area */}
          <div style={{ marginBottom: '20px' }}>
            <TextArea
              rows={10}
              placeholder="Paste the complete job description here…"
              value={rawJd}
              onChange={(e) => setRawJd(e.target.value)}
              style={{
                borderRadius: '8px',
                fontSize: '14px',
                lineHeight: 1.5,
                borderColor: '#CBD5E1',
                padding: '12px 14px',
              }}
            />
          </div>

          {/* 2. Directly below: "Have you already applied to this job?" */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '10px' }}>
              Have you already applied to this job?
            </div>

            {/* 3. Exactly two options: Yes / No */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setAlreadyApplied(true)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '6px',
                  border: alreadyApplied ? '2px solid #0F172A' : '1px solid #CBD5E1',
                  background: alreadyApplied ? '#FFFFFF' : '#F8FAFC',
                  color: '#0F172A',
                  fontWeight: alreadyApplied ? 600 : 500,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: alreadyApplied ? '4px solid #0F172A' : '2px solid #94A3B8',
                    background: '#FFFFFF',
                  }}
                />
                Yes
              </button>

              <button
                type="button"
                onClick={() => setAlreadyApplied(false)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '6px',
                  border: !alreadyApplied ? '2px solid #0F172A' : '1px solid #CBD5E1',
                  background: !alreadyApplied ? '#FFFFFF' : '#F8FAFC',
                  color: '#0F172A',
                  fontWeight: !alreadyApplied ? 600 : 500,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: !alreadyApplied ? '4px solid #0F172A' : '2px solid #94A3B8',
                    background: '#FFFFFF',
                  }}
                />
                No
              </button>
            </div>
          </div>

          {/* 4. Primary Button: Track Application */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
            <Button
              type="primary"
              loading={isExtracting}
              style={{
                background: '#0F172A',
                borderColor: '#0F172A',
                height: '42px',
                padding: '0 28px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '14px',
              }}
              onClick={handleTrackApplication}
            >
              Track Application
            </Button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: SHOW EDITABLE EXTRACTED OR MANUAL REVIEW FORM */}
      {step === 2 && formData && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div style={{ marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {formData.rawJd ? 'Review Extracted Information' : 'Enter Application Details'}
              </h2>
              <span style={{ fontSize: '11px', color: '#0F172A', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontWeight: 600 }}>
                {formData.rawJd ? 'AI Extracted • Editable' : 'Manual Entry • Editable'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              {formData.rawJd
                ? 'All fields below were extracted automatically from the JD. Review or edit any field before saving.'
                : 'Fill in your job application details below before saving.'}
            </p>
          </div>

          <div style={{ maxHeight: '62vh', overflowY: 'auto', paddingRight: '4px', marginBottom: '20px' }}>
            {/* Basic Overview */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Role Details
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Company Name *</label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    style={{ borderRadius: '4px', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Role Title *</label>
                  <Input
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{ borderRadius: '4px', marginTop: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Location</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={{ borderRadius: '4px', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Job Type</label>
                  <Select
                    value={formData.jobType}
                    onChange={(val) => setFormData({ ...formData, jobType: val })}
                    style={{ width: '100%', marginTop: '4px' }}
                    options={[
                      { value: 'Full-time', label: 'Full-time' },
                      { value: 'Part-time', label: 'Part-time' },
                      { value: 'Internship', label: 'Internship' },
                      { value: 'Contract', label: 'Contract' },
                      { value: 'Remote', label: 'Remote' },
                      { value: 'Hybrid', label: 'Hybrid' },
                    ]}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Salary / Comp</label>
                  <Input
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    style={{ borderRadius: '4px', marginTop: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Application URL</label>
                  <Input
                    value={formData.applicationUrl}
                    onChange={(e) => setFormData({ ...formData, applicationUrl: e.target.value })}
                    style={{ borderRadius: '4px', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Application Deadline</label>
                  <Input
                    value={formData.applicationDeadline}
                    onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                    style={{ borderRadius: '4px', marginTop: '4px' }}
                  />
                </div>
              </div>
            </div>

            {/* Tracking Status & Resume Selection */}
            <div style={{ marginBottom: '20px', borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Application Status & Resume
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Status</label>
                  <Select
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    style={{ width: '100%', marginTop: '4px' }}
                    options={[
                      { value: 'Saved', label: 'Saved' },
                      { value: 'Applied', label: 'Applied' },
                      { value: 'Interview', label: 'Interview' },
                      { value: 'Offer', label: 'Offer' },
                      { value: 'Rejected', label: 'Rejected' },
                    ]}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Resume Attached</label>
                  <Select
                    value={formData.resumeUsed}
                    onChange={(val) => setFormData({ ...formData, resumeUsed: val })}
                    style={{ width: '100%', marginTop: '4px' }}
                    options={resumeOptions}
                    placeholder="Select available resume..."
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Date Applied</label>
                  <Input
                    value={formData.appliedDate}
                    onChange={(e) => setFormData({ ...formData, appliedDate: e.target.value })}
                    style={{ borderRadius: '4px', marginTop: '4px' }}
                  />
                </div>
              </div>
            </div>

            {/* Extracted Requirements & Skills */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Extracted Skills & Requirements
              </div>

              {/* Required Skills Tags */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Required Skills
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                  {formData.requiredSkills.map((skill) => (
                    <Tag
                      key={skill}
                      closable
                      onClose={() => handleRemoveRequiredSkill(skill)}
                      style={{ background: '#F1F5F9', borderColor: '#CBD5E1', color: '#0F172A', borderRadius: '4px' }}
                    >
                      {skill}
                    </Tag>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Input
                    size="small"
                    placeholder="Add skill..."
                    value={newReqSkill}
                    onChange={(e) => setNewReqSkill(e.target.value)}
                    onPressEnter={handleAddRequiredSkill}
                    style={{ width: '150px', borderRadius: '4px' }}
                  />
                  <Button size="small" icon={<PlusOutlined />} onClick={handleAddRequiredSkill}>
                    Add
                  </Button>
                </div>
              </div>

              {/* Preferred Skills Tags */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Preferred Skills
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                  {formData.preferredSkills.map((skill) => (
                    <Tag
                      key={skill}
                      closable
                      onClose={() => handleRemovePreferredSkill(skill)}
                      style={{ background: '#F8FAFC', borderColor: '#E2E8F0', color: '#475569', borderRadius: '4px' }}
                    >
                      {skill}
                    </Tag>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Input
                    size="small"
                    placeholder="Add preferred skill..."
                    value={newPrefSkill}
                    onChange={(e) => setNewPrefSkill(e.target.value)}
                    onPressEnter={handleAddPreferredSkill}
                    style={{ width: '150px', borderRadius: '4px' }}
                  />
                  <Button size="small" icon={<PlusOutlined />} onClick={handleAddPreferredSkill}>
                    Add
                  </Button>
                </div>
              </div>

              {/* Experience & Education */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Experience Requirement</label>
                  <Input
                    value={formData.experienceRequirement}
                    onChange={(e) => setFormData({ ...formData, experienceRequirement: e.target.value })}
                    style={{ borderRadius: '4px', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Education Requirement</label>
                  <Input
                    value={formData.educationRequirement}
                    onChange={(e) => setFormData({ ...formData, educationRequirement: e.target.value })}
                    style={{ borderRadius: '4px', marginTop: '4px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '14px' }}>
            <Button onClick={() => setStep(1)}>← Re-paste JD</Button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button onClick={handleClose}>Cancel</Button>
              <Button
                type="primary"
                loading={isSaving}
                style={{
                  background: '#0F172A',
                  borderColor: '#0F172A',
                  height: '38px',
                  padding: '0 22px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
                onClick={handleSaveFinal}
              >
                Save Application
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </Modal>
  );
}
