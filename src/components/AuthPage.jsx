import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/Supabase.js';
import { Input, Form, message, Alert } from 'antd';
import {
  MailOutlined,
  LockOutlined,
  UserOutlined,
  GoogleOutlined,
  GithubOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { colors, typography } from '../theme/tokens';
import BrandLogo from './ui/BrandLogo';
import PrimaryButton from './ui/PrimaryButton';
import SecondaryButton from './ui/SecondaryButton';
import Card from './ui/Card';

// Dedicated Email Verification redirect URL (Targets dedicated /verify-email route)
const getEmailVerifyRedirectUrl = () => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/verify-email`;
  }
  return 'https://aplico-black.vercel.app/verify-email';
};

// OAuth redirect URL (Preserved for Google and GitHub OAuth)
const getOAuthRedirectUrl = () => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/auth`;
  }
  return 'https://aplico-black.vercel.app/auth';
};

// Helper to format Supabase auth errors (prevents literal '{}' and handles 500 SMTP errors)
const parseAuthError = (error, fallback = 'An unexpected error occurred') => {
  if (!error) return fallback;
  if (error.status >= 500 || error.name === 'AuthRetryableFetchError' || error.message === '{}') {
    return 'Server error (500): Failed to send confirmation email. Please verify your custom SMTP configuration in Supabase.';
  }
  if (error.message && error.message !== '{}') {
    return error.message;
  }
  return fallback;
};

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, loading: authLoading } = useAuth();

  // Read URL search params for mode=signup, mode=login, or verify=pending
  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get('mode');
  const verifyParam = searchParams.get('verify');
  const stateEmail = location.state?.unverifiedEmail;

  const [form] = Form.useForm();
  const [isLogin, setIsLogin] = useState(initialMode !== 'signup');
  const [loading, setLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState(stateEmail || '');
  const [signupSuccessEmail, setSignupSuccessEmail] = useState(
    verifyParam === 'pending' && stateEmail ? stateEmail : ''
  );
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const callbackProcessed = useRef(false);

  // Cooldown timer for resending confirmation email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (initialMode === 'signup') {
      setIsLogin(false);
    } else if (initialMode === 'login') {
      setIsLogin(true);
    }
  }, [initialMode]);

  useEffect(() => {
    if (verifyParam === 'pending' && stateEmail) {
      setSignupSuccessEmail(stateEmail);
      setResendEmail(stateEmail);
    }
  }, [verifyParam, stateEmail]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle OAuth & Email Verification parameters returned in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hash = location.hash.startsWith('#') ? location.hash.substring(1) : location.hash;
    const hashParams = new URLSearchParams(hash);

    const errorDesc =
      params.get('error_description') ||
      params.get('error') ||
      hashParams.get('error_description') ||
      hashParams.get('error');
    const errorCode = params.get('error_code') || hashParams.get('error_code');
    const type = params.get('type') || hashParams.get('type');

    // Requirement 5: Do not redirect confirmation link to existing login form or dashboard
    // If this is an email confirmation callback or related error, immediately forward to dedicated /verify-email route
    if (
      type === 'signup' ||
      type === 'email_confirmation' ||
      type === 'email_change' ||
      hashParams.get('type') === 'signup' ||
      (errorDesc && (errorCode === 'otp_expired' || errorCode === 'bad_code' || type === 'signup'))
    ) {
      navigate(`/verify-email${location.search ? location.search : ''}${location.hash ? location.hash : ''}`, { replace: true });
      return;
    }

    if (errorDesc) {
      console.error('Auth callback error:', errorDesc);
      const decoded = decodeURIComponent(errorDesc.replace(/\+/g, ' '));
      message.error(decoded);
    }
  }, [location.search, location.hash, navigate]);

  // Handle session check and OAuth callback processing
  useEffect(() => {
    const handleAuthRedirect = async () => {
      if (authLoading || !session || !user || callbackProcessed.current) {
        return;
      }

      const params = new URLSearchParams(location.search);
      const hash = location.hash.startsWith('#') ? location.hash.substring(1) : location.hash;
      const hashParams = new URLSearchParams(hash);
      const type = params.get('type') || hashParams.get('type');
      const isVerificationCallback = type === 'signup' || type === 'email_confirmation' || type === 'email_change';

      // Requirement 4 & 5: If email verification callback, forward to /verify-email without auto-logging in or redirecting to dashboard
      if (isVerificationCallback) {
        navigate(`/verify-email${location.search ? location.search : ''}${location.hash ? location.hash : ''}`, { replace: true });
        return;
      }

      // Check if user is verified
      const verified = Boolean(
        user.email_confirmed_at ||
        user.confirmed_at ||
        user.user_metadata?.email_verified ||
        user.app_metadata?.provider === 'google' ||
        user.app_metadata?.provider === 'github'
      );

      if (!verified) {
        // Stop unverified user from accessing dashboard; show verification screen
        setSignupSuccessEmail(user.email || '');
        setResendEmail(user.email || '');
        return;
      }

      callbackProcessed.current = true;
      setLoading(true);

      try {
        // Check if user has a profile record
        const { data: profile, error: profileSelectError } = await supabase
          .from('profile')
          .select('id, name, goal')
          .eq('id', user.id)
          .maybeSingle();

        if (profileSelectError && profileSelectError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileSelectError);
        }

        if (isVerificationCallback) {
          message.success('Email verified successfully! Welcome to Aplico.');
        }

        if (!profile) {
          // New User
          const userName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.user_metadata?.user_name ||
            user.email?.split('@')[0] ||
            'User';

          const { error: insertError } = await supabase
            .from('profile')
            .upsert([
              {
                id: user.id,
                name: userName,
                email: user.email,
                created_at: new Date().toISOString(),
              }
            ], { onConflict: 'id' });

          if (insertError) {
            console.error('Error creating profile on auth redirect:', insertError);
          }

          if (!isVerificationCallback) {
            message.success('Account ready! Please complete your onboarding questionnaire.');
          }
          navigate('/signup', { replace: true });
        } else if (!profile.goal) {
          // Incomplete profile questionnaire
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

  // Handle Google Login (Preserved existing implementation)
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthRedirectUrl()
        }
      });

      if (error) {
        console.error('Google login error:', error.message);
        message.error(error.message || 'Failed to initialize Google login');
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      message.error(error?.message || 'Unexpected error during Google login');
    } finally {
      setLoading(false);
    }
  };

  // Handle GitHub Login
  const handleGithubLogin = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: getOAuthRedirectUrl()
        }
      });

      if (error) {
        console.error('GitHub login error:', error.message);
        message.error(error.message || 'Failed to initialize GitHub login. Please ensure GitHub OAuth is enabled in Supabase.');
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      message.error(error?.message || 'Unexpected error during GitHub login');
    } finally {
      setLoading(false);
    }
  };

  // Resend verification email
  const handleResendVerification = async (targetEmailParam) => {
    if (resendCooldown > 0) return;

    const targetEmail = targetEmailParam || signupSuccessEmail || resendEmail || form.getFieldValue('email');
    if (!targetEmail) {
      message.warning('Please enter your email address first.');
      return;
    }
    try {
      setResending(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail.trim().toLowerCase(),
        options: {
          emailRedirectTo: getEmailVerifyRedirectUrl()
        }
      });
      if (error) {
        if (error.status >= 500 || error.name === 'AuthRetryableFetchError' || error.message === '{}') {
          throw new Error('Server error (500): Unable to send verification email. Please check your Supabase SMTP settings.');
        }
        if (error.message?.includes('rate limit') || error.code === 'over_email_send_rate_limit') {
          throw new Error('Rate limit reached. Please wait a minute before requesting another confirmation email.');
        }
        throw error;
      }
      message.success('Confirmation email sent! Please check your inbox and spam folder.');
      setResendCooldown(60);
    } catch (err) {
      console.error('Resend error:', err);
      message.error(parseAuthError(err, 'Failed to resend verification email'));
    } finally {
      setResending(false);
    }
  };

  // Forgot password
  const handleForgotPassword = async (e) => {
    e?.preventDefault();
    const targetEmail = form.getFieldValue('email');
    if (!targetEmail) {
      message.warning('Please enter your email address above to reset your password.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail.trim().toLowerCase(), {
        redirectTo: `${getOAuthRedirectUrl()}?mode=reset`
      });
      if (error) {
        if (error.status >= 500 || error.name === 'AuthRetryableFetchError' || error.message === '{}') {
          throw new Error('Server error (500): Unable to send password reset email. Please check your Supabase SMTP settings.');
        }
        throw error;
      }
      message.success('Password reset email sent! Check your inbox.');
    } catch (err) {
      console.error('Password reset error:', err);
      message.error(parseAuthError(err, 'Failed to send password reset email'));
    } finally {
      setLoading(false);
    }
  };

  // Email Signup Handler - NEW USER
  const handleSignup = async (values) => {
    try {
      setLoading(true);
      const cleanEmail = values.email?.trim().toLowerCase();
      const cleanName = values.name?.trim() || '';

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: values.password,
        options: {
          data: {
            full_name: cleanName,
            name: cleanName,
          },
          emailRedirectTo: getEmailVerifyRedirectUrl(),
        }
      });

      if (error) {
        if (error.status >= 500 || error.name === 'AuthRetryableFetchError' || error.message === '{}') {
          throw new Error('Server error (500): Failed to send confirmation email. Please check your custom SMTP configuration in Supabase.');
        }
        if (error.message?.includes('email rate limit exceeded') || error.code === 'over_email_send_rate_limit') {
          throw new Error('Sign-up rate limit reached. Please wait a few minutes before trying again.');
        }
        if (error.message?.includes('User already registered') || error.code === 'user_already_exists') {
          message.warning('An account with this email already exists. Please log in.');
          setIsLogin(true);
          form.setFieldsValue({ email: cleanEmail, password: '', confirmPassword: '' });
          return;
        }
        throw error;
      }

      // Check for duplicate account where Supabase user enumeration protection returned empty identities
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        message.warning('An account with this email already exists. Please log in.');
        setIsLogin(true);
        form.setFieldsValue({ email: cleanEmail, password: '', confirmPassword: '' });
        return;
      }

      if (data?.session) {
        // Immediate session created (if email confirmation is disabled in Supabase)
        message.success('Account created! Welcome to Aplico.');
      } else if (data?.user) {
        // Requirement 2: Replace form with dedicated "Check your email" screen showing destination email
        setSignupSuccessEmail(cleanEmail);
        setResendEmail(cleanEmail);
        setResendCooldown(60);
      }
    } catch (error) {
      console.error('Signup error:', error);
      message.error(parseAuthError(error, 'Failed to create account'));
    } finally {
      setLoading(false);
    }
  };

  // Email Login Handler - RETURNING USER
  const handleLogin = async (values) => {
    try {
      setLoading(true);
      const cleanEmail = values.email?.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: values.password,
      });

      if (error) {
        if (error.status >= 500 || error.name === 'AuthRetryableFetchError' || error.message === '{}') {
          throw new Error('Server error (500): Unable to reach the authentication service. Please try again.');
        }
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        if (error.message?.includes('Email not confirmed') || error.code === 'email_not_confirmed') {
          setSignupSuccessEmail(cleanEmail);
          setResendEmail(cleanEmail);
          message.warning('Please confirm your email address before logging in.', 6);
          return;
        }
        throw error;
      }

      message.success('Welcome back to Aplico!');
      // Auth state listener triggers handleAuthRedirect to route user appropriately
    } catch (error) {
      console.error('Login error:', error);
      message.error(parseAuthError(error, 'Failed to login'));
    } finally {
      setLoading(false);
    }
  };

  // If user is already authenticated or callback redirect is processing, show loading state
  if ((session && user) || (loading && callbackProcessed.current)) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.background,
        color: colors.textPrimary,
        fontFamily: typography.fontFamilySystem,
        gap: '16px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: `3px solid ${colors.cardBorder}`,
          borderTopColor: colors.primary,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: '14px', color: colors.textSecondary }}>
          Completing sign-in...
        </span>
      </div>
    );
  }

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

          {signupSuccessEmail ? (
            /* DEDICATED "CHECK YOUR EMAIL" SCREEN */
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '20px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: `1.5px solid rgba(99, 102, 241, 0.28)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
                color: colors.primary,
                fontSize: '32px',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.15)'
              }}>
                <MailOutlined />
              </div>

              <h2 style={{
                fontSize: '26px',
                fontWeight: typography.weights.bold,
                color: colors.textPrimary,
                marginBottom: '10px',
                letterSpacing: '-0.5px'
              }}>
                Check your email
              </h2>

              <p style={{
                color: colors.textSecondary,
                fontSize: '14px',
                margin: '0 0 20px 0',
                lineHeight: '1.5'
              }}>
                We’ve sent a confirmation link to:
              </p>

              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '20px',
                wordBreak: 'break-all',
                fontSize: '15px',
                fontWeight: typography.weights.semibold,
                color: colors.textPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <MailOutlined style={{ color: colors.primary }} />
                <span>{signupSuccessEmail}</span>
              </div>

              <p style={{
                color: colors.textMuted,
                fontSize: '13px',
                lineHeight: '1.6',
                marginBottom: '28px'
              }}>
                Click the link inside the email to verify your account and activate access to your dashboard. If you don't see it within a minute, check your spam or junk folder.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <PrimaryButton
                  type="button"
                  onClick={() => handleResendVerification(signupSuccessEmail)}
                  disabled={resending || resendCooldown > 0}
                  style={{
                    width: '100%',
                    height: '46px',
                    fontSize: '14px'
                  }}
                >
                  {resending ? 'Sending...' : resendCooldown > 0 ? `Resend email (${resendCooldown}s)` : 'Resend confirmation email'}
                </PrimaryButton>

                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setSignupSuccessEmail('');
                    setIsLogin(true);
                  }}
                  style={{
                    width: '100%',
                    height: '46px',
                    fontSize: '14px'
                  }}
                >
                  <ArrowLeftOutlined style={{ fontSize: '12px' }} /> Back to Sign In
                </SecondaryButton>
              </div>
            </div>
          ) : (
            /* REGULAR FORM (Login / Signup) */
            <>
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
              <Form form={form} onFinish={isLogin ? handleLogin : handleSignup} layout="vertical">
                {resendEmail && isLogin && (
                  <div style={{ marginBottom: '16px' }}>
                    <Alert
                      type="info"
                      showIcon
                      message="Email Verification"
                      description={
                        <div style={{ marginTop: '4px' }}>
                          <span>Didn't receive a confirmation link? </span>
                          <button
                            type="button"
                            onClick={() => handleResendVerification(resendEmail)}
                            disabled={resending || resendCooldown > 0}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: colors.primary,
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0,
                              textDecoration: 'underline'
                            }}
                          >
                            {resending ? 'Sending...' : resendCooldown > 0 ? `Resend in (${resendCooldown}s)` : 'Resend verification email'}
                          </button>
                        </div>
                      }
                    />
                  </div>
                )}

                {!isLogin && (
                  <Form.Item
                    name="name"
                    rules={[
                      { required: true, message: 'Full name is required' },
                      { whitespace: true, message: 'Full name cannot be empty' }
                    ]}
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
                  rules={[
                    { required: true, message: 'Email address is required' },
                    { type: 'email', message: 'Please enter a valid email address' }
                  ]}
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
                  rules={[
                    { required: true, message: 'Password is required' },
                    { min: 6, message: 'Password must be at least 6 characters' }
                  ]}
                  style={{ marginBottom: isLogin ? '10px' : '16px' }}
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

                {!isLogin && (
                  <Form.Item
                    name="confirmPassword"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Please confirm your password' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('The passwords do not match'));
                        },
                      }),
                    ]}
                    style={{ marginBottom: '24px' }}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ color: colors.textMuted, marginRight: '8px' }} />}
                      placeholder="Confirm password"
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

                {isLogin && (
                  <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                    <a
                      href="#forgot"
                      onClick={handleForgotPassword}
                      style={{ color: colors.primary, fontSize: '13px', fontWeight: 500 }}
                    >
                      Forgot password?
                    </a>
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
                    disabled={loading || authLoading}
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
                    onClick={handleGithubLogin}
                    icon={<GithubOutlined />}
                    disabled={loading || authLoading}
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
                      onClick={() => {
                        setIsLogin(!isLogin);
                        form.resetFields();
                      }}
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
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthPage;