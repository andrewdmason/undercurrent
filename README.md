# Undercurrent

AI-powered video idea generation for small businesses. Undercurrent is the invisible creative engine that constantly generates fresh, relevant, on-brand video ideas ready to paste into Descript Underlord.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4.1 + shadcn/ui
- **Database & Auth:** Supabase
- **AI:** ChatGPT 5.1 (OpenAI)
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Supabase account
- OpenAI API key

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/andrewdmason/undercurrent.git
   cd undercurrent
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

4. Fill in your environment variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `OPENAI_API_KEY` - Your OpenAI API key

5. Run the development server:
   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
/app                 - Next.js App Router pages and layouts
/components          - React components
/lib                 - Utility functions, Supabase client, OpenAI client
/prompts             - AI prompt templates (markdown files)
/docs                - Documentation (PRD, design system)
```

## Documentation

- [Product Requirements (PRD)](docs/prd.md)
- [Design System](docs/design-system.md)

## Development

### Branch Naming

All feature branches should be prefixed with `andrew/`:
```bash
git checkout -b andrew/feature-name
```

### Database Migrations

Only one migration file per branch. If you need additional changes, update the existing migration file.
