import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/equipment/purchase
 *
 * Purchase equipment using gold
 * Atomic transaction to prevent race conditions
 *
 * Body: { equipment_id: string }
 */
export async function POST(request) {
  try {
    // SECURE: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Equipment purchase: No bearer token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('Equipment purchase: Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { equipment_id } = await request.json();

    // Validate input
    if (!equipment_id || typeof equipment_id !== 'string') {
      return NextResponse.json({ error: 'Invalid equipment ID' }, { status: 400 });
    }

    // Use the atomic purchase function from database
    const { data, error } = await supabaseAdmin
      .rpc('purchase_equipment', {
        p_user_id: user.id,
        p_equipment_id: equipment_id
      });

    if (error) {
      console.error('Purchase equipment RPC error:', error);
      return NextResponse.json(
        { error: 'Purchase failed' },
        { status: 500 }
      );
    }

    const result = data[0];

    if (!result.success) {
      // Return appropriate status code based on error type
      const statusCode =
        result.message.includes('Insufficient gold') ? 400 :
        result.message.includes('Already owned') ? 400 :
        result.message.includes('Premium membership required') ? 403 :
        result.message.includes('not found') ? 404 :
        500;

      return NextResponse.json(
        {
          error: result.message,
          new_balance: result.new_balance
        },
        { status: statusCode }
      );
    }

    // Get equipment details for response
    const { data: equipment } = await supabaseAdmin
      .from('equipment_catalog')
      .select('name, type, rarity, gold_price, stat_bonus')
      .eq('id', equipment_id)
      .single();

    console.log('Equipment purchased successfully', {
      userId: user.id,
      equipmentId: equipment_id,
      equipmentName: equipment?.name,
      price: equipment?.gold_price,
      newBalance: result.new_balance
    });

    return NextResponse.json({
      success: true,
      message: 'Purchase successful',
      equipment,
      new_balance: result.new_balance
    });

  } catch (error) {
    console.error('Equipment purchase error:', error);
    return NextResponse.json(
      { error: 'Purchase failed. Please try again.' },
      { status: 500 }
    );
  }
}
