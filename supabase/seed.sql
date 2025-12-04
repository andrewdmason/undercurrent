-- Seed data for local development
-- This file is run after migrations during `supabase db reset`

-- Create test user in auth.users
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  raw_app_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '00000000-0000-0000-0000-000000000000',
  'andrew@test.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Andrew Mason"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
);

-- Create identity record (required for email login)
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  jsonb_build_object(
    'sub', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'email', 'andrew@test.com',
    'email_verified', true
  ),
  'email',
  'andrew@test.com',
  now(),
  now(),
  now()
);

-- The trigger will auto-create the profile, but let's update it to ensure the name is set
update public.profiles 
set full_name = 'Andrew Mason'
where id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Create the Tabletop Library business
insert into public.businesses (
  id,
  name,
  slug,
  url,
  description,
  strategy_prompt,
  content_inspiration_sources,
  created_by,
  created_at,
  updated_at
) values (
  'b1c2d3e4-f5a6-7890-bcde-f12345678901',
  'Tabletop Library',
  'ttl',
  'https://www.tabletoplibrary.com',
  'Tabletop Library is a 24-table board game club in Berkeley, California opening in early 2026. We''re membership-based with over 800 games in our collection, including rare and out-of-print titles. We host events most days, have an AI concierge to help organize pickup games, and feature a small retail section, coffee, pastries, and a back room with 500 vinyl records.',
  E'# Video Marketing Strategy for Tabletop Library\n\n## Distribution Channels\n- **Instagram Reels** (3x/week): Quick tips, unboxings, event highlights\n- **TikTok** (5x/week): Trending sounds, quick reviews, behind-the-scenes\n- **YouTube Shorts** (2x/week): Longer reviews, staff picks, tutorials\n\n## Content Themes\n1. **Product Highlights**: Unboxings, new arrivals, staff picks, rare game spotlights\n2. **Educational**: How to play, game comparisons, buying guides\n3. **Community**: Event recaps, member spotlights, game night vibes\n4. **Behind the Scenes**: Club life, collection curation, staff banter\n5. **Berkeley/Local**: Local community tie-ins, neighborhood features\n\n## Style & Tone\n- Warm, welcoming, and inclusive - like a living room\n- Knowledgeable but not gatekeep-y\n- "Board games are having a moment" energy\n- Genuine enthusiasm, not corporate\n- Slight humor, board game puns welcome\n\n## Production Values\n- Natural lighting when possible\n- iPhone 15 Pro for most content\n- Lapel mics for talking-head videos\n- Clean backgrounds showing game shelves and cozy club atmosphere\n- Consistent thumbnail style with brand colors\n\n## Brand Elements\n- Logo watermark in corner\n- Cozy, living room aesthetic\n- End cards with membership info and location\n\n## Key Messages\n- Membership-based model (not pay-per-hour)\n- 800+ game collection including rare titles\n- AI concierge for organizing pickup games\n- Events most days\n- "Your mythical third place"',
  '["tabletoplibrary.com/events", "boardgamegeek.com/hotness", "new board game releases 2025", "board game cafe marketing", "Berkeley local events"]'::jsonb,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  now(),
  now()
);

-- Link user to business
insert into public.business_users (
  id,
  business_id,
  user_id,
  created_at
) values (
  'c1d2e3f4-a5b6-7890-cdef-123456789012',
  'b1c2d3e4-f5a6-7890-bcde-f12345678901',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  now()
);

-- ============================================
-- SAMPLE TALENT FOR TESTING
-- ============================================

insert into public.business_talent (
  id,
  business_id,
  name,
  description,
  image_url,
  created_at,
  updated_at
) values
  (
    'e1a2b3c4-d5e6-7890-abcd-ef1234567890',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Andrew Mason',
    'Partner and co-founder. Brings entrepreneurial energy and a passion for making board games accessible to everyone. Primary on-camera host for longer-form content.',
    '/seed/talent/andrew.png',
    now(),
    now()
  ),
  (
    'e2b3c4d5-e6f7-8901-bcde-f12345678901',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Nabeel Hyatt',
    'Partner and co-founder. Deep gaming industry experience and expertise in community building. Great for strategic content and industry commentary.',
    '/seed/talent/nabeel.png',
    now(),
    now()
  ),
  (
    'e3c4d5e6-f7a8-9012-cdef-123456789012',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Vera Devera',
    'General Manager. The face of day-to-day operations at Tabletop Library. Expert at teaching games and creating welcoming experiences for members.',
    '/seed/talent/vera.png',
    now(),
    now()
  );

-- ============================================
-- SAMPLE IDEAS FOR TESTING
-- ============================================

-- First batch of ideas (5 ideas from one generation)
insert into public.ideas (
  id,
  business_id,
  title,
  description,
  prompt,
  rating,
  bookmarked,
  generation_batch_id,
  created_at,
  updated_at
) values
  (
    'd1e2f3a4-b5c6-7890-def1-234567890abc',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Board Game Unboxing: Wingspan',
    'A cozy unboxing video showcasing the beautiful components of Wingspan, perfect for attracting bird-lovers and engine-building fans.',
    E'Create a 60-second unboxing video for Wingspan board game.\n\n## Tone\nWarm, inviting, ASMR-inspired\n\n## Key Moments\n1. Open with the box art reveal (5 sec)\n2. Lift the lid slowly, showing the bird tray (10 sec)\n3. Fan out the bird cards, highlighting the artwork (15 sec)\n4. Display the dice tower and custom dice (10 sec)\n5. Show the egg tokens with satisfying clinking sounds (10 sec)\n6. End with a complete table spread (10 sec)\n\n## Call to Action\n"Reserve your copy at Tabletop Library today"',
    'up',
    true,
    'e1f2a3b4-c5d6-7890-ef12-345678901bcd',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    'd2e3f4a5-b6c7-8901-ef12-345678901bcd',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Game Night Tips: How to Teach Rules',
    'Quick tips video on how to explain board game rules without putting people to sleep. Relatable content for your community.',
    E'Create a 45-second tips video on teaching board game rules.\n\n## Tone\nFunny, self-aware, helpful\n\n## Structure\n1. Hook: "Stop! Don''t read the rulebook out loud" (3 sec)\n2. Tip 1: Start with the goal, not the setup (10 sec)\n3. Tip 2: Learn by doing - start playing after basics (10 sec)\n4. Tip 3: The "first round doesn''t count" trick (10 sec)\n5. Tip 4: Have a rules summary ready (7 sec)\n6. CTA: "Join our next learn-to-play night" (5 sec)\n\n## Visual Style\nQuick cuts, on-screen text for each tip',
    null,
    false,
    'e1f2a3b4-c5d6-7890-ef12-345678901bcd',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    'd3e4f5a6-b7c8-9012-f123-456789012cde',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Staff Pick: Why We Love Ticket to Ride',
    'A genuine staff recommendation video that builds trust and showcases your team''s personality.',
    E'Create a 40-second staff pick video for Ticket to Ride.\n\n## Tone\nAuthentic, enthusiastic, personal\n\n## Script Outline\n1. Intro: Staff member introduces themselves (5 sec)\n2. "This is my go-to recommendation for new gamers" (5 sec)\n3. Why it works: Easy to learn, satisfying to play (10 sec)\n4. Personal story: A memorable game moment (10 sec)\n5. Who it''s perfect for (5 sec)\n6. CTA: "Come ask me about it!" (5 sec)\n\n## Production Notes\n- Film in the store with games visible in background\n- Natural lighting preferred\n- Staff member should hold the game box',
    'up',
    false,
    'e1f2a3b4-c5d6-7890-ef12-345678901bcd',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    'd4e5f6a7-b8c9-0123-a234-567890123def',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Event Highlight: Saturday Tournament Recap',
    'Capture the energy of your weekly events to show potential customers what they''re missing.',
    E'Create a 30-second event recap video.\n\n## Tone\nEnergetic, community-focused, FOMO-inducing\n\n## Shot List\n1. Wide shot of busy game room (3 sec)\n2. Close-up of intense gameplay moment (4 sec)\n3. Reaction shots - someone winning/celebrating (5 sec)\n4. Group laughing together (4 sec)\n5. Quick montage of different tables (6 sec)\n6. Winner holding prize/trophy (4 sec)\n7. End card with next event date (4 sec)\n\n## Music\nUpbeat, community vibe - think indie/folk energy\n\n## Text Overlays\n- "Every Saturday @ 2pm"\n- "All skill levels welcome"',
    'down',
    false,
    'e1f2a3b4-c5d6-7890-ef12-345678901bcd',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    'd5e6f7a8-b9c0-1234-b345-678901234ef0',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Quick Review: Azul in 60 Seconds',
    'Bite-sized review format perfect for social media, highlighting what makes Azul special.',
    E'Create a 60-second review of Azul.\n\n## Tone\nPunchy, informative, visually-driven\n\n## Structure\n1. Hook: Show the gorgeous tiles (5 sec)\n2. "Azul in 60 seconds - here''s what you need to know" (5 sec)\n3. The goal: Complete your mosaic (10 sec)\n4. The twist: Draft tiles, but don''t get greedy (15 sec)\n5. Why it''s great: Beautiful + strategic + quick (15 sec)\n6. Rating: 9/10 for gateway games (5 sec)\n7. CTA: "Link in bio to reserve" (5 sec)\n\n## Visual Focus\n- Lots of close-ups on the colorful tiles\n- Show a satisfying tile placement moment\n- Display completed vs incomplete boards',
    null,
    true,
    'e1f2a3b4-c5d6-7890-ef12-345678901bcd',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  -- Second batch (more recent, different generation)
  (
    'd6e7f8a9-b0c1-2345-c456-789012345f01',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Behind the Scenes: New Arrivals Shelf',
    'Show off your curation process and build anticipation for new games hitting your shelves.',
    E'Create a 45-second behind-the-scenes video.\n\n## Tone\nExcited, insider-access feel\n\n## Script\n1. "New games just dropped - let me show you what''s coming to the shelf" (5 sec)\n2. Unpack shipping box, show 3-4 new titles (15 sec)\n3. Quick 5-second pitch for each game (20 sec)\n4. "These hit the shelf tomorrow at 10am" (5 sec)\n\n## Tips\n- Film in back room or receiving area for authenticity\n- Show genuine excitement\n- Create urgency without being pushy',
    null,
    false,
    'f2a3b4c5-d6e7-8901-d567-890123456012',
    now() - interval '6 hours',
    now() - interval '6 hours'
  ),
  (
    'd7e8f9a0-b1c2-3456-d567-890123456102',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Customer Spotlight: Regular''s Favorite Game',
    'Feature a loyal customer talking about their favorite game - authentic social proof.',
    E'Create a 40-second customer spotlight video.\n\n## Tone\nWarm, authentic, community-centered\n\n## Interview Questions (pick 2-3)\n- What''s your all-time favorite game?\n- What keeps you coming back to Tabletop Library?\n- What would you tell someone who''s never been here?\n\n## Production\n- Film in-store with customer permission\n- Keep it casual and conversational\n- B-roll of them browsing or playing\n\n## CTA\n"Join our community - new members always welcome"',
    null,
    false,
    'f2a3b4c5-d6e7-8901-d567-890123456012',
    now() - interval '6 hours',
    now() - interval '6 hours'
  );
