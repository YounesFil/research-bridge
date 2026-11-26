import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, FolderOpen, Plus, Trash2 } from "lucide-react";

import { useCollection, useCollectionMutations, useCollections } from "../api/hooks";
import { EmptyState, ErrorState, Loading } from "../components/ui.jsx";

function CollectionDetail({ id }) {
  const detail = useCollection(id);
  const { removePaper } = useCollectionMutations();
  if (detail.isLoading) return <Loading />;
  if (detail.isError || !detail.data) return null;
  const c = detail.data;
  return (
    <div className="card stack gap-4">
      <div className="section-title">{c.name} &mdash; papers</div>
      {c.papers.length === 0 ? (
        <p className="muted" style={{ fontSize: 14 }}>
          No papers yet. Open a paper and use "Save to collection".
        </p>
      ) : (
        <div className="stack gap-3">
          {c.papers.map((p) => (
            <div key={p.paper_id} className="row gap-3">
              <Link to={`/paper/${p.paper_id}`} className="grow clamp-2 serif" style={{ fontSize: 14 }}>
                {p.title || "Untitled"}
              </Link>
              <span className="faint" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                {p.publication_year || "-"}
              </span>
              <button
                className="btn danger sm"
                onClick={() => removePaper.mutate({ cid: id, pid: p.paper_id })}
                aria-label="remove"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Collections() {
  const collections = useCollections();
  const { create, remove } = useCollectionMutations();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name: name.trim() }, { onSuccess: () => setName("") });
  };

  return (
    <div className="page">
      <div className="container stack gap-6">
        <div className="stack gap-2">
          <h1 style={{ fontSize: 24 }}>Collections</h1>
          <p className="muted">Group papers you want to come back to. Add papers from any paper's page.</p>
        </div>

        <form onSubmit={submit} className="card row gap-3 wrap">
          <input
            className="input grow"
            style={{ minWidth: 240 }}
            placeholder="New collection name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn primary" type="submit" disabled={!name.trim() || create.isPending}>
            <Plus size={16} /> Create
          </button>
        </form>

        {collections.isLoading ? (
          <Loading />
        ) : collections.isError ? (
          <ErrorState error={collections.error} />
        ) : collections.data.length === 0 ? (
          <EmptyState icon={Bookmark} title="No collections yet" hint="Create one above to start saving papers." />
        ) : (
          <div className="grid grid-3">
            {collections.data.map((c) => (
              <div
                key={c.collection_id}
                className="card stack gap-3 hover"
                style={{
                  cursor: "pointer",
                  borderColor: selected === c.collection_id ? "var(--accent)" : undefined,
                }}
                onClick={() => setSelected(selected === c.collection_id ? null : c.collection_id)}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <FolderOpen size={18} className="faint" />
                  <button
                    className="btn danger sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove.mutate(c.collection_id);
                      if (selected === c.collection_id) setSelected(null);
                    }}
                    aria-label="delete collection"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="stack gap-2">
                  <h3 style={{ fontSize: 16 }}>{c.name}</h3>
                  {c.description && (
                    <p className="muted" style={{ fontSize: 13 }}>{c.description}</p>
                  )}
                  <span className="badge" style={{ width: "fit-content" }}>
                    {c.paper_count} paper{c.paper_count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && <CollectionDetail id={selected} />}
      </div>
    </div>
  );
}
