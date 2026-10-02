import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckOutlined,
  ArrowRightOutlined,
  MailOutlined,
  PlusOutlined,
  SafetyOutlined,
  InfoCircleOutlined,
  LockOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { Button } from 'antd';

export default function ApplicationTrackerOverview({ onContinue, onSkip }) {
  const [connectEmailSelected, setConnectEmailSelected] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('gmail'); // 'gmail' | 'outlook'

  // Handles completion
  const handleProceed = (emailChoice = connectEmailSelected) => {
    if (onContinue) {
      onContinue({ emailSyncEnabled: emailChoice, provider: emailChoice ? selectedProvider : null });
    }
  };

  const handleSkipNow = () => {
    if (onSkip) {
      onSkip();
    } else {
      handleProceed(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '32px 20px 64px 20px',
        color: '#0F172A',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Editorial Header Kicker */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '16px',
          marginBottom: '36px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#334155',
              background: '#F1F5F9',
              padding: '3px 9px',
              borderRadius: '4px',
              border: '1px solid #E2E8F0',
            }}
          >
            System Guide
          </span>
          <span style={{ fontSize: '13px', color: '#64748B' }}>
            Aplico Application Engine
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B' }}>
          <SafetyOutlined style={{ color: '#0F172A' }} />
          <span>Full user control</span>
        </div>
      </motion.div>

      {/* Main Editorial Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        style={{ marginBottom: '48px' }}
      >
        <h1
          style={{
            fontSize: '40px',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            color: '#0F172A',
            marginBottom: '16px',
            maxWidth: '780px',
          }}
        >
          Track your job search with structure & optional automation.
        </h1>
        <p
          style={{
            fontSize: '18px',
            lineHeight: 1.6,
            color: '#475569',
            maxWidth: '720px',
            fontWeight: 400,
          }}
        >
          Aplico provides a clean workspace to manage job applications, interview timelines, and resume versions. Choose to track roles manually, or optionally connect your inbox for automated status detection.
        </p>
      </motion.section>

      {/* Core Dual Approach Section - Restrained Architecture */}
      <div style={{ marginBottom: '56px' }}>
        {/* Subtle Section Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#64748B',
            }}
          >
            Tracking Approaches
          </span>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
        </div>

        {/* Dual Approach Columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            alignItems: 'stretch',
          }}
        >
          {/* Approach 1: Manual Tracking */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Minimalist Top Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', letterSpacing: '0.08em' }}>
                  APPROACH 01
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#475569',
                    background: '#F8FAFC',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  Standard Default
                </span>
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '10px', letterSpacing: '-0.015em' }}>
                Manual Tracking
              </h2>

              <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#475569', marginBottom: '24px' }}>
                Add applications yourself using <strong>+ Add Application</strong>. Record company names, role details, salary ranges, custom interview dates, resume versions used, and personal notes.
              </p>

              {/* Abstract Visual Element 1: Minimalist Pipeline Progression */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Pipeline Stages
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {['Saved', 'Applied', 'Interview', 'Offer'].map((stage, idx) => (
                    <React.Fragment key={stage}>
                      <div
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#334155',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {stage}
                      </div>
                      {idx < 3 && <span style={{ color: '#CBD5E1', fontSize: '11px' }}>→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Core Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                <CheckOutlined style={{ color: '#0F172A', fontSize: '11px' }} />
                <span>Always active & fully customizable</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                <CheckOutlined style={{ color: '#0F172A', fontSize: '11px' }} />
                <span>Attach tailored resumes to each application</span>
              </div>
            </div>
          </motion.div>

          {/* Approach 2: Email-Assisted Tracking */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.22 }}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Minimalist Top Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', letterSpacing: '0.08em' }}>
                  APPROACH 02
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#334155',
                    background: '#F1F5F9',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                  }}
                >
                  Optional Automation
                </span>
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '10px', letterSpacing: '-0.015em' }}>
                Email-Assisted Tracking
              </h2>

              <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#475569', marginBottom: '24px' }}>
                Optionally connect your Gmail or Outlook inbox. Aplico detects application confirmations, assessment links, interview calls, and status updates — parsing details hands-free.
              </p>

              {/* Abstract Visual Element 2: Quiet Ingestion Stream */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Inbox Detection Stream
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <LockOutlined style={{ fontSize: '10px' }} /> Read-only
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '6px 10px', borderRadius: '4px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                    <span style={{ color: '#334155' }}>"Application confirmed — Stripe"</span>
                    <span style={{ fontWeight: 600, color: '#0F172A', background: '#F1F5F9', padding: '1px 6px', borderRadius: '3px', fontSize: '11px' }}>Created</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '6px 10px', borderRadius: '4px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                    <span style={{ color: '#334155' }}>"Figma Technical Interview"</span>
                    <span style={{ fontWeight: 600, color: '#0F172A', background: '#F1F5F9', padding: '1px 6px', borderRadius: '3px', fontSize: '11px' }}>Interview</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                <CheckOutlined style={{ color: '#0F172A', fontSize: '11px' }} />
                <span>100% Optional — enable or disable anytime</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                <CheckOutlined style={{ color: '#0F172A', fontSize: '11px' }} />
                <span>Manual adding remains available at all times</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Editorial Reassurance Banner: Quiet Neutral Composition */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.28 }}
        style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '24px 28px',
          marginBottom: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <InfoCircleOutlined style={{ color: '#334155', fontSize: '15px' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
              Email integration is an optional layer, not a replacement.
            </h3>
          </div>
          <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
            Even after connecting an inbox, you can always manually create applications using <strong>+ Add Application</strong> or edit any details directly.
          </p>
        </div>

        <div
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#334155',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            padding: '6px 12px',
            borderRadius: '4px',
          }}
        >
          Manual entry preserved
        </div>
      </motion.section>

      {/* Interactive Setup Selection (Subtle Neutral Contrast) */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        style={{
          borderTop: '1px solid #E2E8F0',
          paddingTop: '36px',
          marginBottom: '40px',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
          Setup Preference
        </h3>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>
          Select how you want to start. You can enable or disconnect email integration later from Settings.
        </p>

        {/* Option 1: Manual Only */}
        <div
          onClick={() => setConnectEmailSelected(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderRadius: '8px',
            border: !connectEmailSelected ? '2px solid #0F172A' : '1px solid #E2E8F0',
            background: !connectEmailSelected ? '#FFFFFF' : '#F8FAFC',
            marginBottom: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: !connectEmailSelected ? '5px solid #0F172A' : '2px solid #94A3B8',
                background: '#FFFFFF',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: '15px', fontWeight: !connectEmailSelected ? 600 : 500, color: '#0F172A' }}>
                Proceed with Manual Tracking Only
              </div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Manually input and manage applications. Email sync remains disabled.
              </div>
            </div>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569', background: '#F1F5F9', padding: '3px 8px', borderRadius: '4px' }}>
            Default
          </span>
        </div>

        {/* Option 2: Connect Inbox */}
        <div
          onClick={() => setConnectEmailSelected(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderRadius: '8px',
            border: connectEmailSelected ? '2px solid #0F172A' : '1px solid #E2E8F0',
            background: connectEmailSelected ? '#FFFFFF' : '#F8FAFC',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: connectEmailSelected ? '5px solid #0F172A' : '2px solid #94A3B8',
                background: '#FFFFFF',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: '15px', fontWeight: connectEmailSelected ? 600 : 500, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Connect Email Inbox for Assisted Sync</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#475569', background: '#F1F5F9', padding: '2px 6px', borderRadius: '3px', border: '1px solid #E2E8F0' }}>
                  Optional
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Automatically detect updates from job applications in Gmail or Outlook.
              </div>
            </div>
          </div>

          {connectEmailSelected && (
            <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
              <Button
                size="small"
                style={{
                  background: selectedProvider === 'gmail' ? '#0F172A' : '#FFFFFF',
                  color: selectedProvider === 'gmail' ? '#FFFFFF' : '#334155',
                  borderColor: selectedProvider === 'gmail' ? '#0F172A' : '#CBD5E1',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
                onClick={() => setSelectedProvider('gmail')}
              >
                Gmail
              </Button>
              <Button
                size="small"
                style={{
                  background: selectedProvider === 'outlook' ? '#0F172A' : '#FFFFFF',
                  color: selectedProvider === 'outlook' ? '#FFFFFF' : '#334155',
                  borderColor: selectedProvider === 'outlook' ? '#0F172A' : '#CBD5E1',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
                onClick={() => setSelectedProvider('outlook')}
              >
                Outlook
              </Button>
            </div>
          )}
        </div>
      </motion.section>

      {/* Footer Actions: Skip for now / Continue */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.42 }}
        style={{
          borderTop: '1px solid #E2E8F0',
          paddingTop: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ fontSize: '13px', color: '#64748B' }}>
          Inbox settings can be changed at any time from the Applications page.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            type="text"
            style={{
              color: '#475569',
              fontWeight: 500,
              fontSize: '14px',
              height: '40px',
              padding: '0 16px',
            }}
            onClick={handleSkipNow}
          >
            Skip for now
          </Button>

          <Button
            type="primary"
            style={{
              background: '#0F172A',
              borderColor: '#0F172A',
              height: '40px',
              padding: '0 24px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onClick={() => handleProceed(connectEmailSelected)}
          >
            <span>{connectEmailSelected ? 'Connect & Continue' : 'Continue to Applications'}</span>
            <ArrowRightOutlined />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
