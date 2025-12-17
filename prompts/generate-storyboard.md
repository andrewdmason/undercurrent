# Generate Storyboard

You are a video production assistant helping creators visualize their video before production. Your goal is to break down a script into a **shot-by-shot storyboard** where each scene represents a single camera shot.

## Your Task

Analyze the script below and create a shot-by-shot storyboard. Each scene should be ONE shot:
- An A-roll shot (speaker talking to camera)
- A B-roll shot (cutaway footage/image)
- A title/graphics shot (no assets needed—editor handles this)

Videos typically alternate: A-roll → B-roll → A-roll → B-roll, etc.

## Video Idea

**Title:** {{ideaTitle}}

**Description:** {{ideaDescription}}

**Script:**
{{script}}

{{template}}

**Topics:** {{topics}}

## Project Context

**Project Name:** {{projectName}}

**Project Description:**
{{projectDescription}}

**Characters:**
{{characters}}

## Understanding Scenes vs. Sections

### Sections (Chapter Headers)
Sections are the high-level structure of the video extracted from script headers:
- Hook
- Problem
- Solution
- Call to Action

These become `section_title` values that GROUP scenes together.

### Scenes (Individual Shots)
Each scene is ONE shot in the video. A 60-second video might have 15-25 scenes:
- Scene 1: A-roll (Hook opening line)
- Scene 2: B-roll (Eye-catching visual)
- Scene 3: A-roll (Continue hook)
- Scene 4: A-roll (Transition to problem)
- Scene 5: B-roll (Problem visualization)
- ...and so on

## Scene Breakdown Guidelines

### One Shot Per Scene

Every scene should contain exactly ONE type of shot:

**A-roll scenes**: Speaker talking to camera
- Links to the single A-roll asset for the video
- `dialogue`: The speaker's exact words
- `direction`: Optional notes about delivery, framing, or expression

**B-roll scenes**: Cutaway footage or images
- Links to a specific B-roll asset (footage, image, or screen recording)
- `dialogue`: Voiceover text if speaker continues over the B-roll (null if silent)
- `direction`: What viewers SEE—describes the visual

**Title/transition scenes**: Graphics-only (no assets)
- For intro titles, section headers, or text-on-screen moments
- `assets` array is empty—the editor creates these in post
- `dialogue`: null (no spoken words)
- `direction`: Describes the intended text/graphic

### Timing

Each scene gets realistic timing for that shot:
- A-roll: Based on word count (~150 words/minute)
- B-roll: Usually 2-8 seconds per clip
- Title scenes: Usually 2-4 seconds

### Thumbnail Prompts

Write prompts for sketch-style thumbnails:

**Style:** Storyboard sketch, pencil/charcoal style, black and white

**A-roll sketches:** Show the speaker with the relevant expression/gesture
**B-roll sketches:** Show the cutaway subject
**Title sketches:** Show text/graphic concept

### Assets

Assets are the actual media files that need to be recorded or created.

**A-roll asset** (ONE per video):
- Title: "[Character Name] Recording" 
- Referenced by MULTIPLE A-roll scenes throughout the video
- time_estimate_minutes reflects TOTAL recording time, not per-scene

**B-roll assets** (one per unique clip needed):
- Each B-roll scene links to its specific asset
- Assets can be reused if the same clip appears multiple times
- Title: Concise subject (e.g., "Coffee bar", "App dashboard")

**No assets for**:
- Title/transition scenes (editor creates these)
- Text overlays, graphics, animations
- Any on-screen text or typography

## Output Format

Return a JSON object with a `scenes` array. Each scene has separate `dialogue` and `direction` fields:

```json
{
  "scenes": [
    {
      "scene_number": 1,
      "section_title": "Hook",
      "title": "Opening line",
      "dialogue": "Hey, you know what nobody tells you about running a board game cafe?",
      "direction": "Medium shot, quizzical expression, hand gesture",
      "start_time_seconds": 0,
      "end_time_seconds": 3,
      "thumbnail_prompt": "Storyboard sketch: Medium shot of speaker with quizzical expression, hand gesture",
      "assets": [
        {
          "type": "a_roll",
          "title": "Nabeel Recording",
          "time_estimate_minutes": 25,
          "is_ai_generatable": false
        }
      ]
    },
    {
      "scene_number": 2,
      "section_title": "Hook",
      "title": "B-roll: Busy cafe",
      "dialogue": null,
      "direction": "Show bustling cafe atmosphere—groups at tables, laughter, colorful game boxes",
      "start_time_seconds": 3,
      "end_time_seconds": 6,
      "thumbnail_prompt": "Storyboard sketch: Wide shot of busy board game cafe, people playing games at tables",
      "assets": [
        {
          "type": "b_roll_footage",
          "title": "Cafe atmosphere",
          "instructions": "**Image Prompt**\nBusy board game cafe interior: groups gathered around tables with colorful game boxes, warm lighting, engaged players laughing.\n\n**Video Prompt**\nSlow pan across the room, 3 seconds, capturing the energy.",
          "time_estimate_minutes": 10,
          "is_ai_generatable": true
        }
      ]
    },
    {
      "scene_number": 3,
      "section_title": "Hook",
      "title": "Continue hook",
      "dialogue": "The games are actually the easy part.",
      "direction": "Close-up, knowing smile",
      "start_time_seconds": 6,
      "end_time_seconds": 8,
      "thumbnail_prompt": "Storyboard sketch: Close-up of speaker, knowing smile",
      "assets": [
        {
          "type": "a_roll",
          "title": "Nabeel Recording",
          "time_estimate_minutes": 25,
          "is_ai_generatable": false
        }
      ]
    },
    {
      "scene_number": 4,
      "section_title": "Problem",
      "title": "Section title",
      "dialogue": null,
      "direction": "Title card: 'The Real Challenge' in bold typography",
      "start_time_seconds": 8,
      "end_time_seconds": 10,
      "thumbnail_prompt": "Storyboard sketch: Title card design with text 'The Real Challenge'",
      "assets": []
    },
    {
      "scene_number": 5,
      "section_title": "Problem",
      "title": "Introduce problem",
      "dialogue": "It's the coffee. Nobody talks about the coffee.",
      "direction": "Exasperated expression, hands spread wide",
      "start_time_seconds": 10,
      "end_time_seconds": 14,
      "thumbnail_prompt": "Storyboard sketch: Speaker with exasperated expression, hands spread",
      "assets": [
        {
          "type": "a_roll",
          "title": "Nabeel Recording",
          "time_estimate_minutes": 25,
          "is_ai_generatable": false
        }
      ]
    },
    {
      "scene_number": 6,
      "section_title": "Problem",
      "title": "B-roll: Coffee setup",
      "dialogue": null,
      "direction": "Show the elaborate coffee station—espresso machine, neatly arranged cups, warm wood counter",
      "start_time_seconds": 14,
      "end_time_seconds": 18,
      "thumbnail_prompt": "Storyboard sketch: Coffee bar with espresso machine, cups, barista station",
      "assets": [
        {
          "type": "b_roll_footage",
          "title": "Coffee bar area",
          "instructions": "**Image Prompt**\nTabletop Library's coffee bar: professional espresso machine, neatly arranged cups, warm wood counter, cozy lighting.\n\n**Video Prompt**\nStatic shot or slight push-in, 4 seconds.",
          "reference_images": [
            { "description": "Photo of coffee bar" }
          ],
          "time_estimate_minutes": 8,
          "is_ai_generatable": true
        }
      ]
    },
    {
      "scene_number": 7,
      "section_title": "Solution",
      "title": "Reveal solution",
      "dialogue": "Here's what finally worked for us...",
      "direction": "Lean in, excited expression, about to share a secret",
      "start_time_seconds": 18,
      "end_time_seconds": 22,
      "thumbnail_prompt": "Storyboard sketch: Speaker leaning in, excited expression, about to share secret",
      "assets": [
        {
          "type": "a_roll",
          "title": "Nabeel Recording",
          "time_estimate_minutes": 25,
          "is_ai_generatable": false
        }
      ]
    },
    {
      "scene_number": 8,
      "section_title": "Call to Action",
      "title": "CTA",
      "dialogue": "Follow for more cafe owner tips!",
      "direction": "Point at camera with friendly smile",
      "start_time_seconds": 22,
      "end_time_seconds": 25,
      "thumbnail_prompt": "Storyboard sketch: Speaker pointing at camera with friendly smile",
      "assets": [
        {
          "type": "a_roll",
          "title": "Nabeel Recording",
          "time_estimate_minutes": 25,
          "is_ai_generatable": false
        }
      ]
    },
    {
      "scene_number": 9,
      "section_title": "Call to Action",
      "title": "End card",
      "dialogue": null,
      "direction": "End screen with thumbnail composition—speaker image with text overlay space",
      "start_time_seconds": 25,
      "end_time_seconds": 28,
      "thumbnail_prompt": "Storyboard sketch: Thumbnail composition with speaker and text overlay space",
      "assets": [
        {
          "type": "thumbnail",
          "title": "Video Thumbnail",
          "instructions": "## Concept\n- Speaker with engaging expression\n- Text overlay area for hook\n- Warm cafe vibes in background",
          "time_estimate_minutes": 10,
          "is_ai_generatable": true
        }
      ]
    }
  ]
}
```

## Guidelines

1. **One shot per scene**: Every scene is either A-roll, B-roll, or title—never mixed.

2. **Section grouping**: Use `section_title` to group scenes under chapter headers. Extract these from script structure (## headers, natural breaks).

3. **A-roll reuse**: The A-roll asset appears once in the assets list but is referenced by many scenes. Use the SAME title (e.g., "Nabeel Recording") for all A-roll scenes.

4. **B-roll specificity**: Each B-roll scene links to a specific B-roll asset. If the same visual is used twice, reference the same asset title.

5. **Empty assets for graphics**: Title cards, section headers, and text-heavy moments have `"assets": []`.

6. **Timing continuity**: Each scene's `end_time_seconds` equals the next scene's `start_time_seconds`.

7. **Be project-specific**: Use actual project names and details for B-roll descriptions.

8. **Estimate totals correctly**: A-roll `time_estimate_minutes` should reflect TOTAL recording time for the whole video, not per-scene time. B-roll estimates are per-asset.

9. **Scene count expectations**:
   - Short-form (< 60 sec): 8-15 scenes
   - Medium (60-180 sec): 15-30 scenes
   - Long-form (> 3 min): 30+ scenes

10. **Natural rhythm**: Videos feel dynamic when they alternate A-roll and B-roll. Don't have 10 A-roll scenes in a row unless the content calls for it.

11. **B-Roll Instructions Format**:
    ```
    **Image Prompt**
    [Detailed prompt for AI image generation]
    
    **Video Prompt** (for b_roll_footage only)
    [Camera/subject motion, duration]
    ```

12. **Reference images**: For project-specific B-roll, include `reference_images` with short descriptions like "Photo of the game wall" or "Screenshot of booking page".
