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
  business_objectives,
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
  E'## Goals\n\n- **Primary**: Drive founding membership sign-ups before launch (target: 200 founding members)\n- **Secondary**: Build brand awareness in the Berkeley/Oakland board game community\n- **Long-term**: Establish Tabletop Library as THE place for board games in the East Bay\n\n## Success Metrics\n\n- Email list sign-ups from video CTAs\n- Website traffic from social platforms\n- Engagement rate (comments, shares, saves)\n- Founding member conversions attributed to video content\n\n## Target Audience\n\n- **Primary**: Board game enthusiasts in Berkeley/Oakland (25-45 years old)\n- **Secondary**: Young professionals looking for social activities beyond bars\n- **Tertiary**: Families looking for wholesome entertainment options\n\nOur ideal member is someone who owns 10+ board games, attends game nights with friends, and is looking for a dedicated space to play and discover new games.',
  E'## Content Themes\n\n1. **Product Highlights**: Unboxings, new arrivals, staff picks, rare game spotlights\n\n2. **Educational**: How to play, game comparisons, buying guides\n\n3. **Community**: Event recaps, member spotlights, game night vibes\n\n4. **Behind the Scenes**: Club life, collection curation, staff banter\n\n5. **Berkeley/Local**: Local community tie-ins, neighborhood features\n\n\n## Style & Tone\n\n- Warm, welcoming, and inclusive - like a living room\n- Knowledgeable but not gatekeep-y\n- "Board games are having a moment" energy\n- Genuine enthusiasm, not corporate\n- Slight humor, board game puns welcome\n\n\n## Production Values\n\n- Natural lighting when possible\n- iPhone 15 Pro for most content\n- Lapel mics for talking-head videos\n- Clean backgrounds showing game shelves and cozy club atmosphere\n- Consistent thumbnail style with brand colors\n\n\n## Brand Elements\n\n- Logo watermark in corner\n- Cozy, living room aesthetic\n- End cards with membership info and location\n\n\n## Key Messages\n\n- Membership-based model (not pay-per-hour)\n- 800+ game collection including rare titles\n- AI concierge for organizing pickup games\n- Events most days\n- "Your mythical third place"',
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
-- SAMPLE CHARACTERS FOR TESTING
-- ============================================

insert into public.business_characters (
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
    '/seed/characters/andrew.png',
    now(),
    now()
  ),
  (
    'e2b3c4d5-e6f7-8901-bcde-f12345678901',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Nabeel Hyatt',
    'Partner and co-founder. Deep gaming industry experience and expertise in community building. Great for strategic content and industry commentary.',
    '/seed/characters/nabeel.png',
    now(),
    now()
  ),
  (
    'e3c4d5e6-f7a8-9012-cdef-123456789012',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Vera Devera',
    'General Manager. The face of day-to-day operations at Tabletop Library. Expert at teaching games and creating welcoming experiences for members.',
    '/seed/characters/vera.png',
    now(),
    now()
  );

-- ============================================
-- SAMPLE DISTRIBUTION CHANNELS FOR TESTING
-- ============================================

insert into public.business_distribution_channels (
  id,
  business_id,
  platform,
  custom_label,
  goal_count,
  goal_cadence,
  notes,
  created_at,
  updated_at
) values
  (
    'dc1a2b3c-d4e5-6789-abcd-ef1234567890',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'tiktok',
    null,
    4,
    'weekly',
    'Primary discovery channel. Quick hooks, trending sounds, "games you need to try" series, POV content, unboxings. Board game cafes perform well here.',
    now(),
    now()
  ),
  (
    'dc2b3c4d-e5f6-7890-bcde-f12345678901',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'instagram_reels',
    null,
    5,
    'weekly',
    'Local discovery and atmosphere showcase. Behind-the-scenes, event teasers, staff picks. Anchor channel for Tabletop Library.',
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
    'Cross-post best performing TikToks/Reels. Builds YouTube presence for discoverability.',
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
    'Monthly deep-dive: full game tutorials, event recaps, or game reviews. Vera as primary teaching host.',
    now(),
    now()
  );

-- ============================================
-- SAMPLE IDEAS FOR TESTING
-- Ideas utilize characters and target specific distribution channels
-- Statuses: new (inbox), accepted (queue), published, rejected, canceled
-- ============================================

insert into public.ideas (
  id,
  business_id,
  title,
  description,
  prompt,
  script,
  image_url,
  status,
  reject_reason,
  generation_batch_id,
  created_at,
  updated_at
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
    E'[INTRO - Vera at table with Wingspan]\n\nVera: Hey everyone, I''m Vera, and today I''m going to teach you one of my absolute favorite games - Wingspan. By the end of this video, you''ll know everything you need to play your first game.\n\n[GOAL]\n\nSo in Wingspan, you''re bird enthusiasts trying to attract the best birds to your wildlife preserves. You''ll score points by collecting birds, laying eggs, caching food, and completing bonus objectives.\n\n[TURN STRUCTURE]\n\nOn your turn, you''ll do one of four actions...\n\n[Continue with full tutorial...]',
    '/seed/ideas/wingspan-tutorial.jpg',
    'published',
    null,
    'e1f2a3b4-c5d6-7890-ef12-345678901bcd',
    now() - interval '14 days',
    now() - interval '7 days'
  ),
  (
    'd3e4f5a6-b7c8-9012-f123-456789012cde',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'POV: You Ask Me for a Game Recommendation',
    'Vera does a trending POV format video where someone asks for a game rec and she rapid-fires questions back. Relatable and funny.',
    E'Create a 30-second POV video for TikTok/Reels.\n\n## On-Screen Talent\nVera Devera - natural on camera, great with customers\n\n## Tone\nFunny, relatable, slightly chaotic energy\n\n## Script Concept\nPOV: You ask me for a game recommendation\n"How many players?"\n"Do they like strategy or luck?"\n"How much time do you have?"\n"Are they competitive or chill?"\n"Have they played Catan?"\n*hands them perfect game*\n"Trust me."\n\n## Production Notes\n- Film from customer POV (camera is the customer)\n- Quick cuts between questions\n- End with satisfied smile and game box reveal\n- Use trending audio if applicable',
    E'[Camera is the customer''s POV - Vera faces camera directly]\n\n[Customer approaches]\n\nVera: [friendly] Hey! Looking for a game?\n\n[Quick cut]\n\nVera: Okay, how many players?\n\n[Quick cut]\n\nVera: Do they like strategy... or more luck-based?\n\n[Quick cut]\n\nVera: How much time do you have?\n\n[Quick cut]\n\nVera: Are they competitive or chill?\n\n[Quick cut]\n\nVera: [squinting slightly] Have they played Catan?\n\n[Quick cut - Vera grabs a game box confidently]\n\nVera: [handing over box with a knowing smile] Trust me.\n\n[End card: @tabletoplibrary]',
    '/seed/ideas/pov-recommendation.jpg',
    'published',
    null,
    'f2a3b4c5-d6e7-8901-d567-890123456012',
    now() - interval '10 days',
    now() - interval '5 days'
  ),

  -- ===========================================
  -- PRODUCTION QUEUE (accepted, ready to film)
  -- ===========================================
  (
    'd2e3f4a5-b6c7-8901-ef12-345678901bcd',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'The Board Game Cafe Revolution: Industry Deep Dive',
    'Andrew and Nabeel discuss the rise of board game cafes, what makes them work, and their vision for Tabletop Library. Great for building authority and SEO.',
    E'Create a 12-minute talking head video on the board game cafe industry.\n\n## On-Screen Talent\nAndrew Mason & Nabeel Hyatt - co-founders with deep industry knowledge\n\n## Tone\nThoughtful, insider perspective, passionate but not salesy\n\n## Structure\n1. Hook: "Board game cafes are having a moment" (30 sec)\n2. The history - from niche to mainstream (2 min)\n3. What makes a great board game cafe (3 min)\n4. Common mistakes cafe owners make (2 min)\n5. Why membership models work (2 min)\n6. Our vision for Tabletop Library (2 min)\n7. CTA: Subscribe + visit us (30 sec)\n\n## Production Notes\n- Two-shot conversation format\n- Film in the club with games visible behind\n- Can cut to B-roll of the space',
    E'[INTRO - Andrew and Nabeel sitting together]\n\nAndrew: So Nabeel, we''ve been getting a lot of questions about board game cafes lately...\n\nNabeel: Yeah, it feels like everywhere you look, a new one is opening up. There''s definitely something happening here.\n\nAndrew: Let''s talk about it. Why now? What''s driving this?\n\n[THE HISTORY]\n\nNabeel: Well, if you look at the data, board game sales have been growing double digits for years now...\n\n[Continue with full conversation...]',
    '/seed/ideas/cafe-revolution.jpg',
    'accepted',
    null,
    'e1f2a3b4-c5d6-7890-ef12-345678901bcd',
    now() - interval '5 days',
    now() - interval '5 days'
  ),
  (
    'd5e6f7a8-b9c0-1234-b345-678901234ef0',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Games That Will End Friendships (Affectionately)',
    'Nabeel counts down the most friendship-testing games in our collection. Funny, relatable content with high share potential.',
    E'Create a 60-second countdown video.\n\n## On-Screen Talent\nNabeel Hyatt - dry humor, knows competitive gaming\n\n## Tone\nFunny, knowing, "we''ve all been there"\n\n## Structure\n1. Hook: "These games WILL cause arguments" (3 sec)\n2. #5: Monopoly (duh) (8 sec)\n3. #4: Risk (those alliances) (10 sec)\n4. #3: Diplomacy (literal backstabbing) (10 sec)\n5. #2: Cosmic Encounter (negotiation chaos) (10 sec)\n6. #1: The Resistance/Secret Hitler (trust no one) (12 sec)\n7. CTA: "Come test your friendships" (7 sec)\n\n## Production Notes\n- Quick cuts, show each game box\n- Nabeel deadpan delivery\n- Maybe dramatic music stings',
    E'[Nabeel standing with arms crossed, deadpan]\n\nNabeel: These games WILL cause arguments. I''m not sorry.\n\n[Dramatic sting - holds up Monopoly]\n\nNabeel: Number 5: Monopoly. Obviously. Next.\n\n[Holds up Risk]\n\nNabeel: Number 4: Risk. "I thought we had an alliance." You thought wrong.\n\n[Holds up Diplomacy]\n\nNabeel: Number 3: Diplomacy. This game has literally ended real friendships. I''ve seen it.\n\n[Holds up Cosmic Encounter]\n\nNabeel: Number 2: Cosmic Encounter. The negotiation phase alone...\n\n[Holds up Secret Hitler]\n\nNabeel: And number 1: Secret Hitler. Or The Resistance. Either way, trust no one.\n\n[Nabeel shrugs]\n\nNabeel: Come test your friendships at Tabletop Library. We have tissues.\n\n[End card]',
    '/seed/ideas/end-friendships.jpg',
    'accepted',
    null,
    'f2a3b4c5-d6e7-8901-d567-890123456012',
    now() - interval '3 days',
    now() - interval '3 days'
  ),
  (
    'd9a0b1c2-d3e4-5678-f789-012345678324',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'The AI Concierge Demo: Finding Your Perfect Game',
    'Andrew demos our AI concierge feature that helps members find games. Shows off a unique differentiator.',
    E'Create a 40-second product demo video.\n\n## On-Screen Talent\nAndrew Mason - can speak to the tech/product side\n\n## Tone\nExcited about tech, but accessible and not too salesy\n\n## Structure\n1. Hook: "We built an AI to help you find games" (5 sec)\n2. Show the interface on phone/tablet (5 sec)\n3. Demo: "I want a 2-player game under an hour" (10 sec)\n4. AI gives recommendations with reasons (10 sec)\n5. "It knows our entire 800+ game collection" (5 sec)\n6. CTA: "Come try it yourself" (5 sec)\n\n## Production Notes\n- Screen recording + Andrew talking\n- Show real recommendations\n- Keep it snappy',
    E'[Andrew holding phone/tablet, standing in club]\n\nAndrew: We built an AI to help you find your next favorite game.\n\n[Shows screen to camera]\n\nAndrew: Watch this. "I want a 2-player game, under an hour, that''s not too competitive."\n\n[Types/speaks into interface]\n\n[AI response appears on screen]\n\nAndrew: And it says... Patchwork, 7 Wonders Duel, and Jaipur. All great picks.\n\n[Turns phone back]\n\nAndrew: It knows our entire 800-game collection. Player count, complexity, themes, everything.\n\n[Gestures around club]\n\nAndrew: Come try it yourself. It''s like having a game expert in your pocket.\n\n[End card: @tabletoplibrary]',
    '/seed/ideas/ai-concierge.jpg',
    'accepted',
    null,
    'a1b2c3d4-e5f6-7890-abcd-111111111111',
    now() - interval '12 hours',
    now() - interval '12 hours'
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
    E'[Close-up of game box on clean table]\n\nAndrew (VO): This is the number one game on BoardGameGeek right now.\n\n[Box rotates to show title]\n\nAndrew (VO): It''s called [GAME NAME] and I just got my hands on it.\n\n[Hands lift lid slowly - satisfying sound]\n\nAndrew (VO): Oh wow. Okay.\n\n[Reveals components - punchboards, minis, cards]\n\nAndrew (VO): Look at these components. This is... this is really nice.\n\n[Pulls out standout piece]\n\nAndrew (VO): And check this out - [describes cool component]\n\n[Shows spread of components]\n\nAndrew (VO): We''ve got this on the shelf at Tabletop Library if you want to try before you buy.\n\n[End card: @tabletoplibrary]',
    '/seed/ideas/unboxing-hotness.jpg',
    'new',
    null,
    'f2a3b4c5-d6e7-8901-d567-890123456012',
    now() - interval '3 days',
    now() - interval '3 days'
  ),
  (
    'd6e7f8a9-b0c1-2345-c456-789012345f01',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'A Day in the Life: Opening Tabletop Library',
    'Behind-the-scenes morning routine video showing Vera opening the club. Builds connection and shows the care that goes into the space.',
    E'Create a 45-second day-in-the-life video.\n\n## On-Screen Talent\nVera Devera - as GM, she opens the club\n\n## Tone\nCozy, authentic, satisfying routine content\n\n## Shot List\n1. Vera arriving, keys in hand (3 sec)\n2. Lights coming on, revealing game shelves (5 sec)\n3. Starting the coffee machine (5 sec)\n4. Straightening games on shelves (8 sec)\n5. Setting up the "new arrivals" display (8 sec)\n6. Flipping the sign to "Open" (5 sec)\n7. First members walking in (8 sec)\n8. Vera wave: "Come hang out" (3 sec)\n\n## Production Notes\n- Natural morning light\n- Cozy background music\n- Show the care and intention',
    E'[Early morning - Vera walks up to Tabletop Library entrance, keys in hand]\n\n[Cozy lo-fi music plays throughout]\n\n[Keys turning in lock - satisfying click]\n\n[Lights flick on section by section, revealing rows of colorful game boxes]\n\n[Vera at coffee machine, pressing buttons]\n\n[Hands straightening games on shelf - satisfying organization]\n\n[Setting up "New This Week" display with fresh games]\n\n[Flipping door sign from CLOSED to OPEN]\n\n[First members walking in, Vera greeting them warmly]\n\n[Vera turns to camera, waves]\n\nVera: Come hang out.\n\n[Text overlay: "Open 7 days a week"]\n\n[End card: @tabletoplibrary]',
    '/seed/ideas/day-in-life.jpg',
    'new',
    null,
    'a1b2c3d4-e5f6-7890-abcd-111111111111',
    now() - interval '1 day',
    now() - interval '1 day'
  ),
  (
    'd7e8f9a0-b1c2-3456-d567-890123456102',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Rating Games by How Hard They Are to Teach',
    'Andrew rates popular games on a "teaching difficulty" scale. Useful content that helps people choose games for their groups.',
    E'Create a 50-second rating video.\n\n## On-Screen Talent\nAndrew Mason - experienced at teaching games to new players\n\n## Tone\nHelpful, honest, slightly self-deprecating\n\n## Structure\n1. Hook: "How hard is this game to teach?" (3 sec)\n2. Tier 1 - "Anyone can learn in 2 minutes": Azul, Codenames (10 sec)\n3. Tier 2 - "One practice round": Ticket to Ride, Carcassonne (10 sec)\n4. Tier 3 - "Watch a video first": Wingspan, Everdell (10 sec)\n5. Tier 4 - "Clear your afternoon": Terraforming Mars (10 sec)\n6. Tier 5 - "Just... good luck": Twilight Imperium (7 sec)\n\n## Production Notes\n- Show game boxes as rating\n- On-screen tier labels\n- Andrew can hold/gesture at games',
    E'[Andrew standing behind table with game boxes]\n\nAndrew: How hard is this game to teach? Let''s find out.\n\n[Text: TIER 1 - "2 Minutes"]\n\n[Holds up Azul]\n\nAndrew: Azul. Codenames. Anyone can learn these in two minutes flat.\n\n[Text: TIER 2 - "One Practice Round"]\n\n[Holds up Ticket to Ride]\n\nAndrew: Ticket to Ride. Carcassonne. One practice round and you''re good.\n\n[Text: TIER 3 - "Watch a Video First"]\n\n[Holds up Wingspan]\n\nAndrew: Wingspan. Everdell. Maybe watch a video first. It helps.\n\n[Text: TIER 4 - "Clear Your Afternoon"]\n\n[Holds up Terraforming Mars]\n\nAndrew: Terraforming Mars. Clear your afternoon. Bring snacks.\n\n[Text: TIER 5 - "Good Luck"]\n\n[Holds up Twilight Imperium - struggles with the weight]\n\nAndrew: And Twilight Imperium... just... good luck.\n\n[End card]',
    '/seed/ideas/teaching-difficulty.jpg',
    'new',
    null,
    'a1b2c3d4-e5f6-7890-abcd-111111111111',
    now() - interval '1 day',
    now() - interval '1 day'
  ),
  (
    'dab1c2d3-e4f5-6789-a890-123456789435',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Rare Game Spotlight: Out-of-Print Gems We Have',
    'Nabeel shows off some rare/out-of-print games in our collection. Appeals to collectors and serious hobbyists.',
    E'Create a 60-second rare games showcase.\n\n## On-Screen Talent\nNabeel Hyatt - deep knowledge of game industry/history\n\n## Tone\nExcited collector energy, "you can''t get this anywhere else"\n\n## Structure\n1. Hook: "Games you literally can''t buy anymore" (5 sec)\n2. Game 1: Show box, why it''s special, current value (15 sec)\n3. Game 2: Show box, why it''s rare (15 sec)\n4. Game 3: The crown jewel (15 sec)\n5. "And you can just... play them here" (5 sec)\n6. CTA: "800+ games, including the ones money can''t buy" (5 sec)\n\n## Production Notes\n- Dramatic reveals\n- Show eBay prices if applicable\n- Nabeel should hold games reverently',
    E'[Nabeel in front of game shelves, holding covered game]\n\nNabeel: These are games you literally cannot buy anymore.\n\n[Dramatic reveal - first game]\n\nNabeel: Fireball Island. Original 1986 edition. This goes for $300 on eBay. If you can find it.\n\n[Sets down, picks up another]\n\nNabeel: HeroQuest. The original. Not the remake. This is the one people are nostalgic for.\n\n[Sets down, picks up final game reverently]\n\nNabeel: And this... Glory to Rome black box edition. The publisher went under. These are essentially impossible to find now.\n\n[Gestures to shelf behind him]\n\nNabeel: We have over 800 games here. Including the ones money can''t buy.\n\n[Half smile]\n\nNabeel: And you can just... play them. Whenever you want.\n\n[End card: @tabletoplibrary]',
    '/seed/ideas/rare-games.jpg',
    'new',
    null,
    'a1b2c3d4-e5f6-7890-abcd-111111111111',
    now() - interval '12 hours',
    now() - interval '12 hours'
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
    E'[MONTAGE - Upbeat indie music throughout]\n\n[Wide shot: Packed game room, warm lighting]\n\n[Close-up: Dice tumbling across board]\n\n[Reaction shot: Someone throwing hands up in victory]\n\n[Group at table erupting in laughter]\n\n[Close-up: Colorful game pieces being placed]\n\n[Two players high-fiving across table]\n\n[Vera at a table, animatedly explaining rules, players nodding]\n\n[Snacks and craft sodas on side table]\n\n[Text overlay: "Every Saturday @ 7pm"]\n\n[Logo: Tabletop Library]\n\n[Text: "All skill levels welcome"]\n\n[End card: @tabletoplibrary]',
    '/seed/ideas/game-night-recap.jpg',
    'rejected',
    'We don''t have enough footage from events yet to make this work. Will revisit after launch.',
    'a1b2c3d4-e5f6-7890-abcd-111111111111',
    now() - interval '1 day',
    now() - interval '1 day'
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
  
  -- POV Game Recommendation (PUBLISHED): TikTok + Instagram Reels (trending format)
  ('d3e4f5a6-b7c8-9012-f123-456789012cde', 'dc1a2b3c-d4e5-6789-abcd-ef1234567890', 'https://www.tiktok.com/@tabletoplibrary/video/example456'),
  ('d3e4f5a6-b7c8-9012-f123-456789012cde', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', 'https://www.instagram.com/reel/example789'),
  
  -- Unboxing BGG Hotness (NEW): TikTok + Instagram + YouTube Shorts (cross-post)
  ('d4e5f6a7-b8c9-0123-a234-567890123def', 'dc1a2b3c-d4e5-6789-abcd-ef1234567890', null),
  ('d4e5f6a7-b8c9-0123-a234-567890123def', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', null),
  ('d4e5f6a7-b8c9-0123-a234-567890123def', 'dc3c4d5e-f6a7-8901-cdef-123456789012', null),
  
  -- Friendship-Ending Games (ACCEPTED/QUEUE): TikTok + Instagram Reels (shareable)
  ('d5e6f7a8-b9c0-1234-b345-678901234ef0', 'dc1a2b3c-d4e5-6789-abcd-ef1234567890', null),
  ('d5e6f7a8-b9c0-1234-b345-678901234ef0', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', null),
  
  -- Day in the Life (NEW): Instagram Reels + TikTok (cozy content)
  ('d6e7f8a9-b0c1-2345-c456-789012345f01', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', null),
  ('d6e7f8a9-b0c1-2345-c456-789012345f01', 'dc1a2b3c-d4e5-6789-abcd-ef1234567890', null),
  
  -- Teaching Difficulty Rating (NEW): TikTok + YouTube Shorts (useful content)
  ('d7e8f9a0-b1c2-3456-d567-890123456102', 'dc1a2b3c-d4e5-6789-abcd-ef1234567890', null),
  ('d7e8f9a0-b1c2-3456-d567-890123456102', 'dc3c4d5e-f6a7-8901-cdef-123456789012', null),
  
  -- Saturday Game Night Recap (REJECTED): Instagram Reels + TikTok (event content)
  ('d8f9a0b1-c2d3-4567-e678-901234567213', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', null),
  ('d8f9a0b1-c2d3-4567-e678-901234567213', 'dc1a2b3c-d4e5-6789-abcd-ef1234567890', null),
  
  -- AI Concierge Demo (ACCEPTED/QUEUE): TikTok + Instagram + YouTube Shorts (differentiator)
  ('d9a0b1c2-d3e4-5678-f789-012345678324', 'dc1a2b3c-d4e5-6789-abcd-ef1234567890', null),
  ('d9a0b1c2-d3e4-5678-f789-012345678324', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', null),
  ('d9a0b1c2-d3e4-5678-f789-012345678324', 'dc3c4d5e-f6a7-8901-cdef-123456789012', null),
  
  -- Rare Games Spotlight (NEW): Instagram Reels + YouTube Shorts (collector content)
  ('dab1c2d3-e4f5-6789-a890-123456789435', 'dc2b3c4d-e5f6-7890-bcde-f12345678901', null),
  ('dab1c2d3-e4f5-6789-a890-123456789435', 'dc3c4d5e-f6a7-8901-cdef-123456789012', null);

-- ============================================
-- THE MASON FAMILY HIJINKS - Second Test Business
-- A family content channel for the Mason family
-- ============================================

-- Create the Mason Family business
insert into public.businesses (
  id,
  name,
  slug,
  url,
  description,
  business_objectives,
  strategy_prompt,
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
  E'# Video Marketing Strategy for The Mason Family Hijinks\n\n## Distribution Channels\n- **YouTube** (2x/week): Main long-form content, family adventures, project builds\n- **Instagram Reels** (4x/week): Behind-the-scenes, quick moments, family life\n- **TikTok** (5x/week): Trending formats, family comedy, relatable parenting\n- **YouTube Shorts** (3x/week): Cross-post best performing short content\n\n## Content Themes\n1. **Family Projects**: Building things together, coding projects, LEGO builds\n2. **Adventures**: Travel vlogs, hiking, exploring new places\n3. **Sports & Activities**: Little League, baseball analytics, family games\n4. **Educational**: Learning together, book discussions, curious exploration\n5. **Comedy**: Family dynamics, kid perspectives, relatable parenting moments\n6. **Behind the Scenes**: Real family life, routines, chaos and all\n\n## Style & Tone\n- Authentic and unscripted feeling\n- Curious and enthusiastic\n- Warm family dynamic, mutual support visible\n- Kids are real participants, not props\n- Balance of chaos and heartfelt moments\n\n## Production Values\n- Mix of polished and casual content\n- iPhone for most content, mirrorless for bigger productions\n- Good audio is priority (lapel mics for interviews)\n- Natural settings: home, yard, Berkeley locations\n\n## Key Messages\n- Families that explore together, grow together\n- Curiosity is contagious\n- Kids have valuable perspectives\n- Making memories through shared projects',
  '["family vloggers 2025", "kid-friendly content ideas", "family youtube channel inspiration", "Berkeley family activities", "parent-child projects"]'::jsonb,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  now(),
  now()
);

-- Link user to Mason Family business
insert into public.business_users (
  id,
  business_id,
  user_id,
  created_at
) values (
  'f2b3c4d5-e6f7-8901-bcde-000000000002',
  'f1a2b3c4-d5e6-7890-abcd-000000000001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  now()
);

-- Mason Family Characters
insert into public.business_characters (
  id,
  business_id,
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
insert into public.business_distribution_channels (
  id,
  business_id,
  platform,
  custom_label,
  goal_count,
  goal_cadence,
  notes,
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
    'Main channel for long-form family content: adventures, project builds, travel vlogs, and deeper storytelling.',
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
    'Behind-the-scenes moments, quick family clips, lifestyle content. Good for local Berkeley community connection.',
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
    'Trending formats, family comedy, relatable parenting content. Kids'' perspectives perform well here.',
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
    'Cross-post best performing TikTok/Reels content. Builds YouTube subscriber base.',
    now(),
    now()
  );

-- ============================================
-- SAMPLE TOPICS FOR TESTING
-- Topics to cover and topics to avoid for idea generation
-- ============================================

insert into public.business_topics (
  id,
  business_id,
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
    '04d5e6f7-a7b8-9012-def1-234567890123',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Game Teaching',
    'Tutorials and how-to-play videos for popular games. Vera is our expert teacher.',
    false,
    now(),
    now()
  ),
  (
    '05e6f7a8-b8c9-0123-ef12-345678901234',
    'b1c2d3e4-f5a6-7890-bcde-f12345678901',
    'Berkeley Local',
    'Tie-ins with the Berkeley community, local events, neighborhood features.',
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
