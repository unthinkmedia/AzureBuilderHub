import React, { useState, useMemo } from "react";

export interface SchemaFile {
  /** Display name (e.g., "SREAgent.schema.json") */
  name: string;
  /** The raw content — string (code/JSON) or object (will be serialized) */
  content: string | Record<string, unknown>;
  /** Language hint for syntax highlighting class */
  language?: "json" | "typescript" | "javascript" | "css";
}

export interface SchemaInspectorProps {
  /** Files to display */
  files: SchemaFile[];
  /** Initially selected file index */
  defaultFileIndex?: number;
  /** Max height before scrolling — defaults to 400px */
  maxHeight?: number;
  /** Optional additional CSS class */
  className?: string;
}

/**
 * SchemaInspector — A read-only code/JSON viewer with file tabs.
 *
 * Displays page schemas and component source in a tabbed panel.
 * Supports JSON pretty-printing with inline syntax color classes.
 *
 * @storybook-candidate — Specialized code viewer, lower priority for upstream.
 */
export const SchemaInspector: React.FC<SchemaInspectorProps> = ({
  files,
  defaultFileIndex = 0,
  maxHeight = 400,
  className,
}) => {
  const [activeIndex, setActiveIndex] = useState(defaultFileIndex);
  const activeFile = files[activeIndex];

  const formattedContent = useMemo(() => {
    if (!activeFile) return "";
    if (typeof activeFile.content === "string") return activeFile.content;
    return JSON.stringify(activeFile.content, null, 2);
  }, [activeFile]);

  const highlighted = useMemo(() => {
    const lang = activeFile?.language ?? "json";
    if (lang === "json") return highlightJson(formattedContent);
    return escapeHtml(formattedContent);
  }, [formattedContent, activeFile?.language]);

  if (files.length === 0) {
    return (
      <div className={`abh-schema-inspector ${className ?? ""}`}>
        <div className="abh-schema-inspector__empty">No files to display</div>
      </div>
    );
  }

  return (
    <div className={`abh-schema-inspector ${className ?? ""}`}>
      {/* File tabs */}
      {files.length > 1 && (
        <div className="abh-schema-inspector__tabs" role="tablist" aria-label="Schema files">
          {files.map((file, i) => (
            <button
              key={file.name}
              className={`abh-schema-inspector__tab ${i === activeIndex ? "abh-schema-inspector__tab--active" : ""}`}
              role="tab"
              aria-selected={i === activeIndex}
              onClick={() => setActiveIndex(i)}
            >
              {file.name}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="abh-schema-inspector__toolbar">
        {files.length === 1 && (
          <span className="abh-schema-inspector__filename">{activeFile.name}</span>
        )}
        <button
          className="abh-schema-inspector__copy"
          onClick={() => navigator.clipboard?.writeText(formattedContent)}
          aria-label="Copy to clipboard"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          Copy
        </button>
      </div>

      {/* Code panel */}
      <div
        className="abh-schema-inspector__code-wrapper"
        style={{ maxHeight }}
        role="tabpanel"
      >
        <pre className="abh-schema-inspector__pre">
          <code
            className={`abh-schema-inspector__code language-${activeFile.language ?? "json"}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
};

/* Lightweight JSON syntax highlighting — no external library */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightJson(json: string): string {
  const escaped = escapeHtml(json);
  return escaped
    // strings
    .replace(
      /(&quot;|")((?:[^"\\]|\\.)*)(&quot;|")/g,
      (match, _q1, inner, _q2) => {
        // Check if this is a key (followed by colon)
        return `<span class="abh-hl-string">"${inner}"</span>`;
      }
    )
    // numbers
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="abh-hl-number">$1</span>')
    // booleans & null
    .replace(/\b(true|false|null)\b/g, '<span class="abh-hl-keyword">$1</span>');
}
