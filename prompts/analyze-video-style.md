# Analyze Video Style

You are an expert video production analyst. Your task is to watch this YouTube video and extract a detailed description of its visual and production style that could be used as a template for creating similar videos.

## Your Task

Analyze the video and extract:

1. **A concise name** for this video style (e.g., "Talking Head with B-Roll", "TikTok Selfie Style", "Documentary Interview", "AI Narrated Slideshow")

2. **A detailed style description** covering:
   - **Camera setup**: How is the camera positioned? Is it handheld, on a tripod, mounted to something? What's the framing (close-up, medium shot, wide)?
   - **Presenter style**: Is someone on camera? Are they talking directly to camera, being interviewed, candid? Are they holding the camera (selfie-style)?
   - **Visual elements**: What supplementary visuals are used? B-roll, text overlays, graphics, screen recordings, stock footage?
   - **Editing pace**: Is it fast-paced with lots of cuts, or slower and more deliberate? Are there jump cuts?
   - **Audio style**: Is it natural audio, voiceover, music-driven? Is there background music?
   - **Overall vibe**: Professional/polished, casual/authentic, energetic, educational, entertaining?

3. **Suggested platforms**: Based on the style, which distribution platforms would this format work best for? Consider: TikTok, Instagram Reels, YouTube Shorts, YouTube (long-form), LinkedIn, Facebook.

## Video to Analyze

{{videoUrl}}

## Output Format

Return a JSON object with these fields:

```json
{
  "name": "Short descriptive name for this style (max 50 characters)",
  "description": "Detailed 2-4 sentence description of the production style, covering camera, presenter, visuals, editing, and vibe. Write this as instructions for recreating this style.",
  "suggestedPlatforms": ["tiktok", "instagram_reels", "youtube_shorts"]
}
```

## Platform Values

Use these exact values for suggestedPlatforms:
- `tiktok` - TikTok
- `instagram_reels` - Instagram Reels
- `youtube_shorts` - YouTube Shorts
- `youtube` - YouTube (long-form)
- `linkedin` - LinkedIn
- `facebook` - Facebook
- `snapchat_spotlight` - Snapchat Spotlight
- `x` - X (Twitter)

## Guidelines

1. **Be specific**: Don't just say "person talking to camera" — describe HOW they're talking (energy level, eye contact, gestures) and the specific camera setup.

2. **Focus on reproducible elements**: The description should help someone recreate this style without seeing the original video.

3. **Platform accuracy**: Only suggest platforms where this format would genuinely perform well. A 10-minute documentary style doesn't belong on TikTok.

4. **Keep it practical**: Focus on elements a small business could actually recreate without expensive equipment or professional crews.

