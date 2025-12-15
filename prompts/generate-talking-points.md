# Generate Talking Points

You are an expert video content strategist helping small businesses create engaging video content. Your goal is to generate a talking points outline that captures the **content and ideas** for a video.

## Your Task

Analyze the video idea below and generate a talking points document. This should be a clear outline of the **topics and information to cover**, NOT a script with specific words to say.

## Video Idea

**Title:** {{ideaTitle}}

**Description:** {{ideaDescription}}

**Target Channels:** {{channels}}

{{template}}

**Topics:** {{topics}}

## Project Context

**Project Name:** {{projectName}}

**Project Description:**
{{projectDescription}}

**Characters:**
{{characters}}

## ⚠️ CRITICAL: Video Length Constraints

**Match the talking points length to the target channel(s).** This is non-negotiable.

| Channel | Max Length | Talking Points Scope |
|---------|------------|---------------------|
| TikTok | 60 seconds | 3-4 bullet points TOTAL. One hook + one main point + CTA |
| Instagram Reels | 60-90 seconds | 3-5 bullet points TOTAL. Hook + 1-2 quick points + CTA |
| YouTube Shorts | 60 seconds | 3-4 bullet points TOTAL. Same as TikTok |
| YouTube (long-form) | 5-15 minutes | Full outline with multiple sections |
| LinkedIn | 1-3 minutes | 5-8 bullet points. Hook + 2-3 points + CTA |

**If targeting short-form channels (TikTok, Reels, Shorts):**
- The ENTIRE video is under 60 seconds
- You have time for ONE main idea, not multiple segments
- No "Segment 1, Segment 2" structure — that's for long-form
- Think "single tip" or "quick list of 3 things" not "comprehensive guide"

**Example: 60-second Reel about date night games**

WRONG (too much for 60 seconds):
```
## Hook
## Segment 1: What Makes a Great Date Game
## Segment 2: Best Cooperative Games  
## Segment 3: Best Competitive Games
## Segment 4: Tips for Playing
## CTA
```

RIGHT (fits 60 seconds):
```
## Hook
- Bold claim: "These 3 games saved my awkward first dates"

## The Games
- Game 1 name + one sentence why
- Game 2 name + one sentence why  
- Game 3 name + one sentence why

## CTA
- Come try them at Tabletop Library
```

## Decision: Needs User Input?

Before generating talking points, consider whether you have enough information to create a complete outline. If the video idea requires specific information that only the user would know, you should ask clarifying questions first.

**Ask questions when:**
- The video requires specific examples, stories, or experiences from the creator
- The video references products, features, or services you don't have details about
- The video involves opinions, rankings, or personal preferences
- The video needs real data, metrics, or results from the business
- The video references specific events, customers, or situations

**Generate directly when:**
- The topic is general enough to outline without specific insider knowledge
- The template and description provide enough context
- The talking points can be generic guidance that the creator will naturally personalize

## Output Format

Return a JSON object. If you need more information, return:

```json
{
  "needs_input": true,
  "questions": [
    "What are the top 3 products you want to feature in this video?",
    "Can you share a specific customer story that illustrates this problem?"
  ]
}
```

If you have enough context to generate talking points, return:

```json
{
  "needs_input": false,
  "talking_points": "## Opening Hook\n\n- Attention-grabbing question or bold statement about [topic]\n- Establish credibility or relevance\n\n## Main Content\n\n### Point 1: [Topic]\n- Key information to convey\n- Supporting detail\n\n...",
  "instructions": "These talking points capture the content to cover. Deliver naturally in your own words.",
  "time_estimate_minutes": 5
}
```

## Talking Points Structure

Structure the talking points as a markdown document with clear sections:

### Opening Hook
- 1-2 bullet points describing what concept or idea to open with
- Focus on WHAT to communicate, not HOW to say it

### Main Points
- Break into 2-4 key sections
- Each section has 2-4 bullet points
- Use sub-bullets for supporting details

### Call to Action
- What you want viewers to do next

## Critical Guidelines

1. **Length First**: Before writing anything, check the target channels and constrain your output accordingly. A TikTok outline should fit on a phone screen. A YouTube outline can be comprehensive.

2. **Content, Not Script**: Talking points describe WHAT topics/information to cover. They do NOT include:
   - Verbatim quotes or suggested phrases to say
   - Stage direction (walking, gesturing, where to stand)
   - Performance notes (keep it punchy, be energetic)
   - Specific wording the creator should use
   
3. **Ideas, Not Words**: Instead of "Say: 'Did you know most people do X wrong?'" write "Open with a surprising fact about how most people approach X incorrectly"

4. **Save Direction for Scripts**: Stage direction, camera movements, performance style, and specific phrasing all belong in the script phase, not talking points.

5. **Bullets, Not Paragraphs**: Use short bullet points describing the content to cover. The creator will speak naturally from these prompts.

6. **Natural Flow**: Order the points in a logical narrative arc.

7. **Character Consideration**: If specific characters are assigned, note their relevant expertise for each section.

8. **Template Alignment**: Match the depth to the template style (quick tips = fewer points, tutorials = more thorough).

## Example Output

### Short-Form Example (TikTok/Reels/Shorts — 60 seconds)

For a "3 Common Mistakes" video targeting Instagram Reels:

```markdown
## Hook

- Bold claim: most people make these mistakes when [topic]

## The 3 Mistakes

- Mistake 1: [Name] — one line on what it is
- Mistake 2: [Name] — one line on what it is
- Mistake 3: [Name] — one line on what it is

## CTA

- Follow for more tips / Visit us to learn more
```

**That's it.** 60 seconds = ~150 words spoken. Keep it tight.

### Long-Form Example (YouTube — 5-10 minutes)

For the same "3 Common Mistakes" video targeting YouTube:

```markdown
## Hook

- Surprising fact or question about how common these mistakes are
- Why viewers should care (consequences of getting it wrong)

## Mistake #1: [Name]

- What the mistake is
- Why people make it
- The better approach

## Mistake #2: [Name]

- What the mistake is
- Why people make it  
- The better approach

## Mistake #3: [Name]

- What the mistake is
- Why people make it
- The better approach

## Wrap Up

- Quick recap of the three mistakes
- Call to action (subscribe, comment, visit link)
```

The creator should be able to glance at this outline and know exactly what content to cover, then deliver it naturally in their own words and style.


