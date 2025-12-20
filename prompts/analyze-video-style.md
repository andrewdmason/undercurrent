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

3. **Suggested platforms**: Based on the style, which distribution platforms would this format work best for?

4. **Production requirements**: What would someone need to recreate this video style? Consider the presenter type, camera comfort level needed, script delivery style, filming locations, equipment, and movement involved.

## Video to Analyze

{{videoUrl}}

## Output Format

Return a JSON object with these fields:

```json
{
  "name": "Short descriptive name for this style (max 50 characters)",
  "description": "Detailed 2-4 sentence description of the production style, covering camera, presenter, visuals, editing, and vibe. Write this as instructions for recreating this style.",
  "suggestedPlatforms": ["tiktok", "instagram_reels"],
  "productionRequirements": {
    "presenterType": "on_camera",
    "cameraComfort": "comfortable",
    "scriptStyles": ["bullet_points"],
    "locations": ["home", "workplace"],
    "equipment": ["smartphone", "webcam"],
    "movement": ["seated"]
  }
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

## Production Requirements Values

### presenterType (required)
- `on_camera` - Someone appears on camera speaking or performing
- `voiceover_only` - Audio narration over visuals, no one on camera
- `none` - Pure B-roll, music video, or text-only content

### cameraComfort (required, or null)
Minimum comfort level needed to recreate this style:
- `new` - Simple, forgiving format (e.g., quick selfie clip, basic talking head)
- `comfortable` - Requires some confidence (e.g., longer takes, multiple camera angles)
- `natural` - Demands high confidence (e.g., interviews, walk-and-talk, live events)
- `null` - Not applicable (for voiceover_only or none presenter types)

### scriptStyles (array, can be empty)
What delivery styles work for this format:
- `word_for_word` - Scripted, teleprompter-friendly
- `bullet_points` - Key points to riff on naturally
- `improviser` - Conversational, unscripted feel

Empty array means any style works.

### locations (array, can be empty)
Where this type of video is typically filmed:
- `home` - Home office or living space
- `workplace` - Office, store, workshop, etc.
- `on_location` - Outdoors, customer sites, events
- `studio` - Dedicated studio setup

Empty array means any location works.

### equipment (array, can be empty)
Minimum equipment level to achieve this look:
- `smartphone` - Phone camera, natural lighting
- `webcam` - Laptop/desktop camera
- `dedicated_camera` - DSLR, mirrorless, or camcorder
- `full_production` - Pro camera, lighting, external audio

Empty array means any equipment works.

### movement (array, can be empty)
What movement capabilities are needed:
- `seated` - Seated or standing stationary
- `walk_and_talk` - Moving while speaking
- `action_shots` - Demonstrations, physical activities
- `on_the_go` - Varied environments, mobile filming

Empty array means any movement style works.

## Guidelines

1. **Be specific**: Don't just say "person talking to camera" — describe HOW they're talking (energy level, eye contact, gestures) and the specific camera setup.

2. **Focus on reproducible elements**: The description should help someone recreate this style without seeing the original video.

3. **Platform accuracy**: Only suggest platforms where this format would genuinely perform well. A 10-minute documentary style doesn't belong on TikTok.

4. **Keep it practical**: Focus on elements a small business could actually recreate without expensive equipment or professional crews.

5. **Be realistic about requirements**: If a video clearly uses professional lighting and multiple cameras, set equipment to `dedicated_camera` or `full_production`. If it's shot on a phone selfie-style, `smartphone` is appropriate.
