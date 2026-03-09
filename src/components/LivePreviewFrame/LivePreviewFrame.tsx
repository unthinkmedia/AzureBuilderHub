import React, { useState, useCallback, useRef } from "react";

export interface LivePreviewFrameProps {
  /** URL of the built Vite app to preview */
  src: string;
  /** Title for the iframe (accessibility) */
  title: string;
  /** Show a fullscreen toggle button */
  allowFullscreen?: boolean;
  /** Aspect ratio — defaults to 16/9. Set to "fill" to stretch to container. */
  aspectRatio?: "16/9" | "4/3" | "fill";
  /** Optional additional CSS class */
  className?: string;
  /** Called when iframe fails to load */
  onError?: () => void;
}

type FrameState = "loading" | "ready" | "error";

/**
 * LivePreviewFrame — An iframe wrapper with loading/error states.
 *
 * Wraps a built Vite app URL in a sandboxed iframe with:
 * - Spinner overlay during load
 * - Error fallback when URL is unreachable
 * - Optional fullscreen toggle
 * - configurable aspect ratio
 *
 * @storybook-candidate — Generic iframe preview component.
 */
export const LivePreviewFrame: React.FC<LivePreviewFrameProps> = ({
  src,
  title,
  allowFullscreen = true,
  aspectRatio = "16/9",
  className,
  onError,
}) => {
  const [state, setState] = useState<FrameState>("loading");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLoad = useCallback(() => {
    setState("ready");
  }, []);

  const handleError = useCallback(() => {
    setState("error");
    onError?.();
  }, [onError]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Listen for fullscreen change events to sync state
  React.useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const aspectStyle =
    aspectRatio === "fill"
      ? { width: "100%", height: "100%" }
      : { aspectRatio: aspectRatio.replace("/", " / "), width: "100%" };

  return (
    <div
      ref={containerRef}
      className={`abh-preview-frame ${className ?? ""}`}
      style={aspectStyle}
    >
      {/* Loading overlay */}
      {state === "loading" && (
        <div className="abh-preview-frame__overlay" aria-live="polite">
          <div className="abh-preview-frame__spinner" aria-label="Loading preview">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <circle
                cx="12" cy="12" r="10"
                stroke="var(--colorBrandStroke1, #0078d4)"
                strokeWidth="3"
                fill="none"
                strokeDasharray="31.4 31.4"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
            <span>Loading preview…</span>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {state === "error" && (
        <div className="abh-preview-frame__overlay abh-preview-frame__overlay--error">
          <div className="abh-preview-frame__error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="var(--colorPaletteRedForeground1, #d13438)" strokeWidth="2" />
              <path d="M12 7v6M12 16v1" stroke="var(--colorPaletteRedForeground1, #d13438)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>Preview unavailable</span>
            <button
              className="abh-preview-frame__retry"
              onClick={() => setState("loading")}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        src={state !== "error" ? src : undefined}
        title={title}
        className="abh-preview-frame__iframe"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
      />

      {/* Fullscreen toggle */}
      {allowFullscreen && state === "ready" && (
        <button
          className="abh-preview-frame__fullscreen"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            {isFullscreen ? (
              <path d="M5 1v4H1M11 1v4h4M5 15v-4H1M11 15v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M1 5V1h4M15 5V1h-4M1 11v4h4M15 11v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </button>
      )}
    </div>
  );
};
