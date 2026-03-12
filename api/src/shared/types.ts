/** Database document types for Azure Builder Hub */

export interface ProjectDocument {
  id: string;
  name: string;
  description: string;
  authorId: string;
  authorName: string;
  status: "draft" | "published" | "archived";
  tags: string[];
  layout: "full-width" | "side-panel";
  pageCount: number;
  currentVersion: number;
  starCount: number;
  forkCount: number;
  forkedFrom: { projectId: string; projectName: string; authorName: string } | null;
  thumbnailUrl: string;
  previewUrl: string;
  repoUrl: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  deletedAt: string | null;
}

export interface VersionDocument {
  id: string;
  projectId: string;
  version: number;
  bundleUrl: string;
  manifest: Record<string, unknown>;
  createdAt: string;
  changelog?: string;
}

export interface StarDocument {
  id: string;
  userId: string;
  projectId: string;
  createdAt: string;
}

export interface ShareDocument {
  id: string;
  projectId: string;
  ownerId: string;
  ownerName: string;
  sharedWithId: string;
  sharedWithName: string;
  createdAt: string;
}

export interface CollectionDocument {
  id: string;
  name: string;
  description: string;
  authorId: string;
  authorName: string;
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
