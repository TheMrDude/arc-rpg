import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limiter';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const FREE_TIER_MONTHLY_LIMIT = 5;

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // SECURE: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Journal create: No bearer token', {
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('Journal create: Unauthorized access attempt', {
        error: authError?.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entry_text, mood } = await request.json();

    // SECURE: Input validation
    if (!entry_text || typeof entry_text !== 'string') {
      return NextResponse.json({ error: 'Invalid entry text' }, { status: 400 });
    }

    if (entry_text.length < 50) {
      return NextResponse.json({ error: 'Entry must be at least 50 characters' }, { status: 400 });
    }

    if (entry_text.length > 5000) {
      return NextResponse.json({ error: 'Entry must be less than 5000 characters' }, { status: 400 });
    }

    if (entry_text.trim().length === 0) {
      return NextResponse.json({ error: 'Entry text cannot be empty' }, { status: 400 });
    }

    // Validate mood if provided
    if (mood !== null && mood !== undefined) {
      if (typeof mood !== 'number' || mood < 1 || mood > 5) {
        return NextResponse.json({ error: 'Mood must be between 1 and 5' }, { status: 400 });
      }
    }

    // SECURE: Sanitize input (remove potentially harmful characters)
    const sanitizedEntry = entry_text
      .replace(/[<>]/g, '') // Remove HTML tags
      .trim();

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, subscription_status, journal_entry_count')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.is_premium || profile?.subscription_status === 'active';

    // Check free tier limits
    if (!isPremium) {
      // Count entries this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabaseAdmin
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      if (count && count >= FREE_TIER_MONTHLY_LIMIT) {
        return NextResponse.json(
          {
            error: 'Monthly limit reached',
            limit: FREE_TIER_MONTHLY_LIMIT,
            current: count,
            upgrade_required: true,
            message: `You've reached your free limit of ${FREE_TIER_MONTHLY_LIMIT} journal entries this month. Upgrade to Founder Access for unlimited journaling.`
          },
          { status: 403 }
        );
      }
    }

    // Calculate word count
    const wordCount = sanitizedEntry.split(/\s+/).filter(word => word.length > 0).length;

    // Create entry (expires_at set automatically by trigger for free users)
    const { data: entry, error: createError } = await supabaseAdmin
      .from('journal_entries')
      .insert({
        user_id: user.id,
        entry_text: sanitizedEntry,
        mood: mood || null,
        word_count: wordCount
      })
      .select()
      .single();

    if (createError) {
      console.error('Journal create error:', createError);
      return NextResponse.json(
        { error: 'Failed to create journal entry' },
        { status: 500 }
      );
    }

    // Check for equipment/boss unlocks (premium only)
    const totalEntries = (profile?.journal_entry_count || 0) + 1;
    let unlocks = { equipment: [], bosses: [] };

    if (isPremium) {
      unlocks = await checkUnlocks(user.id, totalEntries);

      // Mark entry as milestone if unlocks happened
      if (unlocks.equipment.length > 0 || unlocks.bosses.length > 0) {
        await supabaseAdmin
          .from('journal_entries')
          .update({ is_milestone: true })
          .eq('id', entry.id);
      }
    }

    console.log('Journal entry created successfully', {
      userId: user.id,
      entryId: entry.id,
      wordCount,
      mood: mood || 'none',
      isPremium,
      totalEntries,
      unlocks: {
        equipment: unlocks.equipment.length,
        bosses: unlocks.bosses.length
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      entry,
      total_entries: totalEntries,
      unlocks_available: unlocks
    });

  } catch (error) {
    console.error('Journal creation error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to create journal entry. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Check for equipment and boss unlocks based on entry count
 */
async function checkUnlocks(userId, entryCount) {
  try {
    // Check equipment unlocks
    const { data: availableEquipment } = await supabaseAdmin
      .from('journal_equipment')
      .select('*')
      .lte('unlock_requirement', entryCount)
      .eq('is_premium_only', true)
      .order('unlock_requirement', { ascending: true });

    // Check which ones user doesn't have yet
    const { data: userEquipment } = await supabaseAdmin
      .from('user_journal_equipment')
      .select('equipment_id')
      .eq('user_id', userId);

    const userEquipmentIds = new Set(userEquipment?.map(e => e.equipment_id) || []);
    const newEquipment = availableEquipment?.filter(e => !userEquipmentIds.has(e.id)) || [];

    // Auto-unlock new equipment
    if (newEquipment.length > 0) {
      await supabaseAdmin
        .from('user_journal_equipment')
        .insert(
          newEquipment.map(e => ({
            user_id: userId,
            equipment_id: e.id,
            unlocked_at: new Date().toISOString()
          }))
        );
    }

    // Check boss unlocks
    const { data: availableBosses } = await supabaseAdmin
      .from('journal_bosses')
      .select('*')
      .lte('unlock_requirement', entryCount)
      .eq('is_premium_only', true)
      .order('unlock_requirement', { ascending: true });

    const { data: userBosses } = await supabaseAdmin
      .from('user_boss_battles')
      .select('boss_id, status')
      .eq('user_id', userId);

    const userBossIds = new Set(userBosses?.map(b => b.boss_id) || []);
    const newBosses = availableBosses?.filter(b => !userBossIds.has(b.id)) || [];

    // Auto-unlock new bosses
    if (newBosses.length > 0) {
      await supabaseAdmin
        .from('user_boss_battles')
        .insert(
          newBosses.map(b => ({
            user_id: userId,
            boss_id: b.id,
            status: 'available',
            created_at: new Date().toISOString()
          }))
        );
    }

    return {
      equipment: newEquipment,
      bosses: newBosses
    };
  } catch (error) {
    console.error('Error checking unlocks:', error);
    return { equipment: [], bosses: [] };
  }
}
