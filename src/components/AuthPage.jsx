import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/Supabase.js';
import { Input, Form, message } from 'antd';
import { 
  MailOutlined, 
  LockOutlined, 
  UserOutlined,
  GoogleOutlined,
  GithubOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { colors, typography } from '../theme/tokens';
import BrandLogo from './ui/BrandLogo';
import PrimaryButton from './ui/PrimaryButton';
import SecondaryButton from './ui/SecondaryButton';
import Card from './ui/Card';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, loading: authLoading } = useAuth();

  // Read URL search params for mode=signup or mode=login
  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get('mode');

  const [isLogin, setIsLogin] = useState(initialMode !== 'signup');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const callbackProcessed = useRef(false);

  useEffect(() => {
    if (initialMode === 'signup') {
      setIsLogin(false);
    } else if (initialMode === 'login') {
      setIsLogin(true);
    }
  }, [initialMode]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle session check and OAuth callback processing
  useEffect(() => {
    const handleAuthRedirect = async () => {
      if (authLoading || !session || !user || callbackProcessed.current) {
        return;
      }

      callbackProcessed.current = true;
      setLoading(true);

      try {
        // Check if user has a profile record
        const { data: profile } = await supabase
          .from('profile')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) {
          // New User (e.g. via Google OAuth or fresh signup)
          const userFullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
          
          await supabase
            .from('profile')
            .upsert([
              {
                id: user.id,
                full_name: userFullName,
                name: userFullName,
                email: user.email,
                avatar_url: user.user_metadata?.avatar_url || null,
                created_at: new Date().toISOString(),
              }
            ], { onConflict: 'id' });

          message.success('Account created! Please complete your profile.');
          navigate('/signup', { replace: true });
        } else {
          // Returning User with profile
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        }
      } catch (err) {
        console.error('Auth redirect processing error:', err);
        navigate('/dashboard', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    handleAuthRedirect();
  }, [user, session, authLoading, navigate, location]);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) throw error;
    } catch (err) {
      console.error('Google Login Error:', err);
      message.error(err.message || 'Failed to login with Google');
      setLoading(false);
    }
  };

  // Email Signup Handler - NEW USER
  const handleSignup = async (values) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.name,
            name: values.name,
          }
        }
      });

      if (error) throw error;

      if (data?.user) {
        await supabase
          .from('profile')
          .upsert([
            {
              id: data.user.id,
              full_name: values.name || '',
              name: values.name || '',
              email: values.email,
              created_at: new Date().toISOString()
            }
          ], { onConflict: 'id' });

        if (data.session) {
          message.success('Account created! Please complete your profile.');
          navigate('/signup', { replace: true });
        } else {
          message.info('Account registered! Please check your email to confirm.');
          setIsLogin(true);
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      message.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // Email Login Handler - RETURNING USER
  const handleLogin = async (values) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      message.success('Welcome back to Aplico!');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      message.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      background: colors.background,
      color: colors.textPrimary,
      fontFamily: typography.fontFamilySystem
    }}>
      
      {/* LEFT SIDE - BRAND PROMO */}
      {!isMobile && (
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          overflow: 'hidden',
          background: colors.surface,
          borderRight: `1px solid ${colors.cardBorder}`
        }}>
          {/* Top Brand Header */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ marginBottom: '16px' }}>
              <BrandLogo size={36} fontSize="24px" />
            </div>

            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: colors.textMuted,
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: 0
              }}
            >
              <ArrowLeftOutlined style={{ fontSize: '11px' }} /> Back to landing page
            </button>
          </div>

          {/* Brand Tagline */}
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '460px', marginBottom: '60px' }}>
            <h1 style={{
              fontSize: '40px',
              fontWeight: typography.weights.bold,
              color: colors.textPrimary,
              lineHeight: '1.2',
              letterSpacing: '-1.2px',
              marginBottom: '18px'
            }}>
              Track your journey <br />
              to{' '}
              <span style={{ color: colors.primary }}>
                dream opportunity
              </span>
            </h1>
            
            <p style={{
              fontSize: '16px',
              color: colors.textSecondary,
              lineHeight: '1.6',
              fontWeight: typography.weights.regular
            }}>
              Join thousands of students who land their dream opportunities with Aplico.
            </p>
          </div>

          {/* Bottom Card */}
          <Card style={{ padding: '20px', borderRadius: '16px' }}>
            <div style={{ fontSize: '14px', color: colors.textSecondary, fontWeight: 400, marginBottom: '6px' }}>
              "Aplico helped me stay completely organized during my opportunity search."
            </div>
            <div style={{ fontSize: '12px', color: colors.primary, fontWeight: 600 }}>
              — Engineering Student
            </div>
          </Card>
        </div>
      )}

      {/* RIGHT SIDE - AUTH FORM */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '40px 20px' : '60px',
        background: colors.background
      }}>
        <div style={{ maxWidth: '380px', width: '100%' }}>
          
          {/* Mobile Back Link */}
          {isMobile && (
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: colors.textMuted,
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '24px'
              }}
            >
              <ArrowLeftOutlined style={{ fontSize: '11px' }} /> Back to landing page
            </button>
          )}

          {/* Form Header */}
          <div style={{ textAlign: 'left', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: typography.weights.semibold, color: colors.textPrimary, marginBottom: '8px', letterSpacing: '-0.5px' }}>
              {isLogin ? 'Welcome back' : 'Get started'}
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
              {isLogin ? 'Sign in to continue to Aplico' : 'Create your free account'}
            </p>
          </div>

          {/* Form */}
          <Form onFinish={isLogin ? handleLogin : handleSignup} layout="vertical">
            {!isLogin && (
              <Form.Item
                name="name"
                rules={[{ required: true, message: 'Full name is required' }]}
                style={{ marginBottom: '16px' }}
              >
                <Input
                  prefix={<UserOutlined style={{ color: colors.textMuted, marginRight: '8px' }} />}
                  placeholder="Full name"
                  size="large"
                  style={{
                    background: colors.background,
                    border: `1px solid ${colors.borderNeutral}`,
                    borderRadius: '10px',
                    color: colors.textPrimary,
                    height: '46px'
                  }}
                />
              </Form.Item>
            )}

            <Form.Item
              name="email"
              rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
              style={{ marginBottom: '16px' }}
            >
              <Input
                prefix={<MailOutlined style={{ color: colors.textMuted, marginRight: '8px' }} />}
                placeholder="Email address"
                size="large"
                style={{
                  background: colors.background,
                  border: `1px solid ${colors.borderNeutral}`,
                  borderRadius: '10px',
                  color: colors.textPrimary,
                  height: '46px'
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Password is required' }]}
              style={{ marginBottom: isLogin ? '10px' : '24px' }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: colors.textMuted, marginRight: '8px' }} />}
                placeholder="Password"
                size="large"
                style={{
                  background: colors.background,
                  border: `1px solid ${colors.borderNeutral}`,
                  borderRadius: '10px',
                  color: colors.textPrimary,
                  height: '46px'
                }}
              />
            </Form.Item>

            {isLogin && (
              <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                <a href="#" style={{ color: colors.primary, fontSize: '13px', fontWeight: 500 }}>Forgot password?</a>
              </div>
            )}

            <PrimaryButton
              type="submit"
              disabled={loading || authLoading}
              style={{
                width: '100%',
                height: '46px',
                fontSize: '15px'
              }}
            >
              {loading || authLoading ? 'Processing...' : isLogin ? 'Log In' : 'Create Account'}
            </PrimaryButton>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '24px 0'
            }}>
              <div style={{ flex: 1, height: '1px', background: colors.cardBorder }} />
              <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 500 }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: colors.cardBorder }} />
            </div>

            {/* Social OAuth Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
              <SecondaryButton
                type="button"
                onClick={handleGoogleLogin}
                icon={<GoogleOutlined />}
                style={{
                  flex: 1,
                  height: '42px',
                  fontSize: '13px'
                }}
              >
                Google
              </SecondaryButton>

              <SecondaryButton
                type="button"
                icon={<GithubOutlined />}
                style={{
                  flex: 1,
                  height: '42px',
                  fontSize: '13px'
                }}
              >
                GitHub
              </SecondaryButton>
            </div>

            {/* Switch between Login and Signup */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
                {isLogin ? "No account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.primary,
                    cursor: 'pointer',
                    fontWeight: 500,
                    padding: 0
                  }}
                >
                  {isLogin ? 'Sign up' : 'Log in'}
                </button>
              </span>
            </div>
          </Form>

        </div>
      </div>
    </div>
  );
};

export default AuthPage;