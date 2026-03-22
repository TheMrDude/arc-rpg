'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function EventStoryModal({ show, eventName, eventIcon, story, onClose }) {
  const [phase, setPhase] = useState('celebration'); // celebration -> loading -> story
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
      setPhase(story ? 'story' : 'celebration');
      setDisplayedText('');
      return () => { document.body.style.overflow = ''; };
    }
  }, [show, story]);

  // Typewriter effect for story text
  useEffect(() => {
    if (phase === 'story' && story?.chapter_text) {
      const text = story.chapter_text;
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayedText(text.slice(0, i));
        if (i >= text.length) clearInterval(interval);
      }, 15);
      return () => clearInterval(interval);
    }
  }, [phase, story]);

  if (!show) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 65,
        padding: '1rem',
        animation: 'eventFadeIn 0.5s ease',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Celebration Phase */}
        {phase === 'celebration' && (
          <div style={{ textAlign: 'center', animation: 'eventSlideUp 0.6s ease' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>
              {eventIcon || '🏆'}
            </div>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: 900,
              color: '#FFD93D',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              marginBottom: '0.5rem',
              textShadow: '0 0 20px rgba(255, 217, 61, 0.5)',
            }}>
              EVENT COMPLETE!
            </h2>
            <p style={{
              fontSize: '1.2rem',
              color: '#22d3ee',
              fontWeight: 700,
              marginBottom: '2rem',
            }}>
              {eventName}
            </p>
            <div style={{
              color: '#94a3b8',
              fontSize: '0.9rem',
              marginBottom: '1.5rem',
              animation: 'eventPulse 1.5s ease-in-out infinite',
            }}>
              Generating your event story...
            </div>
            <div style={{
              width: 40,
              height: 40,
              border: '3px solid #334155',
              borderTop: '3px solid #22d3ee',
              borderRadius: '50%',
              margin: '0 auto',
              animation: 'eventSpin 1s linear infinite',
            }} />
          </div>
        )}

        {/* Story Phase */}
        {phase === 'story' && story && (
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            borderRadius: 16,
            border: '2px solid #FFD93D',
            boxShadow: '0 0 40px rgba(255, 217, 61, 0.15)',
            overflow: 'hidden',
            animation: 'eventSlideUp 0.5s ease',
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #FFD93D20, #E8B44C10)',
              borderBottom: '1px solid #FFD93D40',
              padding: '1.5rem',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '4px',
                color: '#FFD93D',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}>
                {eventIcon || '🏆'} Event Chapter {eventIcon || '🏆'}
              </div>
              <h3 style={{
                fontSize: '1.4rem',
                fontWeight: 900,
                color: '#fff',
                marginBottom: '0.25rem',
              }}>
                {story.chapter_title}
              </h3>
              <p style={{
                fontSize: '0.8rem',
                color: '#FFD93D',
                fontWeight: 600,
              }}>
                {eventName}
              </p>
            </div>

            {/* Story Text */}
            <div style={{
              padding: '1.5rem',
              color: '#cbd5e1',
              fontSize: '0.95rem',
              lineHeight: 1.8,
              minHeight: 150,
            }}>
              {displayedText}
              {displayedText.length < (story.chapter_text?.length || 0) && (
                <span style={{ animation: 'eventPulse 0.5s ease-in-out infinite' }}>|</span>
              )}
            </div>

            {/* Narrative Reward */}
            {story.narrative_reward && displayedText.length >= (story.chapter_text?.length || 0) && (
              <div style={{
                margin: '0 1.5rem',
                padding: '1rem',
                background: 'rgba(255, 217, 61, 0.08)',
                border: '1px solid #FFD93D40',
                borderRadius: 8,
                textAlign: 'center',
                animation: 'eventSlideUp 0.4s ease',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🎁</div>
                <p style={{
                  color: '#FFD93D',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}>
                  {story.narrative_reward}
                </p>
              </div>
            )}

            {/* Continue Button */}
            {displayedText.length >= (story.chapter_text?.length || 0) && (
              <div style={{
                padding: '1.5rem',
                textAlign: 'center',
                animation: 'eventSlideUp 0.4s ease',
              }}>
                <button
                  onClick={onClose}
                  style={{
                    background: 'linear-gradient(135deg, #FFD93D, #E8B44C)',
                    color: '#0f172a',
                    border: 'none',
                    padding: '0.75rem 2rem',
                    borderRadius: 8,
                    fontSize: '1rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 0 20px rgba(255, 217, 61, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Continue Your Journey
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes eventFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes eventSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes eventPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes eventSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  );
}
