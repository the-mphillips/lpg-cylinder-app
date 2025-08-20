# LPG Cylinder App – Feature & UX Upgrade Plan

## Phase 1 – High-Impact Quick Wins (Do Now)

- [x] PDF finalization + print CSS polish (headers/footers/page breaks)
  - Finalize production PDF template: fixed header/footer, page numbers, margins
  - Print CSS: prevent content clipping, explicit page-breaks, consistent spacing
  - Asset pipeline: ensure logos/marks render crisply at 300dpi
  - Success criteria: visually identical between preview/print; no overflow; brand correct

- [x] Sticky action bar on report forms (New/Edit)
  - Add a sticky footer with primary actions that stays visible while scrolling
  - Mobile-first: large touch targets; desktop: compact spacing
  - Include keyboard focus management and aria-labels
  - Success criteria: actions always visible, no layout shift, works on mobile/desktop

- [x] CSP fix for Vercel deployment
  - Fixed Content Security Policy headers to allow Next.js scripts
  - Added 'unsafe-inline' and Vercel domains to script-src
  - Added WebSocket support and worker/child src directives
  - Success criteria: app loads without CSP errors on Vercel

- [ ] Column visibility + density toggle on reports table
  - Add menu to toggle columns and switch density (comfortable/compact)
  - Persist preferences in localStorage
  - Success criteria: toggles persist, table reflows cleanly at all breakpoints

- [ ] Advanced filters + saved views on reports list (nuqs)
  - Status/date/tester/customer filters + full text search
  - Store filter state in URL (nuqs) and allow naming/saving views
  - Success criteria: shareable URLs restore exact filter state; Saved views selectable

- [ ] Image sizes + skeletons
  - Ensure all next/image usages specify sizes and width/height for LCP
  - Replace spinners with skeletons on dashboard/report sections
  - Success criteria: improved LCP/CLS; no layout jumps during image load

- [ ] Optimistic updates with undo toasts
  - For report status changes (draft → pending, approve/unapprove, archive)
  - Show toast with undo action; revert if undo is clicked
  - Success criteria: snappy UX, Sentry logs on failure, rollback is reliable

- [ ] Sentry spans + exception capture for key user flows
  - Spans for: save draft, submit, approve/unapprove, upload image/signature
  - Sentry.captureException(error) in try/catch in UI actions and API routes
  - Success criteria: spans visible in Sentry; errors captured with useful attributes

## Phase 2 – Next Up (After Phase 1)
- [ ] Realtime updates for notifications and report status via Supabase Realtime
- [ ] PWA offline queue for drafts (Workbox + IndexedDB, background sync)
- [ ] Accessibility pass (contrast, focus management, reduced motion)
- [ ] Keyboard shortcuts (/, f, g+n), command menu integration
- [ ] Table virtualization for very large datasets

---

## Notes
- Order is chosen for maximum perceived polish and minimal implementation risk.
- All changes should maintain strict TypeScript, pass linting, and preserve RSC bias.
- Use Shadcn primitives and Tailwind v4 tokens consistently.
- CSP fix deployed and tested on Vercel - app now loads without script blocking errors.
