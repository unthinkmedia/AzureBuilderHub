import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  listCollections,
  createCollection,
  deleteCollection,
  getCollection,
  listMyProjects,
  removeProjectFromCollection,
  updateCollection,
} from "../api/client";
import {
  Spinner,
  Button,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Input,
  Textarea,
  Field,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
} from "@fluentui/react-components";
import {
  MoreHorizontal20Regular,
  Delete20Regular,
  Share20Regular,
  Edit20Regular,
} from "@fluentui/react-icons";
import { ProjectCard } from "../components/ProjectCard";
import type { CollectionSummary, ProjectSummary } from "../components/types";
import type { ProjectCardVariant } from "../components/ProjectCard";
import "./Collections.css";

/* ── Collection card ── */
const CollectionCard: React.FC<{
  collection: CollectionSummary;
  projects: ProjectSummary[];
  onClick: () => void;
  onDelete: (id: string) => void;
  onShare: (collection: CollectionSummary) => void;
  onEdit: (collection: CollectionSummary) => void;
}> = ({ collection, projects, onClick, onDelete, onShare, onEdit }) => {
  const thumbProjects = projects
    .filter((p) => collection.projectIds.includes(p.id))
    .slice(0, 4);
  const remaining = collection.projectIds.length - thumbProjects.length;

  return (
    <div className="abh-collection-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      aria-label={`Collection: ${collection.name}`}
    >
      <div className="abh-collection-card__more">
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button
              appearance="subtle"
              size="small"
              icon={<MoreHorizontal20Regular />}
              onClick={(e) => e.stopPropagation()}
              aria-label="More actions"
            />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem
                icon={<Edit20Regular />}
                onClick={(e) => { e.stopPropagation(); onEdit(collection); }}
              >
                Edit
              </MenuItem>
              <MenuItem
                icon={<Share20Regular />}
                onClick={(e) => { e.stopPropagation(); onShare(collection); }}
              >
                Share collection
              </MenuItem>
              <MenuDivider />
              <MenuItem
                icon={<Delete20Regular />}
                onClick={(e) => { e.stopPropagation(); onDelete(collection.id); }}
              >
                Delete
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
      {thumbProjects.length > 0 && (
        <div className="abh-collection-card__thumbnails">
          {thumbProjects.map((p) => (
            <div key={p.id} className="abh-collection-card__thumb">
              {p.thumbnailUrl ? (
                <img src={p.thumbnailUrl} alt={p.name} loading="lazy" />
              ) : null}
            </div>
          ))}
          {remaining > 0 && (
            <div className="abh-collection-card__thumb-more">+{remaining}</div>
          )}
        </div>
      )}
      <h3 className="abh-collection-card__name">{collection.name}</h3>
      {collection.description && (
        <p className="abh-collection-card__description">{collection.description}</p>
      )}
      <div className="abh-collection-card__meta">
        <span>{collection.projectIds.length} project{collection.projectIds.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
};

/* ── Main page ── */
export const Collections: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId?: string }>();

  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectSummary[]>([]);
  const [activeCollection, setActiveCollection] = useState<CollectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editingCollection, setEditingCollection] = useState<CollectionSummary | null>(null);
  const [viewMode, setViewMode] = useState<ProjectCardVariant>("grid");

  // Share dialog
  const [showShare, setShowShare] = useState(false);
  const [shareCollection, setShareCollectionState] = useState<CollectionSummary | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cols, projs] = await Promise.all([listCollections(), listMyProjects()]);
      setCollections(cols);
      setAllProjects(projs);

      if (collectionId) {
        const col = cols.find((c) => c.id === collectionId);
        if (col) {
          setActiveCollection(col);
        } else {
          // Try fetching directly
          try {
            const fetched = await getCollection(collectionId);
            setActiveCollection(fetched);
          } catch {
            setActiveCollection(null);
          }
        }
      } else {
        setActiveCollection(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    if (user) fetchData();
    else setLoading(false);
  }, [user, fetchData]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createCollection({ name: newName.trim(), description: newDesc.trim() });
      setCollections((prev) => [created, ...prev]);
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this collection? Projects inside won't be affected.")) return;
    await deleteCollection(id);
    if (collectionId === id) {
      navigate("/collections");
    }
    fetchData();
  };

  const handleRemoveProject = async (projectId: string) => {
    if (!activeCollection) return;
    await removeProjectFromCollection(activeCollection.id, projectId);
    fetchData();
  };

  const openEdit = (col?: CollectionSummary) => {
    const target = col || activeCollection;
    if (!target) return;
    setEditingCollection(target);
    setEditName(target.name);
    setEditDesc(target.description);
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    const target = editingCollection || activeCollection;
    if (!target || !editName.trim()) return;
    await updateCollection(target.id, { name: editName.trim(), description: editDesc.trim() });
    fetchData();
    setShowEdit(false);
    setEditingCollection(null);
  };

  const handleShareCollection = (col: CollectionSummary) => {
    setShareCollectionState(col);
    setCopied(false);
    setShowShare(true);
  };

  const handleCopyLink = async () => {
    if (!shareCollection) return;
    const url = `${window.location.origin}/collections/${shareCollection.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* ── Shared dialogs rendered in both views ── */
  const sharedDialogs = (
    <>
      {/* Edit dialog */}
      <Dialog open={showEdit} onOpenChange={(_, data) => { if (!data.open) { setShowEdit(false); setEditingCollection(null); } }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogContent>
              <div className="abh-collections__form">
                <Field label="Name" required>
                  <Input value={editName} onChange={(_, d) => setEditName(d.value)} />
                </Field>
                <Field label="Description">
                  <Textarea value={editDesc} onChange={(_, d) => setEditDesc(d.value)} rows={2} />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => { setShowEdit(false); setEditingCollection(null); }}>Cancel</Button>
              <Button appearance="primary" onClick={handleEditSave} disabled={!editName.trim()}>Save</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Share collection dialog */}
      <Dialog open={showShare} onOpenChange={(_, data) => { if (!data.open) setShowShare(false); }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Share Collection</DialogTitle>
            <DialogContent>
              <div className="abh-collections__share-content">
                <p className="abh-collections__share-desc">
                  Share a link to <strong>{shareCollection?.name}</strong> with others.
                  {shareCollection && shareCollection.projectIds.length > 0 && (
                    <> This collection contains {shareCollection.projectIds.length} project{shareCollection.projectIds.length !== 1 ? "s" : ""}.</>
                  )}
                </p>
                <div className="abh-collections__share-link-row">
                  <Input
                    readOnly
                    value={shareCollection ? `${window.location.origin}/collections/${shareCollection.id}` : ""}
                    style={{ flex: 1 }}
                    aria-label="Collection link"
                  />
                  <Button appearance="primary" onClick={handleCopyLink}>
                    {copied ? "Copied!" : "Copy link"}
                  </Button>
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setShowShare(false)}>Done</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );

  if (!user) {
    return (
      <div className="abh-collections">
        <div className="abh-collections__empty">
          <h3>Sign in to view your collections</h3>
          <p>Organize your projects into collections, like playlists.</p>
          <Button appearance="primary" onClick={login}>Sign in with GitHub</Button>
        </div>
      </div>
    );
  }

  /* ── Detail view ── */
  if (activeCollection) {
    const collectionProjects = allProjects.filter((p) =>
      activeCollection.projectIds.includes(p.id)
    );

    return (
      <>
      <div className="abh-collections">
        <button className="abh-collections__back" onClick={() => navigate("/collections")}>
          ← Collections
        </button>

        <div className="abh-collections__detail-header">
          <div>
            <h1 className="abh-collections__title">{activeCollection.name}</h1>
            {activeCollection.description && (
              <p className="abh-collections__subtitle">{activeCollection.description}</p>
            )}
            <p className="abh-collections__subtitle">
              {activeCollection.projectIds.length} project{activeCollection.projectIds.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="abh-collections__detail-actions">
            <div className="abh-collections__view-toggle" role="radiogroup" aria-label="View mode">
              <button
                className={`abh-collections__view-btn ${viewMode === "grid" ? "abh-collections__view-btn--active" : ""}`}
                onClick={() => setViewMode("grid")}
                role="radio"
                aria-checked={viewMode === "grid"}
                aria-label="Grid view"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <rect x="1" y="1" width="6" height="6" rx="1" />
                  <rect x="9" y="1" width="6" height="6" rx="1" />
                  <rect x="1" y="9" width="6" height="6" rx="1" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                </svg>
              </button>
              <button
                className={`abh-collections__view-btn ${viewMode === "compact" ? "abh-collections__view-btn--active" : ""}`}
                onClick={() => setViewMode("compact")}
                role="radio"
                aria-checked={viewMode === "compact"}
                aria-label="List view"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <rect x="1" y="1" width="14" height="3" rx="1" />
                  <rect x="1" y="6" width="14" height="3" rx="1" />
                  <rect x="1" y="11" width="14" height="3" rx="1" />
                </svg>
              </button>
            </div>
            <Button appearance="subtle" onClick={() => openEdit()}>Edit</Button>
            <Button appearance="subtle" onClick={() => handleShareCollection(activeCollection)}>Share</Button>
            <Button appearance="subtle" onClick={() => handleDelete(activeCollection.id)}>Delete</Button>
          </div>
        </div>

        {collectionProjects.length === 0 ? (
          <div className="abh-collections__empty">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect x="6" y="14" width="36" height="24" rx="3" stroke="#d1d1d1" strokeWidth="2" fill="none" />
              <rect x="10" y="10" width="28" height="4" rx="2" stroke="#d1d1d1" strokeWidth="1.5" fill="none" />
            </svg>
            <h3>This collection is empty</h3>
            <p>Add projects from the project detail page.</p>
            <Button appearance="primary" onClick={() => navigate("/my-projects")}>Browse Projects</Button>
          </div>
        ) : (
          <div className={viewMode === "compact" ? "abh-collections__project-list" : "abh-collections__project-grid"}>
            {collectionProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={(id) => navigate(`/projects/${id}`)}
                onStar={() => handleRemoveProject(project.id)}
                variant={viewMode}
              />
            ))}
          </div>
        )}
      </div>
      {sharedDialogs}
      </>
    );
  }

  /* ── Collection list view ── */
  return (
    <div className="abh-collections">
      <div className="abh-collections__header">
        <div>
          <h1 className="abh-collections__title">Collections</h1>
          <p className="abh-collections__subtitle">
            {collections.length} collection{collections.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button appearance="primary" onClick={() => setShowCreate(true)}>
          + New Collection
        </Button>
      </div>

      {loading ? (
        <div className="abh-collections__loading">
          <Spinner size="medium" label="Loading collections…" />
        </div>
      ) : error ? (
        <div className="abh-collections__error">
          <p>{error}</p>
          <button onClick={fetchData}>Retry</button>
        </div>
      ) : collections.length === 0 ? (
        <div className="abh-collections__empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <rect x="6" y="14" width="36" height="24" rx="3" stroke="#d1d1d1" strokeWidth="2" fill="none" />
            <rect x="10" y="10" width="28" height="4" rx="2" stroke="#d1d1d1" strokeWidth="1.5" fill="none" />
          </svg>
          <h3>No collections yet</h3>
          <p>Create a collection to organize your projects, like a playlist.</p>
          <Button appearance="primary" onClick={() => setShowCreate(true)}>
            Create your first collection
          </Button>
        </div>
      ) : (
        <div className="abh-collections__grid">
          {collections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              projects={allProjects}
              onClick={() => navigate(`/collections/${col.id}`)}
              onDelete={handleDelete}
              onShare={handleShareCollection}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(_, data) => setShowCreate(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>New Collection</DialogTitle>
            <DialogContent>
              <div className="abh-collections__form">
                <Field label="Name" required>
                  <Input
                    placeholder="e.g. Portal Core Pages"
                    value={newName}
                    onChange={(_, d) => setNewName(d.value)}
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    placeholder="What's this collection about?"
                    value={newDesc}
                    onChange={(_, d) => setNewDesc(d.value)}
                    rows={2}
                  />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button appearance="primary" onClick={handleCreate} disabled={!newName.trim() || creating}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {sharedDialogs}
    </div>
  );
};
