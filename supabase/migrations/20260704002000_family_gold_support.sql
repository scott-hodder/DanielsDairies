-- Family Gold support data — moved out of device localStorage into the
-- database so Gold families keep their Daniel time, appointments, and
-- practitioner tasks across devices and sessions.
--
-- Access model:
--   * Parents: full access to rows for their own children (RLS below).
--   * Practitioners/admin tooling: service-role paths (edge functions/admin
--     UI) — no direct client policies yet, added when practitioner tooling ships.

-- Per-child settings: the family's regular "Daniel time" and (later) the
-- practitioner-confirmed delivery model.
CREATE TABLE IF NOT EXISTS "public"."gold_support_settings" (
    "child_id" uuid PRIMARY KEY REFERENCES "public"."children"("id") ON DELETE CASCADE,
    "parent_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "daniel_days" integer[] NOT NULL DEFAULT '{}',
    "daniel_time" text NOT NULL DEFAULT '16:00',
    "delivery_model" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."gold_appointments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "child_id" uuid NOT NULL REFERENCES "public"."children"("id") ON DELETE CASCADE,
    "parent_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "appt_date" date NOT NULL,
    "appt_time" text NOT NULL DEFAULT '15:30',
    "appt_type" text NOT NULL DEFAULT 'Parent review (online)',
    "status" text NOT NULL DEFAULT 'scheduled'
        CHECK ("status" IN ('scheduled', 'completed', 'cancelled')),
    "notes" text,
    "created_by" text NOT NULL DEFAULT 'parent'
        CHECK ("created_by" IN ('parent', 'practitioner')),
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "gold_appointments_child_idx"
    ON "public"."gold_appointments" ("child_id", "status", "appt_date");

CREATE TABLE IF NOT EXISTS "public"."gold_tasks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "child_id" uuid NOT NULL REFERENCES "public"."children"("id") ON DELETE CASCADE,
    "parent_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "text" text NOT NULL,
    "done" boolean NOT NULL DEFAULT false,
    "source" text NOT NULL DEFAULT 'parent'
        CHECK ("source" IN ('parent', 'practitioner')),
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "gold_tasks_child_idx" ON "public"."gold_tasks" ("child_id", "done");

-- ── RLS: parents manage rows for their own children only ──
ALTER TABLE "public"."gold_support_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."gold_appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."gold_tasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents read own gold settings" ON "public"."gold_support_settings"
    FOR SELECT USING ("parent_id" = auth.uid());
CREATE POLICY "Parents write own gold settings" ON "public"."gold_support_settings"
    FOR INSERT WITH CHECK (
        "parent_id" = auth.uid()
        AND EXISTS (SELECT 1 FROM "public"."children" c WHERE c."id" = "child_id" AND c."parent_user_id" = auth.uid())
    );
CREATE POLICY "Parents update own gold settings" ON "public"."gold_support_settings"
    FOR UPDATE USING ("parent_id" = auth.uid()) WITH CHECK ("parent_id" = auth.uid());
CREATE POLICY "Parents delete own gold settings" ON "public"."gold_support_settings"
    FOR DELETE USING ("parent_id" = auth.uid());

CREATE POLICY "Parents read own gold appointments" ON "public"."gold_appointments"
    FOR SELECT USING ("parent_id" = auth.uid());
CREATE POLICY "Parents write own gold appointments" ON "public"."gold_appointments"
    FOR INSERT WITH CHECK (
        "parent_id" = auth.uid()
        AND EXISTS (SELECT 1 FROM "public"."children" c WHERE c."id" = "child_id" AND c."parent_user_id" = auth.uid())
    );
CREATE POLICY "Parents update own gold appointments" ON "public"."gold_appointments"
    FOR UPDATE USING ("parent_id" = auth.uid()) WITH CHECK ("parent_id" = auth.uid());
CREATE POLICY "Parents delete own gold appointments" ON "public"."gold_appointments"
    FOR DELETE USING ("parent_id" = auth.uid());

CREATE POLICY "Parents read own gold tasks" ON "public"."gold_tasks"
    FOR SELECT USING ("parent_id" = auth.uid());
CREATE POLICY "Parents write own gold tasks" ON "public"."gold_tasks"
    FOR INSERT WITH CHECK (
        "parent_id" = auth.uid()
        AND EXISTS (SELECT 1 FROM "public"."children" c WHERE c."id" = "child_id" AND c."parent_user_id" = auth.uid())
    );
CREATE POLICY "Parents update own gold tasks" ON "public"."gold_tasks"
    FOR UPDATE USING ("parent_id" = auth.uid()) WITH CHECK ("parent_id" = auth.uid());
CREATE POLICY "Parents delete own parent gold tasks" ON "public"."gold_tasks"
    FOR DELETE USING ("parent_id" = auth.uid() AND "source" = 'parent');

CREATE OR REPLACE TRIGGER "tr_gold_support_settings_updated_at"
    BEFORE UPDATE ON "public"."gold_support_settings"
    FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();
CREATE OR REPLACE TRIGGER "tr_gold_appointments_updated_at"
    BEFORE UPDATE ON "public"."gold_appointments"
    FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();
CREATE OR REPLACE TRIGGER "tr_gold_tasks_updated_at"
    BEFORE UPDATE ON "public"."gold_tasks"
    FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();
