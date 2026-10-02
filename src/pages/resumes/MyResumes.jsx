import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/Supabase';
import {
  PlusOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Button, Card, Input, Modal, Upload, message, Empty, Spin, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import ResumeCard, { getFileIcon, formatFileSize } from '../../components/resume/ResumeCard';
import colors from '../../colors';

const MyResumes = () => {
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [resumeName, setResumeName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Single card selection state & outside click detection
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const resumesContainerRef = useRef(null);

  const BUCKET_NAME = 'MyResume';

  // Clear selection when user clicks anywhere outside a resume card
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        e.target.closest('.resume-card') ||
        e.target.closest('.ant-modal-root') ||
        e.target.closest('.ant-dropdown') ||
        e.target.closest('.ant-message') ||
        e.target.closest('.ant-tooltip')
      ) {
        return;
      }
      setSelectedResumeId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Card click toggle handler (selects card, or deselects if clicked again)
  const handleCardClick = (resume, e) => {
    if (e) e.stopPropagation();
    setSelectedResumeId((prevId) => (prevId === resume.id ? null : resume.id));
  };

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      try {
        setUserLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setUserLoading(false);
      }
    };
    getUser();
  }, []);

  // Fetch resumes when user is available
  useEffect(() => {
    if (user) {
      fetchResumes();
    }
  }, [user]);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Generate signed URLs for each resume
      const resumesWithUrls = await Promise.all(
        (data || []).map(async (resume) => {
          try {
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from(BUCKET_NAME)
              .createSignedUrl(resume.file_path, 60);

            if (signedUrlError) throw signedUrlError;

            return {
              ...resume,
              signedUrl: signedUrlData.signedUrl
            };
          } catch (err) {
            console.error('Error generating signed URL for resume:', resume.id, err);
            return resume;
          }
        })
      );

      setResumes(resumesWithUrls);
    } catch (error) {
      console.error('Error fetching resumes:', error);
      message.error('Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    const isPDF = file.type === 'application/pdf';
    const isDoc = file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isPDF && !isDoc) {
      message.error('Please upload PDF or Word document only');
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('File must be smaller than 5MB!');
      return false;
    }

    setSelectedFile(file);
    if (!resumeName) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setResumeName(nameWithoutExt);
    }
    return false;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      message.error('Please select a file to upload');
      return;
    }

    if (!resumeName.trim()) {
      message.error('Please enter a resume name');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      const { error: dbError } = await supabase
        .from('resumes')
        .insert([
          {
            user_id: user.id,
            resume_name: resumeName.trim(),
            target_role: targetRole.trim() || null,
            file_name: selectedFile.name,
            file_path: filePath,
            file_type: selectedFile.type,
            file_size: selectedFile.size,
            uploaded_at: new Date().toISOString(),
          }
        ]);

      if (dbError) throw dbError;

      setUploadProgress(100);
      message.success('Resume uploaded successfully!');

      setResumeName('');
      setTargetRole('');
      setSelectedFile(null);
      setModalVisible(false);
      setUploadProgress(0);

      await fetchResumes();

    } catch (error) {
      console.error('Error uploading resume:', error);
      message.error(error.message || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState(null);
  const [deletingResume, setDeletingResume] = useState(false);

  const handleConfirmDelete = async () => {
    if (!resumeToDelete) return;
    try {
      setDeletingResume(true);

      if (resumeToDelete.file_path) {
        const { error: storageError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([resumeToDelete.file_path]);

        if (storageError) console.error('Storage delete error:', storageError);
      }

      const { error: dbError } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeToDelete.id);

      if (dbError) throw dbError;

      message.success('Resume deleted successfully');

      if (selectedResumeId === resumeToDelete.id) {
        setSelectedResumeId(null);
      }
      setResumes((prevResumes) => prevResumes.filter((r) => r.id !== resumeToDelete.id));

      setDeleteModalVisible(false);
      setResumeToDelete(null);
    } catch (error) {
      console.error('Error deleting resume:', error);
      message.error(error.message || 'Failed to delete resume');
    } finally {
      setDeletingResume(false);
    }
  };

  const handleViewResume = async (resume) => {
    try {
      if (resume.signedUrl) {
        window.open(resume.signedUrl, '_blank');
        return;
      }

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(resume.file_path, 60);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing resume:', error);
      message.error('Failed to open resume');
    }
  };

  return (
    <div style={{
      padding: '0 20px',
      maxWidth: '1400px',
      margin: '0 auto',
    }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: colors.textPrimary,
            margin: 0,
            letterSpacing: '-0.5px',
          }}>
            My Resumes
          </h1>
          <p style={{
            color: colors.textSecondary,
            margin: '4px 0 0 0',
            fontSize: 14,
          }}>
            Manage and organize your resumes
          </p>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setModalVisible(true)}
          style={{
            background: colors.primary,
            border: 'none',
            borderRadius: 10,
            height: 44,
            padding: '0 24px',
            fontSize: 15,
            fontWeight: 600,
            boxShadow: colors.shadow,
          }}
        >
          Add Resume
        </Button>
      </div>

      {/* Main Content Area */}
      {userLoading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 300,
        }}>
          <Spin size="large" tip="Loading account..." />
        </div>
      ) : !user ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 300,
        }}>
          <Empty description="Please log in to view your resumes" />
        </div>
      ) : loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 300,
        }}>
          <Spin size="large" tip="Loading resumes..." />
        </div>
      ) : (
        <>
          {/* Resumes Grid Container with Outside Click Ref */}
          <div
            ref={resumesContainerRef}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 24,
              marginBottom: 32,
            }}
          >
            {/* Upload Action Card */}
            <Card
              hoverable
              style={{
                borderRadius: 16,
                border: `2px dashed ${colors.border}`,
                backgroundColor: colors.bgSecondary,
                minHeight: 200,
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
                }
              }}
              onClick={() => setModalVisible(true)}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${colors.primaryLight} 0%, ${colors.secondaryLight} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}>
                <PlusOutlined style={{ fontSize: 24, color: colors.secondary }} />
              </div>
              <h3 style={{
                fontSize: 16,
                fontWeight: 600,
                color: colors.textPrimary,
                margin: '0 0 4px 0',
              }}>
                Upload New Resume
              </h3>
              <p style={{
                fontSize: 13,
                color: colors.textLight,
                margin: 0,
              }}>
                PDF or Word (Max 5MB)
              </p>
            </Card>

            {/* Resume Cards with single selection and toggle behavior */}
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                selected={selectedResumeId === resume.id}
                onClick={handleCardClick}
                onView={handleViewResume}
                onDownload={handleViewResume}
                onDelete={(res, e) => {
                  if (e) e.stopPropagation();
                  setResumeToDelete(res);
                  setDeleteModalVisible(true);
                }}
              />
            ))}
          </div>

          {/* Empty State */}
          {resumes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <p style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 8 }}>
                      No resumes uploaded yet
                    </p>
                    <p style={{ fontSize: 14, color: colors.textLight }}>
                      Upload your first resume to get started
                    </p>
                  </div>
                }
              />
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary }}>
            Upload Resume
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setResumeName('');
          setTargetRole('');
          setSelectedFile(null);
          setUploadProgress(0);
        }}
        styles={{
          body: { paddingTop: 24 }
        }}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="upload"
            type="primary"
            icon={<UploadOutlined />}
            loading={uploading}
            onClick={handleUpload}
            style={{
              background: colors.primary,
              border: 'none',
              boxShadow: colors.shadow,
            }}
          >
            Upload Resume
          </Button>,
        ]}
        style={{ top: 20 }}
        width={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Resume Name */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontWeight: 500,
              color: colors.textLabel,
              fontSize: 14,
            }}>
              Resume Name <span style={{ color: colors.red }}>*</span>
            </label>
            <Input
              placeholder="e.g., Software Engineer Resume"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
              size="large"
              style={{ borderRadius: 8 }}
              maxLength={100}
              disabled={uploading}
            />
          </div>

          {/* Target Role */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontWeight: 500,
              color: colors.textLabel,
              fontSize: 14,
            }}>
              Target Role (Optional)
            </label>
            <Input
              placeholder="e.g., Full Stack Developer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              size="large"
              style={{ borderRadius: 8 }}
              maxLength={50}
              disabled={uploading}
            />
          </div>

          {/* File Upload */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontWeight: 500,
              color: colors.textLabel,
              fontSize: 14,
            }}>
              File <span style={{ color: colors.red }}>*</span>
            </label>
            <Upload.Dragger
              beforeUpload={handleFileSelect}
              fileList={selectedFile ? [selectedFile] : []}
              onRemove={() => setSelectedFile(null)}
              disabled={uploading}
              maxCount={1}
              style={{ borderRadius: 8 }}
            >
              <p className="ant-upload-drag-icon">
                <FilePdfOutlined style={{ fontSize: 48, color: colors.secondary }} />
              </p>
              <p className="ant-upload-text" style={{ fontWeight: 500, color: colors.textPrimary }}>
                Click or drag file to upload
              </p>
              <p className="ant-upload-hint" style={{ color: colors.textLight }}>
                Supports PDF, DOC, DOCX (Max 5MB)
              </p>
            </Upload.Dragger>
          </div>

          {selectedFile && (
            <div style={{
              padding: 12,
              background: colors.bgLight,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              {getFileIcon(selectedFile.type)}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: colors.textPrimary }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: 12, color: colors.textLight }}>
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div style={{ marginTop: 8 }}>
              <div style={{
                height: 4,
                background: colors.border,
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${uploadProgress}%`,
                  background: colors.gradient,
                  transition: 'width 0.3s ease',
                  borderRadius: 2,
                }} />
              </div>
              <div style={{
                fontSize: 12,
                color: colors.textLight,
                marginTop: 4,
                textAlign: 'right',
              }}>
                {uploadProgress}%
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: colors.textPrimary, fontSize: 18, fontWeight: 600 }}>
            <ExclamationCircleOutlined style={{ color: colors.red || '#EF4444', fontSize: 20 }} />
            Delete Resume?
          </div>
        }
        open={deleteModalVisible}
        onCancel={() => {
          if (!deletingResume) {
            setDeleteModalVisible(false);
            setResumeToDelete(null);
          }
        }}
        footer={[
          <Button
            key="cancel"
            disabled={deletingResume}
            onClick={() => {
              setDeleteModalVisible(false);
              setResumeToDelete(null);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="delete"
            type="primary"
            danger
            loading={deletingResume}
            onClick={handleConfirmDelete}
            style={{ fontWeight: 600 }}
          >
            Delete
          </Button>,
        ]}
        width={460}
        style={{ top: 120 }}
      >
        <p style={{ fontSize: 14, color: colors.textSecondary, margin: '16px 0 8px 0', lineHeight: 1.5 }}>
          Are you sure you want to delete <strong style={{ color: colors.textPrimary }}>"{resumeToDelete?.resume_name || resumeToDelete?.file_name}"</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default MyResumes;