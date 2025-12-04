## Product Description

Small businesses know they *should* be posting video constantly—on Instagram, TikTok, YouTube—but the reality is brutal. Most owners don’t have the time, the ideas, or the mental space to plan a content strategy, let alone script videos, brainstorm hooks, and figure out what will actually resonate. Even the ones who try end up staring at a blank page, posting once every few weeks, and feeling guilty that they aren’t doing more. The gap isn’t motivation—it’s the sheer lift required to turn a business into a steady, creative, video‑producing machine.

**Undercurrent** is the AI that fills that gap. It becomes the invisible creative engine behind your business, constantly generating fresh, relevant, on‑brand video ideas—each packaged as a crisp idea card with a short description, a visual reference, and a full, high‑quality prompt ready to paste directly into Descript Underlord. In seconds, owners get concepts they would never have thought of, tailored to their channel mix, style, events, products, and voice. And with one click, they can iterate, refine, and spin the idea into exactly what they want.

The result is simple but transformative: instead of wrestling with what to make next, businesses open Undercurrent and instantly have a stream of compelling video ideas that feel like they came from a dedicated creative strategist. Creativity stops being a bottleneck—and video marketing becomes something any business can actually keep up with.

## What success looks like

The goal is to increase Descript usage, as measured by the # of videos created by a business

## Tech Stack

- Tailwind 4.1
- Next.js
- Supabase with Supabase email auth
- Vercel for hosting
- ChatGPT 5.1 for AI model

## App Details

After the user gets through onboarding, there are two main sections of the app: The Feed of ideas, and then a config area where they can go to fine-tune the strategy.

### Strategy Config

Will have the following fields and sections:

- Business Name
- URL
- Business Description
- Content Inspiration Sources
    - A list of websites or search terms passed as context to the AI when generating ideas
    - Examples: "tabletoplibrary.com/events" or "new board game releases"
    - For v1, we don't actually fetch/scrape these — just pass them as hints to the AI
- Video Marketing Strategy (this is the long prompt that they’ll have created through onboarding. Will cover:
    - Distribution channels and frequency
    - Content
    - Production values / style / assets

### Once onboarding is complete, the app will revolve around an idea feed

- The user can click a button to generate new ideas on demand — generates 5 ideas per click (eventually we'll generate these automatically but for v1 we'll just do it manually on-demand)
- They'll then see a feed of idea cards, with an AI-generated image and a short description. Think ChatGPT Pulse for inspiration here
- When they click on a card, they should see a video creation prompt that they can paste into Descript Underlord… and then Underlord will take it from there, generating the video or guiding them through the video creation
    - When viewing the idea details, the user should be able to iterate on the prompt by chatting with the agent and generating new versions
- Users should be able to thumb up / thumb down ideas
    - Ratings are stored as structured data
    - Recent liked/disliked ideas are passed to the AI when generating new ideas (simple feedback loop)

### Onboarding flow

- When a user first sets up a business, they'll go through a chatbot onboarding flow, the goal of which will be to populate several fields on the business's strategy doc.
    - Primarily, there will be a field to store the strategy in markdown format, that will include most of the details of their video strategy. Want to keep this flexible so we can iterate on the details over time
    - If there's other information that you think is worth storing in structured data - e.g. sources for content inspiration (web url or search key terms) when generating new ideas, we can do that
    - 
- I'll provide the initial system prompt for the chatbot when we get to that part
- In general, the way that chat will go is like this:
    - The agent will have a minimum set of data points it needs in order to complete the onboarding conversation
    - It will ask one question at a time
        - It will generally follow the question with a set of multiple choice answers, as well as a recommendation
        - There will be a few questions where we don't just want to show text - there's a part where we're going to want to present the user with a series of short video clips they can rate to get at their stylistic preferences. So we'll need to do something to augment the conversation to make that work.
- The user should be able to abandon / return to the conversation at any point

### Multi-business & collaboration

- Users can create multiple businesses and switch between them (business switcher in UI)
- Users can add other users to a business by email address
    - If the email has an existing account → immediately granted access
    - If no account exists → show error "User not found, ask them to sign up first"
- No invitation emails or pending invites for v1
- No role-based permissions — all business members have equal access

## Project Plan

Here’s the initial set of PRs:

1. Setup the github repo and everything
2. Guide me through creating a [design-system.md](http://design-system.md) file that you can use for implementing the visual styles. I have thoughts, we just need to talk it through together
3. Create the basic scaffolding for the tech stack and the basic IA scaffolding for the site. 
    1. Get all the API keys in there that you need like OpenAI and everything
    2. Create an app readme and a cursor rules file
    3. Let’s not actually add anything to the database yet
4. Get supabase auth working and the profiles table and business table and that whole setup
5. Implement feed / business / ideas data model. I have ideas here but want your suggestion before I share them
6. Create the feed with some seed data
7. Create the strategy config section with some seed data

## Other implementation notes

- We should have a /prompts folder where we store md files of any longer AI prompts that we create in this process so it's easy to iterate on them, e.g.
    - The prompt we use for the agent to converse with the user and create a strategy doc
    - The prompt we use to generate new ideas
    - The prompt we use to create an Underlord prompt based on an idea
