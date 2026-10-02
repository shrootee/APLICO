import React, { useState, useEffect } from 'react';
import ApplicationTrackerOverview from './ApplicationTrackerOverview';
import ApplicationsDashboard from './ApplicationsDashboard';

export default function ApplicationsManager() {
  // Check if overview has been dismissed before
  const [hasSeenOverview, setHasSeenOverview] = useState(() => {
    const saved = localStorage.getItem('aplico_tracker_overview_seen');
    return saved === 'true';
  });

  const [emailSyncEnabled, setEmailSyncEnabled] = useState(() => {
    const saved = localStorage.getItem('aplico_email_sync_enabled');
    return saved === 'true';
  });

  const [forceOverviewMode, setForceOverviewMode] = useState(false);

  // Synchronize localStorage
  useEffect(() => {
    localStorage.setItem('aplico_tracker_overview_seen', hasSeenOverview ? 'true' : 'false');
  }, [hasSeenOverview]);

  useEffect(() => {
    localStorage.setItem('aplico_email_sync_enabled', emailSyncEnabled ? 'true' : 'false');
  }, [emailSyncEnabled]);

  const handleContinueFromOverview = (settings) => {
    if (settings && typeof settings.emailSyncEnabled === 'boolean') {
      setEmailSyncEnabled(settings.emailSyncEnabled);
    }
    setHasSeenOverview(true);
    setForceOverviewMode(false);
  };

  const handleSkipFromOverview = () => {
    setEmailSyncEnabled(false);
    setHasSeenOverview(true);
    setForceOverviewMode(false);
  };

  const handleRevisitOverview = () => {
    setForceOverviewMode(true);
  };

  const handleToggleEmailSync = (enabled) => {
    setEmailSyncEnabled(enabled);
  };

  // If first time OR user explicitly clicked "Revisit Overview", show ApplicationTrackerOverview
  if (!hasSeenOverview || forceOverviewMode) {
    return (
      <ApplicationTrackerOverview
        onContinue={handleContinueFromOverview}
        onSkip={handleSkipFromOverview}
      />
    );
  }

  // Otherwise, render full All Applications Dashboard
  return (
    <ApplicationsDashboard
      emailSyncEnabled={emailSyncEnabled}
      onRevisitOverview={handleRevisitOverview}
      onToggleEmailSync={handleToggleEmailSync}
    />
  );
}
