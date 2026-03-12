import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { listMyProjects, publishProject, listCollections, searchGitHubReposByTopic, fetchExperimentJson } from "../api/client";
import type { GitHubRepo, ExperimentJson } from "../api/client";
import { Spinner, Button, Badge, Caption1, Text } from "@fluentui/react-components";
import { ProjectCard } from "../components/ProjectCard";
import type { ProjectSummary, CollectionSummary } from "../components/types";
import type { ProjectCardVariant } from "../components/ProjectCard";
import "./MyProjects.css";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
] as const;

/** Convert a GitHub repo (not yet in DB) into a ProjectSummary for display */
async function githubRepoToSummary(repo: GitHubRepo, username: string): Promise<ProjectSummary> {
  let meta: ExperimentJson | null = null;
  try {
    meta = await fetchExperimentJson(repo.owner.login, repo.name);
  } catch {
    // experiment.json is optional
  }

  return {
    id: repo.full_name, // use owner/repo as a temporary ID
    name: meta?.name ?? repo.name,
    description: meta?.description ?? repo.description ?? "",
    author: { id: username, name: username, avatarUrl: repo.owner.avatar_url },
    status: "draft" as const,
    tags: meta?.tags ?? repo.topics.filter((t) => t !== "vibe-platform"),
    layout: (meta?.layout as "full-width" | "side-panel") ?? "full-width",
    pageCount: 0,
    currentVersion: 0,
    starCount: repo.stargazers_count,
    forkCount: repo.forks_count,
    forkedFrom: null,
    thumbnailUrl: "",
    previewUrl: "",
    repoUrl: repo.html_url,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    publishedAt: null,
  };
}

export const MyProjects: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ProjectCardVariant>("grid");
  const [recentCollections, setRecentCollections] = useState<CollectionSummary[]>([]);
  const [githubOnlyRepos, setGithubOnlyRepos] = useState<ProjectSummary[]>([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const data = await listMyProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [user]);

  /** Fetch GitHub repos with `vibe-platform` topic and surface ones not in the DB */
  const fetchGitHubRepos = useCallback(async (dbProjects: ProjectSummary[]) => {
    if (!user) return;
    try {
      setGithubLoading(true);
      const repos = await searchGitHubReposByTopic(user.userDetails);

      // Build a set of repo URLs already tracked in the DB
      const knownRepoUrls = new Set(
        dbProjects
          .filter((p) => p.repoUrl)
          .map((p) => p.repoUrl!.toLowerCase())
      );
      // Also match by name to catch projects created without repoUrl
      const knownNames = new Set(
        dbProjects.map((p) => p.name.toLowerCase())
      );

      const untracked = repos.filter(
        (r) =>
          !knownRepoUrls.has(r.html_url.toLowerCase()) &&
          !knownNames.has(r.name.toLowerCase())
      );

      // Fetch experiment.json for each untracked repo to get metadata
      const summaries = await Promise.all(
        untracked.map((repo) => githubRepoToSummary(repo, user.userDetails))
      );

      setGithubOnlyRepos(summaries);
    } catch {
      // Non-critical — don't block the page if GitHub search fails
    } finally {
      setGithubLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProjects();
      listCollections()
        .then((cols) => {
          const sorted = [...cols].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          setRecentCollections(sorted.slice(0, 4));
        })
        .catch(() => {});
    } else {
      setLoading(false);
    }
  }, [user, fetchProjects]);

  // Fetch GitHub repos after DB projects are loaded
  useEffect(() => {
    if (!loading && projects.length >= 0 && user) {
      fetchGitHubRepos(projects);
    }
  }, [loading, projects, user, fetchGitHubRepos]);

  /** Import a GitHub-only repo by publishing it to the DB */
  const handleImportRepo = async (ghProject: ProjectSummary) => {
    try {
      setImportingId(ghProject.id);
      const result = await publishProject(ghProject.id, true, {
        name: ghProject.name,
        description: ghProject.description,
        tags: ghProject.tags,
        layout: ghProject.layout,
        repoUrl: ghProject.repoUrl,
      });
      // Move from GitHub-only list into the main projects list
      setGithubOnlyRepos((prev) => prev.filter((r) => r.id !== ghProject.id));
      setProjects((prev) => [result, ...prev]);
    } catch (err) {
      console.error("Failed to import repo", err);
    } finally {
      setImportingId(null);
    }
  };

  const handleOpenProject = (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (project) {
      navigate(`/projects/${id}`, { state: { project } });
    }
  };

  const handlePublishToggle = async (id: string, publish: boolean) => {
    try {
      const project = projects.find((p) => p.id === id);
      const result = await publishProject(id, publish, project ? {
        name: project.name,
        description: project.description,
        tags: project.tags,
        layout: project.layout,
        repoUrl: project.repoUrl,
      } : undefined);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, id: result.id, status: publish ? "published" : "draft", publishedAt: publish ? new Date().toISOString() : p.publishedAt }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to toggle publish status", err);
    }
  };

  // Derive available filter options from all projects
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [projects]);

  const activeFilterCount = selectedTags.length + (selectedStatus ? 1 : 0);

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedStatus("");
    setSearch("");
  };

  const filtered = projects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))) return false;
    if (selectedTags.length > 0 && !selectedTags.some((t) => p.tags.includes(t))) return false;
    if (selectedStatus && p.status !== selectedStatus) return false;
    return true;
  });

  if (!user) {
    return (
      <div className="abh-my-projects">
        <div className="abh-my-projects__empty">
          <h2>Sign in to view your projects</h2>
          <p>Create, manage, and publish your Azure Portal prototypes.</p>
          <Button appearance="primary" onClick={login}>
            Sign in with GitHub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="abh-my-projects">
      {/* Header */}
      <div className="abh-my-projects__header">
        <div>
          <h1 className="abh-my-projects__title">My Projects</h1>
          <p className="abh-my-projects__subtitle">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="abh-my-projects__controls">
          <Button
            appearance="outline"
            onClick={fetchProjects}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="abh-my-projects__toolbar">
        <div className="abh-my-projects__toolbar-left">
          <input
            type="search"
            className="abh-my-projects__search-input"
            placeholder="Search by name or tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search my projects"
          />
          <button
            className={`abh-my-projects__filter-toggle ${filtersOpen ? "abh-my-projects__filter-toggle--active" : ""}`}
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-controls="my-projects-filters"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M1 3h14v1.5H1V3zm2 4h10v1.5H3V7zm3 4h4v1.5H6V11z" />
            </svg>
            Filters{activeFilterCount > 0 && <span className="abh-my-projects__filter-badge">{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && (
            <button className="abh-my-projects__clear-filters" onClick={clearAllFilters}>
              Clear all
            </button>
          )}
        </div>
        <span className="abh-my-projects__result-count">
          {filtered.length} of {projects.length}
        </span>
        <div className="abh-my-projects__view-toggle" role="radiogroup" aria-label="View mode">
          <button
            className={`abh-my-projects__view-btn ${viewMode === "grid" ? "abh-my-projects__view-btn--active" : ""}`}
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
            className={`abh-my-projects__view-btn ${viewMode === "compact" ? "abh-my-projects__view-btn--active" : ""}`}
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
      </div>

      {/* Filter Panel */}
      {filtersOpen && (
        <div className="abh-my-projects__filter-panel" id="my-projects-filters" role="region" aria-label="Project filters">
          {availableTags.length > 0 && (
            <div className="abh-my-projects__filter-group">
              <h4 className="abh-my-projects__filter-heading">Tags</h4>
              <div className="abh-my-projects__filter-chips">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    className={`abh-my-projects__chip ${selectedTags.includes(tag) ? "abh-my-projects__chip--active" : ""}`}
                    onClick={() => toggleTag(tag)}
                    aria-pressed={selectedTags.includes(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="abh-my-projects__filter-group">
            <h4 className="abh-my-projects__filter-heading">Status</h4>
            <div className="abh-my-projects__filter-chips">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`abh-my-projects__chip ${selectedStatus === opt.value ? "abh-my-projects__chip--active" : ""}`}
                  onClick={() => setSelectedStatus(opt.value)}
                  aria-pressed={selectedStatus === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters (shown when panel is collapsed) */}
      {activeFilterCount > 0 && !filtersOpen && (
        <div className="abh-my-projects__active-filters">
          {selectedTags.map((t) => (
            <span key={`t-${t}`} className="abh-my-projects__active-chip">
              {t}
              <button aria-label={`Remove ${t} filter`} onClick={() => toggleTag(t)}>×</button>
            </span>
          ))}
          {selectedStatus && (
            <span className="abh-my-projects__active-chip">
              {selectedStatus}
              <button aria-label="Remove status filter" onClick={() => setSelectedStatus("")}>×</button>
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="abh-my-projects__loading">
          <Spinner size="medium" label="Loading projects…" />
        </div>
      ) : error ? (
        <div className="abh-my-projects__error">
          <p>{error}</p>
          <button onClick={fetchProjects}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="abh-my-projects__empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <rect x="8" y="12" width="32" height="24" rx="3" stroke="#d1d1d1" strokeWidth="2" fill="none" />
            <path d="M16 22h16M16 28h10" stroke="#d1d1d1" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h3>No projects yet</h3>
          <p>
            {search || activeFilterCount > 0
              ? "No projects match your current filters. Try adjusting your search."
              : "Create your first project to get started."}
          </p>
          {(activeFilterCount > 0 || search) ? (
            <Button appearance="secondary" onClick={() => { clearAllFilters(); }}>
              Clear all filters
            </Button>
          ) : (
            <Button appearance="primary" onClick={() => navigate("/new")}>
              New Project
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* GitHub Repos — not yet imported */}
          {(githubOnlyRepos.length > 0 || githubLoading) && (
            <div className="abh-my-projects__github-section">
              <div className="abh-my-projects__github-header">
                <div>
                  <h3 className="abh-my-projects__github-title">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    GitHub Repos
                  </h3>
                  <Caption1 className="abh-my-projects__github-subtitle">
                    Repos with the <code className="abh-my-projects__topic-badge">vibe-platform</code> topic not yet imported
                  </Caption1>
                </div>
              </div>
              {githubLoading ? (
                <div className="abh-my-projects__github-loading">
                  <Spinner size="tiny" label="Scanning GitHub repos…" />
                </div>
              ) : (
                <div className="abh-my-projects__github-list">
                  {githubOnlyRepos.map((repo) => (
                    <div key={repo.id} className="abh-my-projects__github-repo">
                      <div className="abh-my-projects__github-repo-info">
                        <Text weight="semibold">{repo.name}</Text>
                        {repo.description && (
                          <Caption1 className="abh-my-projects__github-repo-desc">{repo.description}</Caption1>
                        )}
                        {repo.tags.length > 0 && (
                          <div className="abh-my-projects__github-repo-tags">
                            {repo.tags.slice(0, 4).map((tag) => (
                              <Badge key={tag} appearance="outline" size="small">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="abh-my-projects__github-repo-actions">
                        <Button
                          appearance="subtle"
                          size="small"
                          onClick={() => window.open(repo.repoUrl, '_blank', 'noopener,noreferrer')}
                          aria-label={`View ${repo.name} on GitHub`}
                        >
                          View
                        </Button>
                        <Button
                          appearance="primary"
                          size="small"
                          disabled={importingId === repo.id}
                          onClick={() => handleImportRepo(repo)}
                        >
                          {importingId === repo.id ? "Importing…" : "Import"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Collections */}
          {recentCollections.length > 0 && (
            <div className="abh-my-projects__recent-collections">
              <div className="abh-my-projects__recent-collections-header">
                <h3 className="abh-my-projects__recent-collections-title">Recent Collections</h3>
                <Button
                  appearance="subtle"
                  size="small"
                  onClick={() => navigate("/collections")}
                >
                  Show more
                </Button>
              </div>
              <div className="abh-my-projects__recent-collections-row">
                {recentCollections.map((col) => (
                  <button
                    key={col.id}
                    className="abh-my-projects__collection-chip"
                    onClick={() => navigate(`/collections/${col.id}`)}
                    aria-label={`Collection: ${col.name} (${col.projectIds.length} projects)`}
                  >
                    <span className="abh-my-projects__collection-chip-name">{col.name}</span>
                    <span className="abh-my-projects__collection-chip-count">
                      {col.projectIds.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={viewMode === "compact" ? "abh-my-projects__list" : "abh-my-projects__grid"}>
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleOpenProject(project.id)}
                onPublishToggle={handlePublishToggle}
                showAddToCollection
                variant={viewMode}
              />
            ))}
          </div>
        </>
      )}


    </div>
  );
};
