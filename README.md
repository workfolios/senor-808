# Señor 808 Portfolio

A one-page artist portfolio website for Señor 808, built to present visual artwork, selected collaboration formats, and a developing media direction through proof-honest public content.

## Tech Stack
- **Framework:** React + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Deployment:** GitHub Actions + GitHub Pages

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## Building for Production

To create a static production build:
```bash
npm run build
```
The output will be in the `dist` directory.

## GitHub Pages Deployment

This project is configured to deploy to GitHub Pages from the `main` branch through GitHub Actions. The Vite base setting uses relative asset paths so the application can run from the repository subpath.

- **Repository:** `workfolios/senor-808`
- **Production URL:** `https://workfolios.github.io/senor-808/`

## Governance

- Bry maintains the repository and deployment workflow.
- Bob Garcia reviews the public experience and supplies approved artwork, titles, dates, categories, descriptions, and permissions.
- Unverified claims, dates, partner names, and media proof remain unpublished until confirmed.
- The repository rename from `senor-808-portfolio` to `senor-808` was completed on July 11, 2026.

See [SOURCE_GOVERNANCE.md](SOURCE_GOVERNANCE.md) for the canonical operating baseline.

## Content Submission

Bob does not need to edit GitHub. For the information and assets needed to update the website, see [CONTENT_SUBMISSION_GUIDE_FOR_BOB.md](CONTENT_SUBMISSION_GUIDE_FOR_BOB.md).

## Technical Administration

Repository maintenance instructions for Bry are retained in [ADMIN_GUIDE.md](ADMIN_GUIDE.md).
