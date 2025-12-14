import { createClient } from "@/lib/supabase/server";
import { openai, DEFAULT_MODEL } from "@/lib/openai";
import { genai, TEXT_MODEL } from "@/lib/gemini";
import { Type } from "@google/genai";
import { readFile } from "fs/promises";
import path from "path";
import { ChatModel, ToolCall } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { generateThumbnail } from "@/lib/actions/thumbnail";
import { generateScript } from "@/lib/actions/ideas";
import { completeScriptFinalization, refreshAssetTodos } from "@/lib/actions/idea-todos";
import { after } from "next/server";

// Tool definitions for the agent
const tools = [
  {
    type: "function" as const,
    function: {
      name: "update_script",
      description: "Update the video script with a new version. Call this when the user asks to change, edit, or improve the script.",
      parameters: {
        type: "object",
        properties: {
          script: {
            type: "string",
            description: "The complete updated script in markdown format",
          },
        },
        required: ["script"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_script",
      description: "Generate a complete script based on gathered information. Call this when you have collected enough information from the user to write the script, or when the user says to just use your best judgment.",
      parameters: {
        type: "object",
        properties: {
          context_summary: {
            type: "string",
            description: "A summary of the key decisions and information gathered from the user (e.g., 'Featured games: Catan, Wingspan, Ticket to Ride. Each chosen because...'). This will be saved for future reference.",
          },
        },
        required: ["context_summary"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "regenerate_idea",
      description: "Completely regenerate the video idea with a new title, description, and thumbnail. Only call this when the user explicitly asks to start over, change the concept entirely, or regenerate the idea.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The new title for the video idea",
          },
          description: {
            type: "string",
            description: "The new description for the video idea",
          },
        },
        required: ["title", "description"],
      },
    },
  },
];

// Gemini tool format - using Type enum from Google SDK
const geminiTools = [
  {
    functionDeclarations: tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: {
        type: Type.OBJECT,
        properties: Object.fromEntries(
          Object.entries(t.function.parameters.properties).map(([key, val]) => [
            key,
            { type: Type.STRING, description: (val as { description: string }).description },
          ])
        ),
        required: t.function.parameters.required,
      },
    })),
  },
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  const { ideaId } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse request body
  const { chatId, message, model, isInit, scriptQuestions } = (await request.json()) as {
    chatId: string;
    message: string;
    model: ChatModel;
    isInit?: boolean;
    scriptQuestions?: string[];
  };

  if (!chatId || (!message && !isInit)) {
    return new Response("Missing chatId or message", { status: 400 });
  }

  // Fetch the idea with project context
  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select(`
      id,
      title,
      description,
      script,
      project_id,
      idea_channels (
        channel_id,
        project_channels (
          platform,
          custom_label
        )
      )
    `)
    .eq("id", ideaId)
    .single();

  if (ideaError || !idea) {
    return new Response("Idea not found", { status: 404 });
  }

  // Verify user has access to this project
  const { data: membership } = await supabase
    .from("project_users")
    .select("id")
    .eq("project_id", idea.project_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return new Response("Access denied", { status: 403 });
  }

  // Fetch project context
  const { data: project } = await supabase
    .from("projects")
    .select("name, slug, description")
    .eq("id", idea.project_id)
    .single();

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  // Fetch characters
  const { data: characters } = await supabase
    .from("project_characters")
    .select("name, description")
    .eq("project_id", idea.project_id);

  // Fetch existing chat messages
  const { data: existingMessages } = await supabase
    .from("idea_chat_messages")
    .select("role, content, tool_calls, tool_call_id")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  // Build system prompt
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "chat-agent.md"),
    "utf-8"
  );

  // Format characters
  const charactersSection =
    characters && characters.length > 0
      ? characters
          .map((c) => `- **${c.name}**: ${c.description || "No description"}`)
          .join("\n")
      : "No character profiles configured.";

  // Format channels
  const channelsSection =
    idea.idea_channels && idea.idea_channels.length > 0
      ? (idea.idea_channels as unknown as Array<{
          channel_id: string;
          project_channels: {
            platform: string;
            custom_label: string | null;
          } | null;
        }>)
          .map((ic) => {
            const channel = ic.project_channels;
            if (!channel) return null;
            return channel.custom_label || channel.platform;
          })
          .filter(Boolean)
          .join(", ")
      : "No specific channels";

  let systemPrompt = promptTemplate
    .replace(/\{\{projectName\}\}/g, project.name || "Unnamed Project")
    .replace("{{ideaTitle}}", idea.title || "Untitled")
    .replace("{{ideaDescription}}", idea.description || "No description")
    .replace("{{channels}}", channelsSection)
    .replace("{{projectDescription}}", project.description || "No description provided.")
    .replace("{{characters}}", charactersSection)
    .replace("{{currentScript}}", idea.script || "*No script generated yet*");

  // Add script finalization questions to context (for Q&A flow)
  if (scriptQuestions && scriptQuestions.length > 0) {
    systemPrompt += `

## Script Finalization Questions

Before generating the script, you need to gather specific information from the user. Here are the questions to ask:

${scriptQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

**Important Q&A Guidelines:**
- Ask these questions ONE AT A TIME
- Wait for the user to answer before asking the next question
- Keep track of which questions have been answered in the conversation
- Once all questions have been answered (or the user says to just proceed), call \`generate_script\` with a summary of their answers
- If the user says "just pick" or "use your best judgment", make reasonable choices and proceed with \`generate_script\`
`;
  }

  // For initial welcome message, add special instructions
  if (isInit) {
    let initInstructions = `

## Welcome Message Instructions

This is the user's first visit to this idea. Generate a brief, friendly welcome message to help them get started. DO NOT call any tools for this message.

Guidelines for your welcome message:
- Be concise (2-3 sentences max)
- Don't repeat the video title - they can already see it
- Focus on what YOU need from THEM to help create a great script
`;
    
    if (scriptQuestions && scriptQuestions.length > 0) {
      initInstructions += `
Since you have questions to ask, start with the FIRST question from the list above.`;
    } else if (!idea.script) {
      initInstructions += `
No script has been generated yet. Let them know you can help create one when they're ready.`;
    } else {
      initInstructions += `
A script already exists. Offer to help them refine it, change the hook, adjust the CTA, or anything else.`;
    }
    
    systemPrompt += initInstructions;
  }

  // Build messages array for API
  const apiMessages: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: ToolCall[] }> = [
    { role: "system", content: systemPrompt },
  ];

  // Add existing messages
  for (const msg of existingMessages || []) {
    if (msg.role === "tool") {
      apiMessages.push({
        role: "tool",
        content: msg.content,
        tool_call_id: msg.tool_call_id || undefined,
      });
    } else if (msg.role === "assistant" && msg.tool_calls) {
      apiMessages.push({
        role: "assistant",
        content: msg.content,
        tool_calls: msg.tool_calls as ToolCall[],
      });
    } else {
      apiMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Add new user message (or init trigger)
  if (isInit) {
    // For init, we use a hidden trigger message that won't be saved
    apiMessages.push({ role: "user", content: "[SYSTEM: Generate welcome message]" });
  } else {
    apiMessages.push({ role: "user", content: message });
    
    // Save user message to database
    const estimatedUserTokens = Math.ceil(message.length / 4);
    await supabase.from("idea_chat_messages").insert({
      chat_id: chatId,
      role: "user",
      content: message,
      token_count: estimatedUserTokens,
    });
  }

  // Create streaming response
  const encoder = new TextEncoder();

  // Track generation log IDs created during tool execution (keyed by tool call ID)
  const generationLogIdMap: Record<string, string> = {};

  // Helper to handle tool execution
  const executeToolCall = async (toolCall: ToolCall): Promise<string> => {
    const args = JSON.parse(toolCall.function.arguments);

    if (toolCall.function.name === "update_script") {
      const { script } = args;
      const { error } = await supabase
        .from("ideas")
        .update({ script })
        .eq("id", ideaId);

      if (error) {
        // Log the failed update
        const { data: logData } = await supabase.from("generation_logs").insert({
          project_id: idea.project_id,
          type: "script_update",
          prompt_sent: `Update script for idea: ${idea.title}`,
          response_raw: script,
          model: "chat-tool",
          error: error.message,
          idea_id: ideaId,
        }).select("id").single();
        
        if (logData?.id) {
          generationLogIdMap[toolCall.id] = logData.id;
        }

        return JSON.stringify({ success: false, error: error.message });
      }

      // Log the successful update
      const { data: logData } = await supabase.from("generation_logs").insert({
        project_id: idea.project_id,
        type: "script_update",
        prompt_sent: `Update script for idea: ${idea.title}`,
        response_raw: script,
        model: "chat-tool",
        idea_id: ideaId,
      }).select("id").single();
      
      if (logData?.id) {
        generationLogIdMap[toolCall.id] = logData.id;
      }

      revalidatePath(`/${project.slug}/ideas/${ideaId}`);
      return JSON.stringify({ success: true, message: "Script updated successfully" });
    }

    if (toolCall.function.name === "generate_script") {
      const { context_summary } = args;
      
      // Generate the script with the conversation context
      const result = await generateScript(ideaId, context_summary);
      
      // Track the generation log ID for linking
      if (result.generationLogId) {
        generationLogIdMap[toolCall.id] = result.generationLogId;
      }

      if (result.error) {
        return JSON.stringify({ success: false, error: result.error });
      }

      // Save context to idea
      const { error: contextError } = await supabase
        .from("ideas")
        .update({ script_context: context_summary })
        .eq("id", ideaId);

      if (contextError) {
        console.error("Failed to save script context:", contextError);
      }

      // Mark script_finalization todo complete with context as outcome
      await completeScriptFinalization(ideaId, context_summary);

      // Refresh asset todos in background
      if (result.script) {
        after(async () => {
          try {
            await refreshAssetTodos(ideaId, result.script!);
          } catch (err) {
            console.error("Failed to refresh asset todos:", err);
          }
        });
      }

      revalidatePath(`/${project.slug}/ideas/${ideaId}`);
      return JSON.stringify({ 
        success: true, 
        message: "Script generated successfully",
        script: result.script 
      });
    }

    if (toolCall.function.name === "regenerate_idea") {
      const { title, description } = args;
      const { error } = await supabase
        .from("ideas")
        .update({ title, description, script: null })
        .eq("id", ideaId);

      if (error) {
        return JSON.stringify({ success: false, error: error.message });
      }

      // Generate new thumbnail in background
      after(async () => {
        try {
          await generateThumbnail(ideaId, idea.project_id);
        } catch (err) {
          console.error("Failed to regenerate thumbnail:", err);
        }
      });

      revalidatePath(`/${project.slug}/ideas/${ideaId}`);
      return JSON.stringify({ success: true, message: "Idea regenerated. New thumbnail is being generated." });
    }

    return JSON.stringify({ success: false, error: "Unknown tool" });
  };

  if (model === "gpt-5.1") {
    // OpenAI streaming
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        const toolCallsToExecute: ToolCall[] = [];
        let inputTokens = 0;
        let outputTokens = 0;

        try {
          const completion = await openai.chat.completions.create({
            model: DEFAULT_MODEL,
            messages: apiMessages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
            tools,
            stream: true,
          });

          let currentToolCall: Partial<ToolCall> | null = null;
          let toolCallArgs = "";

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta;

            // Handle usage info if present
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens;
              outputTokens = chunk.usage.completion_tokens;
            }

            // Handle text content
            if (delta?.content) {
              fullResponse += delta.content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", content: delta.content })}\n\n`)
              );
            }

            // Handle tool calls
            if (delta?.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                if (toolCallDelta.id) {
                  // New tool call starting
                  if (currentToolCall && currentToolCall.id) {
                    toolCallsToExecute.push({
                      ...currentToolCall,
                      function: {
                        name: currentToolCall.function?.name || "",
                        arguments: toolCallArgs,
                      },
                    } as ToolCall);
                  }
                  currentToolCall = {
                    id: toolCallDelta.id,
                    type: "function",
                    function: {
                      name: toolCallDelta.function?.name || "",
                      arguments: "",
                    },
                  };
                  toolCallArgs = "";
                }
                if (toolCallDelta.function?.name && currentToolCall) {
                  currentToolCall.function = {
                    name: toolCallDelta.function.name,
                    arguments: "",
                  };
                }
                if (toolCallDelta.function?.arguments) {
                  toolCallArgs += toolCallDelta.function.arguments;
                }
              }
            }

            // Handle finish reason
            if (chunk.choices[0]?.finish_reason === "tool_calls") {
              // Finalize last tool call
              if (currentToolCall && currentToolCall.id) {
                toolCallsToExecute.push({
                  ...currentToolCall,
                  function: {
                    name: currentToolCall.function?.name || "",
                    arguments: toolCallArgs,
                  },
                } as ToolCall);
              }
            }
          }

          // Execute tool calls if any
          if (toolCallsToExecute.length > 0) {
            // Save assistant message with tool calls
            await supabase.from("idea_chat_messages").insert({
              chat_id: chatId,
              role: "assistant",
              content: fullResponse || "",
              tool_calls: toolCallsToExecute,
              token_count: outputTokens || Math.ceil(fullResponse.length / 4),
            });

            // Execute each tool call
            for (const toolCall of toolCallsToExecute) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: "tool_call", 
                    name: toolCall.function.name,
                    arguments: JSON.parse(toolCall.function.arguments)
                  })}\n\n`
                )
              );

              const result = await executeToolCall(toolCall);

              // Save tool result
              await supabase.from("idea_chat_messages").insert({
                chat_id: chatId,
                role: "tool",
                content: result,
                tool_call_id: toolCall.id,
                token_count: Math.ceil(result.length / 4),
              });

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "tool_result", name: toolCall.function.name, result: JSON.parse(result) })}\n\n`
                )
              );
            }
          } else if (fullResponse) {
            // Save regular assistant message
            await supabase.from("idea_chat_messages").insert({
              chat_id: chatId,
              role: "assistant",
              content: fullResponse,
              token_count: outputTokens || Math.ceil(fullResponse.length / 4),
            });
          }

          // Log the chat interaction
          await supabase.from("chat_logs").insert({
            chat_id: chatId,
            project_id: idea.project_id,
            model: DEFAULT_MODEL,
            messages_sent: apiMessages,
            response_raw: fullResponse,
            tool_calls_made: toolCallsToExecute.length > 0 ? toolCallsToExecute : null,
            generation_log_ids: Object.keys(generationLogIdMap).length > 0 ? generationLogIdMap : null,
            input_tokens: inputTokens || null,
            output_tokens: outputTokens || null,
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error("OpenAI streaming error:", error);

          // Log the error
          await supabase.from("chat_logs").insert({
            chat_id: chatId,
            project_id: idea.project_id,
            model: DEFAULT_MODEL,
            messages_sent: apiMessages,
            generation_log_ids: Object.keys(generationLogIdMap).length > 0 ? generationLogIdMap : null,
            error: errorMessage,
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`)
          );
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } else {
    // Gemini streaming
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";

        try {
          // Convert messages for Gemini format
          // Gemini expects: user, model, and function responses with functionResponse parts
          const geminiContents = apiMessages.slice(1).map((msg) => {
            if (msg.role === "assistant") {
              // Assistant messages become "model" role
              // If it has tool_calls, we need to include functionCall parts
              if (msg.tool_calls && msg.tool_calls.length > 0) {
                return {
                  role: "model" as const,
                  parts: [
                    ...(msg.content ? [{ text: msg.content }] : []),
                    ...msg.tool_calls.map((tc) => ({
                      functionCall: {
                        name: tc.function.name,
                        args: JSON.parse(tc.function.arguments),
                      },
                    })),
                  ],
                };
              }
              return {
                role: "model" as const,
                parts: [{ text: msg.content }],
              };
            } else if (msg.role === "tool") {
              // Tool responses need functionResponse format
              // Parse the content which contains the JSON result
              let responseData = {};
              try {
                responseData = JSON.parse(msg.content);
              } catch {
                responseData = { result: msg.content };
              }
              
              // Find the corresponding tool call to get the function name
              // Look backwards through messages for the assistant message with tool_calls
              const prevAssistant = apiMessages.slice(1).find(
                (m) => m.role === "assistant" && 
                  m.tool_calls?.some((tc) => tc.id === msg.tool_call_id)
              );
              const toolCall = prevAssistant?.tool_calls?.find(
                (tc) => tc.id === msg.tool_call_id
              );
              
              return {
                role: "user" as const,
                parts: [{
                  functionResponse: {
                    name: toolCall?.function.name || "unknown",
                    response: responseData,
                  },
                }],
              };
            } else {
              // User messages stay as "user"
              return {
                role: "user" as const,
                parts: [{ text: msg.content }],
              };
            }
          });

          const response = await genai.models.generateContentStream({
            model: TEXT_MODEL,
            contents: geminiContents,
            config: {
              systemInstruction: systemPrompt,
              tools: geminiTools,
            },
          });

          const toolCallsToExecute: ToolCall[] = [];

          for await (const chunk of response) {
            const text = chunk.text;
            if (text) {
              fullResponse += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", content: text })}\n\n`)
              );
            }

            // Handle function calls from Gemini
            if (chunk.functionCalls && chunk.functionCalls.length > 0) {
              for (const fc of chunk.functionCalls) {
                const toolCall: ToolCall = {
                  id: `gemini-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  type: "function",
                  function: {
                    name: fc.name || "",
                    arguments: JSON.stringify(fc.args || {}),
                  },
                };
                toolCallsToExecute.push(toolCall);
              }
            }
          }

          // Execute tool calls if any
          if (toolCallsToExecute.length > 0) {
            await supabase.from("idea_chat_messages").insert({
              chat_id: chatId,
              role: "assistant",
              content: fullResponse || "",
              tool_calls: toolCallsToExecute,
              token_count: Math.ceil(fullResponse.length / 4),
            });

            for (const toolCall of toolCallsToExecute) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: "tool_call", 
                    name: toolCall.function.name,
                    arguments: JSON.parse(toolCall.function.arguments)
                  })}\n\n`
                )
              );

              const result = await executeToolCall(toolCall);

              await supabase.from("idea_chat_messages").insert({
                chat_id: chatId,
                role: "tool",
                content: result,
                tool_call_id: toolCall.id,
                token_count: Math.ceil(result.length / 4),
              });

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "tool_result", name: toolCall.function.name, result: JSON.parse(result) })}\n\n`
                )
              );
            }
          } else if (fullResponse) {
            await supabase.from("idea_chat_messages").insert({
              chat_id: chatId,
              role: "assistant",
              content: fullResponse,
              token_count: Math.ceil(fullResponse.length / 4),
            });
          }

          // Log the chat interaction
          await supabase.from("chat_logs").insert({
            chat_id: chatId,
            project_id: idea.project_id,
            model: TEXT_MODEL,
            messages_sent: apiMessages,
            response_raw: fullResponse,
            tool_calls_made: toolCallsToExecute.length > 0 ? toolCallsToExecute : null,
            generation_log_ids: Object.keys(generationLogIdMap).length > 0 ? generationLogIdMap : null,
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error("Gemini streaming error:", error);

          await supabase.from("chat_logs").insert({
            chat_id: chatId,
            project_id: idea.project_id,
            model: TEXT_MODEL,
            messages_sent: apiMessages,
            generation_log_ids: Object.keys(generationLogIdMap).length > 0 ? generationLogIdMap : null,
            error: errorMessage,
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`)
          );
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }
}
