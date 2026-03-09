import React from "react";

export interface VersionEntry {
  /** Version identifier (e.g., "v3") */
  label: string;
  /** ISO timestamp */
  timestamp: string;
  /** Optional summary / changelog note */
  summary?: string;
  /** Whether this is the currently active version */
  isCurrent?: boolean;
}

export interface VersionTimelineProps {
  /** Ordered list of versions (newest first) */
  versions: VersionEntry[];
  /** Called when a version entry is clicked */
  onSelect?: (label: string) => void;
  /** Optional additional CSS class */
  className?: string;
}

/**
 * VersionTimeline — A vertical timeline displaying version history.
 *
 * Shows version number, timestamp, optional changelog, and marks the current version.
 * Each entry is selectable to view or restore that version.
 *
 * @storybook-candidate — Generic timeline component, high priority for upstream.
 */
export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  onSelect,
  className,
}) => {
  if (versions.length === 0) {
    return (
      <div className={`abh-version-timeline ${className ?? ""}`}>
        <div className="abh-version-timeline__empty">No versions yet</div>
      </div>
    );
  }

  return (
    <ol className={`abh-version-timeline ${className ?? ""}`} aria-label="Version history">
      {versions.map((version, index) => (
        <li
          key={version.label}
          className={`abh-version-timeline__entry ${version.isCurrent ? "abh-version-timeline__entry--current" : ""}`}
        >
          {/* Timeline connector line */}
          <div className="abh-version-timeline__rail">
            <div
              className={`abh-version-timeline__dot ${version.isCurrent ? "abh-version-timeline__dot--current" : ""}`}
              aria-hidden="true"
            />
            {index < versions.length - 1 && (
              <div className="abh-version-timeline__line" aria-hidden="true" />
            )}
          </div>

          {/* Content */}
          <div className="abh-version-timeline__content">
            <div className="abh-version-timeline__header">
              <span className="abh-version-timeline__label">
                {version.label}
                {version.isCurrent && (
                  <span className="abh-version-timeline__badge">Current</span>
                )}
              </span>
              <time className="abh-version-timeline__time" dateTime={version.timestamp}>
                {formatTimestamp(version.timestamp)}
              </time>
            </div>

            {version.summary && (
              <p className="abh-version-timeline__summary">{version.summary}</p>
            )}

            {onSelect && (
              <button
                className="abh-version-timeline__action"
                onClick={() => onSelect(version.label)}
                aria-label={`View ${version.label}`}
              >
                View this version
              </button>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
