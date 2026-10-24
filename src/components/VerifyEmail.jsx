import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/Supabase.js';
import { Spin, Alert, Input, Form, message } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  MailOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  LoadingOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { colors, typography, borderRadius, shadows } from '../theme/tokens';
import BrandLogo from './ui/BrandLogo';
import PrimaryButton from './ui/PrimaryButton';
import SecondaryButton from './ui/SecondaryButton';
import Card from './ui/Card';

const parseErrorMessage = (errorDesc, errorCode) => {
  if (!errorDesc && !errorCode) {
    return 'This verification link is invalid or has expired. Please request a new confirmation email.';
  }
  const decoded = decodeURIComponent(String(errorDesc || '').replace(/\+/g, ' '));
  if (
    errorCode === 'otp_expired' ||
    decoded.toLowerCase().includes('expired') ||
    decoded.toLowerCase().includes('expire')
  ) {
    return 'This verification link has expired. Confirmation links are time-limited for security.';
  }
  if (
    errorCode === 'bad_code' ||
    decoded.toLowerCase().includes('invalid') ||
    decoded.toLowerCase().includes('not found')
  ) {
    return 'This verification link is invalid or already used. Please request a new confirmation email.';
  }
  return decoded || 'Verification failed. Please try again or request a new confirmation email.';
};

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error' | 'no_token'
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showResendInput, setShowResendInput] = useState(false);
  const processedRef = useRef(false);

  useEffect(() => {
    document.title = 'Email Verification | Aplico';
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    if (processedRef.current) return;

    const processVerification = async () => {
      processedRef.current = true;

      const searchParams = new URLSearchParams(location.search);
      const hash = location.hash.startsWith('#') ? location.hash.substring(1) : location.hash;
      const hashParams = new URLSearchParams(hash);

      const error = searchParams.get('error') || hashParams.get('error');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
      const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');

      // 1. Check for error returned by Supabase Gotrue
      if (error || errorCode || errorDesc) {
        console.warn('[VerifyEmail] Error detected in URL params:', { error, errorCode, errorDesc });
        setErrorMessage(parseErrorMessage(errorDesc, errorCode));
        setStatus('error');
        // Clean URL hash/params without full page reload
        try {
          window.history.replaceState(null, '', window.location.pathname);
        } catch (_) {}
        return;
      }

      const type = searchParams.get('type') || hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash') || searchParams.get('token');

      // 2. PKCE code exchange flow
      if (code) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('[VerifyEmail] exchangeCodeForSession error:', exchangeError);
            setErrorMessage(parseErrorMessage(exchangeError.message, exchangeError.code));
            setStatus('error');
            return;
          }
          await handleVerificationSuccess();
          return;
        } catch (err) {
          console.error('[VerifyEmail] Unexpected exchange error:', err);
          setErrorMessage('Failed to verify token with server.');
          setStatus('error');
          return;
        }
      }

      // 3. Direct token hash verification flow (if custom email template is used)
      if (tokenHash) {
        try {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type || 'signup'
          });
          if (otpError) {
            console.error('[VerifyEmail] verifyOtp error:', otpError);
            setErrorMessage(parseErrorMessage(otpError.message, otpError.code));
            setStatus('error');
            return;
          }
          await handleVerificationSuccess();
          return;
        } catch (err) {
          console.error('[VerifyEmail] Unexpected verifyOtp error:', err);
          setErrorMessage('Failed to verify token.');
          setStatus('error');
          return;
        }
      }

      // 4. Standard Supabase implicit flow (tokens in hash with type=signup / email_confirmation)
      if (accessToken || type === 'signup' || type === 'email_confirmation' || type === 'email_change') {
        await handleVerificationSuccess();
        return;
      }

      // 5. Check if Supabase client already consumed hash on initial load
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email_confirmed_at) {
          await handleVerificationSuccess();
          return;
        }
      } catch (sessErr) {
        console.warn('[VerifyEmail] getSession check warning:', sessErr);
      }

      // 6. No verification token or parameter found
      setStatus('no_token');
    };

    const handleVerificationSuccess = async () => {
      try {
        // Requirement 4: DO NOT automatically sign the user in after email confirmation
        // Clear local session storage so subsequent sign-in is required
        await supabase.auth.signOut({ scope: 'local' });
      } catch (signOutErr) {
        console.warn('[VerifyEmail] Sign-out warning on verification confirmation:', signOutErr);
      }

      // Clean URL hash tokens so credentials are not left in address bar
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch (_) {}

      setStatus('success');
    };

    processVerification();
  }, [location]);

  // Resend verification email handler
  const handleResend = async (e) => {
    e?.preventDefault();
    if (!resendEmail || !resendEmail.trim()) {
      message.warning('Please enter your email address to receive a new link.');
      return;
    }
    if (resendCooldown > 0) return;

    try {
      setResending(true);
      const cleanEmail = resendEmail.trim().toLowerCase();
      const redirectUrl =
        typeof window !== 'undefined' && window.location.origin
          ? `${window.location.origin}/verify-email`
          : 'https://aplico-black.vercel.app/verify-email';

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        if (error.message?.includes('rate limit') || error.code === 'over_email_send_rate_limit') {
          message.warning('Rate limit reached. Please wait a minute before requesting another email.');
        } else {
          message.error(error.message || 'Failed to resend confirmation email.');
        }
        return;
      }

      message.success('New confirmation link sent! Please check your inbox and spam folder.');
      setResendCooldown(60);
      setShowResendInput(false);
    } catch (err) {
      console.error('[VerifyEmail] Resend error:', err);
      message.error('Failed to send confirmation link. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        background: `radial-gradient(circle at 50% 20%, rgba(94, 234, 212, 0.08) 0%, rgba(15, 23, 42, 0) 70%), ${colors.background}`,
        fontFamily: typography.fontFamilySystem,
        color: colors.textPrimary,
        boxSizing: 'border-box'
      }}
    >
      {/* Brand Logo Header */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <BrandLogo size={42} fontSize="26px" />
      </div>

      {/* Main Container Card */}
      <div
        id="verify-status-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: colors.cardBg || '#FFFFFF',
          border: `1px solid ${colors.cardBorder || '#E5E7EB'}`,
          borderRadius: borderRadius.xl || '16px',
          boxShadow: shadows.md || '0 4px 20px rgba(0, 0, 0, 0.06)',
          padding: '40px 32px',
          textAlign: 'center',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative Top Accent Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background:
              status === 'success'
                ? 'linear-gradient(90deg, #10B981, #5EEAD4)'
                : status === 'error'
                ? 'linear-gradient(90deg, #EF4444, #F59E0B)'
                : 'linear-gradient(90deg, #5EEAD4, #7C3AED)'
          }}
        />

        {/* 1. LOADING / VERIFYING STATE */}
        {status === 'verifying' && (
          <div>
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'rgba(94, 234, 212, 0.12)',
                border: '1.5px solid rgba(94, 234, 212, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto'
              }}
            >
              <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: colors.primary }} spin />} />
            </div>

            <h1
              style={{
                fontSize: '24px',
                fontWeight: typography.weights.bold,
                color: colors.textPrimary,
                marginBottom: '12px',
                letterSpacing: '-0.4px'
              }}
            >
              Verifying your email...
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: colors.textSecondary,
                lineHeight: '1.6',
                margin: 0
              }}
            >
              Please wait a moment while we authenticate your verification token with Aplico.
            </p>
          </div>
        )}

        {/* 2. SUCCESS STATE: DEDICATED MINIMAL CONFIRMATION PAGE */}
        {status === 'success' && (
          <div>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '2px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
                color: '#10B981',
                fontSize: '40px',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.18)'
              }}
            >
              <CheckCircleOutlined />
            </div>

            <h1
              id="verification-success-heading"
              style={{
                fontSize: '24px',
                fontWeight: typography.weights.bold,
                color: colors.textPrimary,
                marginBottom: '12px',
                letterSpacing: '-0.5px'
              }}
            >
              Email Verified Successfully
            </h1>

            {/* Requirement 3: Dedicated minimal confirmation message */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: borderRadius.md || '10px',
                padding: '12px 16px',
                marginBottom: '20px'
              }}
            >
              <p
                id="verification-success-message"
                style={{
                  fontSize: '15px',
                  fontWeight: typography.weights.medium,
                  color: '#065F46',
                  margin: 0,
                  lineHeight: '1.5'
                }}
              >
                Email verified successfully. You can now sign in to Aplico.
              </p>
            </div>

            <p
              style={{
                fontSize: '14px',
                color: colors.textSecondary,
                lineHeight: '1.6',
                marginBottom: '32px'
              }}
            >
              Your account is fully activated and ready. Sign in with your email and password to access your dashboard, track applications, and optimize your resumes.
            </p>

            {/* Requirement 6: Optional "Go to Sign In" button */}
            <PrimaryButton
              id="btn-go-to-signin"
              type="button"
              onClick={() => navigate('/auth?mode=login', { replace: true })}
              style={{
                width: '100%',
                height: '46px',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>Go to Sign In</span>
              <ArrowRightOutlined style={{ fontSize: '13px' }} />
            </PrimaryButton>
          </div>
        )}

        {/* 3. ERROR STATE: EXPIRED OR INVALID LINK */}
        {status === 'error' && (
          <div>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '2px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
                color: colors.error || '#EF4444',
                fontSize: '38px',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)'
              }}
            >
              <CloseCircleOutlined />
            </div>

            <h1
              id="verification-error-heading"
              style={{
                fontSize: '22px',
                fontWeight: typography.weights.bold,
                color: colors.textPrimary,
                marginBottom: '12px',
                letterSpacing: '-0.4px'
              }}
            >
              Verification Link Expired or Invalid
            </h1>

            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: borderRadius.md || '10px',
                padding: '12px 16px',
                marginBottom: '24px'
              }}
            >
              <p
                id="verification-error-message"
                style={{
                  fontSize: '14px',
                  color: '#991B1B',
                  margin: 0,
                  lineHeight: '1.5',
                  fontWeight: typography.weights.medium
                }}
              >
                {errorMessage}
              </p>
            </div>

            {showResendInput ? (
              <form onSubmit={handleResend} style={{ marginBottom: '16px' }}>
                <Input
                  id="input-resend-email"
                  prefix={<MailOutlined style={{ color: colors.textLight }} />}
                  placeholder="Enter your registered email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  style={{
                    height: '42px',
                    borderRadius: borderRadius.md,
                    marginBottom: '12px',
                    fontSize: '14px'
                  }}
                  autoFocus
                />
                <PrimaryButton
                  id="btn-submit-resend"
                  type="submit"
                  disabled={resending || resendCooldown > 0}
                  style={{
                    width: '100%',
                    height: '42px',
                    fontSize: '14px',
                    marginBottom: '8px'
                  }}
                >
                  {resending
                    ? 'Sending...'
                    : resendCooldown > 0
                    ? `Resend in (${resendCooldown}s)`
                    : 'Send New Confirmation Link'}
                </PrimaryButton>
              </form>
            ) : (
              <SecondaryButton
                id="btn-show-resend"
                type="button"
                onClick={() => setShowResendInput(true)}
                style={{
                  width: '100%',
                  height: '44px',
                  fontSize: '14px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <ReloadOutlined />
                <span>Request New Confirmation Link</span>
              </SecondaryButton>
            )}

            <PrimaryButton
              id="btn-error-go-signin"
              type="button"
              onClick={() => navigate('/auth?mode=login', { replace: true })}
              style={{
                width: '100%',
                height: '44px',
                fontSize: '14px'
              }}
            >
              Go to Sign In
            </PrimaryButton>
          </div>
        )}

        {/* 4. NO TOKEN DETECTED */}
        {status === 'no_token' && (
          <div>
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1.5px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
                color: colors.primary,
                fontSize: '34px'
              }}
            >
              <MailOutlined />
            </div>

            <h1
              style={{
                fontSize: '22px',
                fontWeight: typography.weights.bold,
                color: colors.textPrimary,
                marginBottom: '12px'
              }}
            >
              Email Verification
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: colors.textSecondary,
                lineHeight: '1.6',
                marginBottom: '28px'
              }}
            >
              No active verification link was detected. If you just registered, please open the confirmation link sent to your inbox.
            </p>

            <PrimaryButton
              id="btn-notoken-go-signin"
              type="button"
              onClick={() => navigate('/auth?mode=login', { replace: true })}
              style={{
                width: '100%',
                height: '44px',
                fontSize: '14px'
              }}
            >
              Go to Sign In
            </PrimaryButton>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0
          }}
        >
          <ArrowLeftOutlined style={{ fontSize: '11px' }} /> Return to Aplico Home
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
