-- Permit the HERMES runtime to operate the authoritative roster subject
-- factory without broad civic-truth authority. These grants support
-- discovery/quarantine bookkeeping only; Person, Occupancy, verification, and
-- publication writes remain outside this role.

GRANT UPDATE ON public.monitoring_state TO hermes_runtime;
GRANT INSERT ON public.seats TO hermes_runtime;
GRANT SELECT, UPDATE ON public.unresolved_roster_units TO hermes_runtime;
GRANT UPDATE ON hermes_ops.research_needs TO hermes_runtime;

DROP POLICY IF EXISTS hermes_discovered_seat_insert ON public.seats;
CREATE POLICY hermes_discovered_seat_insert ON public.seats
  FOR INSERT TO hermes_runtime
  WITH CHECK (
    research_contract_key = 'AUTHORITATIVE_ROSTER_DISCOVERY'
    AND baseline_status = 'discovered_unreviewed'
    AND monitoring_active = false
  );

DROP POLICY IF EXISTS hermes_roster_units_read ON public.unresolved_roster_units;
CREATE POLICY hermes_roster_units_read ON public.unresolved_roster_units
  FOR SELECT TO hermes_runtime
  USING (publication_eligible = false);

DROP POLICY IF EXISTS hermes_roster_units_update ON public.unresolved_roster_units;
CREATE POLICY hermes_roster_units_update ON public.unresolved_roster_units
  FOR UPDATE TO hermes_runtime
  USING (publication_eligible = false)
  WITH CHECK (publication_eligible = false);
