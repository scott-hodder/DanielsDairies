ALTER TABLE settings
ADD COLUMN IF NOT EXISTS ai_prompt_template text;
