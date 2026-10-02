import React, { useState, useEffect } from 'react';
import { StarOutlined, SearchOutlined, ArrowRightOutlined, DeleteOutlined, InboxOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Input, message, Spin } from 'antd';
import { fetchApplicationsFromSupabase, updateApplicationStatusInSupabase } from '../../services/applicationService';
import colors from '../../colors';
export default function SavedJobs() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadSavedJobs = async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await fetchApplicationsFromSupabase();

    if (res.error) {
      setErrorMsg(res.error);
      setSavedJobs([]);
    } else {
      // Filter for applications with status === 'Saved'
      const onlySaved = (res.data || []).filter((app) => app.status === 'Saved');
      setSavedJobs(onlySaved);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSavedJobs();
  }, []);

  const filteredJobs = savedJobs.filter(
    (job) =>
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMoveToTracker = async (id, company) => {
    setSavedJobs(savedJobs.filter((j) => j.id !== id));
    await updateApplicationStatusInSupabase(id, 'Applied');
    message.success(`Moved ${company} to Applied status in Active Tracker!`);
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
          Saved Jobs
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
          Bookmarked opportunities to review, prepare, and apply to later.
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
          placeholder="Filter saved jobs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '260px', borderRadius: '4px', fontSize: '13px' }}
        />
        <span style={{ fontSize: '13px', color: '#64748B' }}>
          {filteredJobs.length} bookmarked roles
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#64748B' }}>
            Loading saved jobs from Supabase...
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && errorMsg && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '18px 20px', borderRadius: '8px', color: '#991B1B' }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>Error Loading Saved Jobs</div>
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !errorMsg && savedJobs.length === 0 && (
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
            No saved jobs found
          </h3>
          <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '400px', margin: '0 auto' }}>
            When you track a job with "No, planning to apply", it will appear here in your saved jobs list.
          </p>
        </div>
      )}

      {/* Cards Grid */}
      {!loading && !errorMsg && savedJobs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {job.company}
                  </h3>
                  <span style={{ fontSize: '11px', color: '#64748B', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>
                    Saved {job.appliedDate}
                  </span>
                </div>

                <div style={{ fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '12px' }}>
                  {job.role}
                </div>

                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>
                  📍 {job.location} • {job.salary}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                <Button
                  type="primary"
                  size="small"
                  style={{
                    background: '#0F172A',
                    borderColor: '#0F172A',
                    fontSize: '12px'
                  }}
                  onClick={() => handleMoveToTracker(job.id, job.company)}
                >
                  <span style={{ color: colors.divider }}>
                    Apply & Move to Tracker
                  </span>
                  <ArrowRightOutlined style={{ color: colors.divider }} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
