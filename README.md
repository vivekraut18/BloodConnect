# BloodConnect

A blood donation platform connecting donors, requesters, and hospitals.

## Technology

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth and PostgreSQL

## Installation

1. Copy `.env.example` to `.env`.
2. Fill in the Supabase project URL and public key.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:4028](http://localhost:4028).

Apply all SQL files in `supabase/migrations/` to the Supabase project before using authenticated or database-backed features.

## Available scripts

- `npm run dev` — Start the development server on port 4028.
- `npm run build` — Create a production build.
- `npm run type-check` — Run TypeScript without emitting files.
- `npm run lint` — Run the Next.js linter.
- `npm run format` — Format source files with Prettier.

## Demo seed

The optional demo seed script uses the Supabase service-role key and must only run from a trusted environment:

```bash
ALLOW_DEMO_SEED=true `
  DEMO_DONOR_PASSWORD="..." `
  DEMO_REQUESTER_PASSWORD="..." `
  DEMO_HOSPITAL_PASSWORD="..." `
  DEMO_ADMIN_PASSWORD="..." `
  npx tsx scripts/seed-demo-data.ts
```

Never expose the service-role key or demo passwords to browser code or commit them to source control.

## Deployment

Configure the Supabase environment variables in the deployment platform and run:

```bash
npm run build
```
