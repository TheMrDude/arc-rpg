import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * What commit is actually serving this request.
 *
 * The smoke test needs this because without it the whole suite has a hollow
 * pass: it ran green against production for a deploy that had already been
 * superseded, and against a stale service worker serving a bundle that was fine
 * when it was built. "Six checks passed" means nothing if you cannot say which
 * build they passed against.
 *
 * Two values, and the difference between them matters:
 *
 *   buildId  - NEXT_PUBLIC_BUILD_ID, inlined by next.config.js at BUILD time.
 *              This is the one worth asserting on: it is baked into the
 *              artifact, so it can only be right if the code answering you was
 *              compiled from that commit.
 *   commit   - VERCEL_GIT_COMMIT_SHA read at REQUEST time. Useful for
 *              diagnosis, but weaker: it describes the deployment's
 *              environment, not the bundle. A stale build in a fresh
 *              deployment would report a correct commit here and a wrong
 *              buildId above.
 *
 * No auth and no database: it must answer even when everything else is broken,
 * and it discloses nothing a visitor cannot read out of the page source, which
 * already embeds the same build id in the service-worker registration URL.
 */
export function GET() {
  return NextResponse.json(
    {
      buildId: process.env.NEXT_PUBLIC_BUILD_ID || 'dev',
      commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
      env: process.env.VERCEL_ENV || 'local',
      deployedAt: process.env.VERCEL_DEPLOYMENT_ID || null,
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
