import { getSeatLedger, metricLabels, type LedgerMetrics } from '@/lib/control-plane';

export const metadata = {
  title: 'Florida seat ledger',
  description: 'Control-plane counts from persisted CivicLenZ seat, occupancy, and coverage-gap files.',
};

function MetricTable({
  caption,
  rows,
}: {
  caption: string;
  rows: Array<[string, LedgerMetrics]>;
}) {
  return (
    <table className="control-plane-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Slice</th>
          {metricLabels.map(([_, label]) => (
            <th scope="col" key={label}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, metrics]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            {metricLabels.map(([key]) => (
              <td key={key}>{metrics[key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ControlPlanePage() {
  const ledger = getSeatLedger();
  const levelRows = Object.entries(ledger.byLevel) as Array<[string, LedgerMetrics]>;
  const regionRows = Object.entries(ledger.byRegion) as Array<[string, LedgerMetrics]>;

  return (
    <article className="control-plane-page">
      <section className="page-hero">
        <div className="shell">
          <span className="eyebrow">Operations ledger</span>
          <h1>Florida expected seats and recovered occupancy</h1>
          <p>
            {ledger.truthRule} Recovered queue data is RECOVERED, not independently VERIFIED.
            This page is not the public official directory.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="shell">
          <MetricTable caption="Totals from persisted files" rows={[['totals', ledger.totals]]} />
          <MetricTable caption="By government level" rows={levelRows} />
          <MetricTable caption="By Miami-Dade, Broward, Palm Beach, and remaining" rows={regionRows} />
          <p className="control-plane-files">
            Seat files: {ledger.fileCounts.seatFiles}. Occupancy candidates:{' '}
            {ledger.fileCounts.occupancyCandidateFiles}. Coverage-gap rows:{' '}
            {ledger.coverageGaps.rows} ({ledger.coverageGaps.expectedCountUnknown} expected_count_unknown).
          </p>
        </div>
      </section>
    </article>
  );
}
