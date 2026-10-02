// this is the question page for the user

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, message } from 'antd';
import { ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import logo from '../assets/aplico_logo.png';
import bg from '../assets/bg.avif';
import { supabase } from '../lib/Supabase.js';

const SignupPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedTracking, setSelectedTracking] = useState(null);
  const [selectedPainPoint, setSelectedPainPoint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get current user from Supabase
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      } else {
        // If no user, redirect to auth page
        navigate('/');
      }
    };
    getUser();
  }, [navigate]);

  const goals = [
    {
      id: 'internship',
      title: 'Internship',
      description: 'Find internships faster',
      icon: '🎓'
    },
    {
      id: 'fulltime',
      title: 'Full-time Job',
      description: 'Start your career',
      icon: '💼'
    },
    {
      id: 'both',
      title: 'Both',
      description: 'Keep all opportunities',
      icon: '🚀'
    }
  ];

  const trackingMethods = [
    {
      id: 'spreadsheet',
      title: 'Spreadsheet',
      description: 'Excel, Google Sheets, etc.',
      icon: '📄'
    },
    {
      id: 'notes',
      title: 'Notes App',
      description: 'Notion, Evernote, Apple Notes',
      icon: '📝'
    },
    {
      id: 'memory',
      title: 'Memory (Chaos Mode)',
      description: 'Living on the edge',
      icon: '🧠'
    },
    {
      id: 'none',
      title: 'I don\'t track them',
      description: 'Starting fresh!',
      icon: '🚫'
    }
  ];

  const painPoints = [
    {
      id: 'deadlines',
      title: 'Missing deadlines',
      description: 'Hard to keep up with due dates',
      icon: '⏰'
    },
    {
      id: 'statuses',
      title: 'Tracking statuses',
      description: 'Where am I in each process?',
      icon: '📊'
    },
    {
      id: 'resumes',
      title: 'Managing resumes',
      description: 'Different versions for each job',
      icon: '📂'
    },
    {
      id: 'followup',
      title: 'Following up',
      description: 'When to reach out?',
      icon: '📧'
    }
  ];

  const getProgressWidth = () => {
    if (step === 1) return '33%';
    if (step === 2) return '66%';
    return '100%';
  };

  const getStepTitle = () => {
    if (step === 1) return 'What are you looking for?';
    if (step === 2) return 'How do you currently track applications?';
    return 'What\'s your biggest application pain point?';
  };

  const getStepSubtitle = () => {
    if (step === 1) return 'We\'ll personalize your experience based on your goals';
    if (step === 2) return 'This is actually fun 😭';
    return 'Help us understand what you struggle with most';
  };

  const handleNext = () => {
    if (step === 1 && !selectedGoal) {
      message.warning('Please select a goal first');
      return;
    }
    if (step === 2 && !selectedTracking) {
      message.warning('Please select a tracking method');
      return;
    }
    if (step === 3 && !selectedPainPoint) {
      message.warning('Please select a pain point');
      return;
    }

    if (step < 3) {
      setStep(step + 1);
    } else {
      // All steps completed - go to dashboard
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        message.error("Please login first");
        navigate('/');
        return;
      }

      const user = session.user;

      // Update profile with Supabase UUID
      const { error } = await supabase
        .from("profile")
        .upsert({
          id: user.id,  // This is Supabase UUID, NOT Firebase UID
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          goal: selectedGoal,
          tracking_method: selectedTracking,
          pain_point: selectedPainPoint,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'id'  // If profile exists, update it
        });

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      message.success("Profile setup complete!");
      navigate("/dashboard");

    } catch (error) {
      console.error("Error:", error);
      console.log("FULL ERROR:", error);
      console.log("MESSAGE:", error.message);
      console.log("DETAILS:", error.details);
      console.log("HINT:", error.hint);
      console.log("CODE:", error.code);
      message.error(error.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div style={{
          display: 'flex',
          gap: '20px',
          justifyContent: 'center',
          marginBottom: '40px',
          flexWrap: 'wrap'
        }}>
          {goals.map((goal) => (
            <div
              key={goal.id}
              onClick={() => setSelectedGoal(goal.id)}
              onMouseEnter={() => setHoveredCard(goal.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                flex: 1,
                minWidth: '160px',
                maxWidth: '200px',
                background: selectedGoal === goal.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${selectedGoal === goal.id
                  ? '#3b82f6'
                  : hoveredCard === goal.id
                    ? 'rgba(59,130,246,0.5)'
                    : 'rgba(255,255,255,0.1)'
                  }`,
                borderRadius: '20px',
                padding: '28px 16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '16px',
                position: 'relative',
                backdropFilter: 'blur(10px)',
                transform: hoveredCard === goal.id && selectedGoal !== goal.id ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: selectedGoal === goal.id ? '0 0 20px rgba(59,130,246,0.2)' : 'none'
              }}
            >
              <div style={{ width: '100%' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'white',
                  marginBottom: '6px',
                  margin: 0
                }}>{goal.title}</h3>
                <p style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.5)',
                  lineHeight: '1.4',
                  margin: 0
                }}>{goal.description}</p>
              </div>
              {selectedGoal === goal.id && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>✓</div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '40px'
        }}>
          {trackingMethods.map((method) => (
            <div
              key={method.id}
              onClick={() => setSelectedTracking(method.id)}
              onMouseEnter={() => setHoveredCard(method.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: selectedTracking === method.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${selectedTracking === method.id
                  ? '#3b82f6'
                  : hoveredCard === method.id
                    ? 'rgba(59,130,246,0.5)'
                    : 'rgba(255,255,255,0.1)'
                  }`,
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                position: 'relative',
                backdropFilter: 'blur(10px)',
                transform: hoveredCard === method.id && selectedTracking !== method.id ? 'translateY(-2px)' : 'translateY(0)'
              }}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'white',
                  marginBottom: '4px',
                  margin: 0
                }}>{method.title}</h3>
                <p style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.5)',
                  margin: 0
                }}>{method.description}</p>
              </div>
              {selectedTracking === method.id && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>✓</div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (step === 3) {
      return (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '40px'
        }}>
          {painPoints.map((point) => (
            <div
              key={point.id}
              onClick={() => setSelectedPainPoint(point.id)}
              onMouseEnter={() => setHoveredCard(point.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: selectedPainPoint === point.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${selectedPainPoint === point.id
                  ? '#3b82f6'
                  : hoveredCard === point.id
                    ? 'rgba(59,130,246,0.5)'
                    : 'rgba(255,255,255,0.1)'
                  }`,
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                position: 'relative',
                backdropFilter: 'blur(10px)',
                transform: hoveredCard === point.id && selectedPainPoint !== point.id ? 'translateY(-2px)' : 'translateY(0)'
              }}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'white',
                  marginBottom: '4px',
                  margin: 0
                }}>{point.title}</h3>
                <p style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.5)',
                  margin: 0
                }}>{point.description}</p>
              </div>
              {selectedPainPoint === point.id && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>✓</div>
              )}
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      background: '#0a0a0a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>

      {/* LEFT SIDE - BRAND */}
      {!isMobile && (
        <div style={{
          flex: 1,
          background: `linear-gradient(135deg, rgba(2,2,5,0.75) 0%, rgba(8,4,20,0.75) 30%, rgba(18,8,38,0.75) 65%, rgba(34,18,72,0.75) 100%), url(${bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0) 70%)',
            borderRadius: '50%',
            top: '-200px',
            left: '-200px',
            animation: 'float 20s ease-in-out infinite'
          }} />

          <div style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0) 70%)',
            borderRadius: '50%',
            bottom: '-150px',
            right: '-150px',
            animation: 'float 15s ease-in-out infinite reverse'
          }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '80px'
            }}>
              <img src={logo} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
              <span style={{ fontSize: '34px', fontWeight: 'bold', color: 'white' }}>Aplico</span>
            </div>

            <h1 style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '20px',
              lineHeight: '1.2',
              letterSpacing: '-1.5px'
            }}>
              Let's set up your
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #3b82f6, #a78bfa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}> application tracker</span>
            </h1>

            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: '1.6',
              maxWidth: '400px'
            }}>
              Just a few questions to personalize your experience.
            </p>
          </div>
        </div>
      )}

      {/* RIGHT SIDE - QUESTIONS */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '40px 20px' : '40px',
        background: 'linear-gradient(135deg, rgba(2,2,5,0.95) 0%, rgba(8,4,20,0.95) 30%, rgba(18,8,38,0.95) 65%, rgba(34,18,72,0.95) 100%)'
      }}>

        <div style={{
          maxWidth: '700px',
          width: '100%'
        }}>

          {/* Mobile Header */}
          {isMobile && (
            <div style={{
              textAlign: 'center',
              marginBottom: '40px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '20px'
              }}>
                <img src={logo} alt="Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                <span style={{ fontSize: '22px', fontWeight: 'bold', color: 'white' }}>Aplico</span>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Step {step} of 3</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{Math.round((step / 3) * 100)}%</span>
            </div>
            <div style={{
              width: '100%',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '100px',
              height: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#3b82f6',
                height: '100%',
                borderRadius: '100px',
                width: getProgressWidth(),
                transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
          </div>

          {/* Question Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            <h2 style={{
              fontSize: isMobile ? '24px' : '28px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px',
              letterSpacing: '-0.5px'
            }}>{getStepTitle()}</h2>
            <p style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '14px'
            }}>{getStepSubtitle()}</p>
          </div>

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center'
          }}>
            {step > 1 && (
              <Button
                size="large"
                onClick={handleBack}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  height: '48px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'white',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
              >
                <ArrowLeftOutlined /> Back
              </Button>
            )}

            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={handleNext}
              style={{
                flex: step > 1 ? 1 : 'none',
                width: step > 1 ? 'auto' : '100%',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none',
                borderRadius: '12px',
                height: '48px',
                fontSize: '15px',
                fontWeight: 600,
                color: 'white',
                boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #7c3aed)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {step === 3 ? 'Go to Dashboard' : 'Continue'} <ArrowRightOutlined />
            </Button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(20px, -20px); }
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .ant-btn {
            font-weight: 600 !important;
          }
        `
      }} />
    </div>
  );
};

export default SignupPage;