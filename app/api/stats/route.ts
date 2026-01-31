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

    // Get heroes online (active in last 30 minutes)
    const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000).toISOString();
    const { count: heroesOnline } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', thirtyMinutesAgo);

    // Get quests completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: questsCompletedToday } = await supabase
      .from('quests')
      .select('*', { count: 'exact', head: true })
      .eq('completed', true)
      .gte('completed_at', today.toISOString());

    // Get founder spots remaining (25 total)
    const { count: premiumUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_premium', true);

    const founderSpotsRemaining = Math.max(0, 25 - (premiumUsers || 0));

    // Get total registered users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Update cache
    cachedStats = {
      heroesOnline: heroesOnline || 0,
      questsCompletedToday: questsCompletedToday || 0,
      founderSpotsRemaining,
      totalHeroes: totalUsers || 0,
      updatedAt: now
    };
    cacheTime = now;

    return NextResponse.json(cachedStats);

  } catch (error) {
    console.error('Error fetching stats:', error);

    // Return minimal fallback stats on error - no fake numbers
    return NextResponse.json({
      heroesOnline: 0,
      questsCompletedToday: 0,
      founderSpotsRemaining: 25,
      totalHeroes: 0,
      updatedAt: Date.now()
    });
  }
}
