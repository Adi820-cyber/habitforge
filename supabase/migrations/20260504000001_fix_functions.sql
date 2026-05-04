-- Fix: Add search_path to SECURITY DEFINER functions (removes Supabase warnings)
CREATE OR REPLACE FUNCTION increment_points(user_id UUID, amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ BEGIN UPDATE users SET points = GREATEST(0, points + amount) WHERE id = user_id; END; $$;

CREATE OR REPLACE FUNCTION decrement_points(user_id UUID, amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ BEGIN UPDATE users SET points = GREATEST(0, points - amount) WHERE id = user_id; END; $$;

CREATE OR REPLACE FUNCTION increment_challenge_completions(challenge_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ BEGIN UPDATE challenges SET total_completions = total_completions + 1 WHERE id = challenge_id; END; $$;
