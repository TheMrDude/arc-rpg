'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkDatabaseSetup();
  }, []);

  async function checkDatabaseSetup() {
    setChecking(true);
    setError(null);

    try {
      // Try to query the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          setSetupComplete(false);
          setError('Database tables not found. Please complete setup below.');
        } else {
          setSetupComplete(true);
        }
      } else {
        setSetupComplete(true);
      }
    } catch (e) {
      console.error('Setup check error:', e);
      setSetupComplete(false);
      setError('Could not verify database setup');
    } finally {
      setChecking(false);
    }
  }

  const setupInstructions = [
    {
      step: 1,
      title: 'Open Supabase SQL Editor',
      description: 'Go to your Supabase project SQL editor',
      link: 'https://supabase.com/dashboard/project/vxzholcypozuurmsmbub/sql/new',
      action: 'Open SQL Editor'
    },
    {
      step: 2,
      title: 'Copy the Setup SQL',
      description: 'Open the COMPLETE_SETUP.sql file in your project and copy all of its contents'
    },
    {
      step: 3,
      title: 'Paste and Run',
      description: 'Paste the SQL into the Supabase editor and click "Run" to create all tables and functions'
    },
    {
      step: 4,
      title: 'Verify Setup',
      description: 'Click the "Check Setup" button below to verify everything was created correctly'
    }
  ];

  if (checking) {
    return (
      <div className="kidquest min-h-screen bg-cream flex items-center justify-center">
        <div className="text-navy text-xl">Checking database setup...</div>
      </div>
    );
  }

  if (setupComplete) {
    return (
      <div className="kidquest min-h-screen bg-cream text-navy p-8">
        <div className="max-w-2xl mx-auto">
          <div className="kq-card bg-emerald/10 border-2 border-emerald p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="kq-display text-3xl font-bold mb-4">Database Setup Complete!</h1>
            <p className="text-navy/60 mb-6">
              Your HabitQuest database is ready to go. You can now start your adventure!
            </p>
            <button
              onClick={() => router.push('/login')}
              className="kq-btn kq-btn-gold"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kidquest min-h-screen bg-cream text-navy p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="kq-display text-5xl font-bold mb-4">Database Setup Required</h1>
          <p className="text-xl text-navy/60">
            Your HabitQuest database needs to be initialized. Follow these steps:
          </p>
          {error && (
            <div className="mt-4 bg-coral/12 border-2 border-coral rounded-candy p-4 text-coral">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-6 mb-12">
          {setupInstructions.map((instruction) => (
            <div
              key={instruction.step}
              className="kq-card p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gold text-navy rounded-full flex items-center justify-center font-bold text-xl">
                  {instruction.step}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{instruction.title}</h3>
                  <p className="text-navy/60 mb-3">{instruction.description}</p>
                  {instruction.link && (
                    <a
                      href={instruction.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="kq-btn kq-btn-blue inline-block"
                    >
                      {instruction.action} →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="kq-card border-2 border-gold p-6 mb-8">
          <h3 className="text-xl font-bold mb-3">📋 COMPLETE_SETUP.sql Location</h3>
          <p className="text-navy/60 mb-3">
            The SQL file is located in your project root directory:
          </p>
          <code className="block bg-navy/5 p-3 rounded-candy text-emerald font-mono text-sm">
            /COMPLETE_SETUP.sql
          </code>
          <p className="text-navy/50 text-sm mt-3">
            Open this file, copy all contents, and paste them into the Supabase SQL editor
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={checkDatabaseSetup}
            className="kq-btn kq-btn-emerald"
          >
            ✓ Check Setup Status
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-navy/50 hover:text-navy underline"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
