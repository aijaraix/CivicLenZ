import { notFound } from "next/navigation";
import { CanonicalSeatProfile } from "@/components/canonical-profile";
import { buildCanonicalProfileView } from "@/lib/civic-data/profile";
import { getAllOfficials } from "@/lib/officials";

export function generateStaticParams() {
  const seen = new Set<string>();
  const params: Array<{ seatKey: string }> = [];
  for (const official of getAllOfficials()) {
    const seatKey = official.seat?.seatId;
    if (!seatKey || seen.has(seatKey)) continue;
    seen.add(seatKey);
    params.push({ seatKey });
  }
  return params;
}

export default async function SeatProfilePage({ params }: { params: Promise<{ seatKey: string }> }) {
  const { seatKey } = await params;
  const official = getAllOfficials().find(
    (item) => item.seat?.seatId === seatKey || item.slug === seatKey,
  );
  if (!official) notFound();
  const view = buildCanonicalProfileView(
    {
      seats: [
        {
          seat_id: official.seat?.seatId ?? official.slug,
          seat_key: official.seat?.seatId ?? official.slug,
          seat_name: official.seat?.seatName || official.office.title,
          office_type: official.office.governmentLevel,
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
      occupancies: official.seat
        ? [
            {
              occupancy_id: `${official.officialId}-occupancy`,
              seat_id: official.seat.seatId,
              person_id: official.officialId,
              occupancy_status: "current",
            },
          ]
        : [],
      claims: [],
    },
    official.seat?.seatId ?? official.slug,
  );
  return <CanonicalSeatProfile view={view} />;
}
