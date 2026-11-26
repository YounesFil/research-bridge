// Thin typed-ish client around the ResearchBridge API.
// The base URL comes from VITE_API_BASE_URL so the app is deploy-agnostic.

const BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function cleanParams(params) {
  const out = {};
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") out[key] = value;
  }
  return out;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let detail;
    try {
      detail = (await res.json()).detail;
    } catch {
      detail = res.statusText;
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function qs(params) {
  const search = new URLSearchParams(cleanParams(params)).toString();
  return search ? `?${search}` : "";
}

export const api = {
  base: BASE,

  health: () => request("/health"),

  // insights
  stats: () => request("/insights/stats"),
  fields: (limit = 12) => request(`/insights/fields${qs({ limit })}`),
  trends: () => request("/insights/trends"),
  influential: (limit = 15) => request(`/insights/influential${qs({ limit })}`),
  crossField: (limit = 15) => request(`/insights/cross-field${qs({ limit })}`),

  // papers
  search: (params) => request(`/papers${qs(params)}`),
  paper: (id) => request(`/papers/${id}`),
  references: (id, limit = 100) => request(`/papers/${id}/references${qs({ limit })}`),
  citations: (id, limit = 100) => request(`/papers/${id}/citations${qs({ limit })}`),
  paperGraph: (id, limitEach = 25) =>
    request(`/papers/${id}/graph${qs({ limit_each: limitEach })}`),

  // bridge
  bridge: (source, target, maxEdges = 5) =>
    request(`/bridge${qs({ source, target, max_edges: maxEdges })}`),

  // collections
  collections: () => request("/collections"),
  collection: (id) => request(`/collections/${id}`),
  createCollection: (body) =>
    request("/collections", { method: "POST", body: JSON.stringify(body) }),
  updateCollection: (id, body) =>
    request(`/collections/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCollection: (id) => request(`/collections/${id}`, { method: "DELETE" }),
  addPaper: (cid, pid) => request(`/collections/${cid}/papers/${pid}`, { method: "POST" }),
  removePaper: (cid, pid) =>
    request(`/collections/${cid}/papers/${pid}`, { method: "DELETE" }),

  // notes
  notes: () => request("/notes"),
  notesForPaper: (id) => request(`/papers/${id}/notes`),
  createNote: (body) => request("/notes", { method: "POST", body: JSON.stringify(body) }),
  updateNote: (id, body) =>
    request(`/notes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: "DELETE" }),
};
