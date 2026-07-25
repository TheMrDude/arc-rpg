import JournalEntry from '@/app/components/JournalEntry';

export const metadata = {
  title: 'Quest Journal | HabitQuest',
  description: 'Transform your daily experiences into epic tales with the HabitQuest journal.',
};

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
    <div className="kidquest min-h-screen bg-cream">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="kq-display text-4xl md:text-5xl font-bold text-navy mb-4">
            📖 Hero's Journal
          </h1>
          <p className="text-navy/60 text-lg">
            Transform your daily experiences into epic tales
          </p>
        </div>

        {/* Journal Entry Component */}
        <JournalEntry />

        {/* Usage Info */}
        <div className="max-w-4xl mx-auto mt-12 kq-card p-6">
          <h2 className="kq-display text-2xl font-bold text-navy mb-4">How It Works</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-purple mb-2">Free Tier</h3>
              <ul className="space-y-2 text-navy/70 text-sm">
                <li>✓ 5 journal entries per month</li>
                <li>✓ Basic AI transformations (~100 words)</li>
                <li>✓ Mood tracking</li>
                <li>✓ 30-day storage</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gold mb-2">Pro Access ($5/mo)</h3>
              <ul className="space-y-2 text-navy/70 text-sm">
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
