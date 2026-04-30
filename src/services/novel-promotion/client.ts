interface ApiFetchLike {
  (input: string, init?: RequestInit): Promise<Response>;
}

export interface CreateProjectInput {
  apiFetch: ApiFetchLike;
  rawText: string;
  title?: string;
  ratio?: string;
  artStyle?: string;
}

export interface CreateProjectResult {
  projectId: string;
  episodeId: string;
  title: string;
}

interface ErrorBody {
  error?: string;
  message?: string;
}

export async function createNovelPromotionProject({
  apiFetch,
  rawText,
  title,
  ratio,
  artStyle,
}: CreateProjectInput): Promise<CreateProjectResult> {
  const res = await apiFetch("/api/novel-promotion/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText, title, ratio, artStyle }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<CreateProjectResult> &
    ErrorBody;

  if (!res.ok || !data.projectId || !data.episodeId) {
    const detail = data.message ?? res.statusText;
    throw new Error(data.error ? `${data.error}: ${detail}` : detail);
  }

  return {
    projectId: data.projectId,
    episodeId: data.episodeId,
    title: data.title ?? "",
  };
}

export interface ClipDetail {
  id: string;
  index: number;
  startText: string;
  endText: string;
  content: string;
  location: string | null;
  characters: string[];
  props: string[];
  matchLevel: string | null;
  screenplay: { scenes?: Array<Record<string, unknown>> } | null;
}

export interface ProjectDetail {
  project: {
    id: string;
    title: string;
    ratio: string | null;
    artStyle: string | null;
    createdAt: string;
  };
  episode: {
    id: string;
    rawText: string;
    status: string;
    charactersIntroduction: string | null;
    characters: Array<{ id: string; libName: string; description: string | null }>;
    locations: Array<{ id: string; libName: string; description: string | null }>;
    props: Array<{ id: string; libName: string; description: string | null }>;
    clips: ClipDetail[];
  } | null;
  latestRun: {
    id: string;
    status: string;
    progress: number;
    step: string | null;
    error: string | null;
    result: Record<string, unknown> | null;
  } | null;
}

export async function updateNovelPromotionRawText({
  apiFetch,
  projectId,
  rawText,
}: {
  apiFetch: ApiFetchLike;
  projectId: string;
  rawText: string;
}): Promise<void> {
  const res = await apiFetch(`/api/novel-promotion/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as ErrorBody;
    const detail = data.message ?? res.statusText;
    throw new Error(data.error ? `${data.error}: ${detail}` : detail);
  }
}

export async function getNovelPromotionProject({
  apiFetch,
  projectId,
}: {
  apiFetch: ApiFetchLike;
  projectId: string;
}): Promise<ProjectDetail> {
  const res = await apiFetch(`/api/novel-promotion/${projectId}`, {
    method: "GET",
  });
  const data = (await res.json().catch(() => ({}))) as ProjectDetail & ErrorBody;
  if (!res.ok) {
    const detail = data.message ?? res.statusText;
    throw new Error(data.error ? `${data.error}: ${detail}` : detail);
  }
  return data;
}
