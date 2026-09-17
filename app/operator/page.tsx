import { OperatorDashboard } from "@/components/operator-dashboard";
import { getLiveOperatorDashboard } from "@/lib/civic-data/supabase-server";

export const dynamic = "force-dynamic";

export default async function OperatorPage() {
  const counts = await getLiveOperatorDashboard();
  return (
    <section className="page-hero">
      <div className="shell">
        <span className="eyebrow">Operator</span>
        <h1>Collection control plane</h1>
        <p>
          Physical counts only, read from the canonical operational store. ACTIVE requires a durable successful worker run.
        </p>
        <OperatorDashboard counts={counts} />
      </div>
    </section>
  );
}
