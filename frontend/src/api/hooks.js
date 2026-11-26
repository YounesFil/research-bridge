// TanStack Query hooks. These give every page caching plus consistent
// loading / error / empty handling for free.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./client";

// --- insights ---
export const useStats = () => useQuery({ queryKey: ["stats"], queryFn: api.stats });
export const useFields = (limit = 10) =>
  useQuery({ queryKey: ["fields", limit], queryFn: () => api.fields(limit) });
export const useTrends = () => useQuery({ queryKey: ["trends"], queryFn: api.trends });
export const useInfluential = (limit = 10) =>
  useQuery({ queryKey: ["influential", limit], queryFn: () => api.influential(limit) });
export const useCrossField = (limit = 10) =>
  useQuery({ queryKey: ["crossField", limit], queryFn: () => api.crossField(limit) });

// --- papers ---
export const useSearch = (params, enabled = true) =>
  useQuery({
    queryKey: ["search", params],
    queryFn: () => api.search(params),
    enabled,
    placeholderData: (prev) => prev,
  });
export const usePaper = (id) =>
  useQuery({ queryKey: ["paper", id], queryFn: () => api.paper(id), enabled: !!id });
export const useReferences = (id) =>
  useQuery({ queryKey: ["refs", id], queryFn: () => api.references(id), enabled: !!id });
export const useCitations = (id) =>
  useQuery({ queryKey: ["cites", id], queryFn: () => api.citations(id), enabled: !!id });
export const usePaperGraph = (id, limitEach = 25) =>
  useQuery({
    queryKey: ["pgraph", id, limitEach],
    queryFn: () => api.paperGraph(id, limitEach),
    enabled: !!id,
  });

// --- bridge ---
export const useBridge = (source, target, maxEdges = 5) =>
  useQuery({
    queryKey: ["bridge", source, target, maxEdges],
    queryFn: () => api.bridge(source, target, maxEdges),
    enabled: !!source && !!target,
  });

// --- collections ---
export const useCollections = () =>
  useQuery({ queryKey: ["collections"], queryFn: api.collections });
export const useCollection = (id) =>
  useQuery({ queryKey: ["collection", id], queryFn: () => api.collection(id), enabled: !!id });

export function useCollectionMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["collections"] });
    qc.invalidateQueries({ queryKey: ["collection"] });
  };
  return {
    create: useMutation({ mutationFn: api.createCollection, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, body }) => api.updateCollection(id, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: api.deleteCollection, onSuccess: invalidate }),
    addPaper: useMutation({
      mutationFn: ({ cid, pid }) => api.addPaper(cid, pid),
      onSuccess: invalidate,
    }),
    removePaper: useMutation({
      mutationFn: ({ cid, pid }) => api.removePaper(cid, pid),
      onSuccess: invalidate,
    }),
  };
}

// --- notes ---
export const useNotesForPaper = (id) =>
  useQuery({ queryKey: ["notes", id], queryFn: () => api.notesForPaper(id), enabled: !!id });

export function useNoteMutations(paperId) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["notes", paperId] });
  return {
    create: useMutation({ mutationFn: api.createNote, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, body }) => api.updateNote(id, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: api.deleteNote, onSuccess: invalidate }),
  };
}
