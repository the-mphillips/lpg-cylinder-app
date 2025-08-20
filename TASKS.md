# Project Tasks

This document tracks completed work and remaining tasks as we approach production. It also includes recommendations to ensure the app is fast, clean, responsive, and beautiful.

## Status Summary

- App foundation complete (Next.js 15, React 19, TypeScript, Tailwind v4, Shadcn UI, tRPC)
- Supabase integration in place (Auth, DB, Storage); RLS policies may require final review
- Authentication, dashboard, settings, uploads, and unified logging implemented
- Reports pages and user/customer admin are next up for polish and completeness
- Vercel deployment CSP issues resolved - app now loads properly

## Completed (✓)

- ✓ Next.js 15 App Router structure and layout
- ✓ TypeScript strict mode and ESLint configuration
- ✓ Tailwind CSS v4 and Shadcn UI setup
- ✓ tRPC server/client with Zod validation
- ✓ Supabase client/server setup; image remote patterns in next config
- ✓ Authentication flow (login/logout), role-based access helpers
- ✓ Dashboard page with statistics and recent items
- ✓ Unified audit logging (single `audit_logs` table usage in code) and log viewer
- ✓ Branding and app settings tabs (dynamic logo/colors, favicon support)
- ✓ Signature management modal and uploads to Supabase Storage
- ✓ PDF preview demo and report UI components
- ✓ Middleware for auth-protected routes
- ✓ PDF finalization and print CSS polish (headers/footers/page breaks)
- ✓ Sticky action bars on report forms (New/Edit) with mobile-first design
- ✓ Content Security Policy fix for Vercel deployment (CSP headers updated)

## In Progress / To Do ( )

- ( ) Reports: list with filtering, pagination, and status chips
- ( ) Reports: create/edit form with validation and autosave (Draft → Pending → Approved)
- ( ) Reports: approval/signature workflow, role guards, and activity logging
- ( ) Users: admin CRUD, role assignment, disable/enable
- ( ) Customers (major customers): CRUD and association with reports
- ( ) Advanced search across reports/users/customers with server-side filtering
- ( ) Column visibility and density toggle on reports table
- ( ) Advanced filters and saved views on reports list (nuqs integration)
- ( ) Image sizes optimization and skeleton loading states
- ( ) Optimistic updates with undo toasts for report status changes
- ( ) Sentry spans and exception capture for key user flows
- ( ) Email system: SMTP settings, send report emails, delivery status
- ( ) Notifications: in-app toasts and optional email triggers for key events
- ( ) Performance budget: LCP/FID/CLS monitoring and thresholds
- ( ) Accessibility pass (WCAG 2.1 AA), keyboard traps, aria-labels, focus states
- ( ) Security pass: RLS policy review, rate limiting, input hardening
- ( ) Error boundaries and empty/loading states across all pages
- ( ) E2E tests (Cypress) for auth, reports CRUD, approval flow, and uploads
- ( ) Unit tests (Jest) for routers and utilities
- ( ) Analytics/telemetry (optional) respecting privacy

## Supabase & RLS Checklist

- ( ) Storage buckets: `app-data` (public), `user-data` (private)
- ( ) RLS policies for `storage.objects` per `SUPABASE_SETUP.md`
- ( ) Database RLS on core tables with role-aware policies
- ( ) Service role secrets configured only server-side

## Performance Recommendations

- Use React Server Components by default; mark interactivity with `"use client"` only when necessary
- Defer non-critical components with Suspense/lazy and route-level streaming
- Optimize data tables: pagination + server-side filtering/sorting
- Preload critical brand assets and use Next.js Image for all images
- Extract reusable selectors and memoize expensive computations
- Reduce bundle size: avoid heavy libs; tree-shake; dynamic import rarely-used modals
- Cache tRPC queries effectively; set proper stale/retry policies
- Add `print.css` and PDF CSS optimizations (already scaffolded) for crisp exports

## UI/UX Enhancements

- Consistent spacing scale, focus rings, and hover states from Shadcn tokens
- Mobile-first layouts with sticky actions and bottom sheets where appropriate
- Clear status colors and icons for report states (Draft, Pending, Approved)
- Table density toggle (comfortable/compact) and column visibility controls
- Keyboard shortcuts for frequent actions (e.g., New Report = N)

## Security & Compliance

- Enforce server-side Zod validation on all procedures
- Log security-sensitive events (auth, email, file ops) to unified logs with metadata
- Review headers (CSP, X-Frame-Options) and cookies flags (Secure, HttpOnly) where applicable
- Regularly rotate service role keys and restrict their usage to server runtime only

## Testing & CI

- ( ) Jest unit tests for routers and utils
- ( ) Cypress E2E: auth, reports CRUD, approvals, uploads, emails
- ( ) GitHub Actions: lint, type-check, test, build
- ( ) Visual regression (optional) on critical screens

## Deployment

- ✓ Vercel project with env vars set (URL, anon, service role)
- ✓ CSP headers fixed for proper script loading
- ( ) Preview deployments with protected access
- ( ) Error reporting/monitoring (Sentry or similar) optional

## Nice-to-Have Iterations

- Offline mode (service worker + IndexedDB queue) for report drafts
- Barcode/QR scanning for cylinder IDs
- Realtime updates via Supabase Realtime for dashboards
- Export/import tools for reports and customers

## Production Hardening Checklist

### Security

- ✓ Content Security Policy (CSP) with strict sources and nonce/sha for inline where needed
- ✓ Frame protection via `frame-ancestors 'none'` (or allow only trusted origins)
- ✓ `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` hardened
- ✓ Strict-Transport-Security (HSTS) with preload (after verifying HTTPS everywhere)
- ( ) CORS locked to required origins; no wildcard in production
- ( ) Cookies: `Secure`, `HttpOnly`, `SameSite=lax/strict` as applicable
- ( ) tRPC procedures: server-side Zod validation on all inputs and outputs
- ( ) RLS verified on all DB tables used by the app (role-aware access)
- ( ) Supabase keys: service role only server-side; anon only client-side
- ( ) Secrets rotation policy and schedule documented
- ( ) File uploads: MIME/type sniffing, size limits, extension allowlist; optional AV scan
- ( ) Rate limiting on auth, uploads, settings, and report mutations (IP/user-based)
- ( ) Brute-force protection for login (progressive delays or lockouts)
- ( ) Authorization checks in server actions and tRPC routers (defense in depth)

### Infrastructure & Ops

- ( ) Environment variables managed via platform secrets (no plaintext in repo)
- ( ) Reproducible builds with locked dependencies and minimal postinstall
- ( ) Backup and restore runbook validated (DB + Storage)
- ( ) Disaster recovery RTO/RPO defined and exercised
- ( ) CDN configured for static assets and images
- ( ) Edge caching rules for public assets (immutable + long max-age)

### Performance & Caching

- ( ) Performance budget (LCP < 2.5s, CLS < 0.1, INP < 200ms) enforced
- ( ) Route-level streaming/Suspense for slow data
- ( ) Server-side pagination/sorting/filtering for large tables
- ( ) HTTP compression (Brotli) enabled; images WebP/AVIF where possible
- ( ) Prefetch critical routes; cache control headers for API where safe
- ( ) Bundle analysis and code splitting; dynamic import for heavy modals

### Data Protection & Privacy

- ( ) PII inventory and data minimization review
- ( ) Data retention policy for logs and reports
- ( ) Export/delete mechanisms for user data (on request)
- ( ) Access logging with userId, IP, user-agent; redact sensitive fields

### Monitoring & Alerts

- ( ) Error tracking (Sentry or equivalent) with source maps uploaded
- ( ) Structured logs with request IDs/correlation IDs
- ( ) Health checks and uptime monitoring
- ( ) Performance monitoring (Web Vitals) and alert thresholds
- ( ) Log retention and alerting on security-sensitive events

### Testing & CI/CD

- ( ) CI pipeline: lint, type-check, unit tests, E2E tests, build
- ( ) Dependabot/Snyk for dependency updates and vulnerability scanning
- ( ) Jest unit tests coverage gates for critical modules
- ( ) Cypress E2E for auth, reports CRUD, approvals, uploads, emails

Last Updated: 2025-08


