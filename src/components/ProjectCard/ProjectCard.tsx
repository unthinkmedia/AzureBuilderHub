import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardFooter,
  Text,
  Caption1,
  Badge,
  Avatar,
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
} from "@fluentui/react-components";
import {
  Star24Regular,
  Star24Filled,
  MoreHorizontal20Regular,
  Delete20Regular,
  Copy20Regular,
  Share20Regular,
  Code20Regular,
  WindowConsole20Regular,
  Open20Regular,
  Info20Regular,
} from "@fluentui/react-icons";
import type { ProjectSummary, ProjectStatus } from "../types";
import { StatCounter } from "../StatCounter";
import { AddToCollectionDialog } from "../AddToCollectionDialog";
import "./ProjectCard.css";

export type ProjectCardVariant = "grid" | "compact";

export interface ProjectCardProps {
  /** Project data to display */
  project: ProjectSummary;
  /** Callback when the card is clicked */
  onClick?: (projectId: string) => void;
  /** Callback when the star button is clicked */
  onStar?: (projectId: string) => void;
  /** Whether the current user has starred this project */
  isStarred?: boolean;
  /** Callback when Publish/Unpublish is clicked. Receives (id, newPublishedState) */
  onPublishToggle?: (projectId: string, publish: boolean) => void;
  /** Show "Add to collection" menu item (opens modal dialog) */
  showAddToCollection?: boolean;
  /** Callback when Delete is clicked */
  onDelete?: (projectId: string) => void;
  /** Callback when Duplicate is clicked */
  onDuplicate?: (projectId: string) => void;
  /** Callback when Share is clicked */
  onShare?: (projectId: string) => void;
  /** Callback when "Open in VS Code" is clicked */
  onOpenInVSCode?: (projectId: string) => void;
  /** Callback when "Open in Copilot CLI" is clicked */
  onOpenInCopilotCLI?: (projectId: string) => void;
  /** Optional additional CSS class */
  className?: string;
  /** Display variant: grid card or compact list row */
  variant?: ProjectCardVariant;
}

const statusLabelMap: Record<ProjectStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const badgeColorMap: Record<ProjectStatus, "informative" | "success" | "important"> = {
  draft: "informative",
  published: "success",
  archived: "important",
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onClick,
  onStar,
  isStarred = false,
  onPublishToggle,
  showAddToCollection,
  onDelete,
  onDuplicate,
  onShare,
  onOpenInVSCode,
  onOpenInCopilotCLI,
  className,
  variant = "grid",
}) => {
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);

  const author = project.author ?? { id: (project as any).authorId ?? "", name: (project as any).authorName ?? "Unknown" };

  const handleClick = () => {
    onClick?.(project.id);
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStar?.(project.id);
  };

  const handleMenuAction = (e: React.MouseEvent, action?: (id: string) => void) => {
    e.stopPropagation();
    action?.(project.id);
  };

  const timeAgo = getRelativeTime(project.updatedAt);

  const isPublished = project.status === "published";
  const hasDeployedContent = project.currentVersion > 0;
  const hasMenuActions = onClick || onDelete || onDuplicate || onShare || onOpenInVSCode || onOpenInCopilotCLI || onPublishToggle || showAddToCollection || hasDeployedContent || project.repoUrl;

  if (variant === "compact") {
    return (
      <Card
        className={`abh-project-card abh-project-card--compact ${className ?? ""}`}
        onClick={handleClick}
        orientation="horizontal"
        aria-label={`${project.name} by ${author.name}`}
      >
        <div className="abh-project-card__compact-thumb">
          {hasDeployedContent ? (
            <img
              src={project.thumbnailUrl}
              alt={`Preview of ${project.name}`}
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                target.parentElement?.classList.add("abh-project-card__thumbnail-placeholder");
              }}
            />
          ) : (
            <div className="abh-project-card__thumbnail-placeholder" aria-hidden="true">
              <span>No preview</span>
            </div>
          )}
        </div>
        <div className="abh-project-card__compact-body">
          <div className="abh-project-card__compact-main">
            <div className="abh-project-card__compact-title-row">
              <Text weight="semibold">{project.name}</Text>
              <Badge
                appearance="filled"
                color={badgeColorMap[project.status]}
                size="small"
              >
                {statusLabelMap[project.status]}
              </Badge>
            </div>
            <Caption1 className="abh-project-card__compact-meta">
              {author.name} · {timeAgo}
            </Caption1>
            <Caption1 className="abh-project-card__compact-desc">
              {project.description}
            </Caption1>
          </div>
          <div className="abh-project-card__compact-end">
            {project.tags.length > 0 && (
              <div className="abh-project-card__tags" role="list" aria-label="Tags">
                {project.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} appearance="outline" size="small" role="listitem">
                    {tag}
                  </Badge>
                ))}
                {project.tags.length > 2 && (
                  <Caption1 className="abh-project-card__tag--overflow">
                    +{project.tags.length - 2}
                  </Caption1>
                )}
              </div>
            )}
            <div className="abh-project-card__stats">
              <StatCounter
                icon={<StarIcon filled={isStarred} />}
                count={project.starCount}
                ariaLabel={`${project.starCount} stars`}
                size="small"
              />
              <StatCounter
                icon={<ForkIcon />}
                count={project.forkCount}
                ariaLabel={`${project.forkCount} forks`}
                size="small"
              />
            </div>
            {onStar && (
              <Button
                appearance="subtle"
                size="small"
                icon={isStarred ? <Star24Filled /> : <Star24Regular />}
                onClick={handleStarClick}
                aria-label={isStarred ? "Unstar this project" : "Star this project"}
                aria-pressed={isStarred}
                className={isStarred ? "abh-project-card__star-btn--active" : ""}
              />
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
    <Card
      className={`abh-project-card ${className ?? ""}`}
      onClick={handleClick}
      aria-label={`${project.name} by ${author.name}`}
    >
      {/* Thumbnail */}
      <div className="abh-project-card__thumbnail">
        {hasDeployedContent ? (
          <img
            src={project.thumbnailUrl}
            alt={`Preview of ${project.name}`}
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              target.parentElement?.classList.add("abh-project-card__thumbnail-placeholder");
            }}
          />
        ) : (
          <div className="abh-project-card__thumbnail-placeholder" aria-hidden="true">
            <span>No preview</span>
          </div>
        )}

      </div>

      {/* Header with title + description */}
      <CardHeader
        image={
          <Avatar
            name={author.name}
            image={author.avatarUrl ? { src: author.avatarUrl } : undefined}
            size={24}
          />
        }
        header={<Text weight="semibold">{project.name}</Text>}
        description={<Caption1>{author.name} · {timeAgo}</Caption1>}
      />

      {/* Description */}
      <Caption1 className="abh-project-card__description">
        {project.description}
      </Caption1>

      {/* Tags */}
      {project.tags.length > 0 && (
        <div className="abh-project-card__tags" role="list" aria-label="Tags">
          {project.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} appearance="outline" size="small" role="listitem">
              {tag}
            </Badge>
          ))}
          {project.tags.length > 3 && (
            <Caption1 className="abh-project-card__tag--overflow">
              +{project.tags.length - 3}
            </Caption1>
          )}
        </div>
      )}

      {/* Fixed Footer */}
      <CardFooter className="abh-project-card__footer">
        <div className="abh-project-card__footer-left">
          <StatCounter
            icon={<StarIcon filled={isStarred} />}
            count={project.starCount}
            ariaLabel={`${project.starCount} stars`}
            size="small"
          />
          <StatCounter
            icon={<ForkIcon />}
            count={project.forkCount}
            ariaLabel={`${project.forkCount} forks`}
            size="small"
          />
        </div>
        <div className="abh-project-card__footer-right">
          <Badge
            appearance="filled"
            color={badgeColorMap[project.status]}
            size="small"
          >
            {statusLabelMap[project.status]}
          </Badge>
          {hasDeployedContent && (
            <Button
              appearance="subtle"
              size="small"
              icon={<Open20Regular />}
              onClick={(e) => {
                e.stopPropagation();
                window.open(project.previewUrl, '_blank', 'noopener,noreferrer');
              }}
              aria-label={`Preview ${project.name}`}
            />
          )}
          {hasMenuActions && (
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
                  {onClick && (
                    <MenuItem
                      icon={<Info20Regular />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClick(project.id);
                      }}
                    >
                      View details
                    </MenuItem>
                  )}
                  {onClick && (hasDeployedContent || onPublishToggle || showAddToCollection) && (
                    <MenuDivider />
                  )}
                  <MenuItem
                    icon={<Code20Regular />}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(project.repoUrl || 'https://github.com/unthinkmedia/AzureBuilderPlayground', '_blank', 'noopener,noreferrer');
                    }}
                  >
                    GitHub Repo
                  </MenuItem>
                  {hasDeployedContent && (
                    <MenuItem
                      icon={<Open20Regular />}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(project.previewUrl, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      Open in Browser
                    </MenuItem>
                  )}
                  {(onPublishToggle || showAddToCollection) && (
                    <MenuDivider />
                  )}
                  {onPublishToggle && (
                    <MenuItem
                      icon={<PublishIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPublishToggle(project.id, !isPublished);
                      }}
                    >
                      {isPublished ? "Unpublish" : "Publish"}
                    </MenuItem>
                  )}
                  {showAddToCollection && (
                    <MenuItem
                      icon={<CollectionIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCollectionDialog(true);
                      }}
                    >
                      Add to collection
                    </MenuItem>
                  )}
                  {(onPublishToggle || showAddToCollection) && (onShare || onDuplicate) && (
                    <MenuDivider />
                  )}
                  {onShare && (
                    <MenuItem
                      icon={<Share20Regular />}
                      onClick={(e) => handleMenuAction(e, onShare)}
                    >
                      Share
                    </MenuItem>
                  )}
                  {onDuplicate && (
                    <MenuItem
                      icon={<Copy20Regular />}
                      onClick={(e) => handleMenuAction(e, onDuplicate)}
                    >
                      Duplicate
                    </MenuItem>
                  )}
                  {(onOpenInVSCode || onOpenInCopilotCLI) && (
                    <MenuDivider />
                  )}
                  {onOpenInVSCode && (
                    <MenuItem
                      icon={<Code20Regular />}
                      onClick={(e) => handleMenuAction(e, onOpenInVSCode)}
                    >
                      Open in VS Code
                    </MenuItem>
                  )}
                  {onOpenInCopilotCLI && (
                    <MenuItem
                      icon={<WindowConsole20Regular />}
                      onClick={(e) => handleMenuAction(e, onOpenInCopilotCLI)}
                    >
                      Open in Copilot CLI
                    </MenuItem>
                  )}
                  {onDelete && (
                    <>
                      <MenuDivider />
                      <MenuItem
                        icon={<Delete20Regular />}
                        onClick={(e) => handleMenuAction(e, onDelete)}
                      >
                        Delete
                      </MenuItem>
                    </>
                  )}
                </MenuList>
              </MenuPopover>
            </Menu>
          )}
        </div>
      </CardFooter>

    </Card>

      {showAddToCollection && (
        <AddToCollectionDialog
          projectId={project.id}
          open={showCollectionDialog}
          onClose={() => setShowCollectionDialog(false)}
        />
      )}
    </>
  );
};

/* Inline SVG icons — lightweight, no external dependency */

const StarIcon: React.FC<{ filled?: boolean }> = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M8 1.5l1.85 3.75L14 5.88l-3 2.92.71 4.13L8 10.94l-3.71 1.99.71-4.13-3-2.92 4.15-.63L8 1.5z"
      fill={filled ? "var(--colorPaletteYellowForeground1, #E3A400)" : "none"}
      stroke={filled ? "var(--colorPaletteYellowForeground1, #E3A400)" : "currentColor"}
      strokeWidth="1.2"
    />
  </svg>
);

const CollectionIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <rect x="2" y="6.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <rect x="2" y="11" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const PublishIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 2v9M4.5 5.5L8 2l3.5 3.5M3 13h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ForkIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M5 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM14 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM9.5 12.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM3.5 5v2.5A2.5 2.5 0 0 0 6 10h4a2.5 2.5 0 0 0 2.5-2.5V5M8 10v1"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
