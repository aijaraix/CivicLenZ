import { DemoOfficial } from '@/lib/demo-data';

export function DemoAvatar({ official, size = 'md', className = '' }: { official: Pick<DemoOfficial, 'initials' | 'color' | 'name'>; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return (
    <span className={`demo-avatar demo-avatar-${size} ${className}`} style={{ '--avatar-color': official.color } as React.CSSProperties} aria-label={`${official.name} example portrait`}>
      <span>{official.initials}</span>
    </span>
  );
}
