'use client';

import { usePathname } from 'next/navigation';
import { MobileTabs, SiteFooter, SiteHeader } from '@/components/site-chrome';

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProductSurface = ['/search', '/officials', '/dashboard', '/monitor', '/alerts', '/watchlist', '/petitions', '/promises', '/contact-official', '/activity', '/reports', '/settings', '/sign-in', '/sign-up'].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasMobileTabs = isProductSurface && !['/sign-in', '/sign-up'].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (isProductSurface) return <>{children}{hasMobileTabs ? <MobileTabs pathname={pathname} /> : null}</>;
  return <><SiteHeader />{children}<SiteFooter /></>;
}
