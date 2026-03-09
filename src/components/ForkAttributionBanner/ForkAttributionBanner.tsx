import React from "react";
import type { ForkedFrom } from "../types";

export interface ForkAttributionBannerProps {
  /** Fork origin data */
  forkedFrom: ForkedFrom;
  /** Called when the original project name is clicked */
  onNavigateToOriginal?: (projectId: string) => void;
  /** Whether the original project is still available */
  originalAvailable?: boolean;
  /** Optional additional CSS class */
  className?: string;
}

/**
 * ForkAttributionBanner — Displays "Forked from X by Y" attribution.
 *
 * Shows a subtle inline banner linking back to the original project.
 * Gracefully handles deleted/unpublished originals.
 *
 * @storybook-candidate — Generalize to `AttributionBanner` for upstream.
 */
export const ForkAttributionBanner: React.FC<ForkAttributionBannerProps> = ({
  forkedFrom,
  onNavigateToOriginal,
  originalAvailable = true,
  className,
}) => {
  const handleClick = () => {
    if (originalAvailable && onNavigateToOriginal) {
      onNavigateToOriginal(forkedFrom.projectId);
    }
  };

  return (
    <div className={`abh-fork-banner ${className ?? ""}`} role="note" aria-label="Fork attribution">
      <svg
        className="abh-fork-banner__icon"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM14 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM9.5 12.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM3.5 5v2.5A2.5 2.5 0 0 0 6 10h4a2.5 2.5 0 0 0 2.5-2.5V5M8 10v1"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="abh-fork-banner__text">
        Forked from{" "}
        {originalAvailable && onNavigateToOriginal ? (
          <button
            className="abh-fork-banner__link"
            onClick={handleClick}
            aria-label={`Go to original project: ${forkedFrom.projectName}`}
          >
            {forkedFrom.projectName}
          </button>
        ) : (
          <span className="abh-fork-banner__unavailable">
            {forkedFrom.projectName}
            {!originalAvailable && " (no longer available)"}
          </span>
        )}{" "}
        by <span className="abh-fork-banner__author">{forkedFrom.authorName}</span>
      </span>
    </div>
  );
};
