import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const VALID_ARCHETYPES = ['warrior', 'seeker', 'builder', 'shadow', 'sage'];

export async function POST(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { new_archetype } = await request.json();

    // Validate archetype
    if (!new_archetype || !VALID_ARCHETYPES.includes(new_archetype)) {
      return NextResponse.json({ error: 'Invalid archetype' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Check if user is premium and can switch
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, archetype, last_archetype_switch_date')
      .eq('id', user.id)
      .single();

    if (!profile?.is_premium) {
      return NextResponse.json(
        { error: 'Premium feature - upgrade to switch archetypes' },
        { status: 403 }
      );
    }

    // Check cooldown (7 days)
    const lastSwitch = profile.last_archetype_switch_date
      ? new Date(profile.last_archetype_switch_date)
      : null;

    const now = new Date();
    const canSwitch = !lastSwitch || now - lastSwitch >= 7 * 24 * 60 * 60 * 1000;

    if (!canSwitch) {
      const nextSwitchDate = new Date(lastSwitch.getTime() + 7 * 24 * 60 * 60 * 1000);
      return NextResponse.json(
        {
          error: `You can switch archetypes once every 7 days. Next available: ${nextSwitchDate.toLocaleDateString()}`,
        },
        { status: 429 }
      );
    }

    // Don't allow switching to same archetype
    if (profile.archetype === new_archetype) {
      return NextResponse.json(
        { error: 'You are already this archetype' },
        { status: 400 }
      );
    }

    const oldArchetype = profile.archetype;

    // Update archetype
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        archetype: new_archetype,
        last_archetype_switch_date: now.toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating archetype:', updateError);
      return NextResponse.json({ error: 'Failed to switch archetype' }, { status: 500 });
    }

    console.log('Archetype switched:', {
      userId: user.id,
      oldArchetype,
      newArchetype: new_archetype,
      timestamp: now.toISOString(),
    });

    return NextResponse.json({
      success: true,
      old_archetype: oldArchetype,
      new_archetype,
      message: `You have transformed from the ${oldArchetype} to the ${new_archetype}!`,
    });
  } catch (error) {
    console.error('Archetype switch error:', error);
    return NextResponse.json({ error: 'Failed to switch archetype' }, { status: 500 });
  }
}
