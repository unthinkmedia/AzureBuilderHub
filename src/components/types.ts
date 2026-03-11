/** Shared types for Azure Builder Hub components */

export interface ProjectAuthor {
  name: string;
  id: string;
  avatarUrl?: string;
}

export interface ForkedFrom {
  projectId: string;
  projectName: string;
  authorName: string;
}

export type ProjectStatus = "draft" | "published" | "archived";
export type LayoutType = "full-width" | "side-panel";

export interface StorybookComponentRef {
  name: string;
  storyPath: string;
}

export interface NewComponentRef {
  name: string;
  description: string;
  sourcePath?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  author: ProjectAuthor;
  status: ProjectStatus;
  tags: string[];
  layout: LayoutType;
  pageCount: number;
  currentVersion: number;
  starCount: number;
  forkCount: number;
  forkedFrom: ForkedFrom | null;
  thumbnailUrl: string;
  previewUrl: string;
  repoUrl?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  /** Whether the current user has starred this project (populated by API) */
  isStarred?: boolean;
  /** Jobs to be done — user-centric goals this project addresses */
  jtbd?: string[];
  /** Storybook components used in this project */
  storybookComponents?: StorybookComponentRef[];
  /** New custom components created for this project */
  newComponents?: NewComponentRef[];
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  version: number;
  bundleUrl: string;
  manifest: Record<string, unknown>;
  createdAt: string;
  changelog?: string;
}

export interface ShareInfo {
  id: string;
  projectId: string;
  ownerId: string;
  ownerName: string;
  sharedWithId: string;
  sharedWithName: string;
  createdAt: string;
}

export interface CollectionSummary {
  id: string;
  name: string;
  description: string;
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
}
