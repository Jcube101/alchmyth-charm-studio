CREATE OR REPLACE FUNCTION public.claim_quote_submission(p_quote_id TEXT, p_claimed_at TEXT, p_stale_before TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token UUID := gen_random_uuid();
BEGIN
  UPDATE public.quotes
  SET submission_claimed_at = p_claimed_at,
      submission_claim_token = v_token
  WHERE quote_id = p_quote_id
    AND submitted_at IS NULL
    AND (submission_claimed_at IS NULL OR submission_claimed_at < p_stale_before);
  IF FOUND THEN RETURN v_token; END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_quote_submission(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quote_submission(TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.check_quote_submit_rate_limit(p_key TEXT, p_now BIGINT, p_window_ms BIGINT DEFAULT 60000, p_limit INTEGER DEFAULT 10)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.quote_submit_limits%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.quote_submit_limits WHERE limiter_key = p_key FOR UPDATE;
  IF NOT FOUND OR p_now - v_row.window_started_at >= p_window_ms THEN
    INSERT INTO public.quote_submit_limits (limiter_key, window_started_at, request_count)
    VALUES (p_key, p_now, 1)
    ON CONFLICT (limiter_key) DO UPDATE
      SET window_started_at = EXCLUDED.window_started_at, request_count = 1;
    RETURN TRUE;
  END IF;
  IF v_row.request_count >= p_limit THEN RETURN FALSE; END IF;
  UPDATE public.quote_submit_limits
  SET request_count = request_count + 1
  WHERE limiter_key = p_key;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.check_quote_submit_rate_limit(TEXT, BIGINT, BIGINT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_quote_submit_rate_limit(TEXT, BIGINT, BIGINT, INTEGER) TO service_role;