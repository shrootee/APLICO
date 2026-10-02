import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PlusOutlined,
  MailOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  InfoCircleOutlined,
  LockOutlined,
  InboxOutlined,
  ReloadOutlined,
  WarningOutlined
} from '@ant-design/icons';
import {
  Button,
  Input,
  Select,
  Modal,
  Tooltip,
  message,
  Switch,
  Spin,
  Empty
} from 'antd';
import AddApplicationModal from '../../components/applications/AddApplicationModal';
import {
  fetchApplicationsFromSupabase,
  updateApplicationStatusInSupabase
} from '../../services/applicationService';

const STATUS_COLORS = {
  Saved: { bg: '#F8FAFC', border: '#E2E8F0', text: '#475569' },
  Applied: { bg: '#F1F5F9', border: '#CBD5E1', text: '#0F172A' },
  Interview: { bg: '#F1F5F9', border: '#CBD5E1', text: '#0F172A' },
  Offer: { bg: '#F8FAFC', border: '#0F172A', text: '#0F172A' },
  Rejected: { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B' },
};

export default function ApplicationsDashboard({
  emailSyncEnabled = false,
  onRevisitOverview,
  onToggleEmailSync
}) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [viewStyle, setViewStyle] = useState('table'); // 'kanban' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSyncActive, setIsSyncActive] = useState(emailSyncEnabled);

  // Load real applications from Supabase for the authenticated user
  const loadUserApplications = async () => {
    setLoading(true);
    setErrorMsg(null);

    const res = await fetchApplicationsFromSupabase();

    if (res.error) {
      setErrorMsg(res.error);
      setApplications([]);
    } else {
      setApplications(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUserApplications();
  }, []);

  // Handle Application Created via AddApplicationModal
  const handleApplicationCreated = (newAppRecord) => {
    if (newAppRecord) {
      setApplications((prev) => [newAppRecord, ...prev.filter((a) => a.id !== newAppRecord.id)]);
    }
  };

  // Filtered List for Search Query
  const filteredApplications = applications.filter((app) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        app.company.toLowerCase().includes(q) ||
        app.role.toLowerCase().includes(q) ||
        (app.notes && app.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const updateStatus = (id, newStatus) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );
    updateApplicationStatusInSupabase(id, newStatus);
    message.info(`Status updated to ${newStatus}`);
  };

  return (
    <div
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        paddingBottom: '60px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top Banner: Sync Integration & Overview */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '14px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: '#F1F5F9',
              color: '#334155',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid #CBD5E1',
            }}
          >
            {isSyncActive ? <MailOutlined /> : <LockOutlined />}
            <span>{isSyncActive ? 'Email-Assisted Sync Active' : 'Manual Mode Active'}</span>
          </div>

          <span style={{ fontSize: '13px', color: '#64748B' }}>
            {isSyncActive
              ? 'Gmail inbox connected. Parsing application receipts & interviews.'
              : 'Add applications manually using + Add Application.'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            type="default"
            size="small"
            style={{
              fontSize: '12px',
              borderRadius: '4px',
              borderColor: '#CBD5E1',
              color: '#334155',
            }}
            onClick={onRevisitOverview}
          >
            <InfoCircleOutlined /> How Tracking Works (Overview)
          </Button>

          <Button
            type="default"
            size="small"
            style={{
              fontSize: '12px',
              borderRadius: '4px',
              borderColor: '#CBD5E1',
              color: '#0F172A',
              background: '#F8FAFC',
            }}
            onClick={() => setIsEmailModalOpen(true)}
          >
            <MailOutlined /> {isSyncActive ? 'Email Settings' : 'Connect Email'}
          </Button>
        </div>
      </div>

      {/* Main Header & Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            All Applications
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
            Active application pipeline & interview management.
          </p>
        </div>

        {/* Action: + Add Application */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{
            background: '#0F172A',
            borderColor: '#0F172A',
            height: '40px',
            color: '#FFFFFF',

            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '14px',
            padding: '0 18px',
          }}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Application
        </Button>
      </div>

      {/* Control Bar: Search & View Style Toggle */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
            placeholder="Search by company, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '260px',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          />
          <span style={{ fontSize: '13px', color: '#64748B' }}>
            {filteredApplications.length} active roles
          </span>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', border: '1px solid #CBD5E1', borderRadius: '4px', overflow: 'hidden' }}>
          <button
            onClick={() => setViewStyle('kanban')}
            style={{
              background: viewStyle === 'kanban' ? '#F1F5F9' : '#FFFFFF',
              border: 'none',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              color: viewStyle === 'kanban' ? '#0F172A' : '#64748B',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AppstoreOutlined /> Kanban
          </button>
          <button
            onClick={() => setViewStyle('table')}
            style={{
              background: viewStyle === 'table' ? '#F1F5F9' : '#FFFFFF',
              border: 'none',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              color: viewStyle === 'table' ? '#0F172A' : '#64748B',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UnorderedListOutlined /> Table
          </button>
        </div>
      </div>

      {/* Loading Spinner State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: '14px', fontSize: '14px', color: '#64748B' }}>
            Loading your applications from Supabase...
          </div>
        </div>
      )}

      {/* Database Error State */}
      {!loading && errorMsg && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px',
            color: '#991B1B',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
            <WarningOutlined style={{ fontSize: '20px' }} />
            <span>Database Fetch Error</span>
          </div>
          <p style={{ fontSize: '13px', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            {errorMsg}
          </p>
          <Button
            icon={<ReloadOutlined />}
            style={{ background: '#991B1B', borderColor: '#991B1B', color: '#FFFFFF' }}
            onClick={loadUserApplications}
          >
            Retry Supabase Fetch
          </Button>
        </div>
      )}

      {/* Empty Applications State (No Fake Data) */}
      {!loading && !errorMsg && applications.length === 0 && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '60px 20px',
            textAlign: 'center',
          }}
        >
          <InboxOutlined style={{ fontSize: '48px', color: '#CBD5E1', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>
            No applications tracked yet
          </h3>
          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '420px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
            Start tracking your job search. Click below to add your first job description for AI extraction or manual tracking.
          </p>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{
              background: '#0F172A',
              borderColor: '#0F172A',
              height: '42px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '14px',
              padding: '0 24px',
            }}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Application
          </Button>
        </div>
      )}

      {/* Main Content Area: Kanban View vs Table View */}
      {!loading && !errorMsg && applications.length > 0 && (
        viewStyle === 'kanban' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            {['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'].map((columnStatus) => {
              const columnApps = filteredApplications.filter((a) => a.status === columnStatus);
              const style = STATUS_COLORS[columnStatus];

              return (
                <div
                  key={columnStatus}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '14px',
                    minHeight: '400px',
                  }}
                >
                  {/* Column Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #E2E8F0',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: style.text,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {columnStatus}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#64748B',
                        background: '#FFFFFF',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      {columnApps.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {columnApps.map((app) => (
                      <motion.div
                        key={app.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                            {app.company}
                          </h4>
                          {app.source === 'Email-Assisted' && (
                            <Tooltip title="Auto-synced from email">
                              <span style={{ fontSize: '10px', color: '#475569', background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '1px 5px', borderRadius: '3px' }}>
                                Auto
                              </span>
                            </Tooltip>
                          )}
                        </div>

                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '8px' }}>
                          {app.role}
                        </div>

                        <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '10px' }}>
                          Applied: {app.appliedDate}
                        </div>

                        {/* Status Selector Dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #F8FAFC' }}>
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>{app.source}</span>
                          <Select
                            size="small"
                            value={app.status}
                            onChange={(val) => updateStatus(app.id, val)}
                            variant="filled"
                            style={{ width: '100px', fontSize: '11px' }}
                            options={[
                              { value: 'Saved', label: 'Saved' },
                              { value: 'Applied', label: 'Applied' },
                              { value: 'Interview', label: 'Interview' },
                              { value: 'Offer', label: 'Offer' },
                              { value: 'Rejected', label: 'Rejected' },
                            ]}
                          />
                        </div>
                      </motion.div>
                    ))}

                    {columnApps.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '28px 10px', color: '#94A3B8', fontSize: '12px' }}>
                        No applications
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Company</th>
                  <th style={{ padding: '12px 16px' }}>Role</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Tracking Source</th>
                  <th style={{ padding: '12px 16px' }}>Resume Attached</th>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => {
                  const s = STATUS_COLORS[app.status] || STATUS_COLORS.Saved;
                  return (
                    <tr key={app.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{app.company}</td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>{app.role}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, padding: '3px 8px', borderRadius: '4px', fontWeight: 500, fontSize: '12px' }}>
                          {app.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 500 }}>
                        {app.source}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>{app.resumeUsed}</td>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>{app.appliedDate}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <Select
                          size="small"
                          value={app.status}
                          onChange={(val) => updateStatus(app.id, val)}
                          style={{ width: '105px', fontSize: '12px' }}
                          options={[
                            { value: 'Saved', label: 'Saved' },
                            { value: 'Applied', label: 'Applied' },
                            { value: 'Interview', label: 'Interview' },
                            { value: 'Offer', label: 'Offer' },
                            { value: 'Rejected', label: 'Rejected' },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal: AI-Powered Add Application Flow */}
      <AddApplicationModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaveSuccess={handleApplicationCreated}
      />

      {/* Modal: Email Sync Settings & Integration */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A', fontSize: '16px', fontWeight: 700 }}>
            <MailOutlined />
            <span>Email-Assisted Sync Integration</span>
          </div>
        }
        open={isEmailModalOpen}
        onCancel={() => setIsEmailModalOpen(false)}
        footer={null}
      >
        <div style={{ padding: '4px 0' }}>
          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '18px' }}>
            Aplico can automatically detect confirmation emails, assessment links, interview invitations, and status changes from your inbox.
          </p>

          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                Automated Inbox Scanning
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Read-only connection to parse job updates
              </div>
            </div>

            <Switch
              checked={isSyncActive}
              onChange={(checked) => {
                setIsSyncActive(checked);
                if (onToggleEmailSync) onToggleEmailSync(checked);
                message.info(checked ? 'Email-assisted sync enabled.' : 'Email sync disabled.');
              }}
            />
          </div>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px', textAlign: 'right' }}>
            <Button type="primary" style={{ background: '#0F172A', borderColor: '#0F172A' }} onClick={() => setIsEmailModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
