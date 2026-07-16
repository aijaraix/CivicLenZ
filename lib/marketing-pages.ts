export type MarketingBlock = {
  eyebrow?: string;
  title: string;
  copy: string;
  points?: string[];
};

export type MarketingPage = {
  label: string;
  title: string;
  intro: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  blocks: MarketingBlock[];
  visual?: 'app-preview' | 'record-preview' | 'contact-preview';
};

export const marketingPages: Record<string, MarketingPage> = {
  'how-it-works': {
    label: 'How CivicLenZ works',
    title: 'From a public record to a clearer civic decision.',
    intro:
      'CivicLenZ is designed to make the information around public offices easier to find, inspect, and follow. Florida is where we begin; the framework is built for every community.',
    primary: { label: 'Explore officials', href: '/officials/' },
    secondary: { label: 'Read our standards', href: '/research/' },
    visual: 'record-preview',
    blocks: [
      {
        eyebrow: '01 — Find your place',
        title: 'Start with where you live.',
        copy: 'Enter an address or ZIP code to see the offices and people connected to your community. Precise address lookup will be clearly labeled when it becomes available.',
        points: ['Your representatives', 'Your jurisdiction', 'Your saved civic interests'],
      },
      {
        eyebrow: '02 — Read the record',
        title: 'See context, not just conclusions.',
        copy: 'Profiles organize public facts, direct statements, filings, meetings, votes, and supporting records so you can inspect the original material.',
        points: ['Sources and dates', 'What is verified', 'What is incomplete or disputed'],
      },
      {
        eyebrow: '03 — Stay connected',
        title: 'Follow the people and issues that matter to you.',
        copy: 'Member accounts will let you save officials, choose update types, and receive a clear digest when a source-backed record changes.',
        points: ['Follow officials', 'Choose alert frequency', 'Manage your data and consent'],
      },
    ],
  },
  research: {
    label: 'Research & standards',
    title: 'Trust has to be visible in the product.',
    intro:
      'CivicLenZ does not ask people to take a score or summary on faith. We preserve the source, distinguish fact from analysis, show uncertainty, and leave room for corrections.',
    primary: { label: 'Explore the first profiles', href: '/officials/' },
    secondary: { label: 'Submit a correction', href: '/corrections/' },
    visual: 'record-preview',
    blocks: [
      {
        eyebrow: 'Source-led',
        title: 'Every important statement needs a trail.',
        copy: 'A published record should identify the publisher, date, direct source, record locator, and whether it supports, contradicts, or provides context.',
        points: ['Primary records first', 'Direct quotations in context', 'Archived links where appropriate'],
      },
      {
        eyebrow: 'Careful analysis',
        title: 'AI can organize evidence. It cannot invent it.',
        copy: 'AI may help classify and summarize records, but it cannot silently fill gaps, convert allegations into findings, or hide conflicting evidence.',
        points: ['Analysis is labeled', 'High-impact findings receive review', 'Uncertainty stays visible'],
      },
      {
        eyebrow: 'Open to correction',
        title: 'The record is allowed to improve.',
        copy: 'Individuals, offices, and members will be able to submit a specific correction with supporting material. Material changes will retain an audit history.',
        points: ['Correction intake', 'Official response path', 'Publication history'],
      },
    ],
  },
  app: {
    label: 'CivicLenZ mobile app',
    title: 'Your civic picture, ready when the conversation happens.',
    intro:
      'The CivicLenZ app is being designed for quick, source-led updates: your representatives, the issues you follow, and a plain view of what changed.',
    primary: { label: 'Join the app waitlist', href: '/contact/' },
    secondary: { label: 'See how it works', href: '/how-it-works/' },
    visual: 'app-preview',
    blocks: [
      {
        eyebrow: 'My representatives',
        title: 'See your civic picture at a glance.',
        copy: 'A personal dashboard will bring your saved location, officials, follows, and alerts into one private place.',
        points: ['Florida first', 'Address-based setup', 'Private member controls'],
      },
      {
        eyebrow: 'Meaningful updates',
        title: 'Choose what deserves an alert.',
        copy: 'Follow an official, office, issue, bill, meeting, or civic petition. Set a digest schedule that works for you.',
        points: ['Daily or weekly summaries', 'Source-backed changes', 'Easy unsubscribe controls'],
      },
      {
        eyebrow: 'Coming soon',
        title: 'App Store release will be announced here.',
        copy: 'Do not treat this preview as an available App Store listing. We will publish the official link only after the app is approved and live.',
      },
    ],
  },
  pricing: {
    label: 'Plans & early access',
    title: 'Useful civic information should stay within reach.',
    intro:
      'The public experience is being designed for everyday residents first. Paid tools, if introduced, will support deeper monitoring and professional research—not put basic public information behind a wall.',
    primary: { label: 'Join early access', href: '/contact/' },
    secondary: { label: 'Explore the public directory', href: '/officials/' },
    blocks: [
      {
        eyebrow: 'Citizen',
        title: 'Core civic access',
        copy: 'Representative discovery, public profiles, sources, and basic civic context are intended to remain accessible to the public.',
        points: ['Public research', 'Source links', 'Foundational civic information'],
      },
      {
        eyebrow: 'Pro — in design',
        title: 'For researchers and highly engaged members.',
        copy: 'Potential paid tools include deeper watchlists, tailored alerts, saved research, comparisons, and exports. Specific features and prices will be announced before launch.',
        points: ['Advanced monitoring', 'Research workspace', 'Transparent billing terms'],
      },
      {
        eyebrow: 'Organization — in design',
        title: 'For newsrooms, nonprofits, and civic teams.',
        copy: 'Organization access may include multi-person workspaces, shared monitoring, briefings, and data access. Contact us to help shape the launch offering.',
        points: ['Shared workspaces', 'Team alerts', 'Organization support'],
      },
    ],
  },
  about: {
    label: 'About CivicLenZ',
    title: 'Clearer civic insight for the places people call home.',
    intro:
      'CivicLenZ is building a source-led way to understand elected officials and public decisions without forcing people through a maze of disconnected websites.',
    primary: { label: 'How CivicLenZ works', href: '/how-it-works/' },
    secondary: { label: 'Contact CivicLenZ', href: '/contact/' },
    visual: 'contact-preview',
    blocks: [
      {
        eyebrow: 'Florida first',
        title: 'Start carefully. Build responsibly.',
        copy: 'Florida is the first launch area because a useful civic product needs a consistent source policy, durable evidence trail, and thoughtful review process before it expands.',
        points: ['Florida launch focus', 'Built to scale beyond one state', 'No claim of coverage before it exists'],
      },
      {
        eyebrow: 'Our commitment',
        title: 'A better path through public information.',
        copy: 'We are building toward profiles, alerts, civic action tools, and member dashboards that give people a clearer place to begin.',
        points: ['Source-led', 'Nonpartisan by design', 'Open to correction'],
      },
      {
        eyebrow: 'Contact',
        title: 'CivicLenZ is based in Miami, Florida.',
        copy: '8310 Byron Avenue, Miami, Florida 33141. For general inquiries, reach us at Ori@AICreates.ai.',
        points: ['Product and partnerships', 'Press and general inquiry', 'Early-access interest'],
      },
    ],
  },
  contact: {
    label: 'Contact & early access',
    title: 'Help shape CivicLenZ before the next stage of launch.',
    intro:
      'Tell us whether you are here as a resident, researcher, newsroom, nonprofit, public office, or potential partner. We will use that feedback to shape the first usable release.',
    primary: { label: 'Email CivicLenZ', href: 'mailto:Ori@AICreates.ai?subject=CivicLenZ%20early%20access' },
    secondary: { label: 'See the app preview', href: '/app/' },
    visual: 'contact-preview',
    blocks: [
      {
        eyebrow: 'Early access',
        title: 'Residents and engaged citizens',
        copy: 'Tell us which Florida community or issue you want to follow first. We will invite early members as representative lookup and alerts become available.',
        points: ['Representative lookup', 'Saved follows', 'Member dashboard'],
      },
      {
        eyebrow: 'Professional access',
        title: 'Research, newsroom, and nonprofit teams',
        copy: 'We want to hear what would make the evidence model genuinely useful for your work: monitoring, source organization, comparisons, or team alerts.',
        points: ['Research workflow', 'Organization plans', 'Feedback sessions'],
      },
      {
        eyebrow: 'Corrections',
        title: 'See something that needs attention?',
        copy: 'Use the correction path for a specific factual issue and include the source or record that should be reviewed.',
        points: ['Specific claims', 'Source material', 'Review status'],
      },
    ],
  },
  corrections: {
    label: 'Corrections',
    title: 'A civic record should be able to improve.',
    intro:
      'CivicLenZ is building a visible corrections process for members, offices, subjects, and researchers. Before the full form is live, send the specific record and supporting source by email.',
    primary: { label: 'Send a correction', href: 'mailto:Ori@AICreates.ai?subject=CivicLenZ%20correction%20request' },
    secondary: { label: 'Read our standards', href: '/research/' },
    blocks: [
      {
        eyebrow: 'What to include',
        title: 'Make the review possible.',
        copy: 'Tell us the page or claim, why it needs review, and the most direct source that supports your request.',
        points: ['Record or page URL', 'Specific correction', 'Primary source where available'],
      },
      {
        eyebrow: 'What happens next',
        title: 'Review, response, and history.',
        copy: 'A completed system will acknowledge the request, assign a review state, preserve the original record, and publish material corrections with context.',
        points: ['Received', 'Under review', 'Resolved or published'],
      },
    ],
  },
  'sign-in': {
    label: 'Member access',
    title: 'A private CivicLenZ dashboard is on its way.',
    intro:
      'Member accounts will use Google sign-in or an email one-time code. No password will be required for the initial experience, and account data will be separated from the public record.',
    primary: { label: 'Join early access', href: '/contact/' },
    secondary: { label: 'Preview the mobile app', href: '/app/' },
    visual: 'app-preview',
    blocks: [
      {
        eyebrow: 'Your private dashboard',
        title: 'See what matters to you.',
        copy: 'Save your representatives, follow additional officials, choose alerts, track your civic activity, and manage your information in one place.',
        points: ['My representatives', 'My follows', 'My alerts and privacy settings'],
      },
      {
        eyebrow: 'Account security',
        title: 'Designed for simple, verified access.',
        copy: 'Google OAuth and email one-time codes will verify account access. Any sensitive civic action will have additional confirmations and safeguards.',
        points: ['Google sign-in', 'Email verification', 'Consent and audit history'],
      },
    ],
  },
};
