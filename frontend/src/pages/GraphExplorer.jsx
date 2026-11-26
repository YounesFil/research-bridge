import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Network, RotateCcw } from "lucide-react";

import { api } from "../api/client";
import CitationGraph from "../components/CitationGraph.jsx";
import PaperPicker from "../components/PaperPicker.jsx";
import { formatNumber } from "../lib/fields";

function mergeGraph(prev, next) {
  if (!prev) return next;
  const nodes = new Map(prev.nodes.map((n) => [n.id, n]));
  for (const n of next.nodes) if (!nodes.has(n.id)) nodes.set(n.id, n);
  const key = (e) => `${e.source}->${e.target}`;
  const edges = new Map(prev.edges.map((e) => [key(e), e]));
  for (const e of next.edges) if (!edges.has(key(e))) edges.set(key(e), e);
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

export default function GraphExplorer() {
  const [searchParams] = useSearchParams();
  const seedParam = searchParams.get("seed");

  const [seed, setSeed] = useState(null);
  const [graph, setGraph] = useState(null);
  const [selected, setSelected] = useState(null);

  const loadSeed = async (paper) => {
    setSeed(paper);
    setSelected(null);
    if (!paper) {
      setGraph(null);
      return;
    }
    const g = await api.paperGraph(paper.paper_id, 25);
    setGraph(g);
  };

  useEffect(() => {
    if (seedParam && (!seed || seed.paper_id !== seedParam)) {
      (async () => {
        const g = await api.paperGraph(seedParam, 25);
        const center = g.nodes.find((n) => n.role === "center") || g.nodes[0];
        setSeed({ paper_id: seedParam, title: center?.label || seedParam });
        setGraph(g);
        setSelected(null);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedParam]);

  const expand = async (id) => {
    setSelected(id);
    const g = await api.paperGraph(id, 18);
    setGraph((prev) => mergeGraph(prev, g));
  };

  const selectedNode = graph?.nodes.find((n) => n.id === selected);

  return (
    <div className="page">
      <div className="container stack gap-5">
        <div className="stack gap-2">
          <h1 style={{ fontSize: 24 }}>Graph Explorer</h1>
          <p className="muted" style={{ maxWidth: 640 }}>
            Start from a paper and click any node to grow its citation neighborhood. Node size reflects how
            often a paper is cited.
          </p>
        </div>

        <div style={{ maxWidth: 460 }}>
          <PaperPicker selected={seed} onSelect={loadSeed} placeholder="Choose a paper to start from..." />
        </div>

        {!seed ? (
          <div className="card state">
            <Network size={26} />
            <div className="muted">Pick a paper above to grow its citation network.</div>
          </div>
        ) : (
          <div className="split">
            <div className="stack gap-3">
              <div className="row gap-3" style={{ justifyContent: "space-between" }}>
                <span className="muted" style={{ fontSize: 13 }}>
                  {graph ? `${graph.nodes.length} papers, ${graph.edges.length} citations` : "Loading..."}
                </span>
                <button className="btn sm" onClick={() => loadSeed(seed)}>
                  <RotateCcw size={14} /> Reset
                </button>
              </div>
              {graph && (
                <CitationGraph data={graph} height={560} onNodeTap={expand} selectedId={selected} />
              )}
            </div>

            <div className="card stack gap-3" style={{ height: "fit-content" }}>
              <div className="section-title">Selected paper</div>
              {selectedNode ? (
                <div className="stack gap-3">
                  <h3 className="serif" style={{ fontSize: 15 }}>{selectedNode.label || "Untitled"}</h3>
                  <div className="row gap-3 wrap faint" style={{ fontSize: 12.5 }}>
                    {selectedNode.year && <span>{selectedNode.year}</span>}
                    <span>{formatNumber(selectedNode.cited_by_count)} citations</span>
                  </div>
                  <div className="row gap-2 wrap">
                    <button className="btn sm" onClick={() => expand(selectedNode.id)}>
                      <Network size={14} /> Expand
                    </button>
                    <Link to={`/paper/${selectedNode.id}`} className="btn sm">Open paper</Link>
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 13.5 }}>
                  Click a node to inspect it, then expand to pull in its neighbors.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
