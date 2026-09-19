CREATE TABLE public.quotes (
  quote_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  customer JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('generated', 'pending_approval', 'approved', 'rejected', 'sent', 'delivery_failed')),
  created_at TEXT NOT NULL,
  submitted_at TEXT,
  last_error TEXT,
  submission_claimed_at TEXT,
  submission_claim_token UUID
);
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.quote_submit_limits (
  limiter_key TEXT PRIMARY KEY,
  window_started_at BIGINT NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count >= 0)
);
GRANT ALL ON public.quote_submit_limits TO service_role;
ALTER TABLE public.quote_submit_limits ENABLE ROW LEVEL SECURITY;