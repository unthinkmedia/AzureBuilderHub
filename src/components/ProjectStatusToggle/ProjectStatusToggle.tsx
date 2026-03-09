import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
} from "@fluentui/react-components";
import {
  ArrowUpload24Regular,
  ArrowDownload24Regular,
  ArrowReset24Regular,
} from "@fluentui/react-icons";
import type { ProjectStatus } from "../types";

export interface ProjectStatusToggleProps {
  /** Current project status */
  status: ProjectStatus;
  /** Callback when status change is confirmed */
  onStatusChange: (newStatus: ProjectStatus) => void | Promise<void>;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Optional additional CSS class */
  className?: string;
}

/**
 * ProjectStatusToggle — Publish/unpublish control with confirmation dialog.
 *
 * Shows current status as a badge with a toggle button.
 * Requires confirmation before changing status (draft ↔ published).
 *
 * @storybook-candidate — Generalize to `StatusToggle` for upstream.
 */
export const ProjectStatusToggle: React.FC<ProjectStatusToggleProps> = ({
  status,
  onStatusChange,
  disabled = false,
  className,
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null);

  const targetStatus: ProjectStatus = status === "published" ? "draft" : "published";

  const handleToggleClick = useCallback(() => {
    setPendingStatus(targetStatus);
    setShowDialog(true);
  }, [targetStatus]);

  const handleConfirm = useCallback(() => {
    if (pendingStatus) {
      onStatusChange(pendingStatus);
    }
    setShowDialog(false);
    setPendingStatus(null);
  }, [pendingStatus, onStatusChange]);

  const handleCancel = useCallback(() => {
    setShowDialog(false);
    setPendingStatus(null);
  }, []);

  const statusConfig = {
    draft: {
      label: "Draft",
      badgeClass: "abh-status-toggle__badge--draft",
      actionLabel: "Publish to Community",
      actionIcon: "publish",
    },
    published: {
      label: "Published",
      badgeClass: "abh-status-toggle__badge--published",
      actionLabel: "Unpublish",
      actionIcon: "unpublish",
    },
    archived: {
      label: "Archived",
      badgeClass: "abh-status-toggle__badge--archived",
      actionLabel: "Restore",
      actionIcon: "restore",
    },
  };

  const config = statusConfig[status];

  const actionIcons = {
    draft: <ArrowUpload24Regular />,
    published: <ArrowDownload24Regular />,
    archived: <ArrowReset24Regular />,
  };

  return (
    <>
      <Button
        appearance="outline"
        size="small"
        onClick={handleToggleClick}
        disabled={disabled || status === "archived"}
        icon={actionIcons[status]}
        className={className}
        aria-label={config.actionLabel}
      >
        {config.actionLabel}
      </Button>

      {/* Confirmation dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(_, data) => { if (!data.open) handleCancel(); }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              {pendingStatus === "published" ? "Publish to Community?" : "Unpublish Project?"}
            </DialogTitle>
            <DialogContent>
              <p>
                {pendingStatus === "published"
                  ? "This project will appear in the Community Gallery. Other designers will be able to view and fork it."
                  : "This project will be removed from the Community Gallery. Existing forks will not be affected."}
              </p>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={handleConfirm}
                autoFocus
              >
                {pendingStatus === "published" ? "Publish" : "Unpublish"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};
