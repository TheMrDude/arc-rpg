import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Track important user engagement events
export async function POST(request) {
  try {
    // Optional auth - allow anonymous events but track user if available
    const { user } = await authenticateRequest(request);

    const {
      event_type,
      event_data,
      session_id,
    } = await request.json();

    // Validate event type
    const validEvents = [
      'page_view',
      'quest_created',
      'quest_completed',
      'gold_purchase_viewed',
      'gold_purchase_initiated',
      'gold_purchase_completed',
      'equipment_viewed',
      'equipment_purchased',
      'story_milestone',
      'level_up',
      'streak_achieved',
      'boss_encountered',
      'boss_defeated',
      'journal_created',
      'journal_transformed',
      'premium_conversion',
      'referral_completed',
      'feature_discovered',
      'session_start',
      'session_end',
    ];

    if (!event_type || !validEvents.includes(event_type)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Create analytics event
    const { error } = await supabaseAdmin
      .from('analytics_events')
      .insert({
        user_id: user?.id || null,
        event_type,
        event_data: event_data || {},
        session_id: session_id || null,
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      });

    if (error) {
      console.error('Analytics tracking error:', error);
      // Don't fail the request if analytics fails
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Analytics error:', error);
    // Don't fail the request if analytics fails
    return NextResponse.json({ success: true });
  }
}
