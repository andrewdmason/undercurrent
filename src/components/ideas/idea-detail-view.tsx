"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Copy, Check, RefreshCw, ArrowLeft, Play, Ban, Sparkles, MoreHorizontal, ListTodo, Clock, FileText, Loader2, LayoutTemplate, User, Tag, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IdeaWithChannels, ProjectTemplateWithChannels, DistributionChannel, IdeaTodo } from "@/lib/types";
import { generateThumbnail } from "@/lib/actions/thumbnail";
import { cancelIdea, generateScript, generateUnderlordPrompt } from "@/lib/actions/ideas";
import { toggleTodoComplete } from "@/lib/actions/idea-todos";
import { updateTopic, deleteTopic, updateDistributionChannel, deleteDistributionChannel } from "@/lib/actions/project";
import { updateCharacter, deleteCharacter } from "@/lib/actions/characters";
import { cn } from "@/lib/utils";
import { ImageShimmer } from "@/components/ui/shimmer";
import { ImageLightbox, ImageExpandButton } from "@/components/ui/image-lightbox";
import { PlatformIcon, getChannelLabel } from "./idea-card";
import { PublishIdeaModal } from "./publish-idea-modal";
import { ScriptDisplay } from "./script-display";
import { ChatSidebar } from "./chat-sidebar";
import { CreateTemplateModal } from "@/components/strategy/create-template-modal";

interface IdeaDetailViewProps {
  idea: IdeaWithChannels;
  projectId: string;
  projectSlug: string;
  projectChannels: DistributionChannel[];
  fullTemplate: ProjectTemplateWithChannels | null;
  initialTodos: IdeaTodo[];
}

// Helper to format time as "Xh Ymin"
function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

// Simple markdown renderer for todo details
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let isCheckbox = false;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={elements.length} className={cn("space-y-1 my-2", isCheckbox ? "list-none pl-0" : "list-disc pl-5")}>
          {currentList.map((item, i) => {
            if (isCheckbox) {
              const checked = item.startsWith('[x]');
              const text = item.replace(/^\[[ x]\]\s*/, '');
              return (
                <li key={i} className="flex items-start gap-2">
                  <span className={cn(
                    "flex-shrink-0 w-4 h-4 mt-0.5 rounded border",
                    checked ? "bg-[var(--grey-800)] border-[var(--grey-800)]" : "border-[var(--grey-300)]"
                  )}>
                    {checked && <Check className="h-4 w-4 text-white p-0.5" />}
                  </span>
                  <span className={cn(checked && "line-through text-[var(--grey-400)]")}>{text}</span>
                </li>
              );
            }
            return <li key={i}>{item}</li>;
          })}
        </ul>
      );
      currentList = [];
      isCheckbox = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Headers
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={elements.length} className="text-sm font-semibold text-[var(--grey-800)] mt-4 first:mt-0 mb-2">
          {line.slice(3)}
        </h3>
      );
      continue;
    }
    
    // Checkbox items
    if (line.match(/^- \[[ x]\]/)) {
      if (currentList.length > 0 && !isCheckbox) flushList();
      isCheckbox = true;
      currentList.push(line.slice(2)); // Remove "- "
      continue;
    }
    
    // List items
    if (line.startsWith('- ')) {
      if (currentList.length > 0 && isCheckbox) flushList();
      currentList.push(line.slice(2));
      continue;
    }
    
    // Empty lines
    if (line.trim() === '') {
      flushList();
      continue;
    }
    
    // Regular paragraphs (handle bold)
    flushList();
    const formatted = line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    elements.push(
      <p key={elements.length} className="text-sm text-[var(--grey-600)] leading-relaxed my-2">
        {formatted}
      </p>
    );
  }
  
  flushList();
  return elements;
}

export function IdeaDetailView({ idea, projectId, projectSlug, projectChannels, fullTemplate, initialTodos }: IdeaDetailViewProps) {
  const router = useRouter();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingUnderlordPrompt, setIsGeneratingUnderlordPrompt] = useState(false);
  const [isScriptUpdating, setIsScriptUpdating] = useState(false);
  const [currentScript, setCurrentScript] = useState<string | null>(idea.script);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(idea.prompt);
  const [isCanceling, setIsCanceling] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [underlordModalOpen, setUnderlordModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [todos, setTodos] = useState<IdeaTodo[]>(initialTodos);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [copiedTodoDetails, setCopiedTodoDetails] = useState(false);

  // Edit modal state
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplateWithChannels | null>(null);
  const [editingTopic, setEditingTopic] = useState<{ id: string; name: string; description?: string | null } | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<{ id: string; name: string; description?: string | null; image_url: string | null } | null>(null);
  const [editingChannel, setEditingChannel] = useState<DistributionChannel | null>(null);

  // Derive selectedTodo from todos array to keep modal in sync
  const selectedTodo = selectedTodoId 
    ? todos.find(t => t.id === selectedTodoId) ?? null 
    : null;

  const hasImage = !!idea.image_url;
  const showShimmer = isGeneratingThumbnail || !hasImage;

  const handleToggleTodo = async (todoId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    
    // Optimistic update
    setTodos(prev => 
      prev.map(t => 
        t.id === todoId ? { ...t, is_complete: !t.is_complete } : t
      )
    );
    
    // Persist to database
    const result = await toggleTodoComplete(todoId, !todo.is_complete);
    if (!result.success) {
      // Revert on error
      setTodos(prev => 
        prev.map(t => 
          t.id === todoId ? { ...t, is_complete: todo.is_complete } : t
        )
      );
      toast.error(result.error || "Failed to update todo");
    }
  };

  const remainingMinutes = todos
    .filter(todo => !todo.is_complete)
    .reduce((sum, todo) => sum + (todo.time_estimate_minutes || 0), 0);

  // Helper to parse and format todo details (handles script_finalization JSON questions)
  const formatTodoDetails = (todo: IdeaTodo): { questions?: string[]; details?: string; outcome?: string } => {
    if (!todo.details) return {};
    
    // Check if details contains an outcome section (separated by ---)
    const parts = todo.details.split('\n\n---\n\n');
    
    if (todo.type === 'script_finalization') {
      try {
        // First part should be JSON array of questions
        const questions = JSON.parse(parts[0]);
        if (Array.isArray(questions)) {
          return {
            questions,
            outcome: parts[1] || undefined,
          };
        }
      } catch {
        // Not JSON, treat as regular details
      }
    }
    
    return {
      details: parts[0],
      outcome: parts[1] || undefined,
    };
  };

  const handleCopyTodoDetails = async () => {
    if (!selectedTodo?.details) return;
    try {
      await navigator.clipboard.writeText(selectedTodo.details);
      setCopiedTodoDetails(true);
      toast.success("Details copied to clipboard");
      setTimeout(() => setCopiedTodoDetails(false), 2000);
    } catch {
      toast.error("Failed to copy details");
    }
  };

  const handlePrintTodo = () => {
    if (!selectedTodo) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const { questions, details, outcome } = formatTodoDetails(selectedTodo);
    let content = `<h1>${selectedTodo.title}</h1>`;
    if (selectedTodo.time_estimate_minutes) {
      content += `<p><em>Estimated time: ${selectedTodo.time_estimate_minutes} minutes</em></p>`;
    }
    if (questions) {
      content += '<h2>Questions</h2><ul>';
      questions.forEach(q => { content += `<li>${q}</li>`; });
      content += '</ul>';
    }
    if (details) {
      content += `<div>${details.replace(/\n/g, '<br>')}</div>`;
    }
    if (outcome) {
      content += `<h2>Outcome</h2><div>${outcome.replace(/\n/g, '<br>')}</div>`;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedTodo.title}</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; }
            h1 { font-size: 1.5em; margin-bottom: 0.5em; }
            h2 { font-size: 1.1em; margin-top: 1.5em; color: #666; }
            ul { padding-left: 1.5em; }
            li { margin: 0.5em 0; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleGenerateThumbnail = async () => {
    if (isGeneratingThumbnail) return;

    setIsGeneratingThumbnail(true);
    try {
      const result = await generateThumbnail(idea.id, projectId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Thumbnail generated successfully");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to generate thumbnail");
      console.error(error);
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!currentPrompt) return;
    try {
      await navigator.clipboard.writeText(currentPrompt);
      setCopiedPrompt(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      toast.error("Failed to copy prompt");
    }
  };

  const handleCopyScript = async () => {
    if (!currentScript) return;
    try {
      await navigator.clipboard.writeText(currentScript);
      setCopiedScript(true);
      toast.success("Script copied to clipboard");
      setTimeout(() => setCopiedScript(false), 2000);
    } catch {
      toast.error("Failed to copy script");
    }
  };

  const handleGenerateScript = async () => {
    if (isGeneratingScript) return;

    setIsGeneratingScript(true);
    try {
      const result = await generateScript(idea.id);
      if (result.error) {
        toast.error(result.error);
      } else if (result.script) {
        setCurrentScript(result.script);
        toast.success("Script generated successfully");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to generate script");
      console.error(error);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateUnderlordPrompt = async () => {
    if (isGeneratingUnderlordPrompt) return;

    setIsGeneratingUnderlordPrompt(true);
    try {
      const result = await generateUnderlordPrompt(idea.id);
      if (result.error) {
        toast.error(result.error);
      } else if (result.underlordPrompt) {
        setCurrentPrompt(result.underlordPrompt);
        toast.success("Underlord prompt generated");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to generate Underlord prompt");
      console.error(error);
    } finally {
      setIsGeneratingUnderlordPrompt(false);
    }
  };

  const handleOpenUnderlordModal = async () => {
    setUnderlordModalOpen(true);
    // If no prompt exists yet, generate it
    if (!currentPrompt && !isGeneratingUnderlordPrompt) {
      await handleGenerateUnderlordPrompt();
    }
  };

  const handleCancel = async () => {
    if (isCanceling) return;

    setIsCanceling(true);
    try {
      const result = await cancelIdea(idea.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Idea removed from Create");
        router.push(`/${projectSlug}/create`);
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to cancel idea");
      console.error(error);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--grey-25)] min-h-0">
      {/* Back Navigation & Title Bar */}
      <div className="border-b border-[var(--border)] bg-[var(--grey-0)]">
        <div className="px-6 py-3 flex items-center gap-4">
          <Link
            href={`/${projectSlug}/create`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--grey-500)] hover:text-[var(--grey-800)] hover:bg-[var(--grey-50)] transition-colors flex-shrink-0"
            aria-label="Back to Create"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h1 className="text-base font-semibold text-[var(--grey-800)] tracking-[-0.2px] truncate">
              {idea.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleOpenUnderlordModal}
              disabled={!currentScript}
              title={!currentScript ? "Generate a script first" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium rounded-lg transition-all",
                currentScript
                  ? "bg-gradient-to-t from-[#262626] to-[#404040] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] hover:brightness-110"
                  : "bg-[var(--grey-100)] text-[var(--grey-400)] cursor-not-allowed"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Create with Underlord
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--grey-0)] text-[var(--grey-500)] hover:bg-[var(--grey-50)] hover:text-[var(--grey-800)] transition-colors"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--grey-0)] p-1 shadow-[0px_8px_16px_rgba(0,0,0,0.12),0px_8px_8px_rgba(0,0,0,0.08)]"
              >
                <DropdownMenuItem
                  onClick={() => setPublishModalOpen(true)}
                  className="flex items-center gap-2 h-8 px-2 rounded-md text-xs text-[var(--grey-800)] hover:bg-[var(--grey-50-a)] cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                  Publish
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--grey-100-a)] -mx-1 my-1" />
                <DropdownMenuItem
                  onClick={handleCancel}
                  disabled={isCanceling}
                  className="flex items-center gap-2 h-8 px-2 rounded-md text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                >
                  <Ban className="h-3.5 w-3.5" />
                  {isCanceling ? "Deleting..." : "Delete this idea"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full px-6 py-6 flex flex-col">
          <div className="grid gap-6 flex-1 min-h-0 overflow-hidden" style={{ gridTemplateColumns: '340px minmax(400px, 1fr) 300px' }}>
            {/* Left Column - Image & Info (scrollable) */}
            <div className="flex flex-col gap-4 overflow-auto">

              {/* Image */}
              <div className="group/image relative w-full aspect-video overflow-hidden rounded-lg bg-[var(--grey-100)]">
                {hasImage && (
                  <Image
                    src={idea.image_url!}
                    alt=""
                    fill
                    className={cn(
                      "object-cover",
                      showShimmer && "opacity-0"
                    )}
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                )}
                
                {showShimmer && <ImageShimmer />}

                {/* Expand image button - top left on hover */}
                {hasImage && !showShimmer && (
                  <ImageExpandButton
                    onClick={() => setLightboxOpen(true)}
                    className="opacity-0 group-hover/image:opacity-100"
                  />
                )}

                {!showShimmer && (
                  <button
                    onClick={handleGenerateThumbnail}
                    className={cn(
                      "absolute bottom-3 right-3 p-2 rounded-md",
                      "bg-black/60 text-white opacity-0 group-hover/image:opacity-100",
                      "transition-opacity duration-200",
                      "hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/50"
                    )}
                    title="Regenerate thumbnail"
                    aria-label="Regenerate thumbnail"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Image Lightbox */}
              {hasImage && (
                <ImageLightbox
                  src={idea.image_url!}
                  open={lightboxOpen}
                  onOpenChange={setLightboxOpen}
                />
              )}

              {/* Description Card with all metadata */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--grey-0)] p-4">
                {idea.description && (
                  <>
                    <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider mb-2">
                      Description
                    </h4>
                    <p className="text-sm text-[var(--grey-800)] leading-relaxed">
                      {idea.description}
                    </p>
                  </>
                )}
                
                {/* All Pills - Channels, Template, Characters, Topics */}
                {((idea.channels?.length ?? 0) > 0 || idea.template || (idea.characters?.length ?? 0) > 0 || (idea.topics?.length ?? 0) > 0) && (
                  <div className={cn("flex items-center gap-1.5 flex-wrap", idea.description && "mt-4 pt-4 border-t border-[var(--border)]")}>
                    {/* Channel Pills */}
                    {idea.channels?.map((channel) => {
                      const fullChannel = projectChannels.find(c => c.id === channel.id);
                      return (
                        <button
                          key={channel.id}
                          onClick={() => fullChannel && setEditingChannel(fullChannel)}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--grey-50)] text-[var(--grey-600)] hover:bg-[var(--grey-100)] transition-colors cursor-pointer"
                        >
                          <PlatformIcon platform={channel.platform} />
                          {getChannelLabel(channel.platform, channel.custom_label)}
                        </button>
                      );
                    })}
                    {/* Template Pill */}
                    {idea.template && fullTemplate && (
                      <button
                        onClick={() => setEditingTemplate(fullTemplate)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--grey-50)] text-[var(--grey-600)] hover:bg-[var(--grey-100)] transition-colors cursor-pointer"
                      >
                        <LayoutTemplate className="h-3 w-3" />
                        {idea.template.name}
                      </button>
                    )}
                    {/* Topic Pills */}
                    {idea.topics?.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => setEditingTopic(topic)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--grey-50)] text-[var(--grey-600)] hover:bg-[var(--grey-100)] transition-colors cursor-pointer"
                      >
                        <Tag className="h-3 w-3" />
                        {topic.name}
                      </button>
                    ))}
                    {/* Character Avatars */}
                    {idea.characters?.map((character) => (
                      <button
                        key={character.id}
                        onClick={() => setEditingCharacter(character)}
                        className="hover:ring-2 hover:ring-[var(--grey-300)] rounded-full transition-all cursor-pointer"
                        title={character.name}
                      >
                        {character.image_url ? (
                          <div className="w-5 h-5 rounded-full overflow-hidden">
                            <Image
                              src={character.image_url}
                              alt={character.name}
                              width={20}
                              height={20}
                              className="w-full h-full object-cover scale-125"
                            />
                          </div>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--grey-100)] text-[var(--grey-500)]">
                            <User className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Prep List */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden">
                {/* Prep List Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
                  <ListTodo className="h-4 w-4 text-[var(--grey-400)]" />
                  <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
                    Prep List
                  </h4>
                  {remainingMinutes > 0 && (
                    <div className="flex items-center gap-1 ml-auto text-xs text-[var(--grey-500)]">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatTime(remainingMinutes)}</span>
                    </div>
                  )}
                </div>

                {/* Todo List - Scrollable */}
                <div className="max-h-[240px] overflow-y-auto p-3 space-y-1">
                  {todos.length === 0 ? (
                    <p className="text-xs text-[var(--grey-400)] text-center py-4">
                      No prep tasks yet
                    </p>
                  ) : (
                    todos.map((todo) => (
                      <div
                        key={todo.id}
                        className="group flex items-center gap-3 p-2 rounded-md hover:bg-[var(--grey-50)] transition-colors cursor-pointer"
                        onClick={() => setSelectedTodoId(todo.id)}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTodo(todo.id);
                          }}
                          className={cn(
                            "flex-shrink-0 w-4 h-4 rounded border transition-colors",
                            todo.is_complete
                              ? "bg-[var(--grey-800)] border-[var(--grey-800)]"
                              : "border-[var(--grey-300)] hover:border-[var(--grey-500)]"
                          )}
                        >
                          {todo.is_complete && (
                            <Check className="h-4 w-4 text-white p-0.5" />
                          )}
                        </button>

                        {/* Todo Title */}
                        <span
                          className={cn(
                            "flex-1 text-sm transition-colors",
                            todo.is_complete
                              ? "text-[var(--grey-400)] line-through"
                              : "text-[var(--grey-800)]"
                          )}
                        >
                          {todo.title}
                        </span>

                        {/* Time Estimate */}
                        {todo.time_estimate_minutes && (
                          <span className="text-xs text-[var(--grey-400)] tabular-nums">
                            {todo.time_estimate_minutes}min
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Middle Column - Script (full height) */}
            <div className="flex flex-col min-h-0 h-full">
              <div className="flex-1 flex flex-col min-h-0 rounded-lg border border-[var(--border)] bg-[var(--grey-0)] overflow-hidden">
                {/* Script Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                  <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider">
                    Script
                  </h4>
                  {currentScript && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateScript}
                        disabled={isGeneratingScript}
                        className="h-7 px-2"
                        title="Regenerate script"
                      >
                        <RefreshCw size={14} className={cn(isGeneratingScript && "animate-spin")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyScript}
                        className="h-7 px-2"
                        title={copiedScript ? "Copied" : "Copy"}
                      >
                        {copiedScript ? (
                          <Check size={14} className="text-[#00975a]" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Script Content or Empty/Loading State */}
                {isGeneratingScript ? (
                  // Loading state
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
                      <Loader2 className="h-6 w-6 text-[#007bc2] animate-spin" />
                    </div>
                    <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
                      Generating Script
                    </h3>
                    <p className="text-xs text-[var(--grey-400)] max-w-[200px]">
                      AI is writing a ready-to-shoot script for this idea...
                    </p>
                  </div>
                ) : currentScript ? (
                  // Script content
                  <div className={cn(
                    "flex-1 min-h-0 overflow-auto p-4 relative",
                    isScriptUpdating && "script-updating"
                  )}>
                    <ScriptDisplay script={currentScript} />
                    {isScriptUpdating && (
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-[var(--cyan-600)]/5 to-transparent animate-shimmer" />
                    )}
                  </div>
                ) : (
                  // Empty state
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
                      <FileText className="h-6 w-6 text-[var(--grey-300)]" />
                    </div>
                    <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
                      No Script Yet
                    </h3>
                    <p className="text-xs text-[var(--grey-400)] max-w-[200px] mb-4">
                      Generate a ready-to-shoot script based on this idea.
                    </p>
                    <button
                      onClick={handleGenerateScript}
                      className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium rounded-lg transition-all bg-gradient-to-t from-[#262626] to-[#404040] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] hover:brightness-110"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate Script
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Chat (full height) */}
            <div className="flex flex-col min-h-0 h-full">
              <ChatSidebar
                ideaId={idea.id}
                projectSlug={projectSlug}
                scriptQuestions={(() => {
                  // Get questions from incomplete script_finalization todo
                  const scriptTodo = todos.find(t => t.type === 'script_finalization' && !t.is_complete);
                  if (!scriptTodo?.details) return undefined;
                  try {
                    const questions = JSON.parse(scriptTodo.details.split('\n\n---\n\n')[0]);
                    return Array.isArray(questions) ? questions : undefined;
                  } catch {
                    return undefined;
                  }
                })()}
                onScriptUpdate={(script) => setCurrentScript(script)}
                onIdeaRegenerate={() => router.refresh()}
                onToolCallStart={(toolName) => {
                  if (toolName === "update_script") setIsScriptUpdating(true);
                }}
                onToolCallEnd={(toolName) => {
                  // Add minimum delay so shimmer is visible
                  if (toolName === "update_script") {
                    setTimeout(() => setIsScriptUpdating(false), 800);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Publish Modal */}
      <PublishIdeaModal
        ideaId={idea.id}
        ideaTitle={idea.title}
        channels={idea.channels}
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
      />

      {/* Underlord Prompt Modal */}
      <Dialog open={underlordModalOpen} onOpenChange={setUnderlordModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#007bc2]" />
              Create with Underlord
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {isGeneratingUnderlordPrompt ? (
              // Loading state
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--grey-50)] mb-4">
                  <Loader2 className="h-6 w-6 text-[#007bc2] animate-spin" />
                </div>
                <h3 className="text-sm font-medium text-[var(--grey-600)] mb-1">
                  Generating Underlord Prompt
                </h3>
                <p className="text-xs text-[var(--grey-400)] max-w-[240px]">
                  Creating detailed editing instructions based on your script...
                </p>
              </div>
            ) : currentPrompt ? (
              // Prompt content
              <>
                <p className="text-sm text-[var(--grey-500)] mb-4">
                  Copy this prompt and paste it into Underlord to generate your video.
                </p>
                <div className="relative rounded-lg border border-[var(--border)] bg-[var(--grey-50)]">
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateUnderlordPrompt}
                      className="h-8 px-2"
                      title="Regenerate prompt"
                    >
                      <RefreshCw size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPrompt}
                      className="h-8 px-3 gap-1.5"
                    >
                      {copiedPrompt ? (
                        <>
                          <Check size={14} className="text-[#00975a]" />
                          <span className="text-[#00975a]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-4 pt-12 max-h-[400px] overflow-auto">
                    <pre className="text-sm text-[var(--grey-800)] whitespace-pre-wrap font-mono leading-relaxed">
                      {currentPrompt}
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              // Error/fallback state (shouldn't normally happen)
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-[var(--grey-500)]">
                  Unable to generate prompt. Please try again.
                </p>
                <Button
                  size="sm"
                  onClick={handleGenerateUnderlordPrompt}
                  className="mt-4 bg-[var(--cyan-600)] hover:bg-[var(--cyan-600)]/90 text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Todo Details Modal */}
      <Dialog open={!!selectedTodo} onOpenChange={(open) => !open && setSelectedTodoId(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <button
                onClick={() => selectedTodo && handleToggleTodo(selectedTodo.id)}
                className={cn(
                  "flex-shrink-0 w-5 h-5 rounded border transition-colors",
                  selectedTodo?.is_complete
                    ? "bg-[var(--grey-800)] border-[var(--grey-800)]"
                    : "border-[var(--grey-300)] hover:border-[var(--grey-500)]"
                )}
              >
                {selectedTodo?.is_complete && (
                  <Check className="h-5 w-5 text-white p-0.5" />
                )}
              </button>
              <span className={cn(
                selectedTodo?.is_complete && "line-through text-[var(--grey-400)]"
              )}>
                {selectedTodo?.title}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            {/* Time estimate and actions row */}
            <div className="flex items-center justify-between">
              {selectedTodo?.time_estimate_minutes ? (
                <div className="flex items-center gap-2 text-sm text-[var(--grey-500)]">
                  <Clock className="h-4 w-4" />
                  <span>Estimated time: {selectedTodo.time_estimate_minutes} minutes</span>
                </div>
              ) : <div />}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyTodoDetails}
                  disabled={!selectedTodo?.details}
                  className="h-8 px-2"
                  title="Copy details"
                >
                  {copiedTodoDetails ? (
                    <Check size={14} className="text-[#00975a]" />
                  ) : (
                    <Copy size={14} />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrintTodo}
                  disabled={!selectedTodo}
                  className="h-8 px-2"
                  title="Print"
                >
                  <Printer size={14} />
                </Button>
              </div>
            </div>
            
            {/* Details content - scrollable */}
            <div className="max-h-[400px] overflow-y-auto">
              {selectedTodo && (() => {
                const { questions, details, outcome } = formatTodoDetails(selectedTodo);
                return (
                  <>
                    {/* Questions for script_finalization todos */}
                    {questions && questions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-[var(--grey-600)] uppercase tracking-wider mb-2">
                          Questions to Answer
                        </h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {questions.map((q, i) => (
                            <li key={i} className="text-sm text-[var(--grey-600)]">{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Regular details (rendered as markdown) */}
                    {details && (
                      <div className="prose prose-sm max-w-none">
                        {renderMarkdown(details)}
                      </div>
                    )}
                    
                    {/* Outcome section */}
                    {outcome && (
                      <div className="mt-4 pt-4 border-t border-[var(--border)]">
                        <div className="prose prose-sm max-w-none">
                          {renderMarkdown(outcome)}
                        </div>
                      </div>
                    )}
                    
                    {/* Empty state */}
                    {!questions && !details && !outcome && (
                      <p className="text-sm text-[var(--grey-400)] italic">
                        No additional details.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Edit Modal */}
      <CreateTemplateModal
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        projectId={projectId}
        channels={projectChannels}
        onTemplateCreated={() => {}}
        onTemplateUpdated={() => router.refresh()}
        editingTemplate={editingTemplate}
      />

      {/* Topic Edit Modal */}
      <TopicEditModal
        topic={editingTopic}
        onClose={() => setEditingTopic(null)}
        projectId={projectId}
        onUpdate={() => router.refresh()}
      />

      {/* Character Edit Modal */}
      <CharacterEditModal
        character={editingCharacter}
        onClose={() => setEditingCharacter(null)}
        projectId={projectId}
        onUpdate={() => router.refresh()}
      />

      {/* Channel Edit Modal */}
      <ChannelEditModal
        channel={editingChannel}
        onClose={() => setEditingChannel(null)}
        onUpdate={() => router.refresh()}
      />
    </div>
  );
}

// ===========================================
// Edit Modal Components
// ===========================================

interface TopicEditModalProps {
  topic: { id: string; name: string; description?: string | null } | null;
  onClose: () => void;
  projectId: string;
  onUpdate: () => void;
}

function TopicEditModal({ topic, onClose, projectId, onUpdate }: TopicEditModalProps) {
  const [name, setName] = useState(topic?.name || "");
  const [description, setDescription] = useState(topic?.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Reset form when topic changes
  if (topic && !initialized) {
    setName(topic.name);
    setDescription(topic.description || "");
    setInitialized(true);
  }
  
  // Reset initialized flag when modal closes
  if (!topic && initialized) {
    setInitialized(false);
  }

  const handleSave = async () => {
    if (!topic || !name.trim()) return;
    setIsSaving(true);
    await updateTopic(topic.id, { name: name.trim(), description: description.trim() || null });
    setIsSaving(false);
    onUpdate();
    onClose();
  };

  const handleDelete = async () => {
    if (!topic) return;
    setIsDeleting(true);
    await deleteTopic(topic.id);
    setIsDeleting(false);
    onUpdate();
    onClose();
  };

  return (
    <Dialog open={!!topic} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] rounded-lg">
        <DialogHeader className="px-4 min-h-8">
          <DialogTitle className="text-xs font-semibold text-[var(--grey-800)]">
            Edit Topic
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Upcoming Events"
              className="h-8 rounded-lg bg-black/[0.03] border-0 text-xs focus-visible:ring-2 focus-visible:ring-[#007bc2]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Visit the website calendar and make videos that promote upcoming events..."
              rows={3}
              className={cn(
                "w-full rounded-lg bg-black/[0.03] border-0 px-3 py-2",
                "text-xs text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
                "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
                "resize-none"
              )}
            />
          </div>
          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="h-8 text-xs text-[var(--grey-400)] hover:text-[#f72736]"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving} className="h-8 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!name.trim() || isSaving} className="h-8 text-xs">
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CharacterEditModalProps {
  character: { id: string; name: string; description?: string | null; image_url: string | null } | null;
  onClose: () => void;
  projectId: string;
  onUpdate: () => void;
}

function CharacterEditModal({ character, onClose, projectId, onUpdate }: CharacterEditModalProps) {
  const [name, setName] = useState(character?.name || "");
  const [description, setDescription] = useState(character?.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Reset form when character changes
  if (character && !initialized) {
    setName(character.name);
    setDescription(character.description || "");
    setInitialized(true);
  }
  
  // Reset initialized flag when modal closes
  if (!character && initialized) {
    setInitialized(false);
  }

  const handleSave = async () => {
    if (!character || !name.trim()) return;
    setIsSaving(true);
    await updateCharacter(character.id, projectId, { name: name.trim(), description: description.trim() || null });
    setIsSaving(false);
    onUpdate();
    onClose();
  };

  const handleDelete = async () => {
    if (!character) return;
    setIsDeleting(true);
    await deleteCharacter(character.id, projectId);
    setIsDeleting(false);
    onUpdate();
    onClose();
  };

  return (
    <Dialog open={!!character} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] rounded-lg">
        <DialogHeader className="px-4 min-h-8">
          <DialogTitle className="text-xs font-semibold text-[var(--grey-800)]">
            Edit Character
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-4 pb-4">
          {/* Avatar preview */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-black/[0.03] flex items-center justify-center">
              {character?.image_url ? (
                <img
                  src={character.image_url}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={32} className="text-[var(--grey-400)]" />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="h-8 rounded-lg bg-black/[0.03] border-0 text-xs focus-visible:ring-2 focus-visible:ring-[#007bc2]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this character's role, personality, and on-camera strengths..."
              rows={5}
              className={cn(
                "w-full rounded-lg bg-black/[0.03] border-0 px-3 py-2",
                "text-xs text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
                "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
                "resize-none"
              )}
            />
          </div>
          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="h-8 text-xs text-[var(--grey-400)] hover:text-[#f72736]"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving} className="h-8 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!name.trim() || isSaving} className="h-8 text-xs">
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ChannelEditModalProps {
  channel: DistributionChannel | null;
  onClose: () => void;
  onUpdate: () => void;
}

function ChannelEditModal({ channel, onClose, onUpdate }: ChannelEditModalProps) {
  const [customLabel, setCustomLabel] = useState(channel?.custom_label || "");
  const [goalCount, setGoalCount] = useState(channel?.goal_count?.toString() || "");
  const [goalCadence, setGoalCadence] = useState<"weekly" | "monthly" | null>(channel?.goal_cadence || null);
  const [notes, setNotes] = useState(channel?.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Reset form when channel changes
  if (channel && !initialized) {
    setCustomLabel(channel.custom_label || "");
    setGoalCount(channel.goal_count?.toString() || "");
    setGoalCadence(channel.goal_cadence);
    setNotes(channel.notes || "");
    setInitialized(true);
  }
  
  // Reset initialized flag when modal closes
  if (!channel && initialized) {
    setInitialized(false);
  }

  const handleSave = async () => {
    if (!channel) return;
    setIsSaving(true);
    await updateDistributionChannel(channel.id, {
      custom_label: customLabel.trim() || null,
      goal_count: goalCount ? parseInt(goalCount, 10) : null,
      goal_cadence: goalCadence,
      notes: notes.trim() || null,
    });
    setIsSaving(false);
    onUpdate();
    onClose();
  };

  const handleDelete = async () => {
    if (!channel) return;
    setIsDeleting(true);
    await deleteDistributionChannel(channel.id);
    setIsDeleting(false);
    onUpdate();
    onClose();
  };

  const platformLabel = channel ? getChannelLabel(channel.platform, channel.custom_label) : "";

  return (
    <Dialog open={!!channel} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] rounded-lg">
        <DialogHeader className="px-4 min-h-8">
          <DialogTitle className="text-xs font-semibold text-[var(--grey-800)] flex items-center gap-2">
            {channel && <PlatformIcon platform={channel.platform} />}
            Edit {platformLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-4 pb-4">
          {/* Custom label (only for custom platform) */}
          {channel?.platform === "custom" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--grey-600)]">Channel Name</label>
              <Input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g., Company Blog, Newsletter"
                className="h-8 rounded-lg bg-black/[0.03] border-0 text-xs focus-visible:ring-2 focus-visible:ring-[#007bc2]"
              />
            </div>
          )}
          
          {/* Production goal */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Production Goal</label>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                value={goalCount}
                onChange={(e) => setGoalCount(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                className="h-8 w-20 rounded-lg bg-black/[0.03] border-0 text-xs focus-visible:ring-2 focus-visible:ring-[#007bc2]"
              />
              <select
                value={goalCadence || ""}
                onChange={(e) => setGoalCadence(e.target.value ? (e.target.value as "weekly" | "monthly") : null)}
                className="h-8 px-3 rounded-lg bg-black/[0.03] border-0 text-xs focus:outline-none focus:ring-2 focus:ring-[#007bc2]"
              >
                <option value="">Select...</option>
                <option value="weekly">per week</option>
                <option value="monthly">per month</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Strategy Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Cross-post from TikTok, focus on educational content..."
              rows={2}
              className={cn(
                "w-full rounded-lg bg-black/[0.03] border-0 px-3 py-2",
                "text-xs text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
                "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
                "resize-none"
              )}
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="h-8 text-xs text-[var(--grey-400)] hover:text-[#f72736]"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving} className="h-8 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 text-xs">
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

