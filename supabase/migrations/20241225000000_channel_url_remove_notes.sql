-- Add channel URL field and remove strategy notes
-- URL field allows tracking the user's actual channel URL (e.g., https://youtube.com/@mybusiness)

ALTER TABLE public.project_channels
ADD COLUMN url text;

ALTER TABLE public.project_channels
DROP COLUMN notes;

