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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Checking database setup...</div>
      </div>
    );
  }

  if (setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-600/20 border-2 border-green-500 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold mb-4">Database Setup Complete!</h1>
            <p className="text-gray-300 mb-6">
              Your ARC RPG database is ready to go. You can now start your adventure!
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-lg font-bold text-lg"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Database Setup Required</h1>
          <p className="text-xl text-gray-300">
            Your ARC RPG database needs to be initialized. Follow these steps:
          </p>
          {error && (
            <div className="mt-4 bg-red-600/20 border border-red-500 rounded-lg p-4 text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-6 mb-12">
          {setupInstructions.map((instruction) => (
            <div
              key={instruction.step}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-yellow-500 text-black rounded-full flex items-center justify-center font-bold text-xl">
                  {instruction.step}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{instruction.title}</h3>
                  <p className="text-gray-300 mb-3">{instruction.description}</p>
                  {instruction.link && (
                    <a
                      href={instruction.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
                    >
                      {instruction.action} →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-800/50 border border-yellow-500 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-bold mb-3">📋 COMPLETE_SETUP.sql Location</h3>
          <p className="text-gray-300 mb-3">
            The SQL file is located in your project root directory:
          </p>
          <code className="block bg-black/50 p-3 rounded text-green-400 font-mono text-sm">
            /arc-rpg/COMPLETE_SETUP.sql
          </code>
          <p className="text-gray-400 text-sm mt-3">
            Open this file, copy all contents, and paste them into the Supabase SQL editor
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={checkDatabaseSetup}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-bold text-lg"
          >
            ✓ Check Setup Status
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white underline"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
