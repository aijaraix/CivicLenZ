import type { OperatorDashboardCounts } from "@/lib/civic-data/operator";

function Stat(props: { label: string; value: number | string }) {
  return (
    <div className="stat-tile">
      <strong>{props.value}</strong>
      <span>{props.label}</span>
    </div>
  );
}

export function OperatorDashboard(props: { counts: OperatorDashboardCounts }) {
  const counts = props.counts;
  return (
    <div className="operator-board">
      {!counts.connected ? (
        <p className="empty-state">
          Collection store is not connected to this web process. Counts below are physical zeros, not estimates.
        </p>
      ) : null}
      <div className="stat-grid">
        <Stat label="Seats discovered" value={counts.seatsDiscovered} />
        <Stat label="Current occupants" value={counts.currentOccupants} />
        <Stat label="Baseline complete" value={counts.baselineComplete} />
        <Stat label="Monitored" value={counts.monitored} />
        <Stat label="Jobs queued" value={counts.jobsQueued} />
        <Stat label="Jobs running" value={counts.jobsRunning} />
        <Stat label="Jobs succeeded" value={counts.jobsSucceeded} />
        <Stat label="Jobs failed" value={counts.jobsFailed} />
        <Stat label="Dead-letter" value={counts.jobsDeadLetter} />
        <Stat label="Contradictions" value={counts.contradictions} />
        <Stat label="Stale claims" value={counts.staleClaims} />
      </div>
      <section className="card profile-card">
        <h2 className="card-title">Worker states</h2>
        <p className="card-subtitle">READY means code exists. ACTIVE requires a real successful worker_run of that path.</p>
        {counts.workerStates.length ? (
          <div className="detail-grid">
            {counts.workerStates.map((row) => (
              <div key={row.capability}>
                <strong>{row.capability}</strong>
                <span>{row.state}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No worker_run rows are visible to this page.</div>
        )}
      </section>
      <section className="card profile-card">
        <h2 className="card-title">Completeness by category</h2>
        {Object.keys(counts.completenessByCategory).length ? (
          <div className="detail-grid">
            {Object.entries(counts.completenessByCategory).map(([category, value]) => (
              <div key={category}>
                <strong>{category}</strong>
                <span>
                  {value.present}/{value.total}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No research-contract field counts yet.</div>
        )}
        <p className="profile-meta">Known gaps: {counts.knownGaps.length ? counts.knownGaps.join(", ") : "none recorded"}</p>
      </section>
      <section className="card profile-card">
        <h2 className="card-title">Source health</h2>
        {counts.sourceHealth.length ? (
          <div className="detail-grid">
            {counts.sourceHealth.map((source) => (
              <div key={source.sourceKey}>
                <strong>{source.sourceKey}</strong>
                <span>{source.healthState}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No source rows are visible to this page.</div>
        )}
      </section>
      <section className="card profile-card">
        <h2 className="card-title">Recent runs</h2>
        {counts.recentRuns.length ? (
          <div className="detail-grid">
            {counts.recentRuns.map((run, index) => (
              <div key={`${run.workerKey}-${index}`}>
                <strong>{run.workerKey}</strong>
                <span>
                  {run.status}
                  {run.completedAt ? ` · ${run.completedAt}` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No recent worker_runs.</div>
        )}
      </section>
    </div>
  );
}
