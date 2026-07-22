# Real-Testimonial Engine

Captures real user quotes ethically — an in-app reflection prompt fired at
genuine milestone moments, with explicit, opt-in consent for public use. Brand
law: **no guilt, no nagging.**

## How it works

- The prompt appears at most **once per milestone**, and never more than **once
  per 7 days** per user, at four earned-pride moments: first boss win, 30th
  lifetime completion, first map region unlocked, 100th lifetime completion.
- Whatever the user writes is **always saved to their journal**
  (`quest_reflections`), so the prompt has value even with zero consent.
- Consent is **opt-in, unchecked by default**. A public quote requires the user
  to check the box; they can revoke sharing at any time from
  **Settings → My quotes** (no confirmation, no friction).
- The landing page reads **only** the `live_testimonials` view — approved,
  consented, non-revoked rows. Until 3+ real quotes exist it shows the honest
  "we're early" empty state. **No invented reviews, ever.**

## Feature flag

- `NEXT_PUBLIC_TESTIMONIALS_ENABLED=true` turns on the in-app capture prompt.
- The landing-page testimonial section (data-driven + honest empty state) ships
  **unflagged** — it's a copy fix, not a feature.

## Review flow (Dan runs this)

Quotes start as `status = 'pending'`. Only you move them forward. No admin UI —
just the Supabase SQL editor.

1. **Open the queue.** Run `supabase/queries/pending_testimonials.sql` in the
   Supabase SQL editor. It lists only quotes the user consented to share
   (`consented_public = true`, not revoked) that are still `pending`.
2. **Read each quote** with its `display_name`, `level_at_time`, and `archetype`
   — exactly what would appear publicly. Copy the `id` of any you want to
   publish.
3. **Publish it:** `UPDATE testimonials SET status = 'live' WHERE id = '<uuid>';`
   It appears on the landing page within 24h (the public feed is edge-cached).
   Optionally use `status = 'approved'` to mark reviewed-but-not-yet-public.
4. **Skip anything off-brand.** Leave it `pending` (invisible), or set
   `status = 'retired'` to keep it out of future queues. Never edit a user's
   words.
5. **Retire later if needed:** `UPDATE testimonials SET status = 'retired'
   WHERE id = '<uuid>';`. Users can also self-revoke anytime, which removes the
   quote from the public view automatically — no action needed from you.

## Data model

- `testimonials` — quotes + consent + moderation status. Not client-readable;
  the service role reads it, and the public `live_testimonials` view exposes
  only live+consented+non-revoked rows.
- `testimonial_prompt_log` — one row per (user, milestone); backs the
  once-per-milestone guarantee and the 7-day global cooldown.
- `live_testimonials` (view) — the only public read surface, consumed by the
  landing page via `/api/testimonials/live`.

See migration `supabase/migrations/20260721010000_testimonials.sql`.
