import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, BarChart3, Layers, Network, Quote, Route as RouteIcon } from "lucide-react";

import {
  useCrossField,
  useFields,
  useInfluential,
  useStats,
  useTrends,
} from "../api/hooks";
import { fieldColor, formatNumber } from "../lib/fields";

function Stat({ value, label }) {
  return (
    <div className="stack">
      <div className="serif" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1 }}>{value}</div>
      <div className="faint" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".09em", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function FeatureCard({ to, icon: Icon, title, text }) {
  return (
    <Link to={to} className="card hover stack gap-4" style={{ minHeight: 162 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div
          style={{
            width: 42, height: 42, borderRadius: 11, display: "grid", placeItems: "center",
            background: "var(--accent-soft)", color: "var(--accent)",
          }}
        >
          <Icon size={21} />
        </div>
        <ArrowRight size={18} className="faint" />
      </div>
      <div className="stack gap-2">
        <h3 style={{ fontSize: 16.5 }}>{title}</h3>
        <p className="muted" style={{ fontSize: 13.5 }}>{text}</p>
      </div>
    </Link>
  );
}

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: "8px 11px", fontSize: 12.5 }}>
      <div style={{ color: "var(--text)" }}>{payload[0].payload.field_name || label}</div>
      <div className="muted">{formatNumber(payload[0].value)} {unit}</div>
    </div>
  );
}

function FieldChart({ data }) {
  if (!data?.length) return <div className="skeleton" style={{ height: 260 }} />;
  const rows = data.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="field_name"
          width={128}
          tick={{ fill: "var(--text-dim)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} content={<ChartTooltip unit="papers" />} />
        <Bar dataKey="paper_count" radius={[0, 5, 5, 0]} barSize={16}>
          {rows.map((r) => (
            <Cell key={r.field_name} fill={fieldColor(r.field_name)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TrendChart({ data }) {
  if (!data?.length) return <div className="skeleton" style={{ height: 260 }} />;
  const rows = data.filter((d) => d.year >= 1990);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={rows} margin={{ left: -18, right: 12, top: 8 }}>
        <XAxis dataKey="year" tick={{ fill: "var(--text-faint)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={{ fill: "var(--text-faint)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip unit="papers" />} />
        <Line type="monotone" dataKey="paper_count" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "var(--accent)" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const stats = useStats();
  const fields = useFields(8);
  const trends = useTrends();
  const influential = useInfluential(6);
  const crossField = useCrossField(6);

  return (
    <>
      <section style={{ padding: "52px 0 30px" }}>
        <div className="container stack gap-4">
          <span className="badge accent" style={{ width: "fit-content" }}>Citation intelligence</span>
          <h1 className="serif" style={{ fontSize: 46, maxWidth: 780, lineHeight: 1.07 }}>
            Discover how research <span style={{ color: "var(--accent)" }}>connects</span>.
          </h1>
          <p className="muted" style={{ fontSize: 17, maxWidth: 630 }}>
            ResearchBridge turns a database of scientific papers and their citations into a map you can
            explore. Trace ideas across fields, follow the network, and find the bridges between any two studies.
          </p>
          <div className="row gap-3 wrap" style={{ marginTop: 6 }}>
            <Link to="/search" className="btn primary">Explore papers <ArrowRight size={16} /></Link>
            <Link to="/bridge" className="btn">Try the Bridge Finder</Link>
          </div>
          {stats.data && (
            <div className="row gap-6 wrap" style={{ marginTop: 28 }}>
              <Stat value={formatNumber(stats.data.papers)} label="Papers" />
              <Stat value={formatNumber(stats.data.citations)} label="Citations" />
              <Stat value={formatNumber(stats.data.authors)} label="Authors" />
              <Stat value={formatNumber(stats.data.topics)} label="Topics" />
            </div>
          )}
        </div>
      </section>

      <section className="container">
        <div className="grid grid-3">
          <FeatureCard
            to="/bridge"
            icon={RouteIcon}
            title="Bridge Finder"
            text="Pick two papers and see how they connect: the shortest citation path and the references they share."
          />
          <FeatureCard
            to="/graph"
            icon={Network}
            title="Graph Explorer"
            text="Walk the citation network. Start from any paper and expand its neighbors to see how a field is wired."
          />
          <FeatureCard
            to="/search"
            icon={BarChart3}
            title="Explore & Insights"
            text="Search thousands of papers with filters, and read the trends, fields, and most influential work."
          />
        </div>
      </section>

      <section className="container" style={{ marginTop: 20 }}>
        <div className="grid grid-2">
          <div className="card stack gap-4">
            <div className="section-title">Papers by field</div>
            <FieldChart data={fields.data} />
          </div>
          <div className="card stack gap-4">
            <div className="section-title">Publications by year</div>
            <TrendChart data={trends.data} />
          </div>
        </div>
      </section>

      <section className="container" style={{ marginTop: 20 }}>
        <div className="grid grid-2">
          <div className="card stack gap-4">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <div className="section-title">Most influential</div>
              <span className="faint" style={{ fontSize: 11.5 }}>citations within the dataset</span>
            </div>
            <div className="stack gap-3">
              {(influential.data || []).map((p, i) => (
                <Link key={p.paper_id} to={`/paper/${p.paper_id}`} className="row gap-3 hover" style={{ padding: "4px 2px", borderRadius: 8 }}>
                  <span className="serif faint" style={{ fontSize: 15, width: 22 }}>{i + 1}</span>
                  <span className="grow clamp-2" style={{ fontSize: 14 }}>{p.title || "Untitled"}</span>
                  <span className="badge accent"><Quote size={12} /> {formatNumber(p.local_citation_count)}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="card stack gap-4">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <div className="section-title">Cross-field bridges</div>
              <span className="faint" style={{ fontSize: 11.5 }}>papers spanning the most fields</span>
            </div>
            <div className="stack gap-3">
              {(crossField.data || []).map((p) => (
                <Link key={p.paper_id} to={`/paper/${p.paper_id}`} className="stack gap-2 hover" style={{ padding: "6px 2px", borderRadius: 8 }}>
                  <span className="clamp-2" style={{ fontSize: 14 }}>{p.title || "Untitled"}</span>
                  <span className="row gap-2 wrap">
                    <span className="badge amber"><Layers size={12} /> {p.field_count} fields</span>
                    {p.fields.slice(0, 3).map((f) => (
                      <span key={f} className="row gap-2 faint" style={{ fontSize: 12 }}>
                        <span className="dot" style={{ background: fieldColor(f) }} /> {f}
                      </span>
                    ))}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
