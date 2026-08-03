type IconName =
  | 'home' | 'search' | 'users' | 'map' | 'star' | 'bell' | 'scale' | 'file' | 'news'
  | 'chart' | 'user' | 'building' | 'heart' | 'settings' | 'help' | 'arrow-left'
  | 'arrow-right' | 'chevron-right' | 'filter' | 'menu' | 'close' | 'plus' | 'message'
  | 'share' | 'shield' | 'target' | 'calendar' | 'watch' | 'logout' | 'flag' | 'phone'
  | 'mail' | 'globe' | 'pin' | 'check' | 'alert' | 'sparkles' | 'edit' | 'lock';

export function Icon({ name, size = 20, stroke = 1.9, className = '' }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className, 'aria-hidden': true };
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    users: <><path d="M16 20v-1.6a4.4 4.4 0 0 0-4.4-4.4H7.4A4.4 4.4 0 0 0 3 18.4V20" /><circle cx="9.5" cy="7" r="3.2" /><path d="M17 10a3 3 0 0 0 0-5.8M21 20v-1.6a4.4 4.4 0 0 0-3-4.15" /></>,
    map: <><path d="m9 19-6 2V5l6-2 6 2 6-2v16l-6 2Z" /><path d="M9 3v16M15 5v16" /></>,
    star: <><path d="m12 3 2.78 5.63 6.22.91-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.93 1.06-6.2L3 9.54l6.22-.91Z" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4" /></>,
    scale: <><path d="M12 3v18M5 7h14M6 7l-3 6h6Zm12 0-3 6h6Z" /><path d="M8 21h8" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>,
    news: <><path d="M4 5h14a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2Z" /><path d="M8 9h8M8 13h8M8 17h5" /><path d="M4 9H2v9a3 3 0 0 0 3 3" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    user: <><circle cx="12" cy="7" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    building: <><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5M8 11h.01M12 11h.01M16 11h.01" /></>,
    heart: <><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.5a5.5 5.5 0 0 0-.1-7.8Z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2 2-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V20h-2.8v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2-2 .06-.06A1.7 1.7 0 0 0 7.56 15a1.7 1.7 0 0 0-1.55-1H5.9v-2.8h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2-2 .06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1-1.55V4.9h2.8v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2 2-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1h.09V14h-.09a1.7 1.7 0 0 0-1.55 1Z" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.7 2.7 0 1 1 4.4 2.1c-1.1.85-1.9 1.35-1.9 2.9M12 17.4h.01" /></>,
    'arrow-left': <><path d="M19 12H5M11 18l-6-6 6-6" /></>,
    'arrow-right': <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    'chevron-right': <path d="m9 18 6-6-6-6" />,
    filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    message: <><path d="M20 15a4 4 0 0 1-4 4H8l-4 3v-7a4 4 0 0 1-2-3.5V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M7 9h10M7 13h6" /></>,
    share: <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></>,
    shield: <><path d="M12 3 4 6v5c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    watch: <><circle cx="12" cy="12" r="8" /><path d="m12 8 3 3-2 3" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    flag: <><path d="M5 22V4M5 5c4-3 7 3 14 0v10c-7 3-10-3-14 0" /></>,
    phone: <><path d="M5.2 3.8 8 3l1.8 4.4-2 1.4a15.5 15.5 0 0 0 7.4 7.4l1.4-2L21 16l-.8 2.8a2 2 0 0 1-2.2 1.4C10.1 19 5 13.9 3.8 6a2 2 0 0 1 1.4-2.2Z" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><path d="M10.3 4.5 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    sparkles: <><path d="m12 3-1.5 5.5L5 10l5.5 1.5L12 17l1.5-5.5L19 10l-5.5-1.5ZM5 16l-.7 2.3L2 19l2.3.7L5 22l.7-2.3L8 19l-2.3-.7ZM19 3l-.7 2.3L16 6l2.3.7L19 9l.7-2.3L22 6l-2.3-.7Z" /></>,
    edit: <><path d="m4 20 4.2-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" /><path d="m14.5 6.5 3 3" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}
