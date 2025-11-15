import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Check if user is premium
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();

    if (!profile?.is_premium) {
      return NextResponse.json(
        { error: 'Premium feature - upgrade to access quest templates' },
        { status: 403 }
      );
    }

    // Fetch all official templates (available to all premium users)
    const { data: templates, error: fetchError } = await supabaseAdmin
      .from('quest_templates')
      .select('*')
      .eq('is_official', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (fetchError) {
      console.error('Error fetching templates:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ success: true, templates: templates || [] });
  } catch (error) {
    console.error('Templates list error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
