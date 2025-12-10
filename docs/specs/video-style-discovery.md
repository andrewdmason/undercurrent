# Video Style Discovery for Onboarding

**Status:** Planned  
**Branch:** TBD (create from main when starting)  
**Priority:** Follow-up enhancement to onboarding flow

## Overview

Replace the manual "video templates" step in onboarding with an intuitive video discovery experience. Instead of asking users to describe video styles in abstract terms, show them real YouTube videos from competitors/similar businesses and let them pick ones they like. AI then analyzes their preferences to auto-generate templates.

## Problem

Small business owners don't think in terms of "video templates" or "formats." Asking them to define "talking head" vs "screen recording with voiceover" is jargon-heavy and creates friction. But they CAN recognize videos they like when they see them.

## Solution

A "Tinder for video styles" experience:

1. AI searches YouTube for videos from competitors/similar services
2. User swipes through embedded videos (like/skip)
3. AI analyzes liked videos and auto-generates templates

## User Flow

1. User reaches the "video styles" step in onboarding
2. System shows: "Let's find video styles that inspire you"
3. AI generates search queries based on:
   - Project description (e.g., "little league organization in Oakland")
   - Selected distribution channels (e.g., Instagram, Facebook)
4. YouTube videos appear as swipeable cards with muted autoplay
5. User taps "Like" or "Skip" on each video
6. After ~5-10 likes (or user clicks "Done"), AI analyzes selections
7. System generates 1-3 templates based on detected patterns
8. User reviews generated templates, can edit/delete before continuing

## Technical Implementation

### 1. YouTube Data API Setup

- Add YouTube Data API v3 to the project
- Store API key in environment variables (`YOUTUBE_API_KEY`)
- Create a reusable YouTube client in `/lib/youtube.ts`

### 2. API Routes

#### `POST /api/onboarding/suggest-video-searches/[projectId]`

Generates smart search queries based on project context.

**Input:** Project ID (fetches description, channels from DB)

**Output:** Array of 5-8 search queries

**Example output for Oakland Baseball (Instagram/Facebook):**
```json
{
  "queries": [
    "little league game highlights",
    "youth baseball team social media videos",
    "community sports organization promo",
    "kids baseball montage",
    "little league season recap video",
    "youth sports instagram reels"
  ]
}
```

**Prompt considerations:**
- Focus on competitor/similar business content
- Tailor to selected channels (short-form for TikTok/Reels, longer for YouTube)
- Include variety of styles (montages, talking head, event coverage, etc.)

#### `POST /api/onboarding/search-youtube/[projectId]`

Searches YouTube with the generated queries.

**Input:** Array of search queries

**Output:** Array of video objects with metadata

```json
{
  "videos": [
    {
      "videoId": "abc123",
      "title": "Season Highlights 2024 | Oakland Little League",
      "description": "...",
      "thumbnailUrl": "https://...",
      "channelName": "OLL Official",
      "duration": "PT2M30S",
      "publishedAt": "2024-03-15"
    }
  ]
}
```

**Implementation notes:**
- Run searches in parallel for speed
- Dedupe results across queries
- Filter out:
  - Videos over 10 minutes (probably not social content)
  - Videos with very low views (quality signal)
  - Music-only/podcast content
- Return ~15-20 videos total

#### `POST /api/onboarding/analyze-video-styles/[projectId]`

Analyzes liked videos and generates templates.

**Input:** Array of liked video metadata

**Output:** Generated templates

```json
{
  "templates": [
    {
      "name": "Game Day Highlights",
      "description": "Fast-paced montage of game action set to upbeat music. Quick cuts between plays, celebrations, and crowd reactions.",
      "suggestedChannels": ["instagram", "facebook"]
    },
    {
      "name": "Player Spotlight",
      "description": "Short interview or feature on individual players. Mix of talking head and action footage.",
      "suggestedChannels": ["instagram", "youtube"]
    }
  ]
}
```

**Prompt considerations:**
- Look for patterns across liked videos (editing style, pacing, format)
- Generate templates that are actionable, not just descriptive
- Consider the user's channels when suggesting template-channel associations
- Limit to 1-3 templates (don't overwhelm)

### 3. New UI Components

#### `VideoDiscoveryStep` (replaces current templates step during discovery phase)

- Header explaining the concept
- Swipeable card stack of videos
- Each card shows:
  - Embedded YouTube player (muted, autoplay on hover/focus)
  - Video title
  - Channel name
  - Duration badge
- Like (heart) / Skip (X) buttons
- Progress indicator ("5 of 15 videos" or "3 liked so far")
- "Done picking" button (enabled after 3+ likes)

#### `VideoCard` component

- Responsive 16:9 aspect ratio
- YouTube embed with `mute=1&autoplay=1&controls=0`
- Overlay with video info
- Swipe gestures (optional nice-to-have)
- Keyboard navigation (arrow keys + enter/space)

#### `GeneratedTemplatesReview`

- Shows AI-generated templates after analysis
- Loading state while AI processes
- Each template card is editable (inline or modal)
- Can delete templates they don't want
- "Continue" moves to next onboarding step

### 4. State Management

Update `OnboardingContext` to track:
- `discoveryVideos: YouTubeVideo[]` - fetched videos
- `likedVideoIds: string[]` - user selections
- `isAnalyzing: boolean` - loading state for AI analysis
- `generatedTemplates: Template[]` - AI output before saving

### 5. Database

No schema changes needed - we're generating `project_templates` entries, same as manual creation.

## UI/UX Considerations

- **Autoplay:** Muted autoplay is essential for quick browsing. User shouldn't have to click play on every video.
- **Mobile:** Cards should be swipeable on mobile. Like/Skip buttons for desktop.
- **Loading:** Show skeleton cards while YouTube results load.
- **Empty state:** If YouTube search returns nothing useful, gracefully fall back to manual template creation.
- **Skip option:** User should be able to skip this entirely ("I'll add templates later").

## Edge Cases

- **No YouTube results:** Fall back to manual template entry
- **User likes 0 videos:** Prompt them to try or skip
- **API rate limits:** Cache results, batch requests appropriately
- **Slow connection:** Lazy load video embeds, prioritize thumbnails first

## Future Enhancements

- **Actual video analysis:** Use AI vision to analyze video content, not just metadata
- **Save inspirations:** Let users save liked videos as "inspiration" references
- **Refresh results:** "Show me more videos" to get fresh results
- **Category filters:** Let users filter by style (montage, interview, tutorial, etc.)

## Dependencies

- YouTube Data API v3 (requires Google Cloud project + API key)
- No new npm packages needed (YouTube embeds are just iframes)

## Estimated Effort

- YouTube API setup: 1 hour
- Search query AI prompt: 1 hour
- YouTube search API route: 2 hours
- Video discovery UI: 4 hours
- Style analysis AI prompt: 2 hours
- Generated templates review UI: 2 hours
- Integration + testing: 2 hours

**Total: ~14 hours**

## Open Questions

1. Should we store the liked videos for reference later? (e.g., "Videos that inspired this template")
2. Rate limiting concerns with YouTube API - do we need caching?
3. Should this be the ONLY way to add templates, or an optional "discovery" mode alongside manual entry?

