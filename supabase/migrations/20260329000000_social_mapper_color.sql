-- Update Social Mapper super skill to use a unique teal color
UPDATE public.super_skills
SET theme_color = '#0891B2'
WHERE slug = 'social-mapper';
