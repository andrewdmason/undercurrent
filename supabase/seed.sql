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
-- Also set is_admin = true so this test user has app-level admin access
update public.profiles 
set full_name = 'Andrew Mason',
    is_admin = true
where id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Create the Tabletop Library project
insert into public.projects (
  id,
  name,
  slug,
  url,
  description,
  business_objectives,
  content_inspiration_sources,
  content_preferences,
  created_by,
  created_at,
  updated_at
) values (
  'b1c2d3e4-f5a6-7890-bcde-f12345678901',
  'Tabletop Library',
  'ttl',
  'https://www.tabletoplibrary.com',
  'Tabletop Library is a 24-table board game club in Berkeley, California opening in early 2026. We''re membership-based with over 800 games in our collection, including rare and out-of-print titles. We host events most days, have an AI concierge to help organize pickup games, and feature a small retail section, coffee, pastries, and a back room with 500 vinyl records.',
  E'## Goals\n\n- **Primary**: Drive founding membership sign-ups before launch (target: 200 founding members)\n- **Secondary**: Build brand awareness in the Berkeley/Oakland board game community\n- **Long-term**: Establish Tabletop Library as THE place for board games in the East Bay\n\n## Success Metrics\n\n- Email list sign-ups from video CTAs\n- Website traffic from social platforms\n- Engagement rate (comments, shares, saves)\n- Founding member conversions attributed to video content\n\n## Target Audience\n\n- **Primary**: Board game enthusiasts in Berkeley/Oakland (25-45 years old)\n- **Secondary**: Young professionals looking for social activities beyond bars\n- **Tertiary**: Families looking for wholesome entertainment options\n\nOur ideal member is someone who owns 10+ board games, attends game nights with friends, and is looking for a dedicated space to play and discover new games.',
  '["tabletoplibrary.com/events", "boardgamegeek.com/hotness", "new board game releases 2025", "board game cafe marketing", "Berkeley local events"]'::jsonb,
  'In general, we should be making videos that feel like they make sense for a board game social club to be making, and avoid videos that feel like any board game content creator could make. That doesn''t mean we''ll never make a "top 10 games about X" video or "how to play Y", but if we do, there should be some reason that it makes sense for us to be making it.',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  now(),
  now()
);

-- Link user to project (as admin)
insert into public.project_members (
  id,
  project_id,
  user_id,
  role,
  created_at
) values (
  'c1d2e3f4-a5b6-7890-cdef-123456789012',
  'b1c2d3e4-f5a6-7890-bcde-f12345678901',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'admin',
  now()
);

-- ============================================
-- ADDITIONAL TEST USERS (non-admin members)
-- ============================================

-- Create test user: Vera Devera (member)
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
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  '00000000-0000-0000-0000-000000000000',
  'vera@test.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Vera Devera"}'::jsonb,
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
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  jsonb_build_object(
    'sub', 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    'email', 'vera@test.com',
    'email_verified', true
  ),
  'email',
  'vera@test.com',
  now(),
  now(),
  now()
);

update public.profiles 
set full_name = 'Vera Devera'
where id = 'b2c3d4e5-f6a7-8901-bcde-f23456789012';

-- Add Vera to TTL as member
insert into public.project_members (
  id,
  project_id,
  user_id,
  role,
  created_at
) values (
  'c2d3e4f5-a6b7-8901-def0-234567890123',
  'b1c2d3e4-f5a6-7890-bcde-f12345678901',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'member',
  now()
);

-- Create test user: Nabeel Hyatt (member)
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
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  '00000000-0000-0000-0000-000000000000',
  'nabeel@test.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Nabeel Hyatt"}'::jsonb,
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
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  jsonb_build_object(
    'sub', 'c3d4e5f6-a7b8-9012-cdef-345678901234',
    'email', 'nabeel@test.com',
    'email_verified', true
  ),
  'email',
  'nabeel@test.com',
  now(),
  now(),
  now()
);

update public.profiles 
set full_name = 'Nabeel Hyatt'
where id = 'c3d4e5f6-a7b8-9012-cdef-345678901234';

-- Add Nabeel to TTL as member
insert into public.project_members (
  id,
  project_id,
  user_id,
  role,
  created_at
) values (
  'c3d4e5f6-b7c8-9012-ef01-345678901234',
  'b1c2d3e4-f5a6-7890-bcde-f12345678901',
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  'member',
  now()
);

-- ============================================
-- SAMPLE CHARACTERS FOR TESTING
-- ============================================

insert into public.project_characters (
  id,
  project_id,
  name,
  description,
  image_url,
  member_id,
  created_at,
  updated_at
) values
  (
    'e1a2b3c4-d5e6-7890-abcd-ef1234567890',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Andrew Mason',
    'Partner at Tabletop Library. Prefers unscripted videos where he works from an outline rather than a full script. Can record from his home studio or the Library. Has a professional recording setup that''s ready to go at a moment''s notice—no prep or setup time needed.',
    '/seed/characters/andrew.png',
    'c1d2e3f4-a5b6-7890-cdef-123456789012',
    now(),
    now()
  ),
  (
    'e2b3c4d5-e6f7-8901-bcde-f12345678901',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Nabeel Hyatt',
    'Partner and co-founder. Deep gaming industry experience and expertise in community building. Great for strategic content and industry commentary.',
    '/seed/characters/nabeel.jpg',
    'c3d4e5f6-b7c8-9012-ef01-345678901234',
    now(),
    now()
  ),
  (
    'e3c4d5e6-f7a8-9012-cdef-123456789012',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Vera Devera',
    'General Manager. The face of day-to-day operations at Tabletop Library. Expert at teaching games and creating welcoming experiences for members.',
    '/seed/characters/vera.jpg',
    'c2d3e4f5-a6b7-8901-def0-234567890123',
    now(),
    now()
  );

-- ============================================
-- SAMPLE DISTRIBUTION CHANNELS FOR TESTING
-- ============================================

insert into public.project_channels (
  id,
  project_id,
  platform,
  custom_label,
  goal_count,
  goal_cadence,
  url,
  created_at,
  updated_at
) values
  (
    'dc2b3c4d-e5f6-7890-bcde-f12345678901',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'instagram_reels',
    null,
    5,
    'weekly',
    'https://instagram.com/tabletoplibrary',
    now(),
    now()
  ),
  (
    'dc3c4d5e-f6a7-8901-cdef-123456789012',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'youtube_shorts',
    null,
    3,
    'weekly',
    'https://youtube.com/@tabletoplibrary',
    now(),
    now()
  ),
  (
    'dc4d5e6f-a7b8-9012-def1-234567890123',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'youtube',
    null,
    1,
    'monthly',
    'https://youtube.com/@tabletoplibrary',
    now(),
    now()
  ),
  (
    '8152a239-e09f-414b-a765-ee6d641b5b13',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'x',
    null,
    3,
    'weekly',
    'https://x.com/tabletoplibrary',
    now(),
    now()
  );

-- ============================================
-- SAMPLE IDEAS FOR TESTING
-- Ideas utilize characters and target specific distribution channels
-- Statuses: new (inbox), preproduction/production/postproduction (kanban), published, rejected, canceled
-- ============================================

insert into public.ideas (
  id,
  project_id,
  title,
  description,
  prompt,
  image_url,
  accepted_at,
  published_at,
  canceled_at,
  reject_reason,
  generation_batch_id,
  created_at,
  updated_at,
  recording_style
) values
  -- ===========================================
  -- PUBLISHED VIDEOS (completed and live)
  -- ===========================================
  (
    'd1e2f3a4-b5c6-7890-def1-234567890abc',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'How to Play Wingspan: Complete Tutorial',
    'Vera walks through the complete rules of Wingspan in her signature welcoming teaching style. Perfect for members who want to learn before visiting.',
    E'Create an 8-minute complete tutorial for Wingspan.\n\n## On-Screen Talent\nVera Devera - she''s our expert game teacher and GM\n\n## Tone\nWarm, patient, encouraging - like learning from a friend\n\n## Structure\n1. Intro: Vera at a table with Wingspan set up (30 sec)\n2. Goal of the game explanation (1 min)\n3. Turn structure walkthrough (2 min)\n4. Bird powers and habitats (2 min)\n5. End-of-round scoring (1 min)\n6. Pro tips for first-time players (1 min)\n7. Outro: "Come play with us!" (30 sec)\n\n## Production Notes\n- Shoot at our best table with good lighting\n- Use top-down camera for board shots\n- Vera should have game pieces to demonstrate',
    '/seed/ideas/wingspan-tutorial.jpg',
    now() - interval '14 days',
    now() - interval '7 days',
    null,
    null,
    'e1f2a3b4-c5d6-7890-ef12-345678901bcd',
    now() - interval '14 days',
    now() - interval '7 days',
    'scripted'
  ),

  -- ===========================================
  -- PRODUCTION PIPELINE (distributed across kanban columns)
  -- ===========================================
  
  -- PREPRODUCTION (Pre-Production)
  (
    'd2e3f4a5-b6c7-8901-ef12-345678901bcd',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'The Board Game Cafe Revolution: Industry Deep Dive',
    'Andrew and Nabeel discuss the rise of board game cafes, what makes them work, and their vision for Tabletop Library. Great for building authority and SEO.',
    E'Create a 12-minute talking head video on the board game cafe industry.\n\n## On-Screen Talent\nAndrew Mason & Nabeel Hyatt - co-founders with deep industry knowledge\n\n## Tone\nThoughtful, insider perspective, passionate but not salesy\n\n## Structure\n1. Hook: "Board game cafes are having a moment" (30 sec)\n2. The history - from niche to mainstream (2 min)\n3. What makes a great board game cafe (3 min)\n4. Common mistakes cafe owners make (2 min)\n5. Why membership models work (2 min)\n6. Our vision for Tabletop Library (2 min)\n7. CTA: Subscribe + visit us (30 sec)\n\n## Production Notes\n- Two-shot conversation format\n- Film in the club with games visible behind\n- Can cut to B-roll of the space',
    '/seed/ideas/cafe-revolution.jpg',
    now() - interval '5 days',
    null,
    null,
    null,
    'e1f2a3b4-c5d6-7890-ef12-345678901bcd',
    now() - interval '5 days',
    now() - interval '5 days',
    'talking_points'
  ),

  -- PRODUCTION (Production)
  (
    'd5e6f7a8-b9c0-1234-b345-678901234ef0',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Games That Will End Friendships (Affectionately)',
    'Nabeel counts down the most friendship-testing games in our collection. Funny, relatable content with high share potential.',
    E'Create a 60-second countdown video.\n\n## On-Screen Talent\nNabeel Hyatt - dry humor, knows competitive gaming\n\n## Tone\nFunny, knowing, "we''ve all been there"\n\n## Structure\n1. Hook: "These games WILL cause arguments" (3 sec)\n2. #5: Monopoly (duh) (8 sec)\n3. #4: Risk (those alliances) (10 sec)\n4. #3: Diplomacy (literal backstabbing) (10 sec)\n5. #2: Cosmic Encounter (negotiation chaos) (10 sec)\n6. #1: The Resistance/Secret Hitler (trust no one) (12 sec)\n7. CTA: "Come test your friendships" (7 sec)\n\n## Production Notes\n- Quick cuts, show each game box\n- Nabeel deadpan delivery\n- Maybe dramatic music stings',
    '/seed/ideas/end-friendships.jpg',
    now() - interval '3 days',
    null,
    null,
    null,
    'f2a3b4c5-d6e7-8901-d567-890123456012',
    now() - interval '3 days',
    now() - interval '3 days',
    'scripted'
  ),

  -- POSTPRODUCTION (Post-Production)
  (
    'd9a0b1c2-d3e4-5678-f789-012345678324',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'The AI Concierge Demo: Finding Your Perfect Game',
    'Andrew demos our AI concierge feature that helps members find games. Shows off a unique differentiator.',
    E'Create a 40-second product demo video.\n\n## On-Screen Talent\nAndrew Mason - can speak to the tech/product side\n\n## Tone\nExcited about tech, but accessible and not too salesy\n\n## Structure\n1. Hook: "We built an AI to help you find games" (5 sec)\n2. Show the interface on phone/tablet (5 sec)\n3. Demo: "I want a 2-player game under an hour" (10 sec)\n4. AI gives recommendations with reasons (10 sec)\n5. "It knows our entire 800+ game collection" (5 sec)\n6. CTA: "Come try it yourself" (5 sec)\n\n## Production Notes\n- Screen recording + Andrew talking\n- Show real recommendations\n- Keep it snappy',
    '/seed/ideas/ai-concierge.jpg',
    now() - interval '12 hours',
    null,
    null,
    null,
    'a1b2c3d4-e5f6-7890-abcd-111111111111',
    now() - interval '12 hours',
    now() - interval '12 hours',
    'scripted'
  ),
  (
    'd3e4f5a6-b7c8-9012-f123-456789012cde',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'POV: You Ask Me for a Game Recommendation',
    'Vera does a trending POV format video where someone asks for a game rec and she rapid-fires questions back. Relatable and funny.',
    E'Create a 30-second POV video for TikTok/Reels.\n\n## On-Screen Talent\nVera Devera - natural on camera, great with customers\n\n## Tone\nFunny, relatable, slightly chaotic energy\n\n## Script Concept\nPOV: You ask me for a game recommendation\n"How many players?"\n"Do they like strategy or luck?"\n"How much time do you have?"\n"Are they competitive or chill?"\n"Have they played Catan?"\n*hands them perfect game*\n"Trust me."\n\n## Production Notes\n- Film from customer POV (camera is the customer)\n- Quick cuts between questions\n- End with satisfied smile and game box reveal\n- Use trending audio if applicable',
    '/seed/ideas/pov-recommendation.jpg',
    now() - interval '10 days',
    null,
    null,
    null,
    'f2a3b4c5-d6e7-8901-d567-890123456012',
    now() - interval '10 days',
    now() - interval '5 days',
    'scripted'
  ),
  
  -- ===========================================
  -- NEW IDEAS (inbox - to be processed)
  -- ===========================================
  (
    'd4e5f6a7-b8c9-0123-a234-567890123def',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Unboxing: The New Hotness from BGG',
    'Andrew does a quick unboxing of whatever is #1 on BoardGameGeek''s hotness list. Timely content that rides existing search interest.',
    E'Create a 45-second unboxing video.\n\n## On-Screen Talent\nAndrew Mason - brings entrepreneurial energy to unboxings\n\n## Tone\nExcited, ASMR-adjacent, builds anticipation\n\n## Structure\n1. Hook: "This is the #1 game on BoardGameGeek right now" (3 sec)\n2. Show the box, read the name (5 sec)\n3. Open the box, react to components (15 sec)\n4. Highlight 2-3 coolest pieces (15 sec)\n5. "Come play it at Tabletop Library" (7 sec)\n\n## Production Notes\n- Clean table, good lighting\n- ASMR-style audio (component sounds)\n- Andrew''s hands + voiceover, face optional',
    '/seed/ideas/unboxing-hotness.jpg',
    null,
    null,
    null,
    null,
    'f2a3b4c5-d6e7-8901-d567-890123456012',
    now() - interval '3 days',
    now() - interval '3 days',
    null
  ),
  (
    'd6e7f8a9-b0c1-2345-c456-789012345f01',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'A Day in the Life: Opening Tabletop Library',
    'Behind-the-scenes morning routine video showing Vera opening the club. Builds connection and shows the care that goes into the space.',
    E'Create a 45-second day-in-the-life video.\n\n## On-Screen Talent\nVera Devera - as GM, she opens the club\n\n## Tone\nCozy, authentic, satisfying routine content\n\n## Shot List\n1. Vera arriving, keys in hand (3 sec)\n2. Lights coming on, revealing game shelves (5 sec)\n3. Starting the coffee machine (5 sec)\n4. Straightening games on shelves (8 sec)\n5. Setting up the "new arrivals" display (8 sec)\n6. Flipping the sign to "Open" (5 sec)\n7. First members walking in (8 sec)\n8. Vera wave: "Come hang out" (3 sec)\n\n## Production Notes\n- Natural morning light\n- Cozy background music\n- Show the care and intention',
    '/seed/ideas/day-in-life.jpg',
    null,
    null,
    null,
    null,
    'a1b2c3d4-e5f6-7890-abcd-111111111111',
    now() - interval '1 day',
    now() - interval '1 day',
    null
  ),
  (
    'd7e8f9a0-b1c2-3456-d567-890123456102',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Rating Games by How Hard They Are to Teach',
    'Andrew rates popular games on a "teaching difficulty" scale. Useful content that helps people choose games for their groups.',
    E'Create a 50-second rating video.\n\n## On-Screen Talent\nAndrew Mason - experienced at teaching games to new players\n\n## Tone\nHelpful, honest, slightly self-deprecating\n\n## Structure\n1. Hook: "How hard is this game to teach?" (3 sec)\n2. Tier 1 - "Anyone can learn in 2 minutes": Azul, Codenames (10 sec)\n3. Tier 2 - "One practice round": Ticket to Ride, Carcassonne (10 sec)\n4. Tier 3 - "Watch a video first": Wingspan, Everdell (10 sec)\n5. Tier 4 - "Clear your afternoon": Terraforming Mars (10 sec)\n6. Tier 5 - "Just... good luck": Twilight Imperium (7 sec)\n\n## Production Notes\n- Show game boxes as rating\n- On-screen tier labels\n- Andrew can hold/gesture at games',
    '/seed/ideas/teaching-difficulty.jpg',
    null,
    null,
    null,
    null,
    'a1b2c3d4-e5f6-7890-abcd-111111111111',
    now() - interval '1 day',
    now() - interval '1 day',
    null
  ),
  (
    'dab1c2d3-e4f5-6789-a890-123456789435',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Rare Game Spotlight: Out-of-Print Gems We Have',
    'Nabeel shows off some rare/out-of-print games in our collection. Appeals to collectors and serious hobbyists.',
    E'Create a 60-second rare games showcase.\n\n## On-Screen Talent\nNabeel Hyatt - deep knowledge of game industry/history\n\n## Tone\nExcited collector energy, "you can''t get this anywhere else"\n\n## Structure\n1. Hook: "Games you literally can''t buy anymore" (5 sec)\n2. Game 1: Show box, why it''s special, current value (15 sec)\n3. Game 2: Show box, why it''s rare (15 sec)\n4. Game 3: The crown jewel (15 sec)\n5. "And you can just... play them here" (5 sec)\n6. CTA: "800+ games, including the ones money can''t buy" (5 sec)\n\n## Production Notes\n- Dramatic reveals\n- Show eBay prices if applicable\n- Nabeel should hold games reverently',
    '/seed/ideas/rare-games.jpg',
    null,
    null,
    null,
    null,
    'a1b2c3d4-e5f6-7890-abcd-111111111111',
    now() - interval '12 hours',
    now() - interval '12 hours',
    null
  ),
  
  -- ===========================================
  -- REJECTED IDEAS (not exposed in UI but in DB)
  -- ===========================================
  (
    'd8f9a0b1-c2d3-4567-e678-901234567213',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Saturday Night Game Night Recap',
    'Quick montage of last Saturday''s game night energy. Shows the community vibe and FOMO-inducing moments.',
    E'Create a 30-second event montage.\n\n## On-Screen Talent\nNo specific host - community is the star\n\n## Tone\nEnergetic, joyful, FOMO-inducing\n\n## Shot List\n1. Wide shot of packed room (2 sec)\n2. Close-up: dice rolling (2 sec)\n3. Reaction: someone winning (3 sec)\n4. Group laughing at a table (3 sec)\n5. Close-up: game pieces/cards (2 sec)\n6. Two people high-fiving (2 sec)\n7. Vera explaining rules to a table (3 sec)\n8. Snacks and drinks (2 sec)\n9. End: "Every Saturday @ 7pm" text (5 sec)\n10. Logo + "Tabletop Library" (3 sec)\n\n## Production Notes\n- Upbeat music throughout\n- Quick cuts, high energy\n- Capture genuine moments',
    '/seed/ideas/game-night-recap.jpg',
    null,
    null,
    null,
    'We don''t have enough footage from events yet to make this work. Will revisit after launch.',
    'a1b2c3d4-e5f6-7890-abcd-111111111111',
    now() - interval '1 day',
    now() - interval '1 day',
    null
  );

-- ============================================
-- IDEA CHANNEL ASSOCIATIONS
-- Link ideas to their intended distribution channels
-- video_url populated for published ideas
-- ============================================

insert into public.idea_channels (idea_id, channel_id, video_url) values
  -- How to Play Wingspan (PUBLISHED): YouTube only (long-form)
  ('d1e2f3a4-b5c6-7890-def1-234567890abc', 'dc4d5e6f-a7b8-9012-def1-234567890123', 'https://www.youtube.com/watch?v=example123'),
  
  -- Board Game Cafe Revolution (ACCEPTED/QUEUE): YouTube only (long-form)
  ('d2e3f4a5-b6c7-8901-ef12-345678901bcd', 'dc4d5e6f-a7b8-9012-def1-234567890123', null),
  
  -- POV Game Recommendation (PUBLISHED): Instagram Reels + X (trending format)
  ('d3e4f5a6-b7c8-9012-f123-456789012cde', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', 'https://www.instagram.com/reel/example789'),
  ('d3e4f5a6-b7c8-9012-f123-456789012cde', '8152a239-e09f-414b-a765-ee6d641b5b13', null),
  
  -- Unboxing BGG Hotness (NEW): Instagram Reels + YouTube Shorts + X (cross-post)
  ('d4e5f6a7-b8c9-0123-a234-567890123def', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', null),
  ('d4e5f6a7-b8c9-0123-a234-567890123def', 'dc3c4d5e-f6a7-8901-cdef-123456789012', null),
  ('d4e5f6a7-b8c9-0123-a234-567890123def', '8152a239-e09f-414b-a765-ee6d641b5b13', null),
  
  -- Friendship-Ending Games (ACCEPTED/QUEUE): Instagram Reels + X (shareable)
  ('d5e6f7a8-b9c0-1234-b345-678901234ef0', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', null),
  ('d5e6f7a8-b9c0-1234-b345-678901234ef0', '8152a239-e09f-414b-a765-ee6d641b5b13', null),
  
  -- Day in the Life (NEW): Instagram Reels + X (cozy content)
  ('d6e7f8a9-b0c1-2345-c456-789012345f01', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', null),
  ('d6e7f8a9-b0c1-2345-c456-789012345f01', '8152a239-e09f-414b-a765-ee6d641b5b13', null),
  
  -- Teaching Difficulty Rating (NEW): YouTube Shorts + X (useful content)
  ('d7e8f9a0-b1c2-3456-d567-890123456102', 'dc3c4d5e-f6a7-8901-cdef-123456789012', null),
  ('d7e8f9a0-b1c2-3456-d567-890123456102', '8152a239-e09f-414b-a765-ee6d641b5b13', null),
  
  -- Saturday Game Night Recap (REJECTED): Instagram Reels + X (event content)
  ('d8f9a0b1-c2d3-4567-e678-901234567213', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', null),
  ('d8f9a0b1-c2d3-4567-e678-901234567213', '8152a239-e09f-414b-a765-ee6d641b5b13', null),
  
  -- AI Concierge Demo (ACCEPTED/QUEUE): Instagram Reels + YouTube Shorts + X (differentiator)
  ('d9a0b1c2-d3e4-5678-f789-012345678324', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', null),
  ('d9a0b1c2-d3e4-5678-f789-012345678324', 'dc3c4d5e-f6a7-8901-cdef-123456789012', null),
  ('d9a0b1c2-d3e4-5678-f789-012345678324', '8152a239-e09f-414b-a765-ee6d641b5b13', null),
  
  -- Rare Games Spotlight (NEW): Instagram Reels + YouTube Shorts (collector content)
  ('dab1c2d3-e4f5-6789-a890-123456789435', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', null),
  ('dab1c2d3-e4f5-6789-a890-123456789435', 'dc3c4d5e-f6a7-8901-cdef-123456789012', null);

-- ============================================
-- THE MASON FAMILY HIJINKS - Second Test Project
-- A family content channel for the Mason family
-- ============================================

-- Create the Mason Family project
insert into public.projects (
  id,
  name,
  slug,
  url,
  description,
  business_objectives,
  content_inspiration_sources,
  created_by,
  created_at,
  updated_at
) values (
  'f1a2b3c4-d5e6-7890-abcd-000000000001',
  'The Mason Family Hijinks',
  'mason-family',
  'https://www.youtube.com/@masonfamilyhijinks',
  'The Mason family is a tightly knit, high-energy Berkeley crew built around curiosity, creativity, and shared projects. Andrew and Jenny anchor the household—balancing ambitious professional lives with deep engagement in family activities. The family turns experiences into shared narratives through board-game clubs, tech side-projects, travel adventures, and whatever else captures their imagination. Sebastian (11) brings athletic intensity and intellectual curiosity, while Oscar (9) adds creative energy and storytelling instincts.',
  E'## Goals\n\n- **Primary**: Document our family adventures and create lasting memories\n- **Secondary**: Build a community of like-minded families\n- **Long-term**: Grow the YouTube channel to 50K subscribers and potentially monetize\n\n## Success Metrics\n\n- YouTube subscriber growth\n- Watch time and average view duration\n- Comment engagement from families\n- Kids'' enthusiasm to keep creating content together\n\n## Target Audience\n\n- **Primary**: Parents (30-45) looking for family activity inspiration\n- **Secondary**: Other families with kids in similar age ranges (8-12)\n- **Tertiary**: Grandparents and extended family keeping up with the kids\n\nOur ideal viewer is a parent who wants authentic, non-performative family content that gives them ideas for activities with their own kids.',
  '["family vloggers 2025", "kid-friendly content ideas", "family youtube channel inspiration", "Berkeley family activities", "parent-child projects"]'::jsonb,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  now(),
  now()
);

-- Link user to Mason Family project (as admin)
insert into public.project_members (
  id,
  project_id,
  user_id,
  role,
  created_at
) values (
  'f2b3c4d5-e6f7-8901-bcde-000000000002',
  'f1a2b3c4-d5e6-7890-abcd-000000000001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'admin',
  now()
);

-- Mason Family Characters
insert into public.project_characters (
  id,
  project_id,
  name,
  description,
  image_url,
  created_at,
  updated_at
) values
  (
    'f3c4d5e6-f7a8-9012-cdef-000000000003',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Andrew',
    'Dad, 45. Anchors the household with entrepreneurial energy and a passion for turning ideas into experiments. Brings tech knowledge, strategic thinking, and an infectious curiosity. Primary host for project builds and tech content.',
    '/seed/characters/andrew.png',
    now(),
    now()
  ),
  (
    'f4d5e6f7-a8b9-0123-def0-000000000004',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Jenny',
    'Mom. Co-anchor of the Mason crew, balancing ambitious professional life with deep family engagement. Brings warmth, organization, and grounded perspective. Great for travel content and family coordination moments.',
    '/seed/characters/jenny.jpg',
    now(),
    now()
  ),
  (
    'f5e6f7a8-b9c0-1234-ef01-000000000005',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Sebastian',
    'Older son, 11. Thoughtful, athletic, and intellectually hungry. Pitches in Little League, uses BlastMotion sensors to analyze his swing, reads Hitchhiker''s Guide for fun, and dives deep into topics like hominids. Can talk baseball mechanics one minute and story structure the next.',
    '/seed/characters/sebastian.jpg',
    now(),
    now()
  ),
  (
    'f6f7a8b9-c0d1-2345-f012-000000000006',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Oscar',
    'Younger son, 9. Imaginative, energetic, and drawn to collaborative play. Loves coding games with Dad, exploring co-op videogames like It Takes Two, and shows early instincts for storytelling and strategy. Brings creative chaos and unexpected perspectives.',
    '/seed/characters/oscar.jpg',
    now(),
    now()
  );

-- Mason Family Distribution Channels
insert into public.project_channels (
  id,
  project_id,
  platform,
  custom_label,
  goal_count,
  goal_cadence,
  url,
  created_at,
  updated_at
) values
  (
    'fc1a2b3c-d4e5-6789-abcd-000000000010',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'youtube',
    null,
    2,
    'weekly',
    'https://youtube.com/@masonfamily',
    now(),
    now()
  ),
  (
    'fc2b3c4d-e5f6-7890-bcde-000000000011',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'instagram_reels',
    null,
    4,
    'weekly',
    'https://instagram.com/masonfamily',
    now(),
    now()
  ),
  (
    'fc3c4d5e-f6a7-8901-cdef-000000000012',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'tiktok',
    null,
    5,
    'weekly',
    'https://tiktok.com/@masonfamily',
    now(),
    now()
  ),
  (
    'fc4d5e6f-a7b8-9012-def1-000000000013',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'youtube_shorts',
    null,
    3,
    'weekly',
    'https://youtube.com/@masonfamily',
    now(),
    now()
  );

-- ============================================
-- SAMPLE TOPICS FOR TESTING
-- Topics to cover and topics to avoid for idea generation
-- ============================================

insert into public.project_topics (
  id,
  project_id,
  name,
  description,
  is_excluded,
  created_at,
  updated_at
) values
  -- Tabletop Library: Topics to Cover
  (
    '01a2b3c4-d4e5-6789-abcd-ef1234567890',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Upcoming Events',
    'Visit tabletoplibrary.com/events and make videos that promote upcoming events, tournaments, and game nights.',
    false,
    now(),
    now()
  ),
  (
    '02b3c4d5-e5f6-7890-bcde-f12345678901',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'New Game Arrivals',
    'Highlight new games added to our 800+ collection. Check BGG hotness for trending titles.',
    false,
    now(),
    now()
  ),
  (
    '03c4d5e6-f6a7-8901-cdef-123456789012',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Membership Benefits',
    'Explain what members get: unlimited play, event access, AI concierge, rare games, etc.',
    false,
    now(),
    now()
  ),
  (
    '05f7a8b9-c9d0-0234-f123-456789012345',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Behind the Scenes',
    'TTL staff talks about how and why they made the decisions about how TTL works.',
    false,
    now(),
    now()
  ),
  -- Tabletop Library: Topics to AVOID
  (
    '06f7a8b9-c9d0-1234-f123-456789012345',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Politics',
    'Avoid anything that could be seen as partisan or politically divisive.',
    true,
    now(),
    now()
  ),
  (
    '07a8b9c0-d0e1-2345-a234-567890123456',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Competitor Criticism',
    'Don''t mention or criticize other board game cafes or competitors by name.',
    true,
    now(),
    now()
  ),
  (
    '08b9c0d1-e1f2-3456-b345-678901234567',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Pricing Details',
    'Don''t discuss specific membership pricing in videos - direct people to the website instead.',
    true,
    now(),
    now()
  ),
  
  -- Mason Family: Topics to Cover
  (
    '09c0d1e2-f2a3-4567-c456-789012345678',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Family Projects',
    'Building things together: coding projects, LEGO builds, DIY crafts, home improvement.',
    false,
    now(),
    now()
  ),
  (
    '0a0d1e2f-f3a4-5678-d567-890123456789',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Sebastian''s Baseball',
    'Little League games, swing analysis with BlastMotion, baseball mechanics, sports tech.',
    false,
    now(),
    now()
  ),
  (
    '0b1e2f3a-a4b5-6789-e678-901234567890',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Travel Adventures',
    'Family trips, exploring new places, travel vlogs, adventure activities.',
    false,
    now(),
    now()
  ),
  (
    '0c2f3a4b-b5c6-7890-f789-012345678901',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Kids'' Perspectives',
    'Let Sebastian and Oscar share their thoughts, opinions, and ideas. Their voices matter.',
    false,
    now(),
    now()
  ),
  -- Mason Family: Topics to AVOID
  (
    '0d3a4b5c-c6d7-8901-a890-123456789012',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'School Details',
    'Don''t mention specific school names, teachers, or classmates for privacy reasons.',
    true,
    now(),
    now()
  ),
  (
    '0e4b5c6d-d7e8-9012-b901-234567890123',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Location Specifics',
    'Avoid showing our exact home address or revealing too much about our neighborhood.',
    true,
    now(),
    now()
  ),
  (
    '0f5c6d7e-e8f9-0123-c012-345678901234',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Other Kids',
    'Don''t film other children without parent permission. Focus on our family only.',
    true,
    now(),
    now()
  );

-- ============================================
-- PROJECT_TEMPLATES FOR TABLETOP LIBRARY
-- ============================================

insert into public.project_templates (
  id,
  project_id,
  name,
  description,
  source_video_url,
  image_url,
  orientation,
  target_duration_seconds,
  created_at,
  updated_at
) values
  (
    'a1000005-f6a7-4b8c-d0e1-f2a3b4c5d6e7',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Instagram (Full Body)',
    'Set up a static, vertical camera on a tripod to capture the presenter full-body at Tabletop Library, while they speak directly to the lens. The footage is likely a single take, edited with frequent jump cuts to remove dead air and keep the pace fast, relying on the natural audio from the mic rather than background music to maintain an authentic, conversational connection.',
    null,
    null,
    'vertical',
    90,
    now(),
    now()
  ),
  (
    'a1000007-b8c9-4d0e-f2a3-b4c5d6e7f8a9',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Instagram (B-Roll Style)',
    'A-roll is medium close-up of presenter using a tripod-mounted camera for a clean studio look. Edit with a fast rhythm, frequently cutting away to high-quality b-roll footage, visual metaphors (like claymation or archival clips), and B-roll that literally illustrates the narrative. Overlay bold, kinetic text for emphasis—sometimes layering it behind the subject for depth—and mix clear dialogue with upbeat, rhythmic background music.',
    null,
    null,
    'vertical',
    90,
    now(),
    now()
  ),
  (
    'a1000006-a7b8-4c9d-e1f2-a3b4c5d6e7f8',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'YouTube',
    'Film a presenter in a medium close-up facing the camera directly with high energy, using a static setup (tripod or webcam) in a casual, authentic environment like a home office. Edit the footage aggressively with jump cuts to remove pauses and use frequent digital zooms (punch-ins) on the presenter''s face to accentuate key points and maintain a fast rhythm. Interleave the talking head segments with clear, high-speed screen recordings or b-roll that demonstrate the subject matter, using bold text overlays and occasional meme-style graphics to keep the tone entertaining and informal.',
    null,
    null,
    'horizontal',
    300,
    now(),
    now()
  ),
  (
    '6759b97b-41ea-48c3-b927-315b4735d834',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Instagram Voiceover',
    E'A-roll is just voiceover. Edit with a fast rhythm, frequently cutting away to high-quality b-roll footage, visual metaphors (like claymation or archival clips), and B-roll that literally illustrates the narrative. Overlay bold, kinetic text for emphasis—sometimes layering it behind the subject for depth—and mix clear dialogue with upbeat, rhythmic background music.\n\nA scripted, fast-paced voiceover with a rapid montage of relevant B-roll, movie clips, or stock footage, eliminating the need for an on-camera presenter. Enhance the visual analysis by adding simple, animated overlays or text to highlight specific details within the frame, while editing cuts rhythmically to match a lo-fi or chill background track.',
    null,
    null,
    'vertical',
    90,
    now(),
    now()
  );

-- ============================================
-- PROJECT_TEMPLATES FOR MASON FAMILY
-- ============================================

insert into public.project_templates (
  id,
  project_id,
  name,
  description,
  source_video_url,
  image_url,
  orientation,
  target_duration_seconds,
  created_at,
  updated_at
) values
  (
    'b2000001-b2c3-4d5e-f6a7-b8c9d0e1f2a3',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Family Project Build',
    'Longer format showing the family building or creating something together. Good for YouTube main channel.',
    null,
    null,
    'horizontal',
    null,
    now(),
    now()
  ),
  (
    'b2000002-c3d4-4e5f-a7b8-c9d0e1f2a3b4',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Adventure Vlog',
    'Family travel and exploration content. Mix of planned activities and spontaneous moments.',
    null,
    null,
    'horizontal',
    null,
    now(),
    now()
  ),
  (
    'b2000003-d4e5-4f6a-b8c9-d0e1f2a3b4c5',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Kid Reaction',
    'Short-form content featuring kids'' genuine reactions to surprises, games, or experiences. High engagement format.',
    null,
    null,
    'vertical',
    60,
    now(),
    now()
  ),
  (
    'b2000004-e5f6-4a7b-c9d0-e1f2a3b4c5d6',
    'f1a2b3c4-d5e6-7890-abcd-000000000001',
    'Quick Moment',
    'Spontaneous 15-30 second family moments. Authentic, unpolished charm for TikTok/Reels.',
    null,
    null,
    'vertical',
    30,
    now(),
    now()
  );

-- ============================================
-- TEMPLATE_CHANNELS - Link templates to channels
-- ============================================

insert into public.template_channels (template_id, channel_id) values
  -- Tabletop Library: Instagram (Full Body) -> Instagram Reels, YouTube Shorts, X
  ('a1000005-f6a7-4b8c-d0e1-f2a3b4c5d6e7', 'dc2b3c4d-e5f6-7890-bcde-f12345678901'),
  ('a1000005-f6a7-4b8c-d0e1-f2a3b4c5d6e7', 'dc3c4d5e-f6a7-8901-cdef-123456789012'),
  ('a1000005-f6a7-4b8c-d0e1-f2a3b4c5d6e7', '8152a239-e09f-414b-a765-ee6d641b5b13'),
  -- Tabletop Library: Instagram (B-Roll Style) -> Instagram Reels, YouTube Shorts, X (vertical only - no YouTube)
  ('a1000007-b8c9-4d0e-f2a3-b4c5d6e7f8a9', 'dc2b3c4d-e5f6-7890-bcde-f12345678901'),
  ('a1000007-b8c9-4d0e-f2a3-b4c5d6e7f8a9', 'dc3c4d5e-f6a7-8901-cdef-123456789012'),
  ('a1000007-b8c9-4d0e-f2a3-b4c5d6e7f8a9', '8152a239-e09f-414b-a765-ee6d641b5b13'),
  -- Tabletop Library: YouTube -> YouTube
  ('a1000006-a7b8-4c9d-e1f2-a3b4c5d6e7f8', 'dc4d5e6f-a7b8-9012-def1-234567890123'),
  -- Tabletop Library: Instagram Voiceover -> Instagram Reels, YouTube Shorts, X
  ('6759b97b-41ea-48c3-b927-315b4735d834', 'dc2b3c4d-e5f6-7890-bcde-f12345678901'),
  ('6759b97b-41ea-48c3-b927-315b4735d834', 'dc3c4d5e-f6a7-8901-cdef-123456789012'),
  ('6759b97b-41ea-48c3-b927-315b4735d834', '8152a239-e09f-414b-a765-ee6d641b5b13'),
  
  -- Mason Family: Family Project Build -> YouTube
  ('b2000001-b2c3-4d5e-f6a7-b8c9d0e1f2a3', 'fc1a2b3c-d4e5-6789-abcd-000000000010'),
  -- Mason Family: Adventure Vlog -> YouTube, Reels
  ('b2000002-c3d4-4e5f-a7b8-c9d0e1f2a3b4', 'fc1a2b3c-d4e5-6789-abcd-000000000010'),
  ('b2000002-c3d4-4e5f-a7b8-c9d0e1f2a3b4', 'fc2b3c4d-e5f6-7890-bcde-000000000011'),
  -- Mason Family: Kid Reaction -> TikTok, Reels, Shorts
  ('b2000003-d4e5-4f6a-b8c9-d0e1f2a3b4c5', 'fc3c4d5e-f6a7-8901-cdef-000000000012'),
  ('b2000003-d4e5-4f6a-b8c9-d0e1f2a3b4c5', 'fc2b3c4d-e5f6-7890-bcde-000000000011'),
  ('b2000003-d4e5-4f6a-b8c9-d0e1f2a3b4c5', 'fc4d5e6f-a7b8-9012-def1-000000000013'),
  -- Mason Family: Quick Moment -> TikTok, Reels
  ('b2000004-e5f6-4a7b-c9d0-e1f2a3b4c5d6', 'fc3c4d5e-f6a7-8901-cdef-000000000012'),
  ('b2000004-e5f6-4a7b-c9d0-e1f2a3b4c5d6', 'fc2b3c4d-e5f6-7890-bcde-000000000011');

-- ============================================
-- UPDATE IDEAS WITH TEMPLATE_IDs
-- ============================================

update public.ideas set template_id = 'a1000006-a7b8-4c9d-e1f2-a3b4c5d6e7f8' where id = 'd1e2f3a4-b5c6-7890-def1-234567890abc'; -- Wingspan Tutorial -> YouTube
update public.ideas set template_id = 'a1000005-f6a7-4b8c-d0e1-f2a3b4c5d6e7' where id = 'd3e4f5a6-b7c8-9012-f123-456789012cde'; -- POV Game Recommendation -> Instagram (Full Body)
update public.ideas set template_id = 'a1000006-a7b8-4c9d-e1f2-a3b4c5d6e7f8' where id = 'd2e3f4a5-b6c7-8901-ef12-345678901bcd'; -- Board Game Cafe Revolution -> YouTube
update public.ideas set template_id = 'a1000005-f6a7-4b8c-d0e1-f2a3b4c5d6e7' where id = 'd5e6f7a8-b9c0-1234-b345-678901234ef0'; -- Games That Will End Friendships -> Instagram (Full Body)
update public.ideas set template_id = 'a1000005-f6a7-4b8c-d0e1-f2a3b4c5d6e7' where id = 'd4e5f6a7-b8c9-0123-a234-567890123def'; -- Unboxing BGG Hotness -> Instagram (Full Body)
update public.ideas set template_id = 'a1000005-f6a7-4b8c-d0e1-f2a3b4c5d6e7' where id = 'd6e7f8a9-b0c1-2345-c456-789012345f01'; -- Day in the Life -> Instagram (Full Body)
update public.ideas set template_id = 'a1000005-f6a7-4b8c-d0e1-f2a3b4c5d6e7' where id = 'd7e8f9a0-b1c2-3456-d567-890123456102'; -- Rating Games by Teaching Difficulty -> Instagram (Full Body)
update public.ideas set template_id = 'a1000005-f6a7-4b8c-d0e1-f2a3b4c5d6e7' where id = 'dab1c2d3-e4f5-6789-a890-123456789435'; -- Rare Game Spotlight -> Instagram (Full Body)
update public.ideas set template_id = 'a1000005-f6a7-4b8c-d0e1-f2a3b4c5d6e7' where id = 'd9a0b1c2-d3e4-5678-f789-012345678324'; -- AI Concierge Demo -> Instagram (Full Body)
update public.ideas set template_id = 'a1000005-f6a7-4b8c-d0e1-f2a3b4c5d6e7' where id = 'd8f9a0b1-c2d3-4567-e678-901234567213'; -- Saturday Night Recap -> Instagram (Full Body)

-- ============================================
-- IDEA_CHARACTERS - Link ideas to characters
-- ============================================

insert into public.idea_characters (idea_id, character_id) values
  -- Wingspan Tutorial (Vera)
  ('d1e2f3a4-b5c6-7890-def1-234567890abc', 'e3c4d5e6-f7a8-9012-cdef-123456789012'),
  -- POV Game Recommendation (Vera)
  ('d3e4f5a6-b7c8-9012-f123-456789012cde', 'e3c4d5e6-f7a8-9012-cdef-123456789012'),
  -- Board Game Cafe Revolution (Andrew & Nabeel)
  ('d2e3f4a5-b6c7-8901-ef12-345678901bcd', 'e1a2b3c4-d5e6-7890-abcd-ef1234567890'),
  ('d2e3f4a5-b6c7-8901-ef12-345678901bcd', 'e2b3c4d5-e6f7-8901-bcde-f12345678901'),
  -- Games That Will End Friendships (Nabeel)
  ('d5e6f7a8-b9c0-1234-b345-678901234ef0', 'e2b3c4d5-e6f7-8901-bcde-f12345678901'),
  -- Unboxing BGG Hotness (Andrew)
  ('d4e5f6a7-b8c9-0123-a234-567890123def', 'e1a2b3c4-d5e6-7890-abcd-ef1234567890'),
  -- Day in the Life (Vera)
  ('d6e7f8a9-b0c1-2345-c456-789012345f01', 'e3c4d5e6-f7a8-9012-cdef-123456789012'),
  -- Rating Games by Teaching Difficulty (Andrew)
  ('d7e8f9a0-b1c2-3456-d567-890123456102', 'e1a2b3c4-d5e6-7890-abcd-ef1234567890'),
  -- Rare Game Spotlight (Nabeel)
  ('dab1c2d3-e4f5-6789-a890-123456789435', 'e2b3c4d5-e6f7-8901-bcde-f12345678901'),
  -- AI Concierge Demo (Andrew)
  ('d9a0b1c2-d3e4-5678-f789-012345678324', 'e1a2b3c4-d5e6-7890-abcd-ef1234567890');

-- ============================================
-- IDEA_TOPICS - Link ideas to topics
-- ============================================

insert into public.idea_topics (idea_id, topic_id) values
  -- Board Game Cafe Revolution -> Membership Benefits
  ('d2e3f4a5-b6c7-8901-ef12-345678901bcd', '03c4d5e6-f6a7-8901-cdef-123456789012'),
  -- Unboxing BGG Hotness -> New Game Arrivals
  ('d4e5f6a7-b8c9-0123-a234-567890123def', '02b3c4d5-e5f6-7890-bcde-f12345678901'),
  -- Day in the Life -> Membership Benefits
  ('d6e7f8a9-b0c1-2345-c456-789012345f01', '03c4d5e6-f6a7-8901-cdef-123456789012'),
  -- Rare Game Spotlight -> New Game Arrivals
  ('dab1c2d3-e4f5-6789-a890-123456789435', '02b3c4d5-e5f6-7890-bcde-f12345678901'),
  -- AI Concierge Demo -> Membership Benefits
  ('d9a0b1c2-d3e4-5678-f789-012345678324', '03c4d5e6-f6a7-8901-cdef-123456789012');

-- ============================================
-- IDEA_ASSETS - Assets for video production
-- ============================================

insert into public.idea_assets (
  id,
  idea_id,
  type,
  is_complete,
  title,
  instructions,
  time_estimate_minutes,
  is_ai_generatable,
  content_text,
  sort_order
) values
  -- ===========================================
  -- PUBLISHED: Wingspan Tutorial (complete)
  -- ===========================================
  (
    'aa111111-1111-1111-1111-111111111111',
    'd1e2f3a4-b5c6-7890-def1-234567890abc',
    'talking_points',
    true,
    'Talking Points',
    'Use these as a guide while recording. Hit each point naturally.',
    5,
    true,
    E'## Opening Hook\n\n- "Wingspan is the game everyone is talking about - let me show you why"\n- Mention it won Kennerspiel des Jahres 2019\n\n## Goal of the Game\n\n- You''re bird enthusiasts building habitats\n- Score points through birds, eggs, food, and bonus cards\n- Person with most points at end of 4 rounds wins\n\n## Turn Structure\n\n- On your turn, pick ONE of four actions\n- Play a bird, gain food, lay eggs, or draw bird cards\n- Each action gets stronger as you build your habitats\n\n## Bird Powers\n\n- Each bird has a unique power\n- Powers activate when you use that row\n- Some trigger "when played", others each turn\n\n## End-of-Round Scoring\n\n- Each round has a goal (eggs in forest, food on birds, etc.)\n- Compete for bonus points\n- Plan ahead!\n\n## Pro Tips\n\n- Don''t ignore your bonus cards\n- Food diversity is your friend\n- Engine building - your early birds power your late game\n\n## Closing\n\n- "Come play Wingspan with us at Tabletop Library"\n- We can teach you in person!',
    0
  ),
  (
    'aa111111-1111-1111-1111-111111111112',
    'd1e2f3a4-b5c6-7890-def1-234567890abc',
    'script',
    true,
    'Script',
    null,
    10,
    true,
    E'[Vera at table with Wingspan set up]\n\nVera: Wingspan is the game everyone''s talking about - and today I''m going to show you why.\n\n[B-roll of game components]\n\nVera: This beautiful game won the prestigious Kennerspiel des Jahres in 2019, and it''s been flying off shelves ever since. Pun intended.\n\n[Vera gestures to player board]\n\nVera: In Wingspan, you''re bird enthusiasts building habitats to attract birds. You''ll score points through the birds you collect, eggs you lay, food you gather, and bonus cards you complete.\n\n[Shows turn structure]\n\nVera: On each turn, you''ll pick just ONE of four actions: play a bird, gain food, lay eggs, or draw bird cards. Here''s the clever part - each action gets stronger as you build out your habitats.\n\n[Shows bird cards]\n\nVera: Every bird has a unique power that activates when you use that row. Some trigger when played, others every single turn. Building these combos is where the magic happens.\n\n[Shows round goals]\n\nVera: At the end of each round, you''ll compete for bonus points based on that round''s goal. Plan ahead!\n\n[Vera holds up finger]\n\nVera: My pro tips? Don''t ignore your bonus cards, keep your food diverse, and remember - your early birds power your late game engine.\n\n[Vera smiles at camera]\n\nVera: Come play Wingspan with us at Tabletop Library. We''d love to teach you in person!\n\n[End card]',
    1
  ),
  (
    'aa111111-1111-1111-1111-111111111113',
    'd1e2f3a4-b5c6-7890-def1-234567890abc',
    'a_roll',
    true,
    'Main Recording (Vera)',
    'Record Vera at the teaching table with Wingspan set up. Good lighting, game visible. Follow the script.',
    60,
    false,
    null,
    2
  ),
  (
    'aa111111-1111-1111-1111-111111111114',
    'd1e2f3a4-b5c6-7890-def1-234567890abc',
    'thumbnail',
    true,
    'Video Thumbnail',
    'Vera holding Wingspan box with excited expression. Text overlay: "How to Play Wingspan"',
    15,
    true,
    null,
    3
  ),

  -- ===========================================
  -- PREPRODUCTION: Board Game Cafe Revolution
  -- ===========================================
  (
    'aa222222-2222-2222-2222-222222222221',
    'd2e3f4a5-b6c7-8901-ef12-345678901bcd',
    'talking_points',
    true,
    'Talking Points',
    'Two-person conversation format. Andrew and Nabeel riff on these points.',
    10,
    true,
    E'## Opening Hook\n\n- "Board game cafes are having a moment"\n- From niche to mainstream - what changed?\n\n## The History\n\n- First wave: hobby game stores with play space\n- Second wave: themed cafes (Snakes & Lattes pioneered)\n- Third wave: premium experiences, curated collections\n- Our position: membership model, premium space\n\n## What Makes a Great Board Game Cafe\n\n- Curation over quantity (800 great games vs 2000 random ones)\n- Staff who can teach and recommend\n- Atmosphere that encourages play\n- Food/drink that doesn''t interfere with gaming\n- Space design - lighting, tables, noise\n\n## Common Mistakes Cafe Owners Make\n\n- Trying to be everything to everyone\n- Underestimating staff training\n- Poor game organization\n- Not creating regulars/community\n\n## Why Membership Models Work\n\n- Creates committed community\n- Predictable revenue\n- Better experience (less crowded, known faces)\n- Investment in the space\n\n## Our Vision for Tabletop Library\n\n- Premium third place for game lovers\n- Expert staff, curated collection\n- Events and community building\n- The place you bring people to discover gaming\n\n## Closing\n\n- Subscribe for more industry insights\n- Come visit us!',
    0
  ),

  -- ===========================================
  -- PRODUCTION: Games That Will End Friendships
  -- ===========================================
  (
    'aa333333-3333-3333-3333-333333333331',
    'd5e6f7a8-b9c0-1234-b345-678901234ef0',
    'talking_points',
    true,
    'Talking Points',
    'Quick hits, deadpan delivery. Each game gets one memorable line.',
    5,
    true,
    E'## Hook\n\n- These games WILL cause arguments\n- Play at your own risk\n\n## #5: Monopoly\n\n- The obvious choice\n- "I''ve seen families not speak for weeks"\n\n## #4: Risk\n\n- Those alliances mean nothing\n- "You said you wouldn''t attack Australia!"\n\n## #3: Diplomacy\n\n- Literally designed for backstabbing\n- No dice, just pure betrayal\n\n## #2: Cosmic Encounter\n\n- Negotiation chaos\n- Everyone lies, everyone knows everyone lies\n\n## #1: Secret Hitler / The Resistance\n\n- Trust no one\n- "I swear I''m liberal" - every fascist ever\n\n## Closing\n\n- Come test your friendships at Tabletop Library\n- We have all of these. You''ve been warned.',
    0
  ),
  (
    'aa333333-3333-3333-3333-333333333332',
    'd5e6f7a8-b9c0-1234-b345-678901234ef0',
    'script',
    true,
    'Script',
    null,
    5,
    true,
    E'[Nabeel looking serious at camera]\n\nNabeel: These games WILL cause arguments. Play at your own risk.\n\n[Quick cut - holds up Monopoly]\n\nNabeel: Number 5: Monopoly. Obviously. I''ve seen families not speak for weeks.\n\n[Quick cut - holds up Risk]\n\nNabeel: Number 4: Risk. Those alliances? They mean nothing. "You said you wouldn''t attack Australia!"\n\n[Quick cut - holds up Diplomacy]\n\nNabeel: Number 3: Diplomacy. This game is literally designed for backstabbing. No dice. Just pure betrayal.\n\n[Quick cut - holds up Cosmic Encounter]\n\nNabeel: Number 2: Cosmic Encounter. Negotiation chaos. Everyone lies. Everyone knows everyone lies.\n\n[Quick cut - holds up Secret Hitler dramatically]\n\nNabeel: And number 1... Secret Hitler. Or The Resistance. Trust. No. One. "I swear I''m liberal" - said every fascist ever.\n\n[Nabeel gestures to shelf behind him]\n\nNabeel: Come test your friendships at Tabletop Library. We have all of these.\n\n[Slight smirk]\n\nNabeel: You''ve been warned.\n\n[End card]',
    1
  ),
  (
    'aa333333-3333-3333-3333-333333333333',
    'd5e6f7a8-b9c0-1234-b345-678901234ef0',
    'a_roll',
    false,
    'Main Recording (Nabeel)',
    'Nabeel with deadpan delivery. Quick cuts between each game. Dramatic music stings on reveals.',
    30,
    false,
    null,
    2
  ),

  -- ===========================================
  -- POSTPRODUCTION: AI Concierge Demo
  -- ===========================================
  (
    'aa444444-4444-4444-4444-444444444441',
    'd9a0b1c2-d3e4-5678-f789-012345678324',
    'talking_points',
    true,
    'Talking Points',
    'Product demo - keep it snappy and focused on the "wow" moment.',
    3,
    true,
    E'## Hook\n\n- We built an AI to help you find games\n- Like having a game expert in your pocket\n\n## The Demo\n\n- Show the interface\n- Example query: "2-player game, under an hour, not too competitive"\n- AI gives personalized recommendations with reasons\n\n## Why It''s Cool\n\n- Knows our entire 800+ game collection\n- Player count, complexity, themes, playtime\n- Learns what you like\n\n## CTA\n\n- Come try it yourself\n- It''s like magic',
    0
  ),
  (
    'aa444444-4444-4444-4444-444444444442',
    'd9a0b1c2-d3e4-5678-f789-012345678324',
    'script',
    true,
    'Script',
    null,
    5,
    true,
    E'[Andrew holding phone/tablet, standing in club]\n\nAndrew: We built an AI to help you find your next favorite game.\n\n[Shows screen to camera]\n\nAndrew: Watch this. "I want a 2-player game, under an hour, that''s not too competitive."\n\n[Types/speaks into interface]\n\n[AI response appears on screen]\n\nAndrew: And it says... Patchwork, 7 Wonders Duel, and Jaipur. All great picks.\n\n[Turns phone back]\n\nAndrew: It knows our entire 800+ game collection. Player count, complexity, themes, everything.\n\n[Gestures around club]\n\nAndrew: Come try it yourself. It''s like having a game expert in your pocket.\n\n[End card: @tabletoplibrary]',
    1
  ),
  (
    'aa444444-4444-4444-4444-444444444443',
    'd9a0b1c2-d3e4-5678-f789-012345678324',
    'a_roll',
    true,
    'Main Recording (Andrew)',
    'Andrew with phone/tablet showing the AI interface. Capture genuine reactions.',
    20,
    false,
    null,
    2
  ),
  (
    'aa444444-4444-4444-4444-444444444444',
    'd9a0b1c2-d3e4-5678-f789-012345678324',
    'b_roll_screen_recording',
    true,
    'AI Interface Recording',
    'Screen recording of the AI concierge interface. Show a real query and response.',
    10,
    false,
    null,
    3
  ),
  (
    'aa444444-4444-4444-4444-444444444445',
    'd9a0b1c2-d3e4-5678-f789-012345678324',
    'thumbnail',
    false,
    'Video Thumbnail',
    'Andrew with phone, text overlay showing AI recommendation. Futuristic/tech feel.',
    15,
    true,
    null,
    4
  ),

  -- ===========================================
  -- POSTPRODUCTION: POV Game Recommendation
  -- ===========================================
  (
    'aa555555-5555-5555-5555-555555555551',
    'd3e4f5a6-b7c8-9012-f123-456789012cde',
    'talking_points',
    true,
    'Talking Points',
    'POV format - camera is the customer. Quick fire questions.',
    3,
    true,
    E'## The Format\n\n- POV: You ask me for a game recommendation\n- Quick cuts, rapid fire questions\n- Builds to satisfying payoff\n\n## The Questions\n\n- "How many players?"\n- "Do they like strategy or luck?"\n- "How much time do you have?"\n- "Are they competitive or chill?"\n- "Have they played Catan?"\n\n## The Payoff\n\n- Confident game selection\n- *hands them perfect game*\n- "Trust me."\n\n## Vibe\n\n- Slightly chaotic energy\n- Relatable (we''ve all been asked this)\n- Vera''s natural on-camera personality',
    0
  ),
  (
    'aa555555-5555-5555-5555-555555555552',
    'd3e4f5a6-b7c8-9012-f123-456789012cde',
    'script',
    true,
    'Script',
    null,
    5,
    true,
    E'[Camera is the customer''s POV - Vera faces camera directly]\n\n[Customer approaches]\n\nVera: [friendly] Hey! Looking for a game?\n\n[Quick cut]\n\nVera: Okay, how many players?\n\n[Quick cut]\n\nVera: Do they like strategy... or more luck-based?\n\n[Quick cut]\n\nVera: How much time do you have?\n\n[Quick cut]\n\nVera: Are they competitive or chill?\n\n[Quick cut]\n\nVera: [squinting slightly] Have they played Catan?\n\n[Quick cut - Vera grabs a game box confidently]\n\nVera: [handing over box with a knowing smile] Trust me.\n\n[End card: @tabletoplibrary]',
    1
  ),
  (
    'aa555555-5555-5555-5555-555555555553',
    'd3e4f5a6-b7c8-9012-f123-456789012cde',
    'a_roll',
    true,
    'Main Recording (Vera)',
    'Film from customer POV. Quick cuts between questions. End with game box reveal.',
    20,
    false,
    null,
    2
  ),
  (
    'aa555555-5555-5555-5555-555555555554',
    'd3e4f5a6-b7c8-9012-f123-456789012cde',
    'thumbnail',
    true,
    'Video Thumbnail',
    'Vera with questioning expression, game boxes behind her. POV style.',
    10,
    true,
    null,
    3
  );

-- ============================================
-- PROJECT_IMAGES - Reference images for b-roll
-- ============================================

insert into public.project_images (
  id,
  project_id,
  image_url,
  title,
  description,
  created_at,
  updated_at
) values
  (
    'a0000001-1111-1111-1111-111111111111',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    '/seed/images/branded-gaming-table.jpg',
    'Branded Gaming Table',
    'Custom game table with The Tabletop Library logo on an orange geometric playmat. Exposed brick wall backdrop with velvet chairs. Great for establishing shots showing the branded experience.',
    now(),
    now()
  ),
  (
    'a0000002-2222-2222-2222-222222222222',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    '/seed/images/corner-booth.jpg',
    'Green Leather Corner Booth',
    'Cozy corner booth with green leather seating and wood table. Orange pendant light overhead, exposed brick, vinyl records visible. Perfect for intimate game sessions or small group shots.',
    now(),
    now()
  ),
  (
    'a0000003-3333-3333-3333-333333333333',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    '/seed/images/vinyl-listening-station.jpg',
    'Vinyl & Games Station',
    'Hi-fi listening station with large speakers, turntable, and vintage receiver. Board games (Panamax, Mars, Escape Plan) on display shelves. Coral velvet armchairs in foreground. Shows the vinyl record collection and gaming crossover.',
    now(),
    now()
  ),
  (
    'a0000004-4444-4444-4444-444444444444',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    '/seed/images/lounge-area.jpg',
    'Main Lounge Area',
    'Spacious lounge with mustard velvet sofa, coral armchairs, and wood coffee table with a game in progress. Floor lamp and vintage speakers visible. Warm, inviting atmosphere for game night content.',
    now(),
    now()
  ),
  (
    'a0000005-5555-5555-5555-555555555555',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    '/seed/images/lounge-alternate-view.jpg',
    'Lounge Wide Shot',
    'Alternate angle of the main lounge showing the full seating arrangement. Game set up on coffee table, speakers and game shelves in background. Good for establishing shots or panning b-roll.',
    now(),
    now()
  ),
  (
    'a0000006-6666-6666-6666-666666666666',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    '/seed/images/elegant-booth-render.jpg',
    'Premium Booth Concept',
    'Design render of an elegant booth with caramel leather banquette, terracotta velvet curtains, brass pendant lights, and chess game on table. Fiddle leaf fig plant accent. Aspirational interior design reference.',
    now(),
    now()
  ),
  (
    'a0000007-7777-7777-7777-777777777777',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    '/seed/images/cafe-seating-mural.jpg',
    'Café Seating with Mural',
    'Design render showing café-style seating against a striking dark green wall with abstract orange lotus mural. Mid-century wood chairs with terracotta upholstery, black pendant lights, trailing plants. Bold visual inspiration.',
    now(),
    now()
  ),
  (
    'a0000008-8888-8888-8888-888888888888',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    '/seed/images/library-nook-render.jpg',
    'Library Nook Concept',
    'Design render of intimate library corner with geometric mid-century wallpaper, floor-to-ceiling bookshelves, coral pendant lamp, and chess setup. Cozy reading/gaming nook inspiration.',
    now(),
    now()
  ),
  (
    'a0000009-9999-9999-9999-999999999999',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    '/seed/images/card-catalog-counter.jpg',
    'Card Catalog Counter',
    'Design render of café counter made from vintage library card catalog drawers. Checkered floor, espresso machine, wooden chess pieces on shelf, colorful book spines. Blends library and café aesthetics.',
    now(),
    now()
  ),
  (
    'a000000a-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    '/seed/images/storefront-sign-painting.jpg',
    'Storefront Sign Painting',
    'Behind-the-scenes photo of sign artist hand-painting The Tabletop Library window logo. Shows the craftsmanship and care in the branding. Great for "making of" or origin story content.',
    now(),
    now()
  ),
  (
    'a000000b-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    '/seed/images/brick-lounge-render.jpg',
    'Brick Wall Lounge Concept',
    'Design render of lounge area with warm brick wall, orange and green mid-century furniture, ceramic floor lamp, and pendant lights. Vinyl records and plants throughout. Retro-modern aesthetic reference.',
    now(),
    now()
  ),
  (
    'a000000c-cccc-cccc-cccc-cccccccccccc',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    '/seed/images/game-night-action.jpg',
    'Game Night in Action',
    'Real photo of customers playing a board game at the large table. Group of 6 people engaged and smiling, natural daylight from windows, exposed brick and beam ceiling. Authentic community atmosphere for promotional content.',
    now(),
    now()
  );
