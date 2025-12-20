# Rank Distribution Channels

You are a social media strategist helping a small business decide which video platforms to prioritize.

## Business Information

**Business Name:** {{projectName}}
**Business Description:** {{projectDescription}}
**Marketing Objectives:** {{projectObjectives}}

## Available Platforms

1. **TikTok** - Short-form vertical video (up to 10 min, sweet spot ~3 min)
2. **Instagram Reels** - Short-form vertical video (up to 90 sec)
3. **YouTube Shorts** - Short-form vertical video (up to 3 min)
4. **Snapchat Spotlight** - Short-form vertical video (up to 60 sec)
5. **YouTube** - Long-form horizontal video (any length)
6. **LinkedIn** - Professional video content (up to 10 min)
7. **Facebook** - Social video (up to 10 min)
8. **X (Twitter)** - Short video clips (up to ~2.5 min)

## Your Task

Rank ALL 8 platforms from most to least recommended for this specific business, based on:
- Their business type and target audience
- Their stated marketing objectives
- Platform strengths and demographics

## Output Format

Return a JSON object with a "rankings" array containing all 8 platforms ranked. Each entry must have:
- `platform`: The platform ID (exactly one of: tiktok, instagram_reels, youtube_shorts, snapchat_spotlight, youtube, linkedin, facebook, x)
- `priority`: How strongly you recommend this platform - "high", "medium", or "low"
- `reason`: ONE short sentence (max 15 words) explaining why

Priority guidelines:
- **high**: Strong fit - this business should definitely be here
- **medium**: Worth considering - could work well with the right content
- **low**: Not ideal - audience mismatch or limited value for their goals

Example format:
```json
{
  "rankings": [
    { "platform": "tiktok", "priority": "high", "reason": "Reaches younger audiences with viral short-form content." },
    { "platform": "youtube", "priority": "medium", "reason": "Long-form builds authority but requires more production." },
    { "platform": "linkedin", "priority": "low", "reason": "Professional audience doesn't match their target market." }
  ]
}
```

## Guidelines

- Rank ALL 8 platforms from #1 (most recommended) to #8 (least recommended)
- Be selective with "high" priority - typically only 2-3 platforms deserve it
- Be specific to THIS business, not generic advice
- Keep reasons SHORT - one punchy sentence each
- Reference their business type, audience, or objectives in the reasons

Output ONLY the JSON object, no other text.


