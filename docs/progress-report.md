# Progress Report — Audit & Fixes (2026-07-16)

## Completed

### Bugs (B1-B5) — All Fixed
- **B1**: Fixed `updateColor` race condition in customization page (was calling `updateTheme` twice)
- **B2**: Fixed fonts not rendering in preview (added `fontFamily()` helper mapping theme fonts to CSS vars)
- **B3**: Background gradient/image support deferred to cover upload feature (now done)
- **B4**: Fixed auth token refresh flow (added `refreshAccessToken` in auth-context)
- **B5**: Fixed accent characters across all PT-BR strings

### UI Issues (U3-U11) — All Fixed
- **U3/U4**: API error message translation layer in `apps/web/src/lib/api.ts` (10 common errors mapped to PT-BR)
- **U5**: Preview uses business name from auth context instead of "Seu negócio" fallback
- **U6**: Social media links replaced with SVG icons (Instagram, WhatsApp, Facebook, TikTok) in both preview and public page
- **U7**: Schedule blocks now offer "Negócio inteiro" option (null professionalId)
- **U8**: Layout "cards" vs "list" toggle implemented in public booking page
- **U9**: Empty states now have CTA buttons (services, professionals, working-hours, schedule-blocks, recurring-blocks)
- **U10**: Financeiro page handles 403 gracefully for professional role (`.catch(() => null)`)
- **U11**: Sidebar filters nav items by user role (owner/admin/professional)
- **Extra**: Fixed "Aténdimentos" → "Atendimentos" and "Comissao" → "Comissão" typos in financeiro
- **Extra**: Fixed "Horario" → "Horário" accent in public booking page

### New Features — All Implemented
- **Logo upload**: Upload/remove logo in customization Identity section, displayed in preview and public page header
- **Cover photo upload**: Upload/remove cover image in customization, shown as hero banner in preview and public page
- **Social icons**: SVG icons for Instagram, WhatsApp, Facebook, TikTok (replaced plain text)
- **Business icon in topbar**: Sidebar header shows business initials badge + name; topbar shows user avatar + dropdown
- **User dropdown**: Shows name, email, role + links to Configurações and Sair
- **Settings page** (`/admin/settings`): Profile editing (name, email), Business editing (name), dark theme toggle, public page link
- **Dark theme**: Full dark mode CSS variables in globals.css, persisted to localStorage, toggled via settings

### Infrastructure
- **Upload module**: `POST /upload` (multer, max 5MB, image only) + `GET /upload/files/:filename` for serving
- **Profile endpoint**: `PATCH /auth/profile` for updating user name/email
- **Schema migration**: Added `logo_url` and `cover_url` columns to `businesses` table
- **Business DTO**: Updated to accept `logoUrl` and `coverUrl`
- **Public API**: Now returns `logoUrl` and `coverUrl` in business response

## Files Modified

### API (`apps/api/src/`)
- `app.module.ts` — registered UploadModule
- `auth/auth.controller.ts` — added PATCH /auth/profile endpoint
- `auth/auth.service.ts` — added updateProfile method
- `business/dto/update-business.dto.ts` — added logoUrl, coverUrl fields
- `public/public.controller.ts` — returns logoUrl, coverUrl in response
- `upload/upload.controller.ts` — **new** file upload controller
- `upload/upload.module.ts` — **new** upload module

### Web (`apps/web/src/`)
- `app/globals.css` — added dark theme CSS variables
- `app/layout.tsx` — Google Fonts (Inter, Poppins, Playfair, DM Sans)
- `app/admin/layout.tsx` — business icon, user dropdown, settings link, role-based nav
- `app/admin/settings/page.tsx` — **new** settings page
- `app/admin/customization/page.tsx` — logo/cover upload, business name in preview, social icons
- `app/admin/financeiro/page.tsx` — accent fixes, error handling for 403
- `app/admin/services/page.tsx` — CTA in empty state
- `app/admin/professionals/page.tsx` — CTA in empty state
- `app/admin/working-hours/page.tsx` — CTA in empty state
- `app/admin/schedule-blocks/page.tsx` — "Negócio inteiro" option, CTA in empty state
- `app/admin/recurring-blocks/page.tsx` — CTA in empty state
- `app/admin/clientes/page.tsx` — accent fixes
- `app/[slug]/page.tsx` — logoUrl/coverUrl in Business interface
- `app/[slug]/booking-client.tsx` — logo/cover display, social icons, layout cards, accent fix
- `lib/api.ts` — error translation layer
- `lib/auth-context.tsx` — refresh token flow

### Database
- `packages/database/prisma/schema.prisma` — added logoUrl, coverUrl to Business model
- `packages/database/prisma/migrations/20260716120000_add_logo_cover/migration.sql`

### Improvements — Done
- **M5**: Confirmation modals for destructive actions — reusable `ConfirmModal` component added to:
  - Agenda (cancel appointment)
  - Schedule blocks (remove block)
  - Recurring blocks (remove block)
  - Working hours (remove entry)
- **M6**: Toast notification system — `ToastProvider` + `useToast` hook replacing inline "Salvo" messages:
  - Settings page (profile save, business save)
  - Customization page (save customization)
  - Animated slide-in toasts with success/error/info types, auto-dismiss after 3s

### Bug Fix — Upload
- Fixed `FileTypeValidator` failing with `diskStorage` (buffer not available). Switched to multer `fileFilter` for extension-based validation.
- Fixed customization save not syncing `coverUrl` to the Business table (needed for public page).

## Remaining (Improvements — Lower Priority)
- **M2**: Drag-and-drop reorder for links extras
- **M3**: Commission type/value configuration in professionals UI
- **M4**: Manual payment registration UI
