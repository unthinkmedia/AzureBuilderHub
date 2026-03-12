import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { searchGitHubReposByTopic, fetchExperimentJson, publishProject, listCollections } from "../api/client";
import type { GitHubRepo, ExperimentJson } from "../api/client";
import { Spinner, Button } from "@fluentui/react-components";
import { ProjectCard } from "../components/ProjectCard";
import type { ProjectSummary, CollectionSummary } from "../components/types";
import type { ProjectCardVariant } from "../components/ProjectCard";
import "./MyProjects.css";

const LAYOUT_OPTIONS = [
  { value: "", label: "All layouts" },
  { value: "full-width", label: "Full width" },
  { value: "side-panel", label: "Side panel" },
] as const;

/** Map a GitHub repo + optional experiment.json into a ProjectSummary for the card */
function repoToProject(
  repo: GitHubRepo,
  experiment: ExperimentJson | null
): ProjectSummary {
  return {
    id: String(repo.id),
    name: experiment?.name || repo.name,
    description: experiment?.description || repo.description || "",
    author: {
      name: repo.owner.login,
      id: repo.owner.login,
      avatarUrl: repo.owner.avatar_url,
    },
    status: experiment?.status ?? "draft",
    tags: experiment?.tags ?? repo.topics.filter((t) => t !== "vibe-platform"),
    layout: (experiment?.layout as "full-width" | "side-panel") || "full-width",
    pageCount: 1,
    currentVersion: 1,
    starCount: repo.stargazers_count,
    forkCount: repo.forks_count,
    forkedFrom: null,
    thumbnailUrl: experiment?.thumbnailUrl || "",
    previewUrl: experiment?.previewUrl || "",
    repoUrl: repo.html_url,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    publishedAt: repo.updated_at,
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
  const [selectedLayout, setSelectedLayout] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ProjectCardVariant>("grid");
  const [recentCollections, setRecentCollections] = useState<CollectionSummary[]>([]);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      // Search GitHub for repos tagged vibe-platform owned by signed-in user
      const repos = await searchGitHubReposByTopic(user.userDetails);

      // Enrich each repo with experiment.json metadata (best-effort)
      const enriched = await Promise.all(
        repos.map(async (repo) => {
          const experiment = await fetchExperimentJson(repo.owner.login, repo.name);
          return repoToProject(repo, experiment);
        })
      );

      setProjects(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects from GitHub");
    } finally {
      setLoading(false);
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
        thumbnailUrl: project.thumbnailUrl,
        previewUrl: project.previewUrl,
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

  const activeFilterCount = selectedTags.length + (selectedLayout ? 1 : 0);

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedLayout("");
    setSearch("");
  };

  const filtered = projects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))) return false;
    if (selectedTags.length > 0 && !selectedTags.some((t) => p.tags.includes(t))) return false;
    if (selectedLayout && p.layout !== selectedLayout) return false;
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
            {projects.length} repo{projects.length !== 1 ? "s" : ""} tagged{" "}
            <code className="abh-my-projects__topic-badge">vibe-platform</code>
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
            <h4 className="abh-my-projects__filter-heading">Layout</h4>
            <div className="abh-my-projects__filter-chips">
              {LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`abh-my-projects__chip ${selectedLayout === opt.value ? "abh-my-projects__chip--active" : ""}`}
                  onClick={() => setSelectedLayout(opt.value)}
                  aria-pressed={selectedLayout === opt.value}
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
          {selectedLayout && (
            <span className="abh-my-projects__active-chip">
              {selectedLayout}
              <button aria-label="Remove layout filter" onClick={() => setSelectedLayout("")}>×</button>
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="abh-my-projects__loading">
          <Spinner size="medium" label="Searching GitHub repos…" />
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
          <h3>No repos found</h3>
          <p>
            {search || activeFilterCount > 0
              ? "No repos match your current filters. Try adjusting your search."
              : `Tag a GitHub repo with the topic "vibe-platform" to see it here.`}
          </p>
          {(activeFilterCount > 0 || search) ? (
            <Button appearance="secondary" onClick={() => { clearAllFilters(); }}>
              Clear all filters
            </Button>
          ) : (
            <Button appearance="primary" as="a" href="https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics" target="_blank" rel="noopener">
              Learn about GitHub topics
            </Button>
          )}
        </div>
      ) : (
        <>
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
