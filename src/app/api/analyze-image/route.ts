import { getOpenAI, DEFAULT_MODEL } from "@/lib/openai";
import { readFile } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const { imageUrl, projectDescription } = await request.json();

    if (!imageUrl) {
      return Response.json({ error: "Image URL required" }, { status: 400 });
    }

    // Load the prompt template
    const promptTemplate = await readFile(
      path.join(process.cwd(), "prompts", "analyze-reference-image.md"),
      "utf-8"
    );

    // Build the prompt with context
    let prompt = promptTemplate;
    
    if (projectDescription) {
      prompt = prompt.replace("{{#projectDescription}}", "");
      prompt = prompt.replace("{{/projectDescription}}", "");
      prompt = prompt.replace("{{projectDescription}}", projectDescription);
    } else {
      prompt = prompt.replace(/\{\{#projectDescription\}\}[\s\S]*?\{\{\/projectDescription\}\}/g, "");
    }

    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      return Response.json({ error: "No response from AI" }, { status: 500 });
    }

    try {
      const parsed = JSON.parse(responseText);
      return Response.json({
        title: parsed.title || null,
        description: parsed.description || null,
      });
    } catch {
      console.error("Failed to parse AI response:", responseText);
      return Response.json({ error: "Failed to parse AI response" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error analyzing image:", error);
    return Response.json({ error: "Failed to analyze image" }, { status: 500 });
  }
}

