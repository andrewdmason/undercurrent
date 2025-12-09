"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ChatModel, IdeaChat, IdeaChatMessage } from "@/lib/types";

// Create a new chat session for an idea
export async function createChat(ideaId: string, model: ChatModel = "gpt-5.1") {
  const supabase = await createClient();

  // Verify user has access to this idea
  const { data: idea } = await supabase
    .from("ideas")
    .select("id, project_id")
    .eq("id", ideaId)
    .single();

  if (!idea) {
    return { error: "Idea not found or access denied" };
  }

  // Count existing chats to generate a name
  const { count } = await supabase
    .from("idea_chats")
    .select("*", { count: "exact", head: true })
    .eq("idea_id", ideaId);

  const chatNumber = (count || 0) + 1;
  const name = `Chat ${chatNumber}`;

  // Create the chat
  const { data: chat, error } = await supabase
    .from("idea_chats")
    .insert({
      idea_id: ideaId,
      name,
      model,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating chat:", error);
    return { error: error.message };
  }

  return { chat: chat as IdeaChat };
}

// List all chats for an idea
export async function listChats(ideaId: string) {
  const supabase = await createClient();

  const { data: chats, error } = await supabase
    .from("idea_chats")
    .select("*")
    .eq("idea_id", ideaId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error listing chats:", error);
    return { error: error.message };
  }

  return { chats: (chats || []) as IdeaChat[] };
}

// Get messages for a chat
export async function getChatMessages(chatId: string) {
  const supabase = await createClient();

  const { data: messages, error } = await supabase
    .from("idea_chat_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching chat messages:", error);
    return { error: error.message };
  }

  return { messages: (messages || []) as IdeaChatMessage[] };
}

// Get a single chat with its metadata
export async function getChat(chatId: string) {
  const supabase = await createClient();

  const { data: chat, error } = await supabase
    .from("idea_chats")
    .select("*")
    .eq("id", chatId)
    .single();

  if (error) {
    console.error("Error fetching chat:", error);
    return { error: error.message };
  }

  return { chat: chat as IdeaChat };
}

// Update chat model
export async function updateChatModel(chatId: string, model: ChatModel) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("idea_chats")
    .update({ model })
    .eq("id", chatId);

  if (error) {
    console.error("Error updating chat model:", error);
    return { error: error.message };
  }

  return { success: true };
}

// Rename a chat
export async function renameChat(chatId: string, name: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("idea_chats")
    .update({ name })
    .eq("id", chatId);

  if (error) {
    console.error("Error renaming chat:", error);
    return { error: error.message };
  }

  return { success: true };
}

// Delete a chat
export async function deleteChat(chatId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("idea_chats")
    .delete()
    .eq("id", chatId);

  if (error) {
    console.error("Error deleting chat:", error);
    return { error: error.message };
  }

  return { success: true };
}

// Get total token count for a chat (for context window tracking)
export async function getChatTokenCount(chatId: string) {
  const supabase = await createClient();

  const { data: messages, error } = await supabase
    .from("idea_chat_messages")
    .select("token_count")
    .eq("chat_id", chatId);

  if (error) {
    console.error("Error fetching token counts:", error);
    return { error: error.message, totalTokens: 0 };
  }

  const totalTokens = (messages || []).reduce(
    (sum, msg) => sum + (msg.token_count || 0),
    0
  );

  return { totalTokens };
}

// Update script from chat tool call
export async function updateScriptFromChat(ideaId: string, script: string, projectSlug?: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("ideas")
    .update({ script })
    .eq("id", ideaId);

  if (error) {
    console.error("Error updating script:", error);
    return { error: error.message };
  }

  if (projectSlug) {
    revalidatePath(`/${projectSlug}/ideas/${ideaId}`);
  }

  return { success: true };
}
