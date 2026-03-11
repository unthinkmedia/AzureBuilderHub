import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { browseCommunity, starProject, unstarProject } from "../api/client";
import { Spinner, Button, Dropdown, Option } from "@fluentui/react-components";
import { ProjectCard } from "../components/ProjectCard";
import type { ProjectSummary } from "../components/types";
import type { ProjectCardVariant } from "../components/ProjectCard";
import "./Community.css";

const SORT_OPTIONS = [
  { value: "stars", label: "Most starred" },
  { value: "recent", label: "Recently published" },
  { value: "forks", label: "Most forked" },
] as const;

const LAYOUT_OPTIONS = [
  { value: "", label: "All layouts" },
  { value: "full-width", label: "Full width" },
  { value: "side-panel", label: "Side panel" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const Community: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ProjectCardVariant>("grid");

  const search = searchParams.get("q") || "";
  const sort = (searchParams.get("sort") as SortOption) || "stars";
  const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const layout = searchParams.get("layout") || "";

  // Derive available filter options from all projects (unfiltered)
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    allProjects.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [allProjects]);

  const activeFilterCount = tags.length + (layout ? 1 : 0);

  // Fetch all published projects once to populate filter options
  useEffect(() => {
    browseCommunity({ limit: 100 }).then((data) => setAllProjects(data.items)).catch(() => {});
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await browseCommunity({
        search: search || undefined,
        sort: sort as "stars" | "newest" | "forks",
        tags: tags.length > 0 ? tags : undefined,
        layout: layout || undefined,
      });
      setProjects(data.items);
      setTotalCount(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load community gallery");
    } finally {
      setLoading(false);
    }
  }, [search, sort, tags.join(","), layout]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const toggleArrayParam = (key: string, value: string) => {
    const current = searchParams.get(key)?.split(",").filter(Boolean) || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateParam(key, next.join(","));
  };

  const clearAllFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("tags");
    next.delete("layout");
    setSearchParams(next);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateParam("q", (formData.get("search") as string) || "");
  };

  const handleStar = async (id: string) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    if (proj.isStarred) {
      await unstarProject(id);
    } else {
      await starProject(id);
    }
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, isStarred: !p.isStarred, starCount: p.starCount + (p.isStarred ? -1 : 1) }
          : p
      )
    );
  };

  return (
    <div className="abh-community">
      {/* Hero */}
      <div className="abh-community__hero">
        <h1 className="abh-community__hero-title">Community Gallery</h1>
        <p className="abh-community__hero-desc">
          Discover and fork Azure Portal prototypes shared by the community.
        </p>
        <form className="abh-community__search-form" onSubmit={handleSearch}>
          <input
            type="search"
            name="search"
            className="abh-community__search-input"
            placeholder="Search projects by name or tag…"
            defaultValue={search}
            aria-label="Search community projects"
          />
          <button type="submit" className="abh-community__search-btn">
            Search
          </button>
        </form>
      </div>

      {/* Toolbar */}
      <div className="abh-community__toolbar">
        <div className="abh-community__toolbar-left">
          <span className="abh-community__count">
            {totalCount} project{totalCount !== 1 ? "s" : ""}
          </span>
          <button
            className={`abh-community__filter-toggle ${filtersOpen ? "abh-community__filter-toggle--active" : ""}`}
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-controls="community-filters"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M1 3h14v1.5H1V3zm2 4h10v1.5H3V7zm3 4h4v1.5H6V11z" />
            </svg>
            Filters{activeFilterCount > 0 && <span className="abh-community__filter-badge">{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && (
            <button className="abh-community__clear-filters" onClick={clearAllFilters}>
              Clear all
            </button>
          )}
        </div>
        <div className="abh-community__sort">
          <div className="abh-community__view-toggle" role="radiogroup" aria-label="View mode">
            <button
              className={`abh-community__view-btn ${viewMode === "grid" ? "abh-community__view-btn--active" : ""}`}
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
              className={`abh-community__view-btn ${viewMode === "compact" ? "abh-community__view-btn--active" : ""}`}
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
          <label htmlFor="sort-select">Sort by</label>
          <Dropdown
            id="sort-select"
            value={SORT_OPTIONS.find((o) => o.value === sort)?.label ?? ""}
            selectedOptions={[sort]}
            onOptionSelect={(_, data) => updateParam("sort", data.optionValue ?? "")}
            style={{ minWidth: "150px" }}
          >
            {SORT_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Dropdown>
        </div>
      </div>

      {/* Filter Panel */}
      {filtersOpen && (
        <div className="abh-community__filters" id="community-filters" role="region" aria-label="Project filters">
          {/* Tags */}
          <div className="abh-community__filter-group">
            <h4 className="abh-community__filter-heading">Tags</h4>
            <div className="abh-community__filter-chips">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  className={`abh-community__chip ${tags.includes(tag) ? "abh-community__chip--active" : ""}`}
                  onClick={() => toggleArrayParam("tags", tag)}
                  aria-pressed={tags.includes(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Layout */}
          <div className="abh-community__filter-group">
            <h4 className="abh-community__filter-heading">Layout</h4>
            <div className="abh-community__filter-chips">
              {LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`abh-community__chip ${layout === opt.value ? "abh-community__chip--active" : ""}`}
                  onClick={() => updateParam("layout", opt.value)}
                  aria-pressed={layout === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && !filtersOpen && (
        <div className="abh-community__active-filters">
          {tags.map((t) => (
            <span key={`t-${t}`} className="abh-community__active-chip">
              {t}
              <button aria-label={`Remove ${t} filter`} onClick={() => toggleArrayParam("tags", t)}>×</button>
            </span>
          ))}
          {layout && (
            <span className="abh-community__active-chip">
              {layout}
              <button aria-label="Remove layout filter" onClick={() => updateParam("layout", "")}>×</button>
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="abh-community__loading">
          <Spinner size="medium" label="Loading community projects…" />
        </div>
      ) : error ? (
        <div className="abh-community__error">
          <p>{error}</p>
          <Button appearance="secondary" onClick={fetchProjects}>Retry</Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="abh-community__empty">
          <h3>No projects found</h3>
          <p>
            {search || activeFilterCount > 0
              ? "No results match your current filters. Try adjusting your search or filters."
              : "No community projects are available yet. Be the first to publish!"}
          </p>
          {activeFilterCount > 0 && (
            <button className="abh-community__clear-filters" onClick={clearAllFilters}>
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === "compact" ? "abh-community__list" : "abh-community__grid"}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={(id) => navigate(`/projects/${id}`)}
              onStar={handleStar}
              isStarred={project.isStarred}
              variant={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};
