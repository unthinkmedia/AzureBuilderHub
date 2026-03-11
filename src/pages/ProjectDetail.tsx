import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  getProject,
  listForks,
  forkProject,
  starProject,
  unstarProject,
  publishProject,
  deleteProject,
} from "../api/client";
import { ForkAttributionBanner } from "../components/ForkAttributionBanner";
import { StarToggleButton } from "../components/StarToggleButton";
import { AddToCollectionDialog } from "../components/AddToCollectionDialog";
import { ShareProjectDialog } from "../components/ShareProjectDialog";
import { ProjectCard } from "../components/ProjectCard";
import type { ProjectSummary, ProjectStatus } from "../components/types";
import {
  Spinner,
  Button,
  Badge,
  CounterBadge,
  Caption1,
  Avatar,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
  Tooltip,
  Link,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbButton,
  BreadcrumbDivider,
  TabList,
  Tab,
  type SelectTabData,
} from "@fluentui/react-components";
import {
  BranchFork24Regular,
  Calendar20Regular,
  Code20Regular,
  Layer20Regular,
  MoreHorizontal24Regular,
  Share24Regular,
  ArrowUpload20Regular,
  ArrowDownload20Regular,
  FolderAdd20Regular,
  Delete20Regular,
  Open24Regular,
  Copy20Regular,
  Library20Regular,
  DesignIdeas20Regular,
  Target20Regular,
} from "@fluentui/react-icons";
import "./ProjectDetail.css";

interface ProjectFull extends ProjectSummary {
  bundleUrl?: string;
}

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectFull | null>(null);
  const [forks, setForks] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forking, setForking] = useState(false);
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("overview");

  const isOwner = !!(user && project?.author.id === user.userId);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [proj, forkedProjects] = await Promise.all([
        getProject(id),
        listForks(id),
      ]);
      setProject(proj as ProjectFull);
      setForks(forkedProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStar = async () => {
    if (!project) return;
    if (project.isStarred) {
      await unstarProject(project.id);
    } else {
      await starProject(project.id);
    }
    setProject((prev) =>
      prev
        ? {
            ...prev,
            isStarred: !prev.isStarred,
            starCount: prev.starCount + (prev.isStarred ? -1 : 1),
          }
        : prev
    );
  };

  const handleFork = async () => {
    if (!project) return;
    setForking(true);
    try {
      const forked = await forkProject(project.id);
      navigate(`/projects/${forked.id}`);
    } catch {
      alert("Failed to fork project");
    } finally {
      setForking(false);
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!project) return;
    await publishProject(project.id, newStatus === "published");
    setProject((prev) => (prev ? { ...prev, status: newStatus } : prev));
  };

  const handleDelete = async () => {
    if (!project) return;
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    await deleteProject(project.id);
    navigate("/my-projects");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="abh-detail__loading">
        <Spinner size="medium" label="Loading project…" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="abh-detail__error">
        <h2>Project not found</h2>
        <p>{error || "The requested project could not be loaded."}</p>
        <Button appearance="secondary" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  const statusBadgeColor = {
    draft: "informative" as const,
    published: "success" as const,
    archived: "important" as const,
  };

  const STORYBOOK_BASE = "http://localhost:6006/?path=/docs/";

  return (
    <div className="abh-detail">
      {/* Breadcrumbs */}
      <Breadcrumb aria-label="Breadcrumb" size="medium" className="abh-detail__breadcrumb">
        <BreadcrumbItem>
          <BreadcrumbButton onClick={() => navigate(isOwner ? "/my-projects" : "/community")}>
            {isOwner ? "My Projects" : "Community"}
          </BreadcrumbButton>
        </BreadcrumbItem>
        <BreadcrumbDivider />
        <BreadcrumbItem>
          <BreadcrumbButton current>
            {project.name}
          </BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Fork attribution */}
      {project.forkedFrom && (
        <ForkAttributionBanner
          forkedFrom={project.forkedFrom}
          onNavigateToOriginal={() =>
            navigate(`/projects/${project.forkedFrom!.projectId}`)
          }
          originalAvailable
        />
      )}

      {/* Hero section: screenshot + project info side by side */}
      <div className="abh-detail__hero">
        <div className="abh-detail__screenshot">
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt={`Screenshot of ${project.name}`}
              className="abh-detail__screenshot-img"
            />
          ) : (
            <div className="abh-detail__screenshot-placeholder">
              <span>No preview available</span>
            </div>
          )}
        </div>

        <div className="abh-detail__info">
          <div className="abh-detail__title-row">
            <h1 className="abh-detail__name">{project.name}</h1>
            <Badge
              appearance="filled"
              color={statusBadgeColor[project.status]}
              size="medium"
            >
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Badge>
          </div>

          <p className="abh-detail__desc">{project.description}</p>

          <div className="abh-detail__author-row">
            <Avatar
              name={project.author.name}
              size={24}
            />
            <Caption1>{project.author.name}</Caption1>
          </div>

          {/* Metadata */}
          <div className="abh-detail__metadata">
            {project.tags.length > 0 && (
              <div className="abh-detail__tags">
                {project.tags.map((tag) => (
                  <Badge key={tag} appearance="outline" size="small">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="abh-detail__stats-row">
              <span className="abh-detail__stat">
                <Calendar20Regular />
                <Caption1>{formatDate(project.updatedAt)}</Caption1>
              </span>
              <span className="abh-detail__stat">
                <Code20Regular />
                <Caption1>v{project.currentVersion}</Caption1>
              </span>
              <span className="abh-detail__stat">
                <Layer20Regular />
                <Caption1>{project.layout === "side-panel" ? "Side Panel" : "Full Width"}</Caption1>
              </span>
              <span className="abh-detail__stat">
                <BranchFork24Regular />
                <Caption1>{project.forkCount} forks</Caption1>
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="abh-detail__actions">
            {project.previewUrl && (
              <Button
                appearance="primary"
                size="small"
                icon={<Open24Regular />}
                onClick={() =>
                  window.open(project.previewUrl, "_blank", "noopener,noreferrer")
                }
              >
                Open in Browser
              </Button>
            )}
            <StarToggleButton
              count={project.starCount}
              isStarred={project.isStarred ?? false}
              onToggle={handleStar}
              size="small"
            />
            {isOwner && (
              <Tooltip content="Share" relationship="label">
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Share24Regular />}
                  onClick={() => setShowShareDialog(true)}
                  aria-label="Share"
                />
              </Tooltip>
            )}
            {!isOwner && (
              <Tooltip content={forking ? "Forking…" : "Fork"} relationship="label">
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<BranchFork24Regular />}
                  onClick={handleFork}
                  disabled={forking}
                  aria-label={forking ? "Forking…" : "Fork"}
                />
              </Tooltip>
            )}
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<MoreHorizontal24Regular />}
                  aria-label="More actions"
                />
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  {isOwner && (
                    <MenuItem
                      icon={
                        project.status === "published" ? (
                          <ArrowDownload20Regular />
                        ) : (
                          <ArrowUpload20Regular />
                        )
                      }
                      onClick={() =>
                        handleStatusChange(
                          project.status === "published" ? "draft" : "published"
                        )
                      }
                    >
                      {project.status === "published"
                        ? "Unpublish"
                        : "Publish to Community"}
                    </MenuItem>
                  )}
                  {project.repoUrl && (
                    <MenuItem
                      icon={<Code20Regular />}
                      onClick={() =>
                        window.open(project.repoUrl, "_blank", "noopener,noreferrer")
                      }
                    >
                      View Repository
                    </MenuItem>
                  )}
                  {(project.repoUrl || isOwner) && user && <MenuDivider />}
                  {user && (
                    <MenuItem
                      icon={<FolderAdd20Regular />}
                      onClick={() => setShowCollectionDialog(true)}
                    >
                      Add to Collection
                    </MenuItem>
                  )}
                  {!isOwner && (
                    <MenuItem
                      icon={<Copy20Regular />}
                      onClick={handleFork}
                      disabled={forking}
                    >
                      Duplicate
                    </MenuItem>
                  )}
                  {isOwner && (
                    <>
                      <MenuDivider />
                      <MenuItem
                        icon={<Delete20Regular />}
                        onClick={handleDelete}
                        className="abh-detail__delete-menu-item"
                      >
                        Delete
                      </MenuItem>
                    </>
                  )}
                </MenuList>
              </MenuPopover>
            </Menu>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabList
        selectedValue={selectedTab}
        onTabSelect={(_e, data: SelectTabData) => setSelectedTab(data.value as string)}
        className="abh-detail__tabs"
      >
        <Tab value="overview">
          Core Jobs to be Done
          {(project.jtbd?.length ?? 0) > 0 && (
            <CounterBadge
              count={project.jtbd?.length ?? 0}
              appearance="filled"
              color="informative"
              size="small"
              style={{ marginLeft: 6 }}
            />
          )}
        </Tab>
        <Tab value="derived">
          Derived Projects
          {forks.length > 0 && (
            <CounterBadge
              count={forks.length}
              appearance="filled"
              color="informative"
              size="small"
              style={{ marginLeft: 6 }}
            />
          )}
        </Tab>
        <Tab value="components">
          Components
          {((project.storybookComponents?.length ?? 0) + (project.newComponents?.length ?? 0)) > 0 && (
            <CounterBadge
              count={(project.storybookComponents?.length ?? 0) + (project.newComponents?.length ?? 0)}
              appearance="filled"
              color="informative"
              size="small"
              style={{ marginLeft: 6 }}
            />
          )}
        </Tab>
      </TabList>

      <div className="abh-detail__tab-content">
        {/* ── Tab: Core Jobs to be Done ── */}
        {selectedTab === "overview" && (
          <>
            {project.jtbd && project.jtbd.length > 0 && (
              <div className="abh-detail__jtbd">
                <h3 className="abh-detail__section-title">
                  <Target20Regular />
                  Jobs to be Done
                </h3>
                <ul className="abh-detail__jtbd-list">
                  {project.jtbd.map((job, i) => (
                    <li key={i} className="abh-detail__jtbd-item">
                      {job}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </>
        )}

        {/* ── Tab: Derived Projects ── */}
        {selectedTab === "derived" && (
          <div className="abh-detail__derived">
            {forks.length > 0 ? (
              <>
                <h3 className="abh-detail__section-title">
                  Derived Projects
                  <Caption1 className="abh-detail__derived-count">
                    {forks.length} project{forks.length !== 1 ? "s" : ""} built from this
                  </Caption1>
                </h3>
                <div className="abh-detail__derived-grid">
                  {forks.map((fork) => (
                    <ProjectCard
                      key={fork.id}
                      project={fork}
                      onClick={(forkId) => navigate(`/projects/${forkId}`)}
                      variant="compact"
                    />
                  ))}
                </div>
              </>
            ) : (
              <Caption1 className="abh-detail__empty-tab">
                No derived projects yet.
              </Caption1>
            )}
          </div>
        )}

        {/* ── Tab: Components ── */}
        {selectedTab === "components" && (
          <div className="abh-detail__components-section">
            {project.storybookComponents && project.storybookComponents.length > 0 && (
              <div className="abh-detail__component-group">
                <h3 className="abh-detail__section-title">
                  <Library20Regular />
                  Storybook Components
                  <Caption1 className="abh-detail__derived-count">
                    {project.storybookComponents.length} component{project.storybookComponents.length !== 1 ? "s" : ""}
                  </Caption1>
                </h3>
                <div className="abh-detail__component-list">
                  {project.storybookComponents.map((comp) => (
                    <Link
                      key={comp.name}
                      href={`${STORYBOOK_BASE}${comp.storyPath}`}
                      target="_blank"
                      className="abh-detail__component-link"
                    >
                      <Badge appearance="outline" color="brand" size="medium">
                        {comp.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {project.newComponents && project.newComponents.length > 0 && (
              <div className="abh-detail__component-group">
                <h3 className="abh-detail__section-title">
                  <DesignIdeas20Regular />
                  Custom Components
                  <Caption1 className="abh-detail__derived-count">
                    {project.newComponents.length} component{project.newComponents.length !== 1 ? "s" : ""}
                  </Caption1>
                </h3>
                <div className="abh-detail__new-component-list">
                  {project.newComponents.map((comp) => (
                    <div key={comp.name} className="abh-detail__new-component">
                      <Badge appearance="tint" color="subtle" size="medium">
                        {comp.name}
                      </Badge>
                      <Caption1 className="abh-detail__new-component-desc">
                        {comp.description}
                      </Caption1>
                      {comp.sourcePath && (
                        <Link
                          href={comp.sourcePath}
                          target="_blank"
                          className="abh-detail__component-link"
                        >
                          <Code20Regular />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!project.storybookComponents?.length && !project.newComponents?.length && (
              <Caption1 className="abh-detail__empty-tab">
                No components documented yet.
              </Caption1>
            )}
          </div>
        )}
      </div>

      {/* Add to collection dialog */}
      {user && (
        <AddToCollectionDialog
          projectId={project.id}
          open={showCollectionDialog}
          onClose={() => setShowCollectionDialog(false)}
        />
      )}

      {/* Share dialog */}
      {isOwner && (
        <ShareProjectDialog
          projectId={project.id}
          open={showShareDialog}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </div>
  );
};
