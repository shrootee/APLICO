import React, { useState, useEffect } from 'react';
import { FolderOpenOutlined, SearchOutlined, ReloadOutlined, InboxOutlined } from '@ant-design/icons';
import { Button, Input, message, Spin } from 'antd';
import { fetchApplicationsFromSupabase, updateApplicationStatusInSupabase } from '../../services/applicationService';

export default function ArchivedApplications() {
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadArchivedApplications = async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await fetchApplicationsFromSupabase();

    if (res.error) {
      setErrorMsg(res.error);
      setArchived([]);
    } else {
      // Filter for rejected/archived applications
      const rejectedOrArchived = (res.data || []).filter((app) => app.status === 'Rejected');
      setArchived(rejectedOrArchived);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadArchivedApplications();
  }, []);

  const filteredArchived = archived.filter(
    (item) =>
      item.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRestore = async (id, company) => {
    setArchived(archived.filter((a) => a.id !== id));
    await updateApplicationStatusInSupabase(id, 'Applied');
    message.success(`Restored ${company} back to Active Application Tracker`);
  };

  return (
    <div
      style={{
        maxWidth: '1120px',
        margin: '0 auto',
        paddingBottom: '60px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
          Archived Applications
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
          Historical record of closed, rejected, or completed job applications.
        </p>
      </div>

      {/* Control Bar */}
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
        }}
      >
        <Input
          prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
          placeholder="Search archive..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '260px', borderRadius: '4px', fontSize: '13px' }}
        />
        <span style={{ fontSize: '13px', color: '#64748B' }}>
          {filteredArchived.length} archived items
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#64748B' }}>
            Loading archived applications from Supabase...
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && errorMsg && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '18px 20px', borderRadius: '8px', color: '#991B1B' }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>Error Loading Archive</div>
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !errorMsg && archived.length === 0 && (
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
            No archived applications found
          </h3>
          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '400px', margin: '0 auto' }}>
            When an application status is marked as Rejected, it will appear in your archived applications history.
          </p>
        </div>
      )}

      {/* Table View */}
      {!loading && !errorMsg && archived.length > 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Company</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Final Outcome</th>
                <th style={{ padding: '12px 16px' }}>Applied Date</th>
                <th style={{ padding: '12px 16px' }}>Resume Used</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredArchived.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{item.company}</td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>{item.role}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748B' }}>{item.appliedDate}</td>
                  <td style={{ padding: '12px 16px', color: '#64748B' }}>{item.resumeUsed}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => handleRestore(item.id, item.company)}
                      style={{ fontSize: '12px' }}
                    >
                      Restore
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
