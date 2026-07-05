-- Copy fix: de-streak the day-3 daily login reward message.
-- Applied to production 2026-07-04 via MCP (migration name: daily_login_reward_copy_destreak).
-- Only the day-3 message string changed; logic is identical.

CREATE OR REPLACE FUNCTION public.claim_daily_login_reward(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_already_claimed boolean;
  v_consecutive_days integer;
  v_base_gold integer := 10;
  v_bonus_gold integer := 0;
  v_total_gold integer;
  v_streak_day integer;
BEGIN
  -- Check if already claimed today
  SELECT EXISTS(
    SELECT 1 FROM public.daily_login_rewards
    WHERE user_id = p_user_id AND login_date = CURRENT_DATE
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already claimed today', 'gold', 0);
  END IF;

  -- Count consecutive days (including yesterday)
  SELECT COUNT(*) INTO v_consecutive_days
  FROM public.daily_login_rewards
  WHERE user_id = p_user_id
    AND login_date >= CURRENT_DATE - INTERVAL '7 days'
    AND login_date < CURRENT_DATE;

  v_streak_day := v_consecutive_days + 1;

  -- Bonus gold: day 3 = +5, day 5 = +10, day 7 = +25
  IF v_streak_day >= 7 THEN
    v_bonus_gold := 25;
  ELSIF v_streak_day >= 5 THEN
    v_bonus_gold := 10;
  ELSIF v_streak_day >= 3 THEN
    v_bonus_gold := 5;
  END IF;

  v_total_gold := v_base_gold + v_bonus_gold;

  -- Insert the login reward
  INSERT INTO public.daily_login_rewards (user_id, login_date, gold_awarded, bonus_applied, streak_day)
  VALUES (p_user_id, CURRENT_DATE, v_total_gold, v_bonus_gold > 0, v_streak_day);

  -- Add gold to profile
  UPDATE public.profiles
  SET gold = gold + v_total_gold
  WHERE id = p_user_id;

  -- Log the gold transaction
  INSERT INTO public.gold_transactions (id, user_id, amount, transaction_type, reference_id, metadata)
  VALUES (
    gen_random_uuid(),
    p_user_id,
    v_total_gold,
    'daily_login',
    NULL,
    jsonb_build_object('streak_day', v_streak_day, 'base', v_base_gold, 'bonus', v_bonus_gold)
  );

  RETURN jsonb_build_object(
    'success', true,
    'gold_awarded', v_total_gold,
    'base_gold', v_base_gold,
    'bonus_gold', v_bonus_gold,
    'streak_day', v_streak_day,
    'message', CASE
      WHEN v_streak_day >= 7 THEN 'Week warrior! +25 bonus gold!'
      WHEN v_streak_day >= 5 THEN 'Five days strong! +10 bonus gold!'
      WHEN v_streak_day >= 3 THEN 'Three days strong! +5 bonus gold!'
      ELSE 'Welcome back, hero! +10 gold'
    END
  );
END;
$function$;
