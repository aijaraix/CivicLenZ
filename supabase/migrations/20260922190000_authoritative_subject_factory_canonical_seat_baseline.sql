-- Align the Subject Factory's discovery-only insert policy with the existing
-- canonical seats.baseline_status enum. This changes no table constraint and
-- grants no identity, occupancy, verification, or publication authority.

DROP POLICY IF EXISTS hermes_discovered_seat_insert ON public.seats;
CREATE POLICY hermes_discovered_seat_insert ON public.seats
  FOR INSERT TO hermes_runtime
  WITH CHECK (
    research_contract_key = 'AUTHORITATIVE_ROSTER_DISCOVERY'
    AND baseline_status = 'discovered'
    AND monitoring_active = false
  );
