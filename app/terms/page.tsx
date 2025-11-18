'use client';

import Link from 'next/link';

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-gray-400">Last updated: November 18, 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Agreement to Terms</h2>
            <p className="text-gray-300 mb-4">
              By accessing or using HabitQuest ("the Service"), you agree to be bound by these Terms of
              Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Description of Service</h2>
            <p className="text-gray-300 mb-4">
              HabitQuest is a gamified productivity application that transforms your daily tasks into
              epic RPG-style quests. The Service includes:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Quest creation and management</li>
              <li>AI-powered narrative generation using Anthropic Claude</li>
              <li>Progress tracking with XP, levels, and achievements</li>
              <li>Premium features including recurring quests, equipment, and skill trees</li>
              <li>Journal and reflection tools</li>
              <li>Seasonal events and story progressions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Account Registration</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">Eligibility</h3>
            <p className="text-gray-300 mb-4">
              You must be at least 13 years old to use HabitQuest. By creating an account, you represent
              that you meet this age requirement.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Account Security</h3>
            <p className="text-gray-300 mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Maintaining the security of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Providing accurate and complete registration information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Acceptable Use</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">You May:</h3>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Use the Service for personal productivity and task management</li>
              <li>Create and complete quests for legitimate purposes</li>
              <li>Share your achievements on social media</li>
              <li>Provide feedback and suggestions</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">You May Not:</h3>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Use automated scripts or bots to manipulate your progress</li>
              <li>Share, sell, or transfer your account to others</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Scrape, mine, or extract data from the Service</li>
              <li>Bypass any rate limiting or security measures</li>
              <li>Use the Service to spam or send unsolicited communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Premium Subscription</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">Pricing</h3>
            <p className="text-gray-300 mb-4">
              HabitQuest offers a lifetime premium subscription for $47 USD. This is a one-time payment
              with no recurring charges.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Premium Features</h3>
            <p className="text-gray-300 mb-4">
              Premium access includes:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Unlimited recurring quest templates</li>
              <li>Equipment shop with XP multipliers</li>
              <li>Advanced skill trees</li>
              <li>Archetype switching</li>
              <li>Weekly AI summaries</li>
              <li>Hero's Journal with AI transformations</li>
              <li>Priority support</li>
              <li>All future premium features</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Payment Processing</h3>
            <p className="text-gray-300 mb-4">
              Payments are processed securely through Stripe. We do not store your full credit card information.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Refund Policy</h3>
            <p className="text-gray-300 mb-4">
              We offer a 30-day money-back guarantee. If you're not satisfied with your premium subscription,
              contact support@habitquest.app within 30 days of purchase for a full refund.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Price Changes</h3>
            <p className="text-gray-300 mb-4">
              We reserve the right to change our pricing at any time. Existing premium subscribers are
              grandfathered and will not be affected by price increases.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">AI-Generated Content</h2>
            <p className="text-gray-300 mb-4">
              We use Anthropic's Claude AI to generate quest narratives and transformations. You acknowledge that:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>AI-generated content is created automatically and may occasionally contain errors</li>
              <li>We are not responsible for the accuracy or appropriateness of AI-generated content</li>
              <li>You should review all AI-generated content before relying on it</li>
              <li>AI-generated content is provided "as is" without warranties</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Intellectual Property</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">Our Content</h3>
            <p className="text-gray-300 mb-4">
              HabitQuest and its original content (excluding user-generated content) are owned by us and
              protected by copyright, trademark, and other laws. This includes:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>The HabitQuest name, logo, and branding</li>
              <li>UI/UX design and layout</li>
              <li>Software code and architecture</li>
              <li>Archetype designs and descriptions</li>
              <li>Equipment, skills, and achievement systems</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Your Content</h3>
            <p className="text-gray-300 mb-4">
              You retain ownership of content you create (quests, journal entries, reflections). By using
              the Service, you grant us a limited license to:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Store and process your content to provide the Service</li>
              <li>Use aggregated, anonymized data for analytics and improvements</li>
              <li>Display your content back to you across devices</li>
            </ul>
            <p className="text-gray-300 mb-4">
              We will never share your private quests or journals publicly without your explicit permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Data Privacy</h2>
            <p className="text-gray-300 mb-4">
              Your use of the Service is also governed by our Privacy Policy. Please review it at{' '}
              <Link href="/privacy" className="text-[#FF6B6B] hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Service Availability</h2>
            <p className="text-gray-300 mb-4">
              We strive for 99.9% uptime but cannot guarantee uninterrupted service. We reserve the right to:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Modify or discontinue features with notice</li>
              <li>Perform maintenance during off-peak hours</li>
              <li>Suspend access to investigate security incidents</li>
            </ul>
            <p className="text-gray-300 mb-4">
              We are not liable for any loss or damage resulting from service interruptions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Termination</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">By You</h3>
            <p className="text-gray-300 mb-4">
              You may delete your account at any time through your account settings or by contacting support.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">By Us</h3>
            <p className="text-gray-300 mb-4">
              We may suspend or terminate your access if:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>You violate these Terms of Service</li>
              <li>Your account is involved in fraudulent activity</li>
              <li>Required by law</li>
              <li>Your account has been inactive for over 2 years</li>
            </ul>
            <p className="text-gray-300 mb-4">
              Upon termination, your data will be deleted according to our Privacy Policy. Premium
              subscriptions are non-refundable except during the 30-day guarantee period.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Disclaimers and Limitations</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">No Warranties</h3>
            <p className="text-gray-300 mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS
              FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Limitation of Liability</h3>
            <p className="text-gray-300 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Loss of profits, data, or goodwill</li>
              <li>Service interruptions</li>
              <li>Loss of productivity or business opportunities</li>
              <li>Errors in AI-generated content</li>
            </ul>
            <p className="text-gray-300 mb-4">
              Our total liability shall not exceed the amount you paid for premium subscription ($47)
              or $100, whichever is greater.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Indemnification</h2>
            <p className="text-gray-300 mb-4">
              You agree to indemnify and hold harmless HabitQuest, its officers, directors, employees,
              and agents from any claims, damages, losses, liabilities, and expenses (including attorney
              fees) arising from:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Content you submit to the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Governing Law and Disputes</h2>
            <p className="text-gray-300 mb-4">
              These Terms are governed by the laws of [Your Jurisdiction], without regard to conflict
              of law principles.
            </p>
            <p className="text-gray-300 mb-4">
              Any disputes shall be resolved through binding arbitration in accordance with [Arbitration Rules],
              except you may assert claims in small claims court if they qualify.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Changes to Terms</h2>
            <p className="text-gray-300 mb-4">
              We may modify these Terms at any time. We will notify you of material changes by:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Posting the updated Terms on this page</li>
              <li>Updating the "Last updated" date</li>
              <li>Sending an email notification (for significant changes)</li>
            </ul>
            <p className="text-gray-300 mb-4">
              Continued use after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Severability</h2>
            <p className="text-gray-300 mb-4">
              If any provision of these Terms is found to be unenforceable, the remaining provisions
              will remain in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Entire Agreement</h2>
            <p className="text-gray-300 mb-4">
              These Terms, together with our Privacy Policy, constitute the entire agreement between
              you and HabitQuest regarding the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-gray-300 mb-4">
              For questions about these Terms, contact us:
            </p>
            <ul className="list-none text-gray-300 mb-4 space-y-2">
              <li><strong>Email:</strong> legal@habitquest.app</li>
              <li><strong>Support:</strong> support@habitquest.app</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-700 text-center text-gray-400">
          <p>
            <Link href="/privacy" className="text-[#FF6B6B] hover:underline mr-4">Privacy Policy</Link>
            <Link href="/" className="text-[#FF6B6B] hover:underline">Back to Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
