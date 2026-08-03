import { SearchExperience } from '@/components/search-experience';
import { Suspense } from 'react';

export const metadata = { title: 'Find my officials' };

export default function SearchPage() { return <Suspense fallback={<SearchFallback />}><SearchExperience /></Suspense>; }

function SearchFallback() { return <div className="search-page"><div className="site-width"><div className="search-loading">Preparing your civic picture…</div></div></div>; }
