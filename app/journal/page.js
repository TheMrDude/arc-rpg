import JournalEntry from '@/app/components/JournalEntry';

/**
 * JOURNAL PAGE
 *
 * Dedicated journaling experience with:
 * - Free tier: 5 entries/month, basic transformations
 * - Premium tier: Unlimited, deep transformations, equipment/boss unlocks
 * - Integration with existing journal component
 *
 * Route: /journal
 */
export default function JournalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            📖 Hero's Journal
          </h1>
          <p className="text-gray-300 text-lg">
            Transform your daily experiences into epic tales
          </p>
        </div>

        {/* Journal Entry Component */}
        <JournalEntry />

        {/* Usage Info */}
        <div className="max-w-4xl mx-auto mt-12 p-6 bg-gray-800/50 rounded-lg border border-purple-500/30">
          <h2 className="text-2xl font-bold text-white mb-4">How It Works</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-2">Free Tier</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>✓ 5 journal entries per month</li>
                <li>✓ Basic AI transformations (~100 words)</li>
                <li>✓ Mood tracking</li>
                <li>✓ 30-day storage</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">Founder Access ($47)</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>✓ Unlimited journal entries</li>
                <li>✓ Deep AI transformations (~250 words with quest suggestions)</li>
                <li>✓ "On This Day" memories</li>
                <li>✓ Equipment unlocks (7 items)</li>
                <li>✓ Boss battles (3 bosses)</li>
                <li>✓ Permanent storage</li>
                <li>✓ Mood analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
