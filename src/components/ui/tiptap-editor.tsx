"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TurndownService from "turndown";
import { marked } from "marked";
import { useEffect, useRef, useState } from "react";
import { Bold, Italic, List, Heading2, Heading3, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Initialize turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
});

// Convert markdown to HTML for Tiptap
function markdownToHtml(markdown: string): string {
  if (!markdown) return "";
  return marked.parse(markdown, { async: false }) as string;
}

interface TiptapEditorProps {
  content: string;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "Start typing...",
  className,
  editable = true,
}: TiptapEditorProps) {
  // Track the last content we set externally (from props)
  const lastExternalContent = useRef(content);
  // Flag to track if we're in the middle of an internal update
  const isInternalUpdate = useRef(false);
  // Force re-render on selection changes for toolbar state
  const [, setSelectionKey] = useState(0);
  
  // Convert markdown to HTML for initial content
  const initialHtml = markdownToHtml(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: initialHtml,
    editable,
    immediatelyRender: false, // Prevent SSR hydration mismatch
    editorProps: {
      attributes: {
        class: "tiptap-content focus:outline-none min-h-[200px]",
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        // Mark this as an internal update so useEffect doesn't reset cursor
        isInternalUpdate.current = true;
        const html = editor.getHTML();
        const markdown = turndownService.turndown(html);
        onChange(markdown);
      }
    },
    onSelectionUpdate: () => {
      // Trigger re-render to update toolbar button states
      setSelectionKey((k) => k + 1);
    },
  });

  // Update content only when it changes externally (e.g., regeneration)
  useEffect(() => {
    if (!editor) return;
    
    // Skip if this is an internal update (user typing)
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    
    // Only update if external content actually changed (like regeneration)
    if (content !== lastExternalContent.current) {
      const html = markdownToHtml(content);
      editor.commands.setContent(html);
      lastExternalContent.current = content;
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--border)] bg-[var(--grey-0)]">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </ToolbarButton>
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <Italic size={16} />
        </ToolbarButton>
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List size={16} />
        </ToolbarButton>
        <div className="w-px h-4 bg-[var(--border)] mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          isActive={false}
          disabled={!editor.can().undo()}
          title="Undo (⌘Z)"
        >
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          isActive={false}
          disabled={!editor.can().redo()}
          title="Redo (⌘⇧Z)"
        >
          <Redo2 size={16} />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive: boolean;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, title, disabled, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        "text-[var(--grey-600)] hover:text-[var(--grey-800)] hover:bg-[var(--grey-50-a)]",
        isActive && "bg-[var(--grey-100-a)] text-[var(--grey-800)]",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-[var(--grey-600)]"
      )}
    >
      {children}
    </button>
  );
}
