import { notFound } from 'next/navigation';
import { ProfileExperience } from '@/components/profile-experience';
import { demoOfficials, getDemoOfficial } from '@/lib/demo-data';

export function generateStaticParams() { return demoOfficials.map((official) => ({ slug: official.slug })); }

export default async function OfficialProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const official = getDemoOfficial(slug);
  if (!official) notFound();
  return <ProfileExperience official={official} />;
}
