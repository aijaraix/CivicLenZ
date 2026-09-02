import { OperatorDashboard } from "@/components/operator-dashboard";
import { emptyOperatorDashboard } from "@/lib/civic-data/operator";

export default function OperatorPage() {
  const counts = emptyOperatorDashboard();
  return (
    <section className="page-hero">
      <div className="shell">
        <span className="eyebrow">Operator</span>
        <h1>Collection control plane</h1>
        <p>
          Physical counts only. This page does not simulate coverage, jobs, or worker health. Connecting it to the live
          store is a later wiring step; until then every count is zero.
        </p>
        <OperatorDashboard counts={counts} />
      </div>
    </section>
  );
}
