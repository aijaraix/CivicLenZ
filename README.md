# CivicLenZ UI/UX Source

This is a clean, download-ready copy of the public CivicLenZ website UI/UX source currently on the `main` branch of `aijaraix/CivicLenZ`.

Included:

- Responsive public homepage and navigation
- Shared CivicLenZ visual system and mobile styling
- Public information pages (About, How It Works, Research, App, Contact, etc.)
- Florida officials directory and individual profile-page UI
- CivicLenZ lens mark and homepage/editorial artwork
- Next.js static-export configuration

Not included:

- Automated data-collection workers and the large elected-official data corpus
- Any private environment values or credentials

One representative Florida official record is included so the directory and individual-profile UI work in a clean local build. To reproduce the live directory population, retain or reconnect the separate official-data tree from the private CivicLenZ repository.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Build for deployment

```bash
npm run build
```

This project is configured for static export, so the resulting `out/` directory can be deployed to Vercel, Cloudflare Pages, or another static host.
