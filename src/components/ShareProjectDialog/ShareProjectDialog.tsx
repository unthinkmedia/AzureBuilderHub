import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Input,
  Spinner,
} from "@fluentui/react-components";
import {
  listProjectShares,
  shareProject,
  unshareProject,
  searchUsers,
} from "../../api/client";
import type { ShareInfo } from "../types";
import type { UserSearchResult } from "../../api/client";
import "./ShareProjectDialog.css";

export interface ShareProjectDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export const ShareProjectDialog: React.FC<ShareProjectDialogProps> = ({
  projectId,
  open,
  onClose,
}) => {
  const [shares, setShares] = useState<ShareInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchShares = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProjectShares(projectId);
      setShares(data);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      fetchShares();
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open, fetchShares]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      // Filter out users already shared with
      const sharedUserIds = new Set(shares.map((s) => s.sharedWithId));
      setSearchResults(results.filter((u) => !sharedUserIds.has(u.userId)));
    } finally {
      setSearching(false);
    }
  };

  const handleShare = async (user: UserSearchResult) => {
    setSharing(user.userId);
    try {
      const newShare = await shareProject(projectId, user.userId, user.userDetails);
      setShares((prev) => [...prev, newShare]);
      setSearchResults((prev) => prev.filter((u) => u.userId !== user.userId));
    } finally {
      setSharing(null);
    }
  };

  const handleUnshare = async (share: ShareInfo) => {
    setRemoving(share.id);
    try {
      await unshareProject(projectId, share.id);
      setShares((prev) => prev.filter((s) => s.id !== share.id));
    } finally {
      setRemoving(null);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => { if (!data.open) onClose(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Share Project</DialogTitle>
          <DialogContent>
            <div className="abh-share-dialog__content">
              {/* Search for users */}
              <div className="abh-share-dialog__search">
                <Input
                  placeholder="Search users by name…"
                  value={searchQuery}
                  onChange={(_, d) => setSearchQuery(d.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                  style={{ flex: 1 }}
                  aria-label="Search for users to share with"
                />
                <Button
                  appearance="primary"
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                >
                  {searching ? "Searching…" : "Search"}
                </Button>
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="abh-share-dialog__search-results">
                  {searchResults.map((user) => (
                    <button
                      key={user.userId}
                      className="abh-share-dialog__search-item"
                      onClick={() => handleShare(user)}
                      disabled={sharing === user.userId}
                    >
                      <span className="abh-share-dialog__search-item-name">
                        {user.userDetails}
                      </span>
                      <span className="abh-share-dialog__search-item-action">
                        {sharing === user.userId ? "Sharing…" : "Share"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !searching && (
                <div className="abh-share-dialog__no-results">
                  No users found matching "{searchQuery}"
                </div>
              )}

              {/* Divider */}
              {shares.length > 0 && <div className="abh-share-dialog__divider" />}

              {/* Currently shared with */}
              {loading ? (
                <Spinner size="small" label="Loading shares…" />
              ) : shares.length > 0 ? (
                <>
                  <h4 className="abh-share-dialog__shared-heading">
                    Shared with ({shares.length})
                  </h4>
                  <div className="abh-share-dialog__shared-list">
                    {shares.map((share) => (
                      <div key={share.id} className="abh-share-dialog__shared-item">
                        <div className="abh-share-dialog__shared-item-info">
                          <span className="abh-share-dialog__shared-item-name">
                            {share.sharedWithName}
                          </span>
                          <span className="abh-share-dialog__shared-item-date">
                            Shared {formatDate(share.createdAt)}
                          </span>
                        </div>
                        <Button
                          appearance="subtle"
                          size="small"
                          onClick={() => handleUnshare(share)}
                          disabled={removing === share.id}
                        >
                          {removing === share.id ? "Removing…" : "Unshare"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="abh-share-dialog__empty">
                  This project hasn't been shared with anyone yet.
                </div>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>Done</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
