import { notFound } from "next/navigation";
import { CanonicalSeatProfile } from "@/components/canonical-profile";
import { buildCanonicalProfileView } from "@/lib/civic-data/profile";
import { getAllOfficials, getOfficialBySeatKey, publicSeatKey } from "@/lib/officials";

export function generateStaticParams() {
  const seen = new Set<string>();
  const params: Array<{ seatKey: string }> = [];
  for (const official of getAllOfficials()) {
    const seatKey = publicSeatKey(official);
    if (!seatKey || seen.has(seatKey)) continue;
    seen.add(seatKey);
    params.push({ seatKey });
  }
  return params;
}

export default async function SeatProfilePage({ params }: { params: Promise<{ seatKey: string }> }) {
  const { seatKey } = await params;
  const official = getOfficialBySeatKey(seatKey);
  if (!official) notFound();
  const resolvedSeatKey = publicSeatKey(official);
  const view = buildCanonicalProfileView(
    {
      seats: [
        {
          seat_id: resolvedSeatKey,
          seat_key: resolvedSeatKey,
          seat_name: official.seat?.seatName || official.office.seatName || official.office.title,
          office_type: official.office.officeType || official.office.title,
          government_level: official.office.governmentLevel,
          occupancy_status: official.seat?.occupancyStatus ?? "unknown",
        },
      ],
      persons: [
        {
          person_id: official.officialId,
          canonical_name: official.person.displayName,
        },
      ],
      occupancies: [
        {
          occupancy_id: `${official.officialId}-occupancy`,
          seat_id: resolvedSeatKey,
          person_id: official.officialId,
          occupancy_status: "current",
        },
      ],
      claims: [],
    },
    resolvedSeatKey,
  );
  return <CanonicalSeatProfile view={view} />;
}
