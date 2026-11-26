import { Link } from "react-router-dom";
import { Calendar, Quote } from "lucide-react";

import { fieldColor, formatNumber } from "../lib/fields";

export default function PaperCard({ paper }) {
  return (
    <Link to={`/paper/${paper.paper_id}`} className="card hover stack gap-3">
      <div className="stack gap-2">
        <h3 className="serif clamp-2" style={{ fontSize: 16.5 }}>
          {paper.title || "Untitled paper"}
        </h3>
        {paper.authors?.length > 0 && (
          <div className="muted clamp-2" style={{ fontSize: 13 }}>
            {paper.authors.join(", ")}
          </div>
        )}
      </div>
      <div className="row gap-4 wrap" style={{ fontSize: 12.5 }}>
        {paper.publication_year && (
          <span className="row gap-2 faint">
            <Calendar size={13} /> {paper.publication_year}
          </span>
        )}
        <span className="row gap-2 faint">
          <Quote size={13} /> {formatNumber(paper.cited_by_count)} citations
        </span>
        {paper.is_stub && <span className="tag">metadata pending</span>}
      </div>
      {paper.fields?.length > 0 && (
        <div className="row gap-2 wrap">
          {paper.fields.slice(0, 3).map((f) => (
            <span key={f} className="badge">
              <span className="dot" style={{ background: fieldColor(f) }} />
              {f}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
