import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { listMyProjects, deleteProject, publishProject, forkProject } from "../api/client";
import { Spinner, Button } from "@fluentui/react-components";
import { ProjectCard } from "../components/ProjectCard";
import type { ProjectSummary } from "../components/types";
import type { ProjectCardVariant } from "../components/ProjectCard";
import "./MyProjects.css";

const LAYOUT_OPTIONS = [
  { value: "", label: "All layouts" },
  { value: "full-width", label: "Full width" },
  { value: "side-panel", label: "Side panel" },
] as const;

export const MyProjects: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "draft" | "published">("all");
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedLayout, setSelectedLayout] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ProjectCardVariant>("grid");

  const fetchProjects = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (user) {
      fetchProjects();
    } else {
      setLoading(false);
    }
  }, [user, fetchProjects]);

  const handlePublishToggle = async (id: string, publish: boolean) => {
    await publishProject(id, publish);
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    await deleteProject(id);
    fetchProjects();
  };

  const handleDuplicate = async (id: string) => {
    await forkProject(id);
    fetchProjects();
  };

  const handleShare = (id: string) => {
    navigate(`/projects/${id}?share=true`);
  };

  const handleOpenInVSCode = (id: string) => {
    window.open(`vscode://file/${id}`, "_blank");
  };

  const handleOpenInCopilotCLI = (id: string) => {
    window.open(`https://github.com/codespaces?project=${encodeURIComponent(id)}`, "_blank");
  };

  // Derive available filter options from all projects
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [projects]);

  const availableServices = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.azureServices.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [projects]);

  const activeFilterCount = selectedTags.length + selectedServices.length + (selectedLayout ? 1 : 0);

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const toggleService = (svc: string) =>
    setSelectedServices((prev) => (prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]));

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedServices([]);
    setSelectedLayout("");
    setSearch("");
  };

  const filtered = projects.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))) return false;
    if (selectedTags.length > 0 && !selectedTags.some((t) => p.tags.includes(t))) return false;
    if (selectedServices.length > 0 && !selectedServices.some((s) => p.azureServices.includes(s))) return false;
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
            Sign in with Microsoft
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
          <div className="abh-my-projects__filters" role="radiogroup" aria-label="Filter projects">
            {(["all", "draft", "published"] as const).map((f) => (
              <button
                key={f}
                className={`abh-my-projects__filter ${filter === f ? "abh-my-projects__filter--active" : ""}`}
                role="radio"
                aria-checked={filter === f}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <Button
            appearance="primary"
            onClick={() => navigate("/new")}
          >
            + New Project
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
          {availableServices.length > 0 && (
            <div className="abh-my-projects__filter-group">
              <h4 className="abh-my-projects__filter-heading">Azure Services</h4>
              <div className="abh-my-projects__filter-chips">
                {availableServices.map((svc) => (
                  <button
                    key={svc}
                    className={`abh-my-projects__chip ${selectedServices.includes(svc) ? "abh-my-projects__chip--active" : ""}`}
                    onClick={() => toggleService(svc)}
                    aria-pressed={selectedServices.includes(svc)}
                  >
                    {svc}
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
          {selectedServices.map((s) => (
            <span key={`s-${s}`} className="abh-my-projects__active-chip">
              {s}
              <button aria-label={`Remove ${s} filter`} onClick={() => toggleService(s)}>×</button>
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
            {filter !== "all" || search || activeFilterCount > 0
              ? "No projects match your current filters. Try adjusting your search or filters."
              : "Create your first project to get started."}
          </p>
          {(filter !== "all" || activeFilterCount > 0 || search) ? (
            <Button appearance="secondary" onClick={() => { setFilter("all"); clearAllFilters(); }}>
              Clear all filters
            </Button>
          ) : (
            <Button appearance="primary" onClick={() => navigate("/new")}>
              Create your first project
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === "compact" ? "abh-my-projects__list" : "abh-my-projects__grid"}>
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={(id) => navigate(`/projects/${id}`)}
              onPublishToggle={handlePublishToggle}
              showAddToCollection
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onShare={handleShare}
              onOpenInVSCode={handleOpenInVSCode}
              onOpenInCopilotCLI={handleOpenInCopilotCLI}
              variant={viewMode}
            />
          ))}
        </div>
      )}


    </div>
  );
};
