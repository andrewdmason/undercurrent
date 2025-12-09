"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { GenerationLog } from "@/lib/types";

interface GenerationLogCardProps {
  log: GenerationLog;
  projectName: string;
}

export function GenerationLogCard({ log, projectName }: GenerationLogCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const createdAt = new Date(log.created_at);
  const formattedDate = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = createdAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const ideasCount = log.ideas_created?.length || 0;
  const hasError = !!log.error;

  return (
    <div className="bg-[var(--grey-0)] border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--grey-50-a)] transition-colors"
      >
        <div className="flex items-center gap-3">
          {hasError ? (
            <AlertCircle size={18} className="text-[var(--red-500)]" />
          ) : (
            <CheckCircle2 size={18} className="text-[var(--green-500)]" />
          )}
          <div className="text-left">
            <div className="text-sm font-medium text-[var(--grey-800)]">
              {projectName}
            </div>
            <div className="text-xs text-[var(--grey-400)]">
              {formattedDate} at {formattedTime} · {log.model}
              {hasError ? (
                <span className="text-[var(--red-500)]"> · Failed</span>
              ) : (
                <span> · {ideasCount} ideas created</span>
              )}
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-[var(--grey-400)]" />
        ) : (
          <ChevronDown size={18} className="text-[var(--grey-400)]" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[var(--border)] px-4 py-4 space-y-4">
          {/* Error message if present */}
          {hasError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-xs font-medium text-red-800 mb-1">Error</div>
              <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
                {log.error}
              </pre>
            </div>
          )}

          {/* Prompt sent */}
          <div>
            <div className="text-xs font-medium text-[var(--grey-600)] mb-2">
              Prompt Sent
            </div>
            <div className="bg-[var(--grey-50)] rounded-lg p-3 max-h-64 overflow-auto">
              <pre className="text-xs text-[var(--grey-800)] whitespace-pre-wrap font-mono">
                {log.prompt_sent}
              </pre>
            </div>
          </div>

          {/* Response received */}
          {log.response_raw && (
            <div>
              <div className="text-xs font-medium text-[var(--grey-600)] mb-2">
                Response Received
              </div>
              <div className="bg-[var(--grey-50)] rounded-lg p-3 max-h-64 overflow-auto">
                <pre className="text-xs text-[var(--grey-800)] whitespace-pre-wrap font-mono">
                  {formatResponse(log.response_raw)}
                </pre>
              </div>
            </div>
          )}

          {/* Ideas created */}
          {log.ideas_created && log.ideas_created.length > 0 && (
            <div>
              <div className="text-xs font-medium text-[var(--grey-600)] mb-2">
                Ideas Created
              </div>
              <div className="flex flex-wrap gap-2">
                {log.ideas_created.map((id) => (
                  <code
                    key={id}
                    className="text-xs bg-[var(--grey-50)] px-2 py-1 rounded text-[var(--grey-600)] font-mono"
                  >
                    {id.slice(0, 8)}...
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatResponse(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}




