-- Update Theory Compliance instruction to specify theory should only be mentioned ONCE
-- Not repetitively on every page

UPDATE audit_sections 
SET ai_instruction = 'Mention the primary theory name AND researcher citation ONCE in the module, ideally on the first content page or introduction. After that initial mention, let the theory DRIVE the content approach but do NOT repeatedly name the theory or researcher. The content should embody the theory principles without constantly referencing it by name. Example: If using "Neuroplasticity (Merzenich, 1998)", mention it once early, then use concepts like "your brain can change and grow" without saying "neuroplasticity" again.'
WHERE section_number = 1;

-- Also update Brain Town to be clearer about Daniel's role
UPDATE audit_sections 
SET ai_instruction = 'Use Brain Town vocabulary throughout: town, roads, streets, traffic, buildings, town planner, brain town. The child is ALWAYS the "town planner" of their Brain Town - they have agency and control. Daniel (the narrator) should introduce concepts and guide, but the child makes all decisions. Use the correct character mascot for the Super Skill (e.g., Lenny the Border Collie for Brain Builder).'
WHERE section_number = 3;
