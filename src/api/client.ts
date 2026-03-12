import type { ProjectSummary, ProjectVersion, CollectionSummary, ShareInfo } from "../components/types";

const BASE = "/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

/* ── Projects ── */

export async function listMyProjects(): Promise<ProjectSummary[]> {
  return apiFetch<ProjectSummary[]>("/projects");
}

export async function getProject(id: string): Promise<ProjectSummary> {
  return apiFetch<ProjectSummary>(`/projects/${encodeURIComponent(id)}`);
}

export async function createProject(
  data: Pick<ProjectSummary, "name" | "description" | "tags" | "layout">
): Promise<ProjectSummary> {
  return apiFetch<ProjectSummary>("/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProjectMetadata(
  id: string,
  data: Partial<Pick<ProjectSummary, "name" | "description" | "tags">>
): Promise<ProjectSummary> {
  return apiFetch<ProjectSummary>(`/projects/${encodeURIComponent(id)}/metadata`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function publishProject(id: string, publish: boolean): Promise<ProjectSummary> {
  return apiFetch<ProjectSummary>(`/projects/${encodeURIComponent(id)}/publish`, {
    method: "PUT",
    body: JSON.stringify({ publish }),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await fetch(`${BASE}/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/* ── Community ── */

export interface CommunityQuery {
  search?: string;
  tags?: string[];
  layout?: string;
  sort?: "newest" | "stars" | "forks";
  offset?: number;
  limit?: number;
}

export interface CommunityResult {
  items: ProjectSummary[];
  total: number;
}

export async function browseCommunity(query: CommunityQuery = {}): Promise<CommunityResult> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.tags?.length) params.set("tags", query.tags.join(","));
  if (query.layout) params.set("layout", query.layout);
  if (query.sort) params.set("sort", query.sort);
  if (query.offset != null) params.set("offset", String(query.offset));
  if (query.limit != null) params.set("limit", String(query.limit));
  return apiFetch<CommunityResult>(`/community?${params}`);
}

/* ── Stars ── */

export async function starProject(id: string): Promise<void> {
  await fetch(`${BASE}/projects/${encodeURIComponent(id)}/star`, { method: "POST" });
}

export async function unstarProject(id: string): Promise<void> {
  await fetch(`${BASE}/projects/${encodeURIComponent(id)}/star`, { method: "DELETE" });
}

export async function listStarredProjects(): Promise<ProjectSummary[]> {
  return apiFetch<ProjectSummary[]>("/stars/mine");
}

/* ── Fork ── */

export async function forkProject(id: string): Promise<ProjectSummary> {
  return apiFetch<ProjectSummary>(`/projects/${encodeURIComponent(id)}/fork`, {
    method: "POST",
  });
}

export async function listForks(id: string): Promise<ProjectSummary[]> {
  return apiFetch<ProjectSummary[]>(`/projects/${encodeURIComponent(id)}/forks`);
}

/* ── Versions ── */

export async function listVersions(projectId: string): Promise<ProjectVersion[]> {
  return apiFetch<ProjectVersion[]>(`/projects/${encodeURIComponent(projectId)}/versions`);
}

/* ── Collections ── */

export async function listCollections(): Promise<CollectionSummary[]> {
  return apiFetch<CollectionSummary[]>("/collections");
}

export async function getCollection(collectionId: string): Promise<CollectionSummary> {
  return apiFetch<CollectionSummary>(`/collections/${encodeURIComponent(collectionId)}`);
}

export async function createCollection(
  data: Pick<CollectionSummary, "name" | "description">
): Promise<CollectionSummary> {
  return apiFetch<CollectionSummary>("/collections", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCollection(
  collectionId: string,
  data: Partial<Pick<CollectionSummary, "name" | "description" | "projectIds">>
): Promise<CollectionSummary> {
  return apiFetch<CollectionSummary>(`/collections/${encodeURIComponent(collectionId)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCollection(collectionId: string): Promise<void> {
  await fetch(`${BASE}/collections/${encodeURIComponent(collectionId)}`, { method: "DELETE" });
}

export async function addProjectToCollection(collectionId: string, projectId: string): Promise<CollectionSummary> {
  return apiFetch<CollectionSummary>(`/collections/${encodeURIComponent(collectionId)}/projects`, {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });
}

export async function removeProjectFromCollection(collectionId: string, projectId: string): Promise<CollectionSummary> {
  return apiFetch<CollectionSummary>(`/collections/${encodeURIComponent(collectionId)}/projects`, {
    method: "DELETE",
    body: JSON.stringify({ projectId }),
  });
}

/* ── Shares ── */

export async function shareProject(projectId: string, userId: string, userName: string): Promise<ShareInfo> {
  return apiFetch<ShareInfo>(`/projects/${encodeURIComponent(projectId)}/share`, {
    method: "POST",
    body: JSON.stringify({ userId, userName }),
  });
}

export async function unshareProject(projectId: string, shareId: string): Promise<void> {
  await fetch(`${BASE}/projects/${encodeURIComponent(projectId)}/share`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shareId }),
  });
}

export async function listProjectShares(projectId: string): Promise<ShareInfo[]> {
  return apiFetch<ShareInfo[]>(`/projects/${encodeURIComponent(projectId)}/shares`);
}

export async function listSharedByMe(): Promise<ShareInfo[]> {
  return apiFetch<ShareInfo[]>("/shares/by-me");
}

export async function listSharedWithMe(): Promise<ShareInfo[]> {
  return apiFetch<ShareInfo[]>("/shares/with-me");
}

export interface UserSearchResult {
  userId: string;
  userDetails: string;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  return apiFetch<UserSearchResult[]>(`/users/search?q=${encodeURIComponent(query)}`);
}

/* ── GitHub Integration ── */

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  updated_at: string;
  language: string | null;
  default_branch: string;
}

export interface GitHubSearchResult {
  total_count: number;
  items: GitHubRepo[];
}

export interface ExperimentJson {
  name?: string;
  description?: string;
  tags?: string[];
  layout?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  status?: "draft" | "published" | "archived";
}

/** Cached GitHub token fetched from the local auth session */
let _cachedGitHubToken: string | null = null;

async function getGitHubToken(): Promise<string | null> {
  if (_cachedGitHubToken) return _cachedGitHubToken;
  try {
    const res = await fetch("/api/github-token");
    if (res.ok) {
      const data = await res.json() as { token: string };
      _cachedGitHubToken = data.token;
      return _cachedGitHubToken;
    }
  } catch {
    // Not available (mock mode or not authenticated)
  }
  return null;
}

/** Clear cached token on logout */
export function clearGitHubTokenCache() {
  _cachedGitHubToken = null;
}

async function githubFetch<T>(url: string): Promise<T> {
  const token = await getGitHubToken();
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`GitHub ${res.status}: ${text}`);
  }
  return res.json();
}

export async function searchGitHubReposByTopic(username: string): Promise<GitHubRepo[]> {
  // Try to get a local GitHub token first (fills the cache)
  const token = await getGitHubToken();

  if (token) {
    // Local dev with real OAuth — call GitHub directly
    const q = encodeURIComponent(`topic:vibe-platform user:${username}`);
    const result = await githubFetch<GitHubSearchResult>(
      `https://api.github.com/search/repositories?q=${q}&per_page=100`
    );
    return result.items;
  }

  // Production / SWA — use Azure Function proxy
  const result = await apiFetch<GitHubSearchResult>("/github-repos");
  return result.items;
}

export async function fetchExperimentJson(
  owner: string,
  repo: string
): Promise<ExperimentJson | null> {
  const token = await getGitHubToken();

  if (token) {
    // Local dev — call GitHub directly
    try {
      const data = await githubFetch<{ content: string; encoding: string }>(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/experiment.json`
      );
      if (data.encoding === "base64") {
        return JSON.parse(atob(data.content));
      }
      return null;
    } catch {
      return null;
    }
  }

  // Production — use Azure Function proxy
  try {
    return await apiFetch<ExperimentJson | null>(
      `/github-repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/experiment`
    );
  } catch {
    return null;
  }
}
