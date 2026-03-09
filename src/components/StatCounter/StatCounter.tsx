import React from "react";

export interface StatCounterProps {
  /** Icon element to display (e.g., star, fork, page icon) */
  icon: React.ReactNode;
  /** Numeric count to display */
  count: number;
  /** Accessible label describing the stat (e.g., "42 stars") */
  ariaLabel: string;
  /** Optional size variant */
  size?: "small" | "medium";
  /** Optional additional CSS class */
  className?: string;
}

/**
 * StatCounter — Displays an icon alongside a formatted number.
 *
 * A small inline element for showing counts (stars, forks, pages, etc.)
 * with an icon prefix. Formats large numbers with compact notation (e.g., 1.2K).
 *
 * @storybook-candidate — Generic, reusable beyond the Hub.
 */
export const StatCounter: React.FC<StatCounterProps> = ({
  icon,
  count,
  ariaLabel,
  size = "medium",
  className,
}) => {
  const formattedCount = formatCount(count);

  return (
    <span
      className={`abh-stat-counter abh-stat-counter--${size} ${className ?? ""}`}
      aria-label={ariaLabel}
      role="status"
    >
      <span className="abh-stat-counter__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="abh-stat-counter__value">{formattedCount}</span>
    </span>
  );
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
