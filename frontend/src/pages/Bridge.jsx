import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Route as RouteIcon } from "lucide-react";

import { useBridge } from "../api/hooks";
import CitationGraph from "../components/CitationGraph.jsx";
import PaperPicker from "../components/PaperPicker.jsx";
import { ErrorState, Loading } from "../components/ui.jsx";
import { formatNumber } from "../lib/fields";

function SummaryStat({ label, value }) {
  return (
    <div className="card stack gap-2">
      <span className="faint" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" }}>
        {label}
      </span>
      <span className="serif" style={{ fontSize: 24 }}>{value}</span>
    </div>
  );
}

function Legend() {
  const items = [
    ["var(--accent)", "Source / target"],
    ["#f5a524", "Shared reference"],
    ["#60a5fa", "Intermediate"],
  ];
  return (
    <div className="row gap-4 wrap">
      {items.map(([c, l]) => (
        <span key={l} className="row gap-2 faint" style={{ fontSize: 12 }}>
          <span className="dot" style={{ background: c }} /> {l}
        </span>
      ))}
    </div>
  );
}

function BridgeResult({ result }) {
  const hasPath = result.path_length !== null && result.path?.length > 0;
  return (
    <div className="stack gap-5">
      <div className="grid grid-3">
        <SummaryStat
          label="Shortest path"
          value={hasPath ? `${result.path_length} hop${result.path_length === 1 ? "" : "s"}` : "none found"}
        />
        <SummaryStat label="Shared references" value={formatNumber(result.shared_references.length)} />
        <SummaryStat label="Papers citing both" value={formatNumber(result.co_citations.length)} />
      </div>

      {result.message && (
        <div className="card muted" style={{ fontSize: 14 }}>{result.message}</div>
      )}

      {hasPath && (
        <div className="card stack gap-3">
          <div className="section-title">Citation path</div>
          <div className="row gap-2 wrap">
            {result.path.map((p, i) => (
              <span key={p.paper_id} className="row gap-2 wrap">
                <Link
                  to={`/paper/${p.paper_id}`}
                  className="tag"
                  style={{ borderColor: "var(--accent)", color: "var(--text)", maxWidth: 240 }}
                >
                  <span className="clamp-1">{p.title || p.paper_id}</span>
                </Link>
                {i < result.path.length - 1 && <ArrowRight size={15} className="faint" />}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card stack gap-3">
        <div className="section-title">Connection graph</div>
        <CitationGraph data={result.graph} height={430} />
        <Legend />
      </div>

      {result.shared_references.length > 0 && (
        <div className="card stack gap-3">
          <div className="section-title">Shared references</div>
          <div className="stack gap-2">
            {result.shared_references.map((p) => (
              <Link
                key={p.paper_id}
                to={`/paper/${p.paper_id}`}
                className="row gap-3 hover"
                style={{ padding: "5px 2px", borderRadius: 8 }}
              >
                <span className="grow clamp-1 serif" style={{ fontSize: 14 }}>{p.title || "Untitled"}</span>
                <span className="faint" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                  {p.publication_year || "-"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Bridge() {
  const [source, setSource] = useState(null);
  const [target, setTarget] = useState(null);
  const [run, setRun] = useState(null);

  const bridge = useBridge(run?.source, run?.target);
  const sameTwice = source && target && source.paper_id === target.paper_id;

  return (
    <div className="page">
      <div className="container stack gap-6">
        <div className="stack gap-2">
          <h1 style={{ fontSize: 24 }}>Bridge Finder</h1>
          <p className="muted" style={{ maxWidth: 650 }}>
            Pick two papers. ResearchBridge looks for the shortest citation path between them and the
            references they share &mdash; the evidence that two lines of work are connected.
          </p>
        </div>

        <div className="card stack gap-4">
          <div className="grid grid-2">
            <div className="stack gap-2">
              <div className="field-label">First paper</div>
              <PaperPicker selected={source} onSelect={setSource} placeholder="Search the first paper..." />
            </div>
            <div className="stack gap-2">
              <div className="field-label">Second paper</div>
              <PaperPicker selected={target} onSelect={setTarget} placeholder="Search the second paper..." />
            </div>
          </div>
          <div className="row gap-3 wrap">
            <button
              className="btn primary"
              disabled={!source || !target || sameTwice}
              onClick={() => setRun({ source: source.paper_id, target: target.paper_id })}
            >
              <RouteIcon size={16} /> Find connections
            </button>
            {sameTwice && <span className="faint" style={{ fontSize: 13 }}>Pick two different papers.</span>}
          </div>
        </div>

        {run &&
          (bridge.isLoading ? (
            <Loading label="Searching for connections..." />
          ) : bridge.isError ? (
            <ErrorState error={bridge.error} />
          ) : bridge.data ? (
            <BridgeResult result={bridge.data} />
          ) : null)}
      </div>
    </div>
  );
}
