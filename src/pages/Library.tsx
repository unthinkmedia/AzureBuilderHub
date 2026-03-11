import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  listSharedByMe,
  listSharedWithMe,
  listStarredProjects,
  getProject,
  unshareProject,
  unstarProject,
} from "../api/client";
import { Spinner, Button, TabList, Tab } from "@fluentui/react-components";
import type { ProjectSummary, ShareInfo } from "../components/types";
import "./Library.css";

type LibraryTab = "shared" | "shared-with-me" | "following";

export const Library: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LibraryTab>("shared");

  // Shared by me
  const [sharedByMe, setSharedByMe] = useState<(ShareInfo & { project?: ProjectSummary })[]>([]);
  // Shared with me
  const [sharedWithMe, setSharedWithMe] = useState<(ShareInfo & { project?: ProjectSummary })[]>([]);
  // Following (starred)
  const [following, setFollowing] = useState<ProjectSummary[]>([]);

  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [byMe, withMe, starred] = await Promise.all([
        listSharedByMe(),
        listSharedWithMe(),
        listStarredProjects(),
      ]);

      // Resolve project details for shares
      const allProjectIds = new Set([
        ...byMe.map((s) => s.projectId),
        ...withMe.map((s) => s.projectId),
      ]);
      const projectMap = new Map<string, ProjectSummary>();
      await Promise.all(
        Array.from(allProjectIds).map(async (pid) => {
          try {
            const p = await getProject(pid);
            projectMap.set(pid, p);
          } catch {
            // Project may have been deleted
          }
        })
      );

      setSharedByMe(byMe.map((s) => ({ ...s, project: projectMap.get(s.projectId) })));
      setSharedWithMe(withMe.map((s) => ({ ...s, project: projectMap.get(s.projectId) })));
      setFollowing(starred);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
    else setLoading(false);
  }, [user, fetchData]);

  const handleUnshare = async (share: ShareInfo) => {
    await unshareProject(share.projectId, share.id);
    setSharedByMe((prev) => prev.filter((s) => s.id !== share.id));
    setSharedWithMe((prev) => prev.filter((s) => s.id !== share.id));
  };

  const handleUnfollow = async (project: ProjectSummary) => {
    await unstarProject(project.id);
    setFollowing((prev) => prev.filter((p) => p.id !== project.id));
  };

  if (!user) {
    return (
      <div className="abh-library">
        <div className="abh-library__empty">
          <h3>Sign in to view your library</h3>
          <p>See projects shared with you and projects you follow.</p>
          <Button appearance="primary" onClick={login}>
            Sign in with GitHub
          </Button>
        </div>
      </div>
    );
  }

  const tabCounts: Record<LibraryTab, number> = {
    shared: sharedByMe.length,
    "shared-with-me": sharedWithMe.length,
    following: following.length,
  };

  return (
    <div className="abh-library">
      {/* Header */}
      <div className="abh-library__header">
        <h1 className="abh-library__title">Library</h1>
        <p className="abh-library__subtitle">
          Projects shared with you, by you, and ones you follow
        </p>
      </div>

      {/* Tabs */}
      <div className="abh-library__tabs">
        <TabList
          selectedValue={activeTab}
          onTabSelect={(_, data) => setActiveTab(data.value as LibraryTab)}
        >
          <Tab value="shared">Shared ({tabCounts.shared})</Tab>
          <Tab value="shared-with-me">Shared with me ({tabCounts["shared-with-me"]})</Tab>
          <Tab value="following">Following ({tabCounts.following})</Tab>
        </TabList>
      </div>

      {/* Content */}
      {loading ? (
        <div className="abh-library__loading">
          <Spinner size="medium" label="Loading library…" />
        </div>
      ) : (
        <div role="tabpanel">
          {activeTab === "shared" && (
            <SharedByMePanel
              shares={sharedByMe}
              onUnshare={handleUnshare}
              onNavigate={(id) => navigate(`/projects/${id}`)}
            />
          )}
          {activeTab === "shared-with-me" && (
            <SharedWithMePanel
              shares={sharedWithMe}
              onRemove={handleUnshare}
              onNavigate={(id) => navigate(`/projects/${id}`)}
            />
          )}
          {activeTab === "following" && (
            <FollowingPanel
              projects={following}
              onUnfollow={handleUnfollow}
              onNavigate={(id) => navigate(`/projects/${id}`)}
            />
          )}
        </div>
      )}
    </div>
  );
};

/* ── Sub-panels ── */

const SharedByMePanel: React.FC<{
  shares: (ShareInfo & { project?: ProjectSummary })[];
  onUnshare: (share: ShareInfo) => void;
  onNavigate: (projectId: string) => void;
}> = ({ shares, onUnshare, onNavigate }) => {
  if (shares.length === 0) {
    return (
      <div className="abh-library__empty">
        <svg className="abh-library__empty-icon" width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M16 20l8-6 8 6v14a2 2 0 01-2 2h-4v-8h-4v8h-4a2 2 0 01-2-2V20z" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M12 14l12-9 12 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
        <h3>No shared projects</h3>
        <p>Projects you share with others will appear here.</p>
      </div>
    );
  }

  return (
    <div className="abh-library__section">
      <div className="abh-library__list">
        {shares.map((share) => (
          <div key={share.id} className="abh-library__item">
            <div
              className="abh-library__item-info"
              onClick={() => onNavigate(share.projectId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") onNavigate(share.projectId); }}
            >
              <span className="abh-library__item-name">
                {share.project?.name ?? share.projectId}
              </span>
              <span className="abh-library__item-meta">
                Shared with {share.sharedWithName} · {new Date(share.createdAt).toLocaleDateString()}
              </span>
              {share.project?.description && (
                <span className="abh-library__item-desc">{share.project.description}</span>
              )}
            </div>
            <div className="abh-library__item-actions">
              <Button appearance="subtle" size="small" onClick={() => onUnshare(share)}>
                Unshare
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SharedWithMePanel: React.FC<{
  shares: (ShareInfo & { project?: ProjectSummary })[];
  onRemove: (share: ShareInfo) => void;
  onNavigate: (projectId: string) => void;
}> = ({ shares, onRemove, onNavigate }) => {
  if (shares.length === 0) {
    return (
      <div className="abh-library__empty">
        <svg className="abh-library__empty-icon" width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect x="8" y="12" width="32" height="24" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M8 18l16 10 16-10" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
        <h3>Nothing shared with you yet</h3>
        <p>When someone shares a project with you, it will show up here.</p>
      </div>
    );
  }

  return (
    <div className="abh-library__section">
      <div className="abh-library__list">
        {shares.map((share) => (
          <div key={share.id} className="abh-library__item">
            <div
              className="abh-library__item-info"
              onClick={() => onNavigate(share.projectId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") onNavigate(share.projectId); }}
            >
              <span className="abh-library__item-name">
                {share.project?.name ?? share.projectId}
              </span>
              <span className="abh-library__item-meta">
                Shared by {share.ownerName} · {new Date(share.createdAt).toLocaleDateString()}
              </span>
              {share.project?.description && (
                <span className="abh-library__item-desc">{share.project.description}</span>
              )}
            </div>
            <div className="abh-library__item-actions">
              <Button appearance="subtle" size="small" onClick={() => onRemove(share)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FollowingPanel: React.FC<{
  projects: ProjectSummary[];
  onUnfollow: (project: ProjectSummary) => void;
  onNavigate: (projectId: string) => void;
}> = ({ projects, onUnfollow, onNavigate }) => {
  if (projects.length === 0) {
    return (
      <div className="abh-library__empty">
        <svg className="abh-library__empty-icon" width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M24 8l5.5 11.2L42 21.5l-9 8.8 2.1 12.4L24 36.8l-11.1 5.9L15 30.3l-9-8.8 12.5-2.3L24 8z" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
        <h3>Not following any projects</h3>
        <p>Star a project from the Community page to follow it here.</p>
      </div>
    );
  }

  return (
    <div className="abh-library__section">
      <div className="abh-library__list">
        {projects.map((project) => (
          <div key={project.id} className="abh-library__item">
            <div
              className="abh-library__item-info"
              onClick={() => onNavigate(project.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") onNavigate(project.id); }}
            >
              <span className="abh-library__item-name">{project.name}</span>
              <span className="abh-library__item-meta">
                by {project.author.name} · v{project.currentVersion}
              </span>
              {project.description && (
                <span className="abh-library__item-desc">{project.description}</span>
              )}
            </div>
            <div className="abh-library__item-actions">
              <div className="abh-library__item-stats">
                <span className="abh-library__stat">
                  <StarIcon /> {project.starCount}
                </span>
                <span className="abh-library__stat">
                  <ForkIcon /> {project.forkCount}
                </span>
              </div>
              <Button appearance="subtle" size="small" onClick={() => onUnfollow(project)}>
                Unfollow
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Inline icons ── */

const StarIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M8 1.5l1.85 3.75L14 5.88l-3 2.92.71 4.13L8 10.94l-3.71 1.99.71-4.13-3-2.92 4.15-.63L8 1.5z"
      fill="var(--colorPaletteYellowForeground1, #E3A400)"
      stroke="var(--colorPaletteYellowForeground1, #E3A400)"
      strokeWidth="1.2"
    />
  </svg>
);

const ForkIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M5 3.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM14 3.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM8.5 14a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path d="M3.5 5v2c0 1.1.9 2 2 2h5a2 2 0 002-2V5M7 9v3.5" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);
