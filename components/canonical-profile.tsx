import { COMPLETENESS_DIMENSION_LABELS, type CanonicalProfileView } from "@/lib/civic-data/profile";

export function CompletenessPanel(props: {
  dimensions?: Array<{ label: string; status: string; summary: string }>;
  gaps?: string[];
  note?: string;
}) {
  const rows =
    props.dimensions && props.dimensions.length > 0
      ? props.dimensions
      : COMPLETENESS_DIMENSION_LABELS.map((label) => ({
          label,
          status: "not_audited",
          summary: "No completeness snapshot is attached to this seat yet.",
        }));
  return (
    <section className="card profile-card">
      <h2 className="card-title">Completeness</h2>
      <p className="card-subtitle">
        {props.note ??
          "Completeness is nine queryable dimensions, not one percentage. NULL is not complete. Open-ended datasets are never everything-on-the-internet complete."}
      </p>
      <div className="dimension-grid">
        {rows.map((row) => (
          <div className="dimension-cell" key={row.label}>
            <strong>{row.label}</strong>
            <span className="badge">{row.status}</span>
            <span>{row.summary}</span>
          </div>
        ))}
      </div>
      {props.gaps && props.gaps.length > 0 ? (
        <p className="profile-meta">Known gaps: {props.gaps.join(", ")}</p>
      ) : (
        <p className="profile-meta">Gaps are listed only when a research-contract audit has run.</p>
      )}
    </section>
  );
}

export function CanonicalSeatProfile(props: { view: CanonicalProfileView }) {
  return (
    <article>
      <section className="profile-hero">
        <div className="shell">
          <span className="eyebrow">Seat record</span>
          <h1>{props.view.seatName}</h1>
          <p className="profile-title">
            {props.view.occupantName
              ? `Current occupant: ${props.view.occupantName}`
              : "No current occupant is publication-eligible yet."}
          </p>
          <div className="badges" style={{ justifyContent: "flex-start" }}>
            <span className="badge">{props.view.officeType}</span>
            <span className="badge">{props.view.occupancyStatus}</span>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="shell detail-layout">
          <section className="card profile-card">
            <h2 className="card-title">Publication-eligible claims</h2>
            <p className="card-subtitle">{props.view.completenessNote}</p>
            {props.view.publicationEligibleClaims.length ? (
              <div className="detail-grid">
                {props.view.publicationEligibleClaims.map((claim) => (
                  <div key={`${claim.fieldKey}-${claim.displayValue}`}>
                    <strong>{claim.fieldKey}</strong>
                    <span>
                      {claim.displayValue} · {claim.verificationState}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No publication-eligible claims yet. Unverified extracts stay unpublished.</div>
            )}
            <p className="profile-meta">{props.view.unpublishedCount} claims are held below the publication gate.</p>
          </section>
          <CompletenessPanel />
        </div>
      </section>
    </article>
  );
}
