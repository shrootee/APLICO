import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './components/LandingPage';
import MainDashboard from './pages/resumes/MainDashboard';
import Auth from './components/AuthPage';
import Signup from './components/Signup';
import MyResumes from './pages/resumes/MyResumes';       
import ResumeBuilder from './pages/resumes/ResumeBuilder'; 
import ATSChecker from './pages/resumes/ATSChecker'; 
import ResumeMatch from './pages/jobmatch/ResumeMatch';
import SkillGapAnalysis from './pages/jobmatch/SkillGapAnalysis';
import ApplicationsManager from './pages/applications/ApplicationsManager';
import SavedJobs from './pages/applications/SavedJobs';
import ArchivedApplications from './pages/applications/ArchivedApplications';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />

          {/* Protected Onboarding Route */}
          <Route
            path="/signup"
            element={
              <ProtectedRoute>
                <Signup />
              </ProtectedRoute>
            }
          />

          {/* Protected Dashboard & Module Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainDashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<MyResumes />} />
            
            {/* Resumes */}
            <Route path="resumes/all-resumes" element={<MyResumes />} />
            <Route path="resumes/ats-analysis" element={<ATSChecker />} />
            
            {/* Applications (Aligned with AppNavigation items) */}
            <Route path="applications/all" element={<ApplicationsManager />} />
            <Route path="applications/saved" element={<SavedJobs />} />
            <Route path="applications/archive" element={<ArchivedApplications />} />

            {/* Job Match */}
            <Route path="job-match/resume-match" element={<ResumeMatch />} />
            <Route path="job-match/skill-gap-analysis" element={<SkillGapAnalysis />} />

            {/* Interviews */}
            <Route path="interviews/tracker" element={<MyResumes />} />
            <Route path="interviews/prep" element={<MyResumes />} />

            {/* Analytics & Settings */}
            <Route path="analytics" element={<ATSChecker />} />
            <Route path="settings" element={<MyResumes />} />
          </Route>

          {/* Direct Route Shortcuts */}
          <Route path="/my-resumes" element={<Navigate to="/dashboard/resumes/all-resumes" replace />} />
          <Route path="/ats-checker" element={<Navigate to="/dashboard/resumes/ats-analysis" replace />} />
          <Route path="/job-match" element={<Navigate to="/dashboard/job-match/resume-match" replace />} />
          <Route path="/skill-gap" element={<Navigate to="/dashboard/job-match/skill-gap-analysis" replace />} />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;