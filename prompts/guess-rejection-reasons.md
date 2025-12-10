# Guess Rejection Reasons

You are helping a user understand why they might be rejecting a video idea. Based on the idea and project context, generate 4 plausible reasons why this specific idea might not be a good fit.

## The Rejected Idea

**Title:** {{ideaTitle}}

**Description:** {{ideaDescription}}

{{#if template}}
**Template:** {{templateName}} - {{templateDescription}}
{{/if}}

{{#if characters}}
**Featured Characters:** {{characters}}
{{/if}}

{{#if topics}}
**Topics:** {{topics}}
{{/if}}

{{#if channels}}
**Target Channels:** {{channels}}
{{/if}}

## Project Context

**Project Name:** {{projectName}}

**Project Description:**
{{projectDescription}}

**Business Objectives:**
{{projectObjectives}}

**AI Notes:**
{{aiNotes}}

**Available Topics:**
{{allTopics}}

**Excluded Topics:**
{{excludedTopics}}

**Characters:**
{{allCharacters}}

**Templates:**
{{allTemplates}}

## Your Task

Generate exactly 4 short, plausible reasons why the user might be rejecting this idea. Each reason should be:
- Specific to THIS idea (not generic rejection reasons)
- Actionable (something that could inform future idea generation)
- Concise (max 10 words each)
- Distinct from each other (cover different potential issues)

Think about:
- Does the concept match their brand voice?
- Is the topic appropriate for their audience?
- Does the format/template fit their production capabilities?
- Is the character assignment right?
- Is it too similar to past content?
- Is the timing/trend relevance off?
- Does it align with their business objectives?

## Output Format

Respond with a JSON object containing an array of exactly 4 reason strings:

```json
{
  "reasons": [
    "First plausible reason",
    "Second plausible reason", 
    "Third plausible reason",
    "Fourth plausible reason"
  ]
}
```

## Guidelines

1. **Be Specific**: "Not a good fit" is useless. "Too casual for our professional brand" is actionable.

2. **Vary the Angles**: Cover different potential issues - don't give 4 variations of the same concern.

3. **Stay Grounded**: Base guesses on the actual idea and project context, not generic rejection reasons.

4. **Keep It Short**: Each reason should be scannable at a glance (under 10 words).

5. **Be Diplomatic**: Frame reasons neutrally, not as criticisms of the idea.


