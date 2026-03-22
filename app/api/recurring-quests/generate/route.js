import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Verify cron secret OR admin auth
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query all due recurring quests
    const { data: dueQuests, error: queryError } = await supabaseAdmin
      .rpc('get_due_recurring_quests');

    let questsToGenerate;

    if (queryError) {
      // RPC may not exist — fall back to direct query
      console.log('RPC not available, using direct query');
      const today = new Date().toISOString().split('T')[0];

      const { data: allActive, error: fetchError } = await supabaseAdmin
        .from('recurring_quests')
        .select('*')
        .eq('is_active', true);

      if (fetchError) {
        console.error('Error fetching recurring quests:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch recurring quests' }, { status: 500 });
      }

      // Filter for due quests in application code
      questsToGenerate = (allActive || []).filter(rq => {
        if (!rq.last_generated_at) return true;

        const lastGen = new Date(rq.last_generated_at);
        const now = new Date();
        const daysSince = Math.floor((now - lastGen) / (1000 * 60 * 60 * 24));

        if (rq.recurrence_type === 'daily') {
          return daysSince >= 1;
        } else if (rq.recurrence_type === 'weekly') {
          return daysSince >= 7;
        } else if (rq.recurrence_type === 'custom') {
          return daysSince >= (rq.recurrence_interval || 1);
        }
        return false;
      });
    } else {
      questsToGenerate = dueQuests || [];
    }

    let generated = 0;
    const errors = [];

    for (const rq of questsToGenerate) {
      try {
        // Insert quest instance
        const { error: insertError } = await supabaseAdmin
          .from('quests')
          .insert({
            user_id: rq.user_id,
            original_text: rq.original_text,
            transformed_text: rq.transformed_text,
            difficulty: rq.difficulty,
            xp_value: rq.xp_value,
            completed: false,
          });

        if (insertError) {
          errors.push({ quest_id: rq.id, error: insertError.message });
          continue;
        }

        // Update last_generated_at
        await supabaseAdmin
          .from('recurring_quests')
          .update({ last_generated_at: new Date().toISOString().split('T')[0] })
          .eq('id', rq.id);

        generated++;
      } catch (err) {
        errors.push({ quest_id: rq.id, error: err.message });
      }
    }

    console.log('Recurring quest generation complete:', {
      total_due: questsToGenerate.length,
      generated,
      errors: errors.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      generated,
      total_due: questsToGenerate.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Recurring quest generation error:', error);
    return NextResponse.json({ error: 'Failed to generate recurring quests' }, { status: 500 });
  }
}

// Also support GET for Vercel Cron (Vercel crons use GET by default)
export async function GET(request) {
  return POST(request);
}
