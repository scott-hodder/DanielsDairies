-- Progress summaries: written by a practitioner in the Practitioner Hub and,
-- when shared, shown in the family's "Guides from your practitioner" section
-- on the Family Gold dashboard.
--
-- One live summary per practitioner-client pair, updated in place. The
-- Super Skills table in the printable document is generated from live app
-- data, so only the narrative fields are stored here.

CREATE TABLE IF NOT EXISTS "public"."practitioner_progress_summaries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "practitioner_user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "child_id" uuid NOT NULL REFERENCES "public"."children"("id") ON DELETE CASCADE,
    "practitioner_name" text,
    "period_label" text,
    "weather_green" text,
    "weather_yellow" text,
    "weather_red" text,
    "story" text,
    "roads_stronger" text,
    "roads_resting" text,
    "building_next" text,
    "try_at_home" text,
    "next_checkin" text,
    "shared_with_family" boolean NOT NULL DEFAULT false,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("practitioner_user_id", "child_id")
);

CREATE INDEX IF NOT EXISTS "prac_progress_summaries_child_idx"
    ON "public"."practitioner_progress_summaries" ("child_id", "shared_with_family");

ALTER TABLE "public"."practitioner_progress_summaries" ENABLE ROW LEVEL SECURITY;

-- Practitioners manage their own summaries
CREATE POLICY "Practitioners manage own progress summaries"
    ON "public"."practitioner_progress_summaries" FOR ALL
    USING ("practitioner_user_id" = auth.uid())
    WITH CHECK ("practitioner_user_id" = auth.uid());

-- Parents can read summaries shared for their own children
CREATE POLICY "Parents read shared progress summaries"
    ON "public"."practitioner_progress_summaries" FOR SELECT
    USING (
        "shared_with_family" = true
        AND EXISTS (
            SELECT 1 FROM "public"."children" c
            WHERE c."id" = "child_id" AND c."parent_user_id" = auth.uid()
        )
    );

-- These databases do not apply default privileges to new tables:
-- explicit GRANTs are required or even the service role is denied.
GRANT ALL ON "public"."practitioner_progress_summaries" TO "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."practitioner_progress_summaries" TO "authenticated";

CREATE OR REPLACE TRIGGER "tr_prac_progress_summaries_updated_at"
    BEFORE UPDATE ON "public"."practitioner_progress_summaries"
    FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();
