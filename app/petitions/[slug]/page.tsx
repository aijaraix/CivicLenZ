import { PetitionDetail } from '@/components/petitions-experience';
import { demoPetitions } from '@/lib/demo-data';
export function generateStaticParams() { return demoPetitions.map((petition) => ({ slug: petition.slug })); }
export default async function PetitionPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <PetitionDetail slug={slug} />; }
