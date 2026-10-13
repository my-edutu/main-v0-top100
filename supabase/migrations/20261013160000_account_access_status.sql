-- Account authorization is distinct from public directory visibility.
-- Apply this migration before deploying code that reads account_status.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_account_status_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('active', 'suspended', 'deleted'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.account_status IS
  'Account access status, independent of is_public directory visibility.';
