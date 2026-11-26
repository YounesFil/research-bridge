import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";

import { useFields, useSearch } from "../api/hooks";
import PaperCard from "../components/PaperCard.jsx";
import { EmptyState, ErrorState, Loading } from "../components/ui.jsx";
import { formatNumber } from "../lib/fields";

const LIMIT = 12;

function Pager({ page, pages, onPage }) {
  return (
    <div className="row gap-3">
      <button className="btn sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
        Prev
      </button>
      <span className="faint" style={{ fontSize: 13 }}>
        {page + 1} / {pages}
      </span>
      <button className="btn sm" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  );
}

export default function Search() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [field, setField] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [minCitations, setMinCitations] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const params = useMemo(
    () => ({
      q: debouncedQ || undefined,
      field: field || undefined,
      year_from: yearFrom || undefined,
      min_citations: minCitations || undefined,
      limit: LIMIT,
      offset: page * LIMIT,
    }),
    [debouncedQ, field, yearFrom, minCitations, page],
  );

  const search = useSearch(params);
  const fields = useFields(14);
  const total = search.data?.total ?? 0;
  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="page">
      <div className="container stack gap-6">
        <div className="stack gap-2">
          <h1 style={{ fontSize: 24 }}>Explore papers</h1>
          <p className="muted">Search by title or abstract, then narrow by field, year, or citations.</p>
        </div>

        <div className="card stack gap-4">
          <div style={{ position: "relative" }}>
            <SearchIcon size={18} className="faint" style={{ position: "absolute", left: 13, top: 12 }} />
            <input
              className="input"
              style={{ paddingLeft: 42 }}
              placeholder="Search papers, e.g. transformer, reinforcement learning, SLAM"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="row gap-4 wrap">
            <div>
              <div className="field-label">Field</div>
              <select
                className="select"
                style={{ width: 210 }}
                value={field}
                onChange={(e) => {
                  setField(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All fields</option>
                {(fields.data || []).map((f) => (
                  <option key={f.field_name} value={f.field_name}>
                    {f.field_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="field-label">From year</div>
              <input
                className="input"
                style={{ width: 130 }}
                type="number"
                placeholder="2015"
                value={yearFrom}
                onChange={(e) => {
                  setYearFrom(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <div>
              <div className="field-label">Min. citations</div>
              <input
                className="input"
                style={{ width: 150 }}
                type="number"
                placeholder="1000"
                value={minCitations}
                onChange={(e) => {
                  setMinCitations(e.target.value);
                  setPage(0);
                }}
              />
            </div>
          </div>
        </div>

        {search.isError ? (
          <ErrorState error={search.error} />
        ) : search.isLoading ? (
          <Loading label="Searching..." />
        ) : total === 0 ? (
          <EmptyState icon={SearchIcon} title="No papers found" hint="Try a different query or clear the filters." />
        ) : (
          <>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted" style={{ fontSize: 13.5 }}>
                {formatNumber(total)} result{total === 1 ? "" : "s"}
              </span>
              {pages > 1 && <Pager page={page} pages={pages} onPage={setPage} />}
            </div>
            <div className="grid grid-3">
              {search.data.items.map((p) => (
                <PaperCard key={p.paper_id} paper={p} />
              ))}
            </div>
            {pages > 1 && (
              <div className="row" style={{ justifyContent: "center" }}>
                <Pager page={page} pages={pages} onPage={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
