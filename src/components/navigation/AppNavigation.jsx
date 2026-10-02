import React, { useState, useMemo, useEffect } from 'react';
import { ConfigProvider, Layout, Menu, Input, Avatar, Dropdown, Button, Breadcrumb } from 'antd';
import {
  FileTextOutlined,
  ScanOutlined,
  FolderOpenOutlined,
  RadarChartOutlined,
  LineChartOutlined,
  CalendarOutlined,
  BookOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/aplico_logo.png';
import { colors } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';

const { Sider, Header, Content } = Layout;

function getItem(label, key, icon, children, type) {
  return {
    key,
    icon,
    children,
    label,
    type,
  };
}

// User specified navigation tree
const defaultMenuItems = [
  getItem('Resumes', 'resumes-group', <FileTextOutlined />, [
    getItem('All Resumes', '/dashboard/resumes/all-resumes', <FileTextOutlined />),
    getItem('ATS Scorer', '/dashboard/resumes/ats-analysis', <ScanOutlined />),
  ]),
  getItem('Applications', 'applications-group', <FolderOpenOutlined />, [
    getItem('All Applications', '/dashboard/applications/all', <FolderOpenOutlined />),
    getItem('Saved Jobs', '/dashboard/applications/saved', <FolderOpenOutlined />),
    getItem('Archive', '/dashboard/applications/archive', <FolderOpenOutlined />),
  ]),
  getItem('Job Match', 'job-match-group', <RadarChartOutlined />, [
    getItem('Resume Match', '/dashboard/job-match/resume-match', <RadarChartOutlined />),
    getItem('Skill Gap Analysis', '/dashboard/job-match/skill-gap-analysis', <LineChartOutlined />),
  ]),
  getItem('Interviews', 'interviews-group', <CalendarOutlined />, [
    getItem('Interview Tracker', '/dashboard/interviews/tracker', <CalendarOutlined />),
    getItem('Interview Preparation', '/dashboard/interviews/prep', <BookOutlined />),
  ]),
  getItem('Analytics', '/dashboard/analytics', <BarChartOutlined />),
  getItem('Settings', '/dashboard/settings', <SettingOutlined />),
];

const pathBreadcrumbMap = {
  '/dashboard': ['Main', 'Resumes'],
  '/dashboard/resumes/all-resumes': ['Resumes', 'All Resumes'],
  '/dashboard/resumes/ats-analysis': ['Resumes', 'ATS Scorer'],
  '/dashboard/applications/all': ['Applications', 'All Applications'],
  '/dashboard/applications/saved': ['Applications', 'Saved Jobs'],
  '/dashboard/applications/archive': ['Applications', 'Archive'],
  '/dashboard/job-match/resume-match': ['Job Match', 'Resume Match'],
  '/dashboard/job-match/skill-gap-analysis': ['Job Match', 'Skill Gap Analysis'],
  '/dashboard/interviews/tracker': ['Interviews', 'Interview Tracker'],
  '/dashboard/interviews/prep': ['Interviews', 'Interview Preparation'],
  '/dashboard/analytics': ['Insights', 'Analytics'],
  '/dashboard/settings': ['System', 'Settings'],
};

// Helper function to derive ONLY the active route's group key
const getActiveGroupKeys = (path) => {
  if (path.includes('/resumes/') || path.includes('/my-resumes') || path.includes('/ats-checker')) {
    return ['resumes-group'];
  }
  if (path.includes('/applications/')) {
    return ['applications-group'];
  }
  if (path.includes('/job-match/') || path.includes('/skill-gap')) {
    return ['job-match-group'];
  }
  if (path.includes('/interviews/')) {
    return ['interviews-group'];
  }
  // Default for index /dashboard
  if (path === '/dashboard' || path === '/') {
    return ['resumes-group'];
  }
  return [];
};

const AppNavigation = ({
  children,
  brandName = 'Aplico',
  menuItems = defaultMenuItems,
  style = {},
  siderStyle = {},
  headerStyle = {},
  contentStyle = {},
  className = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const currentPath = location.pathname;

  // Initialize openKeys to ONLY the group containing the current route
  const [openKeys, setOpenKeys] = useState(() => getActiveGroupKeys(location.pathname));

  const activeSelectedKeys = useMemo(() => {
    if (currentPath === '/dashboard') return ['/dashboard/resumes/all-resumes'];
    if (currentPath.includes('all-resumes')) return ['/dashboard/resumes/all-resumes'];
    if (currentPath.includes('ats-analysis')) return ['/dashboard/resumes/ats-analysis'];
    if (currentPath.includes('applications/all')) return ['/dashboard/applications/all'];
    if (currentPath.includes('applications/saved')) return ['/dashboard/applications/saved'];
    if (currentPath.includes('applications/archive')) return ['/dashboard/applications/archive'];
    if (currentPath.includes('resume-match')) return ['/dashboard/job-match/resume-match'];
    if (currentPath.includes('skill-gap-analysis')) return ['/dashboard/job-match/skill-gap-analysis'];
    if (currentPath.includes('interviews/tracker')) return ['/dashboard/interviews/tracker'];
    if (currentPath.includes('interviews/prep')) return ['/dashboard/interviews/prep'];
    if (currentPath.includes('analytics')) return ['/dashboard/analytics'];
    if (currentPath.includes('settings')) return ['/dashboard/settings'];
    return [currentPath];
  }, [currentPath]);

  // Sync openKeys when route changes, opening ONLY the group containing the current route
  useEffect(() => {
    const groupKeys = getActiveGroupKeys(currentPath);
    if (groupKeys.length > 0) {
      setOpenKeys(groupKeys);
    }
  }, [currentPath]);

  const onNavigate = (e) => {
    if (e.key && e.key.startsWith('/')) {
      navigate(e.key);
    }
  };

  const handleOpenChange = (keys) => {
    setOpenKeys(keys);
  };

  const currentBreadcrumbs = pathBreadcrumbMap[currentPath] || ['Dashboard', 'Page'];

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile Settings',
      icon: <UserOutlined />,
      onClick: () => navigate('/dashboard/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Sign Out',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: async () => {
        await signOut();
        navigate('/auth');
      },
    },
  ];

  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: colors.primary,
          colorLink: colors.primary,
          colorLinkHover: colors.primaryHover,
          borderRadius: 8,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        components: {
          Menu: {
            itemSelectedBg: '#ECFDF5',
            itemSelectedColor: colors.primary,
            itemHoverColor: colors.primary,
            itemHoverBg: '#F8FAFC',
            horizontalItemSelectedColor: colors.primary,
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden', background: '#f8fafc', ...style }} className={className}>
        <Layout style={{ height: '100vh', overflow: 'hidden' }}>
          {/* Sider - Clean Soft White Surface with Mint Theme (#34D399) */}
          <Sider
            trigger={null}
            collapsible
            collapsed={isCollapsed}
            theme="light"
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              height: '100vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRight: '1px solid #e2e8f0',
              boxShadow: '2px 0 12px rgba(0,0,0,0.03)',
              zIndex: 100,
              ...siderStyle,
            }}
          >
            {/* Brand Header */}
            <div
              style={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                paddingLeft: isCollapsed ? 0 : 24,
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/dashboard')}
              >
                <img src={logo} alt="Logo" style={{ width: '28px', height: '28px' }} />
              </div>
              {!isCollapsed && (
                <span
                  className="brand-text"
                  style={{
                    fontSize: '18px',
                    marginLeft: 12,
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate('/dashboard')}
                >
                  {brandName}
                </span>
              )}
            </div>

            <Menu
              theme="light"
              items={menuItems}
              selectedKeys={activeSelectedKeys}
              openKeys={openKeys}
              onOpenChange={handleOpenChange}
              onClick={onNavigate}
              style={{
                background: '#ffffff',
                borderInlineEnd: 0,
                paddingTop: '8px'
              }}
            />
          </Sider>

          {/* Main Layout Area */}
          <Layout
            style={{
              marginLeft: isCollapsed ? 80 : 200,
              transition: 'margin-left 0.2s ease',
              height: '100vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: '#f8fafc',
            }}
          >
            {/* Header */}
            <Header
              style={{
                background: '#ffffff',
                padding: '0 32px',
                display: 'flex',
                alignItems: 'center',
                gap: '32px',
                boxShadow: '0 1px 0 rgba(0,0,0,0.05)',
                borderBottom: '1px solid #e2e8f0',
                flexShrink: 0,
                ...headerStyle,
              }}
            >
              <Button
                type="text"
                icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{
                  fontSize: '16px',
                  width: 38,
                  height: 38,
                  color: '#4B5563',
                }}
              />

              <div style={{ flex: 1 }}>
                <Breadcrumb
                  items={currentBreadcrumbs.map((b) => ({ title: b }))}
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div style={{ width: '280px' }}>
                <Input
                  prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
                  placeholder="Search resumes, jobs..."
                  variant="filled"
                  style={{
                    borderRadius: '20px',
                    background: '#f1f5f9',
                    border: 'none',
                  }}
                />
              </div>

              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ color: '#4B5563', fontSize: '16px' }}
              />

              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    transition: 'background 0.2s',
                  }}
                >
                  <Avatar
                    src={avatarUrl}
                    icon={!avatarUrl && <UserOutlined />}
                    style={{ backgroundColor: colors.primaryLight, color: colors.primary }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
                      {displayName}
                    </span>
                    <span style={{ fontSize: '11px', color: '#6B7280', lineHeight: 1.2 }}>
                      Student Account
                    </span>
                  </div>
                </div>
              </Dropdown>
            </Header>

            {/* Main Content */}
            <Content
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '32px',
                background: '#f8fafc',
                ...contentStyle,
              }}
            >
              {children}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default AppNavigation;
