import { SearchExperience } from '@/components/search-experience';
import { Suspense } from 'react';

export const metadata = { title: 'Officials directory' };

export default function OfficialsPage() { return <Suspense fallback={<DirectoryFallback />}><SearchExperience directory /></Suspense>; }

function DirectoryFallback() { return <div className="search-page"><div className="site-width"><div className="search-loading">Preparing the officials directory…</div></div></div>; }
