const API_BASE = '/api';

// ─── Types ───────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  usage_count?: number;
}

export interface Design {
  id: string;
  name: string;
  folder_id: string | null;
  design_json: string;
  html_cache: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  folder_name?: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  design_count: number;
  subfolder_count: number;
}

// ─── Generic fetch wrapper ───────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API error');
  }
  return res.json();
}

// ─── Designs ─────────────────────────────────────────

export const designsApi = {
  list(params?: { folder_id?: string; tag?: string; unfiled?: boolean }) {
    const qs = new URLSearchParams();
    if (params?.folder_id) qs.set('folder_id', params.folder_id);
    if (params?.tag) qs.set('tag', params.tag);
    if (params?.unfiled) qs.set('unfiled', 'true');
    const query = qs.toString();
    return apiFetch<Design[]>(`/designs${query ? `?${query}` : ''}`);
  },

  get(id: string) {
    return apiFetch<Design>(`/designs/${id}`);
  },

  create(data: { name?: string; folder_id?: string | null; design_json?: any }) {
    return apiFetch<Design>('/designs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: { name?: string; design_json?: any; html_cache?: string }) {
    return apiFetch<Design>(`/designs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete(id: string) {
    return apiFetch<{ success: boolean }>(`/designs/${id}`, { method: 'DELETE' });
  },

  move(id: string, folder_id: string | null) {
    return apiFetch<Design>(`/designs/${id}/move`, {
      method: 'PUT',
      body: JSON.stringify({ folder_id }),
    });
  },

  addTag(designId: string, tagId: string) {
    return apiFetch<{ success: boolean }>(`/designs/${designId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag_id: tagId }),
    });
  },

  removeTag(designId: string, tagId: string) {
    return apiFetch<{ success: boolean }>(`/designs/${designId}/tags/${tagId}`, {
      method: 'DELETE',
    });
  },
};

// ─── Folders ─────────────────────────────────────────

export const foldersApi = {
  list() {
    return apiFetch<Folder[]>('/folders');
  },

  create(data: { name?: string; parent_id?: string | null }) {
    return apiFetch<Folder>('/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: { name?: string; parent_id?: string | null }) {
    return apiFetch<Folder>(`/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete(id: string) {
    return apiFetch<{ success: boolean }>(`/folders/${id}`, { method: 'DELETE' });
  },
};

// ─── Tags ────────────────────────────────────────────

export const tagsApi = {
  list() {
    return apiFetch<Tag[]>('/tags');
  },

  create(data: { name: string; color?: string }) {
    return apiFetch<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: { name?: string; color?: string }) {
    return apiFetch<Tag>(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete(id: string) {
    return apiFetch<{ success: boolean }>(`/tags/${id}`, { method: 'DELETE' });
  },
};

// ─── Search ──────────────────────────────────────────

export const searchApi = {
  search(params: { q?: string; tags?: string }) {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.tags) qs.set('tags', params.tags);
    return apiFetch<(Design & { folder_name: string | null })[]>(`/search?${qs.toString()}`);
  },
};
