-- ──────────────────────────────────────────────────────────────────────────────
-- marketing_drafts: auto-assign scheduled_for on approval
-- Mirrors the nextScheduledFor() algorithm in marketing-approval edge function.
-- Fires BEFORE UPDATE, so NEW.scheduled_for is set before the row is written.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION marketing_auto_assign_scheduled_for()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_target_days  int[];
  v_candidate    date;
  v_dow          int;   -- 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  v_conflict     boolean;
  v_checked      int := 0;
BEGIN
  -- Only act when transitioning to 'approved' with no scheduled_for set
  IF NEW.status = 'approved'
     AND OLD.status IS DISTINCT FROM 'approved'
     AND NEW.scheduled_for IS NULL
  THEN
    CASE NEW.platform
      WHEN 'instagram' THEN v_target_days := ARRAY[2, 4, 6];   -- Tue Thu Sat
      WHEN 'linkedin'  THEN v_target_days := ARRAY[1, 3, 5];   -- Mon Wed Fri
      ELSE
        -- WhatsApp or unknown: schedule for tomorrow
        NEW.scheduled_for := (CURRENT_DATE + INTERVAL '1 day')::date;
        RETURN NEW;
    END CASE;

    v_candidate := CURRENT_DATE + INTERVAL '1 day';

    WHILE v_checked < 21 LOOP
      v_dow := EXTRACT(DOW FROM v_candidate)::int;

      IF v_dow = ANY(v_target_days) THEN
        SELECT EXISTS (
          SELECT 1 FROM marketing_drafts
          WHERE  platform     = NEW.platform
          AND    scheduled_for = v_candidate
          AND    status       IN ('approved', 'published')
          AND    id           != NEW.id
        ) INTO v_conflict;

        IF NOT v_conflict THEN
          NEW.scheduled_for := v_candidate;
          RETURN NEW;
        END IF;
      END IF;

      v_candidate := v_candidate + INTERVAL '1 day';
      v_checked   := v_checked + 1;
    END LOOP;

    -- Fallback: next calendar day (should never reach here in practice)
    NEW.scheduled_for := (CURRENT_DATE + INTERVAL '1 day')::date;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists (idempotent)
DROP TRIGGER IF EXISTS marketing_drafts_auto_schedule ON marketing_drafts;

CREATE TRIGGER marketing_drafts_auto_schedule
  BEFORE UPDATE ON marketing_drafts
  FOR EACH ROW
  EXECUTE FUNCTION marketing_auto_assign_scheduled_for();

-- ──────────────────────────────────────────────────────────────────────────────
-- Backfill: assign scheduled_for to already-approved posts that have none.
-- Runs once at migration time.
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r            RECORD;
  v_target_days int[];
  v_candidate  date;
  v_dow        int;
  v_conflict   boolean;
  v_checked    int;
BEGIN
  FOR r IN
    SELECT id, platform
    FROM   marketing_drafts
    WHERE  status = 'approved'
    AND    scheduled_for IS NULL
  LOOP
    CASE r.platform
      WHEN 'instagram' THEN v_target_days := ARRAY[2, 4, 6];
      WHEN 'linkedin'  THEN v_target_days := ARRAY[1, 3, 5];
      ELSE
        UPDATE marketing_drafts
        SET    scheduled_for = (CURRENT_DATE + INTERVAL '1 day')::date
        WHERE  id = r.id;
        CONTINUE;
    END CASE;

    v_candidate := CURRENT_DATE + INTERVAL '1 day';
    v_checked   := 0;

    WHILE v_checked < 21 LOOP
      v_dow := EXTRACT(DOW FROM v_candidate)::int;

      IF v_dow = ANY(v_target_days) THEN
        SELECT EXISTS (
          SELECT 1 FROM marketing_drafts
          WHERE  platform      = r.platform
          AND    scheduled_for = v_candidate
          AND    status        IN ('approved', 'published')
          AND    id            != r.id
        ) INTO v_conflict;

        IF NOT v_conflict THEN
          UPDATE marketing_drafts
          SET    scheduled_for = v_candidate
          WHERE  id = r.id;
          EXIT;
        END IF;
      END IF;

      v_candidate := v_candidate + INTERVAL '1 day';
      v_checked   := v_checked + 1;
    END LOOP;

    IF v_checked = 21 THEN
      UPDATE marketing_drafts
      SET    scheduled_for = (CURRENT_DATE + INTERVAL '1 day')::date
      WHERE  id = r.id;
    END IF;
  END LOOP;
END;
$$;
