import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    // SECURITY: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Equipment purchase: No bearer token', {
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('Equipment purchase: Unauthorized', {
        error: authError?.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Validate input
    const { equipment_id } = await request.json();

    if (!equipment_id || typeof equipment_id !== 'string') {
      return NextResponse.json({ error: 'Invalid equipment ID' }, { status: 400 });
    }

    // SECURITY: Check if user is premium (equipment is premium feature)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, level, gold')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.subscription_status !== 'active') {
      return NextResponse.json({
        error: 'Premium feature',
        message: 'Equipment shop requires premium subscription'
      }, { status: 403 });
    }

    // SECURITY: Get equipment details (server-side, don't trust client)
    const { data: equipment, error: equipError } = await supabaseAdmin
      .from('equipment_catalog')
      .select('*')
      .eq('id', equipment_id)
      .single();

    if (equipError || !equipment) {
      console.error('Equipment not found:', { equipment_id, error: equipError });
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // SECURITY: Check if user already owns this equipment
    const { data: existing } = await supabaseAdmin
      .from('user_equipment')
      .select('id')
      .eq('user_id', user.id)
      .eq('equipment_id', equipment_id)
      .single();

    if (existing) {
      return NextResponse.json({
        error: 'Already owned',
        message: 'You already own this equipment'
      }, { status: 400 });
    }

    // SECURITY: Check level requirement
    if (profile.level < equipment.required_level) {
      return NextResponse.json({
        error: 'Level too low',
        message: `You need to reach level ${equipment.required_level} to unlock this equipment`
      }, { status: 403 });
    }

    // SECURITY: Check gold balance (server-side)
    if (profile.gold < equipment.gold_price) {
      return NextResponse.json({
        error: 'Insufficient gold',
        message: `You need ${equipment.gold_price} gold but only have ${profile.gold}`
      }, { status: 403 });
    }

    // SECURITY: Use atomic transaction function to deduct gold
    const { data: transactionResult, error: transactionError } = await supabaseAdmin
      .rpc('process_gold_transaction', {
        p_user_id: user.id,
        p_amount: -equipment.gold_price, // Negative for deduction
        p_transaction_type: 'equipment_purchase',
        p_reference_id: equipment_id,
        p_metadata: {
          equipment_name: equipment.name,
          equipment_rarity: equipment.rarity,
          equipment_slot: equipment.slot,
        }
      });

    if (transactionError) {
      console.error('Gold transaction failed:', {
        error: transactionError,
        userId: user.id,
        equipmentId: equipment_id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({
        error: 'Transaction failed',
        message: 'Failed to process gold payment'
      }, { status: 500 });
    }

    // Check if transaction succeeded
    const result = transactionResult[0];
    if (!result || !result.success) {
      return NextResponse.json({
        error: 'Transaction failed',
        message: result?.error_message || 'Insufficient gold'
      }, { status: 400 });
    }

    // Grant equipment to user
    const { error: grantError } = await supabaseAdmin
      .from('user_equipment')
      .insert({
        user_id: user.id,
        equipment_id: equipment_id,
      });

    if (grantError) {
      console.error('Failed to grant equipment after payment:', {
        error: grantError,
        userId: user.id,
        equipmentId: equipment_id,
        timestamp: new Date().toISOString(),
      });

      // CRITICAL: Refund the gold if equipment grant failed
      await supabaseAdmin.rpc('process_gold_transaction', {
        p_user_id: user.id,
        p_amount: equipment.gold_price, // Refund
        p_transaction_type: 'refund',
        p_reference_id: equipment_id,
        p_metadata: {
          reason: 'Equipment grant failed',
          error: grantError.message,
        }
      });

      return NextResponse.json({
        error: 'Purchase failed',
        message: 'Failed to grant equipment (gold refunded)'
      }, { status: 500 });
    }

    console.log('Equipment purchased successfully', {
      userId: user.id,
      equipmentId: equipment_id,
      equipmentName: equipment.name,
      cost: equipment.gold_price,
      newBalance: result.new_balance,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      equipment: equipment,
      new_balance: result.new_balance,
      cost: equipment.gold_price,
    });

  } catch (error) {
    console.error('Equipment purchase error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to process equipment purchase'
    }, { status: 500 });
  }
}
