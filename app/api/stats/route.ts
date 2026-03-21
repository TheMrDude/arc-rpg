import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cache for 5 minutes
let cachedStats: any = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const now = Date.now();

    // Return cached stats if still valid
    if (cachedStats && (now - cacheTime) < CACHE_DURATION) {
      return NextResponse.json(cachedStats);
    }

    // Single optimized query using Promise.all instead of sequential N+1
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { count: totalUsers },
      { count: premiumUsers },
      { count: questsCompletedToday },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
      supabase.from('quests').select('*', { count: 'exact', head: true }).eq('completed', true).gte('completed_at', today.toISOString()),
    ]);

    // Update cache
    cachedStats = {
      heroesOnline: 0,
      questsCompletedToday: questsCompletedToday || 0,
      totalHeroes: totalUsers || 0,
      proMembers: premiumUsers || 0,
      updatedAt: now
    };
    cacheTime = now;

    return NextResponse.json(cachedStats);

  } catch (error) {
    console.error('Error fetching stats:', error);

    return NextResponse.json({
      heroesOnline: 0,
      questsCompletedToday: 0,
      totalHeroes: 0,
      proMembers: 0,
      updatedAt: Date.now()
    });
  }
}
