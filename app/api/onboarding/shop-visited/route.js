import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';
import { advanceWelcomeChain } from '@/lib/quest-chain';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fired when the user opens the shop (equipment tab or /shop page).
// Records the visit once (unique per user/event) and lets the Welcome
// Quest chain advance past step 4 ("Equip Your Hero").
export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await supabaseAdmin.from('onboarding_events').upsert(
      { user_id: user.id, event: 'shop_visited' },
      { onConflict: 'user_id,event', ignoreDuplicates: true }
    );

    const welcomeChain = await advanceWelcomeChain(user.id, 'shop_visited');

    return NextResponse.json({ success: true, welcome_chain: welcomeChain });
  } catch (error) {
    console.error('shop-visited error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
