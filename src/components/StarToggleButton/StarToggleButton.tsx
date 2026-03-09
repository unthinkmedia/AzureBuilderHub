import React, { useState, useCallback } from "react";
import { ToggleButton } from "@fluentui/react-components";
import { Star24Regular, Star24Filled } from "@fluentui/react-icons";

export interface StarToggleButtonProps {
  /** Current star count */
  count: number;
  /** Whether the current user has starred */
  isStarred: boolean;
  /** Callback when the star is toggled — receives the new desired state */
  onToggle: (starred: boolean) => void | Promise<void>;
  /** Disable the button (e.g., during API call) */
  disabled?: boolean;
  /** Size variant */
  size?: "small" | "medium";
  /** Optional additional CSS class */
  className?: string;
}

/**
 * StarToggleButton — A toggle button with star icon and live count.
 *
 * Optimistically updates the count on click and calls `onToggle`.
 * Generalizable to `ToggleCountButton` for Storybook contribution.
 *
 * @storybook-candidate — Generalize icon/label props for upstream.
 */
export const StarToggleButton: React.FC<StarToggleButtonProps> = ({
  count,
  isStarred,
  onToggle,
  disabled = false,
  size = "medium",
  className,
}) => {
  const [optimisticStarred, setOptimisticStarred] = useState(isStarred);
  const [optimisticCount, setOptimisticCount] = useState(count);

  // Sync when props change from parent
  React.useEffect(() => {
    setOptimisticStarred(isStarred);
    setOptimisticCount(count);
  }, [isStarred, count]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    const nextStarred = !optimisticStarred;
    setOptimisticStarred(nextStarred);
    setOptimisticCount((prev) => prev + (nextStarred ? 1 : -1));
    onToggle(nextStarred);
  }, [disabled, optimisticStarred, onToggle]);

  const formattedCount =
    optimisticCount >= 1000
      ? `${(optimisticCount / 1000).toFixed(1)}K`
      : optimisticCount.toString();

  const StarIcon = optimisticStarred ? Star24Filled : Star24Regular;

  return (
    <ToggleButton
      checked={optimisticStarred}
      onClick={handleClick}
      disabled={disabled}
      size={size}
      icon={<StarIcon style={optimisticStarred ? { color: "var(--colorPaletteYellowForeground1)" } : undefined} />}
      appearance="subtle"
      className={className}
      aria-label={optimisticStarred ? `Unstar (${optimisticCount} stars)` : `Star (${optimisticCount} stars)`}
    >
      {formattedCount}
    </ToggleButton>
  );
};
