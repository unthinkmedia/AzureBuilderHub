import React, { useState, useMemo } from "react";

export type DiffViewMode = "split" | "unified" | "preview";

export interface DiffSide {
  /** Version label (e.g., "v2") */
  label: string;
  /** Raw content for text diff */
  content?: string;
  /** Preview URL for iframe comparison */
  previewUrl?: string;
}

export interface VersionDiffViewerProps {
  /** Left (older) version */
  left: DiffSide;
  /** Right (newer) version */
  right: DiffSide;
  /** Default view mode */
  defaultMode?: DiffViewMode;
  /** Max height before scrolling */
  maxHeight?: number;
  /** Optional additional CSS class */
  className?: string;
}

/**
 * VersionDiffViewer — Side-by-side comparison of two project versions.
 *
 * Supports three modes:
 * - **split**: Side-by-side text diff with additions/deletions highlighted
 * - **unified**: Inline diff view
 * - **preview**: Side-by-side iframe previews of both versions
 *
 * @storybook-candidate — Specialized, lower priority for upstream.
 */
export const VersionDiffViewer: React.FC<VersionDiffViewerProps> = ({
  left,
  right,
  defaultMode = "split",
  maxHeight = 500,
  className,
}) => {
  const [mode, setMode] = useState<DiffViewMode>(defaultMode);

  const diffLines = useMemo(() => {
    if (!left.content || !right.content) return null;
    return computeDiff(left.content, right.content);
  }, [left.content, right.content]);

  const stats = useMemo(() => {
    if (!diffLines) return { added: 0, removed: 0 };
    return {
      added: diffLines.filter((l) => l.type === "added").length,
      removed: diffLines.filter((l) => l.type === "removed").length,
    };
  }, [diffLines]);

  return (
    <div className={`abh-diff-viewer ${className ?? ""}`}>
      {/* Toolbar */}
      <div className="abh-diff-viewer__toolbar">
        <div className="abh-diff-viewer__labels">
          <span className="abh-diff-viewer__version-label">{left.label}</span>
          <span className="abh-diff-viewer__arrow" aria-hidden="true">→</span>
          <span className="abh-diff-viewer__version-label">{right.label}</span>
          {diffLines && (
            <span className="abh-diff-viewer__stats">
              <span className="abh-diff-viewer__stat--added">+{stats.added}</span>
              <span className="abh-diff-viewer__stat--removed">-{stats.removed}</span>
            </span>
          )}
        </div>
        <div className="abh-diff-viewer__modes" role="tablist" aria-label="Diff view mode">
          {(["split", "unified", "preview"] as const).map((m) => (
            <button
              key={m}
              className={`abh-diff-viewer__mode-btn ${mode === m ? "abh-diff-viewer__mode-btn--active" : ""}`}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              disabled={m === "preview" && !left.previewUrl && !right.previewUrl}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="abh-diff-viewer__content" style={{ maxHeight }}>
        {mode === "preview" ? (
          <div className="abh-diff-viewer__previews">
            <div className="abh-diff-viewer__preview-pane">
              <div className="abh-diff-viewer__preview-header">{left.label}</div>
              {left.previewUrl ? (
                <iframe
                  src={left.previewUrl}
                  title={`Preview of ${left.label}`}
                  className="abh-diff-viewer__iframe"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="abh-diff-viewer__no-preview">No preview available</div>
              )}
            </div>
            <div className="abh-diff-viewer__divider" aria-hidden="true" />
            <div className="abh-diff-viewer__preview-pane">
              <div className="abh-diff-viewer__preview-header">{right.label}</div>
              {right.previewUrl ? (
                <iframe
                  src={right.previewUrl}
                  title={`Preview of ${right.label}`}
                  className="abh-diff-viewer__iframe"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="abh-diff-viewer__no-preview">No preview available</div>
              )}
            </div>
          </div>
        ) : mode === "split" && diffLines ? (
          <div className="abh-diff-viewer__split">
            <pre className="abh-diff-viewer__pane abh-diff-viewer__pane--left">
              {diffLines
                .filter((l) => l.type !== "added")
                .map((line, i) => (
                  <div
                    key={i}
                    className={`abh-diff-viewer__line ${line.type === "removed" ? "abh-diff-viewer__line--removed" : ""}`}
                  >
                    <span className="abh-diff-viewer__line-num">
                      {line.type === "removed" ? line.leftNum : line.leftNum}
                    </span>
                    <span className="abh-diff-viewer__line-text">{line.text}</span>
                  </div>
                ))}
            </pre>
            <div className="abh-diff-viewer__divider" aria-hidden="true" />
            <pre className="abh-diff-viewer__pane abh-diff-viewer__pane--right">
              {diffLines
                .filter((l) => l.type !== "removed")
                .map((line, i) => (
                  <div
                    key={i}
                    className={`abh-diff-viewer__line ${line.type === "added" ? "abh-diff-viewer__line--added" : ""}`}
                  >
                    <span className="abh-diff-viewer__line-num">
                      {line.type === "added" ? line.rightNum : line.rightNum}
                    </span>
                    <span className="abh-diff-viewer__line-text">{line.text}</span>
                  </div>
                ))}
            </pre>
          </div>
        ) : diffLines ? (
          <pre className="abh-diff-viewer__unified">
            {diffLines.map((line, i) => (
              <div
                key={i}
                className={`abh-diff-viewer__line ${
                  line.type === "added"
                    ? "abh-diff-viewer__line--added"
                    : line.type === "removed"
                      ? "abh-diff-viewer__line--removed"
                      : ""
                }`}
              >
                <span className="abh-diff-viewer__line-prefix">
                  {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                </span>
                <span className="abh-diff-viewer__line-text">{line.text}</span>
              </div>
            ))}
          </pre>
        ) : (
          <div className="abh-diff-viewer__empty">
            No text content to compare. Switch to Preview mode.
          </div>
        )}
      </div>
    </div>
  );
};

/* Simple line-level diff algorithm (LCS-based) */

interface DiffLine {
  type: "unchanged" | "added" | "removed";
  text: string;
  leftNum?: number;
  rightNum?: number;
}

function computeDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split("\n");
  const rightLines = right.split("\n");
  const result: DiffLine[] = [];

  // Build LCS table
  const m = leftLines.length;
  const n = rightLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  let i = m;
  let j = n;
  const temp: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      temp.push({ type: "unchanged", text: leftLines[i - 1], leftNum: i, rightNum: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      temp.push({ type: "added", text: rightLines[j - 1], rightNum: j });
      j--;
    } else {
      temp.push({ type: "removed", text: leftLines[i - 1], leftNum: i });
      i--;
    }
  }

  // Reverse since we built from bottom-up
  for (let k = temp.length - 1; k >= 0; k--) {
    result.push(temp[k]);
  }

  return result;
}
