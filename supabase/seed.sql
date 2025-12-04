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
  url,
  created_by,
  created_at,
  updated_at
) values (
  'b1c2d3e4-f5a6-7890-bcde-f12345678901',
  'Tabletop Library',
  'https://www.tabletoplibrary.com',
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
