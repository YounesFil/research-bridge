import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ExternalLink,
  Network,
  Pencil,
  Plus,
  Quote,
  Route as RouteIcon,
  Trash2,
} from "lucide-react";

import {
  useCitations,
  useCollectionMutations,
  useCollections,
  useNoteMutations,
  useNotesForPaper,
  usePaper,
  usePaperGraph,
  useReferences,
} from "../api/hooks";
import CitationGraph from "../components/CitationGraph.jsx";
import { ErrorState, Loading } from "../components/ui.jsx";
import { fieldColor, formatNumber } from "../lib/fields";

function SaveToCollection({ paperId }) {
  const collections = useCollections();
  const { addPaper, create } = useCollectionMutations();
  const [newName, setNewName] = useState("");
  const [saved, setSaved] = useState(null);

  const add = (cid, label) =>
    addPaper.mutate(
      { cid, pid: paperId },
      {
        onSuccess: () => {
          setSaved(label);
          setTimeout(() => setSaved(null), 1600);
        },
      },
    );

  const createAndAdd = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    create.mutate(
      { name: newName.trim() },
      {
        onSuccess: (col) => {
          add(col.collection_id, col.name);
          setNewName("");
        },
      },
    );
  };

  return (
    <details className="dropdown">
      <summary className="btn">
        <Plus size={15} /> {saved ? `Saved to ${saved}` : "Save to collection"}
      </summary>
      <div className="card menu">
        {(collections.data || []).map((c) => (
          <button key={c.collection_id} className="menu-item" onClick={() => add(c.collection_id, c.name)}>
            {c.name}
          </button>
        ))}
        {collections.data?.length === 0 && (
          <div className="faint" style={{ fontSize: 12, padding: "6px 10px" }}>No collections yet</div>
        )}
        <form onSubmit={createAndAdd} className="row gap-2" style={{ padding: "6px 6px 2px" }}>
          <input
            className="input"
            style={{ fontSize: 13, padding: "6px 9px" }}
            placeholder="New collection"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn sm primary" type="submit">Add</button>
        </form>
      </div>
    </details>
  );
}

function PaperGraphCard({ id }) {
  const g = usePaperGraph(id, 20);
  return (
    <div className="card stack gap-3">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="section-title">Citation neighborhood</div>
        <Link to={`/graph?seed=${id}`} className="btn ghost sm">
          Open full explorer <ArrowRight size={14} />
        </Link>
      </div>
      {g.isLoading ? (
        <div className="skeleton" style={{ height: 360 }} />
      ) : g.data ? (
        <CitationGraph data={g.data} height={380} />
      ) : null}
    </div>
  );
}

function PaperMiniList({ title, sub, query }) {
  return (
    <div className="card stack gap-3">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="section-title">{title}</div>
        <span className="faint" style={{ fontSize: 11.5 }}>{sub}</span>
      </div>
      {query.isLoading ? (
        <Loading />
      ) : (query.data || []).length === 0 ? (
        <p className="muted" style={{ fontSize: 13.5 }}>None in the dataset.</p>
      ) : (
        <div className="stack gap-2" style={{ maxHeight: 340, overflowY: "auto" }}>
          {query.data.map((p) => (
            <Link
              key={p.paper_id}
              to={`/paper/${p.paper_id}`}
              className="row gap-3 hover"
              style={{ padding: "5px 2px", borderRadius: 8 }}
            >
              <span className="grow clamp-2" style={{ fontSize: 13.5 }}>{p.title || p.paper_id}</span>
              <span className="faint" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                {p.publication_year || "-"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesCard({ paperId }) {
  const notes = useNotesForPaper(paperId);
  const { create, update, remove } = useNoteMutations(paperId);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState("");

  const add = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    create.mutate({ paper_id: paperId, content: text.trim() }, { onSuccess: () => setText("") });
  };

  return (
    <div className="card stack gap-4">
      <div className="section-title">Notes</div>
      <form onSubmit={add} className="stack gap-3">
        <textarea
          className="input"
          placeholder="Write a note about this paper..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn primary sm" style={{ width: "fit-content" }} type="submit" disabled={!text.trim() || create.isPending}>
          <Plus size={15} /> Add note
        </button>
      </form>
      <div className="stack gap-3">
        {(notes.data || []).map((n) => (
          <div key={n.note_id} className="card stack gap-2" style={{ background: "var(--surface-2)" }}>
            {editing === n.note_id ? (
              <div className="stack gap-2">
                <textarea className="input" value={editText} onChange={(e) => setEditText(e.target.value)} />
                <div className="row gap-2">
                  <button
                    className="btn sm primary"
                    onClick={() =>
                      update.mutate(
                        { id: n.note_id, body: { content: editText } },
                        { onSuccess: () => setEditing(null) },
                      )
                    }
                  >
                    <Check size={14} /> Save
                  </button>
                  <button className="btn sm ghost" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 14, lineHeight: 1.55 }}>{n.content}</p>
                <div className="row gap-2" style={{ justifyContent: "flex-end" }}>
                  <button
                    className="btn ghost sm"
                    onClick={() => {
                      setEditing(n.note_id);
                      setEditText(n.content);
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button className="btn danger sm" onClick={() => remove.mutate(n.note_id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Paper() {
  const { id } = useParams();
  const paper = usePaper(id);
  const references = useReferences(id);
  const citing = useCitations(id);

  if (paper.isLoading)
    return (
      <div className="page">
        <div className="container"><Loading /></div>
      </div>
    );
  if (paper.isError)
    return (
      <div className="page">
        <div className="container"><ErrorState error={paper.error} /></div>
      </div>
    );

  const p = paper.data;

  return (
    <div className="page">
      <div className="container stack gap-5">
        <Link to="/search" className="row gap-2 faint" style={{ fontSize: 13.5, width: "fit-content" }}>
          <ArrowLeft size={15} /> Back to explore
        </Link>

        <div className="card stack gap-4 pad-lg">
          <h1 className="serif" style={{ fontSize: 27, lineHeight: 1.2 }}>{p.title || "Untitled paper"}</h1>
          {p.authors_detail?.length > 0 && (
            <div className="muted">{p.authors_detail.map((a) => a.name).join(", ")}</div>
          )}
          <div className="row gap-4 wrap" style={{ fontSize: 13 }}>
            {p.publication_year && (
              <span className="row gap-2 faint"><Calendar size={14} /> {p.publication_year}</span>
            )}
            <span className="row gap-2 faint"><Quote size={14} /> {formatNumber(p.cited_by_count)} total citations</span>
            <span className="row gap-2 faint">
              <Network size={14} /> {p.reference_count} references &middot; {p.local_citation_count} cited-by here
            </span>
          </div>
          {p.topics?.length > 0 && (
            <div className="row gap-2 wrap">
              {p.topics.map((t) => (
                <span key={t.topic_id} className="badge">
                  <span className="dot" style={{ background: fieldColor(t.field_name) }} /> {t.name}
                </span>
              ))}
            </div>
          )}
          {p.abstract && (
            <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.62, maxWidth: 860 }}>{p.abstract}</p>
          )}
          <div className="row gap-3 wrap">
            <SaveToCollection paperId={p.paper_id} />
            <Link to={`/graph?seed=${p.paper_id}`} className="btn"><Network size={15} /> Open in graph</Link>
            <Link to="/bridge" className="btn"><RouteIcon size={15} /> Bridge from here</Link>
            {p.doi && (
              <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer" className="btn ghost">
                <ExternalLink size={15} /> View DOI
              </a>
            )}
          </div>
        </div>

        <PaperGraphCard id={p.paper_id} />

        <div className="grid grid-2">
          <PaperMiniList title="References" sub="papers this one cites" query={references} />
          <PaperMiniList title="Cited by" sub="papers that cite this, in our data" query={citing} />
        </div>

        <NotesCard paperId={p.paper_id} />
      </div>
    </div>
  );
}
