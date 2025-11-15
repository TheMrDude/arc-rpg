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
 * POST /api/equipment/equip
 *
 * Equip or unequip an item
 * Only one item per type (slot) can be equipped
 *
 * Body: { equipment_id: string, action: 'equip' | 'unequip' }
 */
export async function POST(request) {
  try {
    // SECURE: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Equipment equip: No bearer token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('Equipment equip: Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { equipment_id, action } = await request.json();

    // Validate input
    if (!equipment_id || typeof equipment_id !== 'string') {
      return NextResponse.json({ error: 'Invalid equipment ID' }, { status: 400 });
    }

    if (!action || !['equip', 'unequip'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "equip" or "unequip"' }, { status: 400 });
    }

    // Verify user owns this equipment
    const { data: ownership, error: ownershipError } = await supabaseAdmin
      .from('user_equipment')
      .select('id, is_equipped')
      .eq('user_id', user.id)
      .eq('equipment_id', equipment_id)
      .single();

    if (ownershipError || !ownership) {
      return NextResponse.json(
        { error: 'Equipment not owned' },
        { status: 404 }
      );
    }

    // Get equipment type to manage slot exclusivity
    const { data: equipment, error: equipmentError } = await supabaseAdmin
      .from('equipment_catalog')
      .select('type, name')
      .eq('id', equipment_id)
      .single();

    if (equipmentError || !equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    if (action === 'equip') {
      // Unequip all items of same type (slot) first
      await supabaseAdmin
        .from('user_equipment')
        .update({ is_equipped: false })
        .eq('user_id', user.id)
        .eq('equipment_id', supabaseAdmin.raw(`(
          SELECT id FROM equipment_catalog WHERE type = '${equipment.type}'
        )`))
        .neq('equipment_id', equipment_id);

      // Equip the selected item
      const { error: equipError } = await supabaseAdmin
        .from('user_equipment')
        .update({ is_equipped: true })
        .eq('user_id', user.id)
        .eq('equipment_id', equipment_id);

      if (equipError) {
        console.error('Equip error:', equipError);
        return NextResponse.json(
          { error: 'Failed to equip item' },
          { status: 500 }
        );
      }

      console.log('Equipment equipped', {
        userId: user.id,
        equipmentId: equipment_id,
        equipmentName: equipment.name,
        type: equipment.type
      });

      return NextResponse.json({
        success: true,
        message: `Equipped ${equipment.name}`,
        action: 'equip'
      });

    } else {
      // Unequip the item
      const { error: unequipError } = await supabaseAdmin
        .from('user_equipment')
        .update({ is_equipped: false })
        .eq('user_id', user.id)
        .eq('equipment_id', equipment_id);

      if (unequipError) {
        console.error('Unequip error:', unequipError);
        return NextResponse.json(
          { error: 'Failed to unequip item' },
          { status: 500 }
        );
      }

      console.log('Equipment unequipped', {
        userId: user.id,
        equipmentId: equipment_id,
        equipmentName: equipment.name,
        type: equipment.type
      });

      return NextResponse.json({
        success: true,
        message: `Unequipped ${equipment.name}`,
        action: 'unequip'
      });
    }

  } catch (error) {
    console.error('Equipment equip error:', error);
    return NextResponse.json(
      { error: 'Failed to update equipment' },
      { status: 500 }
    );
  }
}
