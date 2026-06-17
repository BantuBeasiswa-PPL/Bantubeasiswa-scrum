E2E tests with the shared Supabase test DB
=========================================

Quick summary
-------------
- Use the shared Supabase test instance (provided by PM) via `.env.test`.
- Never commit `.env.test` — `.gitignore` already ignores `.env*`.

Run tests (recommended)
----------------------
1) Install `env-cmd` (only once):

```bash
npm install --save-dev env-cmd
```

2) Run Playwright e2e using the test env file:

```bash
npm run test:e2e:with-env
```

$Env:NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
$Env:NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
$Env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

npm run test:e2e
```

Safety checklist
----------------
- Verify the provided DB is an isolated test instance (not production).
- Ensure seeders run and `afterEach` cleanup exists in tests to avoid collisions.
- Rotate `SUPABASE_SERVICE_ROLE_KEY` if this key is public.

Notes
-----
- Playwright uses `webServer` that runs `npm run dev`. Ensure no dev server conflicts.
- Playwright config already sets `workers: 1` to reduce race conditions.

If you want, I can run `npm run test:e2e:with-env` now from this workspace.
