'use client';

import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1A2E] to-[#16213E] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-[#FF6B6B] hover:text-[#FF8787] transition-colors mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-400">Last updated: November 18, 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-gray-300 mb-4">
              Welcome to HabitQuest ("we," "our," or "us"). We are committed to protecting your privacy
              and personal information. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our mobile application and website.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">Personal Information</h3>
            <p className="text-gray-300 mb-4">
              When you create an account, we collect:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Email address (for authentication and account recovery)</li>
              <li>Password (encrypted and never stored in plain text)</li>
              <li>Profile information (username, character archetype selection)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Quest and Activity Data</h3>
            <p className="text-gray-300 mb-4">
              To provide our gamified productivity service, we collect:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Quest titles and descriptions you create</li>
              <li>Completion status and timestamps</li>
              <li>Experience points (XP) and level progression</li>
              <li>Streaks, achievements, and badges earned</li>
              <li>Journal entries and reflections</li>
              <li>Equipment purchases and skill tree selections</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Payment Information</h3>
            <p className="text-gray-300 mb-4">
              For premium subscriptions, we use Stripe for payment processing. We do not store your
              full credit card information. Stripe securely handles all payment data in compliance with
              PCI DSS standards. We only store:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Transaction IDs</li>
              <li>Subscription status</li>
              <li>Last 4 digits of card (for reference)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Device information (browser type, operating system, device model)</li>
              <li>IP address and general location (city/country level)</li>
              <li>Usage statistics (features used, session duration)</li>
              <li>Error logs and crash reports</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">How We Use Your Information</h2>
            <p className="text-gray-300 mb-4">We use your information to:</p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li><strong>Provide our service:</strong> Create your personalized RPG experience, track progress, and generate AI-powered quest narratives</li>
              <li><strong>Process payments:</strong> Handle subscription purchases and verify payment status</li>
              <li><strong>Improve our app:</strong> Analyze usage patterns to enhance features and fix bugs</li>
              <li><strong>Send notifications:</strong> Quest reminders, achievement unlocks, and streak alerts (if you enable them)</li>
              <li><strong>Customer support:</strong> Respond to your inquiries and troubleshoot issues</li>
              <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security incidents</li>
              <li><strong>Legal compliance:</strong> Comply with legal obligations and enforce our Terms of Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">AI Processing with Anthropic Claude</h2>
            <p className="text-gray-300 mb-4">
              We use Anthropic's Claude AI to enhance your quests with narrative elements. When you create
              a quest, we send:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Your quest title and description</li>
              <li>Your selected archetype</li>
              <li>Context about your current progress</li>
            </ul>
            <p className="text-gray-300 mb-4">
              Anthropic processes this data to generate RPG-style narratives. According to Anthropic's
              privacy policy, they do not train their models on user data sent through their API.
              Data is processed solely to provide the service and is not retained longer than necessary.
            </p>
            <p className="text-gray-300 mb-4">
              Learn more: <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#FF6B6B] hover:underline">Anthropic Privacy Policy</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Data Storage and Security</h2>
            <p className="text-gray-300 mb-4">
              Your data is stored using Supabase (PostgreSQL database) with:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Encryption at rest and in transit (TLS/SSL)</li>
              <li>Row-level security (RLS) policies ensuring users only access their own data</li>
              <li>Regular automated backups</li>
              <li>SOC 2 Type II compliance</li>
            </ul>
            <p className="text-gray-300 mb-4">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Password hashing with bcrypt</li>
              <li>Rate limiting on API endpoints</li>
              <li>HTTPS-only connections</li>
              <li>Input validation and sanitization</li>
              <li>Regular security audits</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Data Sharing and Third Parties</h2>
            <p className="text-gray-300 mb-4">
              We do not sell your personal information. We share data only with:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Service Providers</h3>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li><strong>Supabase:</strong> Database hosting and authentication</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Anthropic:</strong> AI narrative generation</li>
              <li><strong>Vercel:</strong> Application hosting and CDN</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Legal Requirements</h3>
            <p className="text-gray-300 mb-4">
              We may disclose information if required by law, court order, or government request, or
              to protect our rights, property, or safety.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Your Rights and Choices</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">Access and Export</h3>
            <p className="text-gray-300 mb-4">
              You can access and export all your data through your account dashboard.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Correction and Deletion</h3>
            <p className="text-gray-300 mb-4">
              You can update or delete your quests, journal entries, and profile information at any time.
              To delete your entire account and all associated data, contact us at support@habitquest.app
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Opt-Out</h3>
            <p className="text-gray-300 mb-4">
              You can opt out of:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Push notifications (in app settings or device settings)</li>
              <li>Email communications (unsubscribe link in emails)</li>
              <li>AI-generated narratives (use manual quest mode)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">GDPR Rights (EU Users)</h3>
            <p className="text-gray-300 mb-4">
              If you're in the EU, you have additional rights:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Right to access your data</li>
              <li>Right to rectification</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Children's Privacy</h2>
            <p className="text-gray-300 mb-4">
              HabitQuest is not intended for children under 13 years old. We do not knowingly collect
              personal information from children under 13. If you believe we have collected information
              from a child under 13, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Cookies and Tracking</h2>
            <p className="text-gray-300 mb-4">
              We use essential cookies for:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Authentication (keeping you logged in)</li>
              <li>Session management</li>
              <li>Security (CSRF protection)</li>
            </ul>
            <p className="text-gray-300 mb-4">
              We do not use third-party advertising cookies or tracking pixels.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
            <p className="text-gray-300 mb-4">
              We retain your data:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Account data: Until you delete your account, plus 30 days</li>
              <li>Quest and progress data: Until you delete it or your account</li>
              <li>Payment records: 7 years (legal requirement for financial records)</li>
              <li>Analytics data: Aggregated and anonymized, indefinitely</li>
              <li>Backup data: 90 days after deletion from primary database</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">International Data Transfers</h2>
            <p className="text-gray-300 mb-4">
              Your data may be transferred to and processed in countries other than your own.
              We ensure adequate protection through:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Standard Contractual Clauses (SCCs) with service providers</li>
              <li>Adherence to GDPR and CCPA requirements</li>
              <li>Encryption during transfer and storage</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Changes to This Policy</h2>
            <p className="text-gray-300 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of material changes by:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Posting the new policy on this page</li>
              <li>Updating the "Last updated" date</li>
              <li>Sending you an email notification (for significant changes)</li>
            </ul>
            <p className="text-gray-300 mb-4">
              Your continued use of HabitQuest after changes indicates acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-gray-300 mb-4">
              For privacy-related questions, concerns, or requests, contact us:
            </p>
            <ul className="list-none text-gray-300 mb-4 space-y-2">
              <li><strong>Email:</strong> privacy@habitquest.app</li>
              <li><strong>Support:</strong> support@habitquest.app</li>
              <li><strong>Response time:</strong> Within 48 hours for privacy requests</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Jurisdiction</h2>
            <p className="text-gray-300 mb-4">
              This Privacy Policy is governed by the laws of [Your Jurisdiction]. If you have concerns
              about our privacy practices, you may file a complaint with your local data protection authority.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-700 text-center text-gray-400">
          <p>
            <Link href="/terms" className="text-[#FF6B6B] hover:underline mr-4">Terms of Service</Link>
            <Link href="/" className="text-[#FF6B6B] hover:underline">Back to Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
