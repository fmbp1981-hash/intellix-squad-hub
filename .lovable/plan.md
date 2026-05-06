## Fix Edge Function Bundling Timeout

Replace `https://esm.sh/@supabase/supabase-js@2.45.0` with `npm:@supabase/supabase-js@2.45.0` in two files to avoid the 10s esm.sh fetch timeout during bundling.

### Changes

1. **`supabase/functions/_shared/auth.ts`** (line 1)
   ```typescript
   import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
   ```

2. **`supabase/functions/export-run/index.ts`** (line 1)
   ```typescript
   import { createClient } from "npm:@supabase/supabase-js@2.45.0";
   ```

### Verification

- Deploy `export-run` and confirm successful bundling.
- Check logs for boot success.
