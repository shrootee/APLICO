import React, { useState } from 'react';
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from '../../context/AuthContext';
import { message } from 'antd';
import AppNavigation from '@/components/navigation/AppNavigation';

/**
 * MainDashboard Page Layout
 * Uses the reusable AppNavigation component as the single source of truth for navigation.
 */
const MainDashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      message.success('Logged out successfully');
      navigate('/auth', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
      message.error('Failed to log out');
    }
  };

  return (
    <AppNavigation
      selectedKey={location.pathname}
      onNavigate={({ key }) => navigate(key)}
      collapsed={collapsed}
      onCollapse={setCollapsed}
      user={user}
      profile={profile}
      onLogout={handleLogout}
    >
      <Outlet />
    </AppNavigation>
  );
};

export default MainDashboard;