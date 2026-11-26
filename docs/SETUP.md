# Setup (local development)

You normally do not need to run the project locally: the AI environment builds and
verifies it, and Cloudflare deploys automatically from GitHub. These steps exist for
completeness and for the day you want a local copy.

## Prerequisites

- Node.js 20 LTS or newer: https://nodejs.org
- Git: https://git-scm.com

## Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/gamingbk598/publication-platform.git
   cd publication-platform
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in values (see ENVIRONMENT.md). For
   Phase 1–2 no values are required; the defaults work.

4. Start the development server:

   ```bash
   npm run dev
   ```

   Then open http://localhost:4321 in your browser.
