import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";

cytoscape.use(fcose);

const ROLE_COLORS = {
  source: "#2dd4bf",
  target: "#22d3ee",
  bridge: "#f5a524",
  center: "#2dd4bf",
  reference: "#60a5fa",
  citing: "#a3e635",
  path: "#f5a524",
};

function nodeSize(count) {
  return Math.min(18 + Math.sqrt(count || 0) * 1.1, 62);
}

function shortLabel(title) {
  if (!title) return "";
  return title.length > 42 ? `${title.slice(0, 40)}…` : title;
}

function toElements(data) {
  if (!data) return [];
  const nodes = (data.nodes || []).map((n) => ({
    data: {
      id: n.id,
      label: shortLabel(n.label),
      size: nodeSize(n.cited_by_count),
      color: (n.role && ROLE_COLORS[n.role]) || "#60a5fa",
      stub: n.is_stub ? 1 : 0,
    },
  }));
  const edges = (data.edges || []).map((e, i) => ({
    data: { id: `e${i}-${e.source}-${e.target}`, source: e.source, target: e.target },
  }));
  return [...nodes, ...edges];
}

const STYLESHEET = [
  {
    selector: "node",
    style: {
      "background-color": "data(color)",
      width: "data(size)",
      height: "data(size)",
      label: "data(label)",
      color: "#aebdd0",
      "font-size": 9,
      "font-family": "Inter, sans-serif",
      "text-valign": "bottom",
      "text-margin-y": 4,
      "text-max-width": 120,
      "text-wrap": "ellipsis",
      "min-zoomed-font-size": 8,
    },
  },
  {
    selector: "node[stub = 1]",
    style: {
      "background-opacity": 0.45,
      "border-width": 1,
      "border-color": "#2b3a55",
      "border-style": "dashed",
    },
  },
  {
    selector: "edge",
    style: {
      width: 1.2,
      "line-color": "#2b3a55",
      "target-arrow-color": "#2b3a55",
      "target-arrow-shape": "triangle",
      "arrow-scale": 0.7,
      "curve-style": "bezier",
      opacity: 0.7,
    },
  },
  {
    selector: "node.selected",
    style: { "border-width": 3, "border-color": "#eef4fb", "border-opacity": 0.95 },
  },
  { selector: "node:active", style: { "overlay-opacity": 0.1, "overlay-color": "#ffffff" } },
];

const LAYOUT = {
  name: "fcose",
  quality: "default",
  animate: true,
  animationDuration: 450,
  nodeRepulsion: 7000,
  idealEdgeLength: 95,
  padding: 28,
  randomize: true,
};

export default function CitationGraph({ data, height = 460, onNodeTap, selectedId }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const tapRef = useRef(onNodeTap);
  tapRef.current = onNodeTap;

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const cy = cytoscape({
      container: containerRef.current,
      elements: toElements(data),
      style: STYLESHEET,
      layout: LAYOUT,
      minZoom: 0.15,
      maxZoom: 2.5,
      wheelSensitivity: 0.25,
    });
    cy.on("tap", "node", (evt) => {
      if (tapRef.current) tapRef.current(evt.target.id());
    });
    cyRef.current = cy;
    return () => cy.destroy();
  }, [data]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("selected");
    if (selectedId) cy.getElementById(selectedId).addClass("selected");
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        background:
          "radial-gradient(circle at 50% 40%, rgba(45,212,191,0.05), transparent 70%), var(--bg-grid)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
      }}
    />
  );
}
