# LPG Cylinder Testing System

A modern, professional LPG cylinder testing and certification system built with Next.js 15, React 19, TypeScript, Tailwind CSS v4, Shadcn UI, tRPC, and Supabase.

## Overview

- Digital report management with approval/signature workflow
- Role-based access control (Super Admin, Admin, Authorized Signatory, Tester)
- Dashboard analytics, unified logging, PDF preview/export, file uploads to Supabase Storage
- End-to-end type safety via tRPC + Zod

See `TASKS.md` for an up-to-date checklist of what is complete and what remains for production.

## Tech Stack

- Next.js 15 (App Router), React 19, TypeScript (strict)
- Tailwind CSS v4, Shadcn UI, Radix primitives
- tRPC (server/client) with SuperJSON and Zod validation
- Supabase (PostgreSQL, Auth, Storage)

## Quick Start

Prerequisites:
- Node.js 18+
- npm
- Supabase project (URL and keys)

1) Install dependencies
```bash
npm install
```

2) Environment variables (create `.env.local` at the repo root)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3) Run the dev server
```bash
npm run dev
```
Visit http://localhost:3000

For detailed Storage/RLS setup, see `SUPABASE_SETUP.md`.

## Useful Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Lint and type-check
```

## Project Structure (high level)

```
src/
  app/
    api/           # Next API routes incl. tRPC
    dashboard/     # Dashboard page
    reports/       # Reports pages (list/new/edit/view)
    settings/      # Settings pages
    login/         # Login page
  components/      # UI/components (Shadcn/Radix)
  lib/             # supabase, trpc, auth, types, utils
  styles/          # global/print styles
```

## Production Notes

- Configure Supabase Storage buckets and RLS (see `SUPABASE_SETUP.md`)
- Verify RLS policies for database tables used by tRPC procedures
- Set `NEXT_PUBLIC_SUPABASE_URL` and keys in the production environment (e.g., Vercel)
- Ensure `next.config.ts` remote patterns allow your Supabase storage host
- Review security headers and rate limiting for API routes

## Documentation Index

- `TASKS.md` — live checklist of completed and pending work
- `SUPABASE_SETUP.md` — storage buckets and RLS examples
- `RESTORATION-GUIDE.md` — database restoration/migration guidance

Last Updated: 2025-08
