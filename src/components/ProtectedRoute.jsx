import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const ProtectedRoute = ({ children }) => {
  const { user, session, loading, isEmailVerified } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#ffffff',
          gap: '16px',
        }}
      >
        <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: '#bd7efe' }} spin />} />
        <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
          Verifying session...
        </span>
      </div>
    );
  }

  if (!user || !session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Enforce email verification on all protected routes
  if (!isEmailVerified) {
    return (
      <Navigate
        to="/auth?verify=pending"
        replace
        state={{ unverifiedEmail: user?.email, from: location }}
      />
    );
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
