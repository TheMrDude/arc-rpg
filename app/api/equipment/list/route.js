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
 * GET /api/equipment/list
 *
 * Returns all equipment from catalog with user's ownership/equipped status
 * Filters by type if provided (weapon, armor, accessory, companion)
 */
export async function GET(request) {
  try {
    // SECURE: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Equipment list: No bearer token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('Equipment list: Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // weapon, armor, accessory, companion

    // Get user's gold and premium status
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('gold, is_premium, subscription_status')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.is_premium || profile?.subscription_status === 'active';

    // Get all equipment from catalog
    let query = supabaseAdmin
      .from('equipment_catalog')
      .select('*')
      .order('sort_order', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }

    const { data: catalog, error: catalogError } = await query;

    if (catalogError) {
      console.error('Failed to fetch equipment catalog:', catalogError);
      return NextResponse.json(
        { error: 'Failed to fetch equipment' },
        { status: 500 }
      );
    }

    // Get user's owned equipment
    const { data: userEquipment } = await supabaseAdmin
      .from('user_equipment')
      .select('equipment_id, is_equipped, purchased_at')
      .eq('user_id', user.id);

    // Create lookup map for owned equipment
    const ownedMap = {};
    userEquipment?.forEach(item => {
      ownedMap[item.equipment_id] = {
        is_equipped: item.is_equipped,
        purchased_at: item.purchased_at
      };
    });

    // Enrich catalog with ownership status
    const enrichedCatalog = catalog.map(item => ({
      ...item,
      is_owned: !!ownedMap[item.id],
      is_equipped: ownedMap[item.id]?.is_equipped || false,
      purchased_at: ownedMap[item.id]?.purchased_at || null,
      can_afford: (profile?.gold || 0) >= item.gold_price,
      can_purchase: (
        !ownedMap[item.id] && // Not owned
        (profile?.gold || 0) >= item.gold_price && // Can afford
        (!item.is_premium_only || isPremium) // Has premium if required
      ),
      lock_reason: ownedMap[item.id] ? null :
        (profile?.gold || 0) < item.gold_price ? 'insufficient_gold' :
        (item.is_premium_only && !isPremium) ? 'premium_required' :
        null
    }));

    // Group by type
    const grouped = {
      weapon: enrichedCatalog.filter(item => item.type === 'weapon'),
      armor: enrichedCatalog.filter(item => item.type === 'armor'),
      accessory: enrichedCatalog.filter(item => item.type === 'accessory'),
      companion: enrichedCatalog.filter(item => item.type === 'companion')
    };

    // Calculate stats
    const stats = {
      total_items: catalog.length,
      owned_items: Object.keys(ownedMap).length,
      equipped_items: Object.values(ownedMap).filter(i => i.is_equipped).length,
      affordable_items: enrichedCatalog.filter(i => !i.is_owned && i.can_afford).length,
      by_type: {
        weapon: { total: grouped.weapon.length, owned: grouped.weapon.filter(i => i.is_owned).length },
        armor: { total: grouped.armor.length, owned: grouped.armor.filter(i => i.is_owned).length },
        accessory: { total: grouped.accessory.length, owned: grouped.accessory.filter(i => i.is_owned).length },
        companion: { total: grouped.companion.length, owned: grouped.companion.filter(i => i.is_owned).length }
      }
    };

    return NextResponse.json({
      equipment: type ? enrichedCatalog : grouped,
      user_gold: profile?.gold || 0,
      is_premium: isPremium,
      stats
    });

  } catch (error) {
    console.error('Equipment list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}
