import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/founder-spots
 *
 * View founder spot inventory and claims
 * Admin only
 */
export async function GET(request) {
  // Check admin authorization
  const { error: adminError, user: adminUser } = await requireAdmin(request);
  if (adminError) return adminError;

  const supabaseAdmin = getSupabaseAdminClient();

  try {
    // Get founder inventory
    const { data: inventory, error: invError } = await supabaseAdmin
      .from('founder_inventory')
      .select('*')
      .single();

    if (invError) {
      console.error('Founder inventory query error:', invError);
      return NextResponse.json(
        { error: 'Failed to fetch founder inventory' },
        { status: 500 }
      );
    }

    // Get all premium users to see who claimed
    const { data: premiumUsers, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, archetype, level, is_premium, premium_since, subscription_status, stripe_customer_id, created_at')
      .or('is_premium.eq.true,subscription_status.eq.active')
      .order('premium_since', { ascending: true });

    if (usersError) {
      console.error('Premium users query error:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch premium users' },
        { status: 500 }
      );
    }

    // Get payment events for tracking
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payment_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (paymentsError) {
      console.error('Payment events query error:', paymentsError);
    }

    const stats = {
      totalCapacity: inventory.total_capacity,
      remaining: inventory.remaining,
      claimed: inventory.total_capacity - inventory.remaining,
      percentageSold: ((inventory.total_capacity - inventory.remaining) / inventory.total_capacity * 100).toFixed(1),
      premiumUsers: premiumUsers.length,
      recentPayments: payments?.length || 0
    };

    console.log('Admin viewed founder spots:', {
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      remaining: inventory.remaining,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      inventory,
      stats,
      premiumUsers,
      recentPayments: payments || []
    });
  } catch (error) {
    console.error('Admin founder spots error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/founder-spots
 *
 * Manually adjust founder spot inventory (emergency use only)
 * Admin only
 *
 * Body: { action: 'add' | 'remove', amount: number, reason: string }
 */
export async function POST(request) {
  // Check admin authorization
  const { error: adminError, user: adminUser } = await requireAdmin(request);
  if (adminError) return adminError;

  const supabaseAdmin = getSupabaseAdminClient();

  try {
    const { action, amount, reason } = await request.json();

    // Validate input
    if (!action || !['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "add" or "remove"' },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be positive number' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reason is required for audit trail' },
        { status: 400 }
      );
    }

    const delta = action === 'add' ? amount : -amount;

    // Update inventory
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('founder_inventory')
      .update({
        total_capacity: supabaseAdmin.raw(`total_capacity + ${delta}`),
        remaining: supabaseAdmin.raw(`remaining + ${delta}`),
        updated_at: new Date().toISOString()
      })
      .eq('id', 'founder')
      .select()
      .single();

    if (updateError) {
      console.error('Founder inventory update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update inventory' },
        { status: 500 }
      );
    }

    // Log the action
    console.warn('ADMIN INVENTORY ADJUSTMENT:', {
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      action,
      amount,
      delta,
      reason,
      newTotal: updated.total_capacity,
      newRemaining: updated.remaining,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Inventory ${action === 'add' ? 'increased' : 'decreased'} by ${amount}`,
      inventory: updated,
      auditLog: {
        adminEmail: adminUser.email,
        action,
        amount,
        reason,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Admin founder spots adjustment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
