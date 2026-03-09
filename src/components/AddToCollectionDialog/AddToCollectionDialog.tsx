import React, { useEffect, useState } from "react";
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
  listCollections,
  createCollection,
  addProjectToCollection,
  removeProjectFromCollection,
} from "../../api/client";
import type { CollectionSummary } from "../types";
import "./AddToCollectionDialog.css";

export interface AddToCollectionDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export const AddToCollectionDialog: React.FC<AddToCollectionDialogProps> = ({
  projectId,
  open,
  onClose,
}) => {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listCollections()
      .then(setCollections)
      .finally(() => setLoading(false));
  }, [open]);

  const isInCollection = (col: CollectionSummary) => col.projectIds.includes(projectId);

  const handleToggle = async (col: CollectionSummary) => {
    setToggling(col.id);
    try {
      if (isInCollection(col)) {
        const updated = await removeProjectFromCollection(col.id, projectId);
        setCollections((prev) =>
          prev.map((c) => (c.id === col.id ? updated : c))
        );
      } else {
        const updated = await addProjectToCollection(col.id, projectId);
        setCollections((prev) =>
          prev.map((c) => (c.id === col.id ? updated : c))
        );
      }
    } finally {
      setToggling(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const created = await createCollection({ name: newName.trim(), description: "" });
    // Immediately add the project to the new collection
    const updated = await addProjectToCollection(created.id, projectId);
    setCollections((prev) => [updated, ...prev]);
    setNewName("");
    setShowCreate(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => { if (!data.open) onClose(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Add to Collection</DialogTitle>
          <DialogContent>
            {loading ? (
              <Spinner size="small" label="Loading collections…" />
            ) : (
              <div className="abh-add-to-collection__list">
                {collections.map((col) => (
                  <button
                    key={col.id}
                    className="abh-add-to-collection__item"
                    onClick={() => handleToggle(col)}
                    disabled={toggling === col.id}
                    aria-pressed={isInCollection(col)}
                  >
                    <div
                      className={`abh-add-to-collection__check ${
                        isInCollection(col) ? "abh-add-to-collection__check--active" : ""
                      }`}
                    />
                    <span className="abh-add-to-collection__item-name">{col.name}</span>
                    <span className="abh-add-to-collection__item-count">
                      {col.projectIds.length}
                    </span>
                  </button>
                ))}

                {collections.length > 0 && <div className="abh-add-to-collection__divider" />}

                {showCreate ? (
                  <div className="abh-add-to-collection__inline-create">
                    <Input
                      placeholder="Collection name"
                      value={newName}
                      onChange={(_, d) => setNewName(d.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                      autoFocus
                      style={{ flex: 1 }}
                    />
                    <Button size="small" appearance="primary" onClick={handleCreate} disabled={!newName.trim()}>
                      Add
                    </Button>
                  </div>
                ) : (
                  <button
                    className="abh-add-to-collection__create"
                    onClick={() => setShowCreate(true)}
                  >
                    + Create new collection
                  </button>
                )}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>Done</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
