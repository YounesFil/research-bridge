import { useEffect, useRef, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";

import { useSearch } from "../api/hooks";

export default function PaperPicker({ selected, onSelect, placeholder = "Search for a paper..." }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDq(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useSearch({ q: dq || undefined, limit: 6 }, dq.trim().length > 1);

  if (selected) {
    return (
      <div className="card row gap-3" style={{ padding: "10px 12px" }}>
        <span className="grow clamp-2 serif" style={{ fontSize: 14 }}>
          {selected.title || selected.paper_id}
        </span>
        <button className="btn ghost sm" onClick={() => onSelect(null)} aria-label="clear">
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <SearchIcon size={16} className="faint" style={{ position: "absolute", left: 12, top: 11 }} />
      <input
        className="input"
        style={{ paddingLeft: 36 }}
        placeholder={placeholder}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && dq.trim().length > 1 && (
        <div
          className="card"
          style={{
            position: "absolute", top: 48, left: 0, right: 0, zIndex: 30, padding: 6,
            maxHeight: 300, overflowY: "auto", boxShadow: "var(--shadow-lg)",
          }}
        >
          {results.isLoading && <div className="faint" style={{ padding: 10, fontSize: 13 }}>Searching...</div>}
          {results.data?.items?.length === 0 && (
            <div className="faint" style={{ padding: 10, fontSize: 13 }}>No matches</div>
          )}
          {(results.data?.items || []).map((p) => (
            <button
              key={p.paper_id}
              className="stack gap-2 picker-item"
              style={{
                width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8,
                background: "transparent", border: "none", color: "var(--text)",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(p);
                setQ("");
                setOpen(false);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span className="clamp-2" style={{ fontSize: 13.5 }}>{p.title || "Untitled"}</span>
              <span className="faint" style={{ fontSize: 12 }}>
                {p.publication_year || "-"} &middot; {p.cited_by_count} citations
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
