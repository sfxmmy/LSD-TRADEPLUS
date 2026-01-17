# TRADESAVE+ Code Structure & Technical Debt Analysis

> This document helps maintain context about the codebase structure, known issues, and refactoring priorities.
> Last updated: January 2026

---

## Production Readiness (January 2026)

### New Production Features Added

| Feature | Files | Purpose |
|---------|-------|---------|
| **Sentry Error Tracking** | `instrumentation.js`, `instrumentation-client.js` | Automatic error capture, session replay |
| **Error Boundaries** | `components/ErrorBoundary.js`, `app/error.js`, `app/global-error.js` | Prevents white-screen crashes |
| **Rate Limiting** | `lib/rate-limit.js` | Protects API routes from abuse |
| **Form Validation** | `lib/validation.js` | Comprehensive input validation utilities |
| **Schema v5** | `schema.sql` | CHECK constraints, composite indexes, better docs |

### Sentry Setup

```javascript
// Client-side error tracking with session replay
// Config: instrumentation-client.js
// - 10% session replay sampling (100% on errors)
// - Filters browser extensions, network errors, expected auth errors
// - Disabled on localhost

// Server-side error tracking
// Config: instrumentation.js
// - Tracks API route errors
// - Edge runtime support
```

**Required env var:** `NEXT_PUBLIC_SENTRY_DSN`

### Error Boundaries

```javascript
// App-level error boundary (wraps entire app)
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Section-level boundary (for individual components)
import { SectionErrorBoundary } from '@/components/ErrorBoundary'
<SectionErrorBoundary name="trades-table" message="Failed to load trades">
  <TradesTable />
</SectionErrorBoundary>

// Next.js route error pages
// app/error.js - catches route errors
// app/global-error.js - catches root layout errors
```

### Rate Limiting

```javascript
import { rateLimiters } from '@/lib/rate-limit'

// Pre-configured limiters:
rateLimiters.auth(request)     // 5 req/min - login, discord check
rateLimiters.checkout(request) // 3 req/min - stripe checkout/portal
rateLimiters.upload(request)   // 20 req/min - image uploads
rateLimiters.api(request)      // 60 req/min - general API

// Applied to:
// - /api/stripe/create-checkout
// - /api/stripe/create-portal
// - /api/upload-image
// - /api/discord/check-member
```

### Form Validation

```javascript
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateSymbol,
  validatePnL,
  validateRiskReward,
  validateCurrency,
  validateDate,
  validateForm
} from '@/lib/validation'

// Example usage
const result = validateEmail(email)
if (!result.valid) {
  setError(result.error) // "Please enter a valid email address"
}

// Multi-field validation
const { valid, errors, values } = validateForm({
  email: { value: email, validator: validateEmail },
  password: { value: password, validator: validatePassword, options: { minLength: 8 } }
})
```

### Schema v5 Changes

```sql
-- CHECK constraint for subscription_status
CHECK (subscription_status IN ('admin', 'subscribing', 'free trial',
       'free subscription', 'not subscribing', 'past_due'))

-- CHECK constraint for dashboard_type
CHECK (dashboard_type IN ('accounts', 'backtesting'))

-- New composite indexes for performance
idx_trades_account_date ON trades(account_id, date DESC)
idx_notes_account_date ON notes(account_id, date DESC)
idx_accounts_user_dashboard ON accounts(user_id, dashboard_type)
```

### Bandaids Fixed

| Issue | Fix |
|-------|-----|
| `stripe_customer_id` check in create-portal | Removed - field doesn't exist in schema |
| Legacy field documentation | Improved comments explaining fallback logic |

---

## Completed Refactoring (January 2026)

### New Files Created

| File | Purpose |
|------|---------|
| `lib/auth.js` | Shared `hasValidSubscription()` function - eliminates 4 duplicate copies |
| `lib/constants.js` | Shared constants: `optionStyles`, `defaultInputs`, validation, timezones |
| `lib/utils.js` | 25+ utility functions for formatting, parsing, calculations |
| `lib/hooks.js` | Custom React hooks: `useIsMobile`, `useTooltip`, `useClickOutside`, etc. |
| `components/Toast.js` | Toast notification system with `showToast()` and `<ToastContainer />` |
| `components/Modal.js` | Reusable `<Modal>` and `<ConfirmModal>` components |
| `components/Header.js` | Reusable `<Header>`, `<Logo>`, and header button styles |
| `components/LoadingScreen.js` | TRADESAVE+ branded loading screen |
| `components/Tooltip.js` | `DataTooltip`, `ButtonTooltip`, `ChartTooltip`, `BarTooltip` |
| `components/RatingStars.js` | Star rating input and display components |
| `components/CustomDropdown.js` | Styled dropdown with color support for options |
| `components/ImageUploader.js` | Multi-image upload with preview |
| `components/EquityCurve.js` | SVG equity chart with prop firm DD lines, hover tooltips |
| `components/StatCard.js` | `StatCard`, `StatCardGrid`, `MiniStat`, `StatWithProgress`, `StatComparison` |
| `app/dashboard/components/` | Dashboard page extracted components folder |
| `app/account/[id]/components/` | Account page extracted components folder |

### Changes Made

1. **lib/auth.js** - Created shared auth utility
   - `hasValidSubscription(profile)` - checks admin, subscribing, free subscription, free trial

2. **Supabase Client** - All client pages now use `getSupabase()` from `lib/supabase.js`
   - Replaced 24+ `createClient(process.env...)` calls
   - API routes still use direct `createClient` (server-side with service role keys)

3. **Console Logs Removed** - All `console.log/warn/error` removed from client pages
   - Kept in API routes for server-side debugging

4. **Toast System** - Replaced all 51 `alert()` calls with `showToast()`
   - Added `<ToastContainer />` to: settings, pricing, dashboard, account pages
   - Toast auto-dismisses after 4 seconds, supports success/warning/error types

5. **CSS Design Tokens** - Added to `globals.css`:
   - Colors: `--color-primary`, `--color-bg-*`, `--color-border-*`, `--color-text-*`
   - Spacing: `--space-xs` through `--space-2xl`
   - Typography: `--text-xs` through `--text-3xl`
   - Border radius: `--radius-sm` through `--radius-xl`
   - Z-index scale: `--z-dropdown`, `--z-modal`, `--z-tooltip`

### Files Modified

| File | Changes |
|------|---------|
| `app/dashboard/page.js` | Import auth/supabase/toast, replaced createClient, replaced alerts |
| `app/account/[id]/page.js` | Import supabase/toast, replaced createClient, replaced alerts, removed console.logs |
| `app/settings/page.js` | Import auth/supabase/toast, replaced createClient, replaced alerts |
| `app/pricing/page.js` | Import auth/supabase/toast, replaced createClient, replaced alerts |
| `app/login/page.js` | Import auth/supabase, replaced createClient, use hasValidSubscription |
| `app/signup/page.js` | Import supabase, replaced createClient |
| `app/page.js` | Import auth/supabase, replaced createClient |
| `app/auth/callback/page.js` | Import auth/supabase, replaced createClient, use hasValidSubscription |
| `app/discord-login/page.js` | Import supabase, replaced createClient |
| `app/admin/page.js` | Import supabase, replaced createClient with getSupabase |
| `app/globals.css` | Added CSS design tokens (60 lines of :root variables) |

### Components Available for Future Use

The new components follow the golden rule (exact style copies). Use for new code:

```javascript
// Toast
import { ToastContainer, showToast } from '@/components/Toast'
showToast('Error message')           // red error toast
showToast('Success!', 'success')     // green success toast
showToast('Warning', 'warning')      // orange warning toast

// Modal
import Modal, { ConfirmModal } from '@/components/Modal'
<Modal isOpen={show} onClose={close} title="Title" width="420px">
  Content here
</Modal>

// Header
import Header, { Logo, headerButtonStyle } from '@/components/Header'
<Header>
  <a href="/dashboard" style={headerButtonStyle}>Back</a>
</Header>

// Shared Constants
import { optionStyles, defaultInputs, knownImportFields } from '@/lib/constants'

// Utility Functions
import {
  formatCurrency, formatPnl, getOptVal, getOptTextColor,
  parseFlexibleDate, parsePnlValue, getExtraData, calcWinRate
} from '@/lib/utils'

// Custom Hooks
import { useIsMobile, useTooltip, useClickOutside, useDebounce } from '@/lib/hooks'

// Loading Screen
import { LoadingScreen } from '@/components/LoadingScreen'
<LoadingScreen /> // Shows TRADESAVE+ branded spinner

// Tooltips
import { DataTooltip, ButtonTooltip, ChartTooltip, BarTooltip } from '@/components/Tooltip'
<DataTooltip text="Tooltip content" position={mousePos} visible={show} />
<ButtonTooltip text="Hover help" position={mousePos} visible={show} />

// Rating Stars
import { RatingStars, RatingDisplay } from '@/components/RatingStars'
<RatingStars value={rating} onChange={setRating} />
<RatingDisplay value={4} />

// Custom Dropdown
import { CustomDropdown } from '@/components/CustomDropdown'
<CustomDropdown
  value={selected}
  options={options}
  onChange={setSelected}
  placeholder="Select..."
/>

// Image Uploader
import { ImageUploader } from '@/components/ImageUploader'
<ImageUploader
  images={images}
  onUpload={handleUpload}
  onRemove={handleRemove}
/>

// Equity Curve
import { EquityCurve, MiniEquityCurve } from '@/components/EquityCurve'
<EquityCurve trades={trades} account={account} height={300} />
<MiniEquityCurve trades={trades} width={200} height={80} />

// Stat Cards
import { StatCard, StatCardGrid, MiniStat, StatWithProgress, StatComparison } from '@/components/StatCard'
<StatCardGrid columns={4}>
  <StatCard label="Win Rate" value="65%" color="#22c55e" trend="up" trendValue="+5%" />
  <StatCard label="Total P&L" value="$1,234" />
</StatCardGrid>
```

---

## How to Write New Code

### Required Imports for Client Pages

```javascript
'use client'

// Supabase - ALWAYS use getSupabase(), never createClient()
import { getSupabase } from '@/lib/supabase'

// Auth - for checking subscription status
import { hasValidSubscription } from '@/lib/auth'

// Toast - for user feedback (replaces alert())
import { ToastContainer, showToast } from '@/components/Toast'
```

### Supabase Usage Pattern

```javascript
// ✅ CORRECT - use getSupabase() in each function
async function loadData() {
  const supabase = getSupabase()
  const { data } = await supabase.from('trades').select('*')
}

// ❌ WRONG - don't use createClient directly in pages
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env...)  // NO!
```

### Toast Pattern (User Feedback)

```javascript
// Add ToastContainer once at the end of your page component
return (
  <div>
    {/* ... page content ... */}
    <ToastContainer />
  </div>
)

// Use showToast() for feedback
showToast('Something went wrong')              // error (default)
showToast('Trade saved successfully', 'success')
showToast('Please check your input', 'warning')
```

### Auth Check Pattern

```javascript
// Check subscription before allowing access
const { data: profile } = await supabase
  .from('profiles')
  .select('subscription_status')
  .eq('id', user.id)
  .single()

if (hasValidSubscription(profile)) {
  // Allow access
} else {
  window.location.href = '/pricing'
}
```

### File Organization

| Type | Location | Example |
|------|----------|---------|
| Pages | `app/[name]/page.js` | `app/settings/page.js` |
| API Routes | `app/api/[name]/route.js` | `app/api/stripe/webhook/route.js` |
| Shared Components | `components/[Name].js` | `components/Toast.js` |
| Utilities | `lib/[name].js` | `lib/auth.js` |
| Database | `schema.sql` | Single file for all SQL |

### API Routes (Server-Side)

API routes are different - they CAN use `createClient` directly with service role:

```javascript
// In app/api/*/route.js - this is correct
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Server-only key
)
```

### Console Logs

```javascript
// ❌ Client pages - NO console.log
console.log('debug')  // Remove these

// ✅ API routes - OK for debugging
console.error('Webhook error:', err)  // Keep these
```

### CSS Design Tokens

Use CSS variables from `globals.css` for new code:

```javascript
// ✅ PREFERRED for new code
style={{ background: 'var(--color-primary)' }}
style={{ padding: 'var(--space-md)' }}
style={{ borderRadius: 'var(--radius-md)' }}

// ⚠️ EXISTING CODE - leave as-is unless specifically refactoring
style={{ background: '#22c55e' }}  // Don't change working code
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ToastContainer`, `ConfirmModal` |
| Functions | camelCase | `getSupabase`, `hasValidSubscription` |
| Files (components) | PascalCase.js | `Toast.js`, `Modal.js` |
| Files (utilities) | lowercase.js | `auth.js`, `supabase.js` |
| CSS variables | kebab-case | `--color-primary`, `--space-md` |

---

## Overall Rating: 5.5/10

The app is functional and feature-rich, but has significant architectural debt, code duplication, and maintainability issues.

---

## Architecture Overview

| Metric | Value | Notes |
|--------|-------|-------|
| Total JS Lines | ~12,000 | High for this type of app |
| Largest File | 6,190 lines | account/[id]/page.js |
| Second Largest | 5,252 lines | dashboard/page.js |
| Inline Styles | 2,129 | No CSS modules used |
| useState Hooks | 150+ | In dashboard alone |
| Test Files | 0 | No tests |
| TypeScript | No | Plain JavaScript |

---

## File Structure

```
app/
├── account/[id]/
│   ├── page.js             # 6,190 lines - Main trading journal UI (to be refactored)
│   └── components/         # NEW - Extracted components folder
│       └── index.js        # Component exports
├── dashboard/
│   ├── page.js             # 5,252 lines - Dashboard & account management (to be refactored)
│   └── components/         # NEW - Extracted components folder
│       ├── index.js        # Component exports
│       └── JournalCard.js  # ~400 lines - Journal widget with mini equity curve
├── admin/page.js           # 441 lines - Admin panel
├── settings/page.js        # 445 lines - User settings
├── login/page.js           # 194 lines - Login form
├── signup/page.js          # 191 lines - Signup form
├── pricing/page.js         # 155 lines - Pricing page
├── page.js                 # 140 lines - Landing page
├── auth/callback/page.js   # ~80 lines - OAuth callback
├── discord-login/page.js   # ~78 lines - Discord OAuth
├── globals.css             # 91 lines - Global styles only
└── api/
    ├── stripe/
    │   ├── webhook/route.js      # 190 lines
    │   ├── create-checkout/      # 89 lines
    │   └── create-portal/        # 48 lines
    ├── upload-image/route.js     # 77 lines
    ├── auth/callback/route.js    # 135 lines
    └── discord/check-member/     # 39 lines

lib/
├── supabase.js             # 43 lines - getSupabase() singleton for all client pages
├── auth.js                 # 35 lines - hasValidSubscription() shared auth utility
├── constants.js            # ~100 lines - optionStyles, defaultInputs, validation
├── utils.js                # ~280 lines - 25+ utility functions
├── hooks.js                # ~120 lines - Custom React hooks
├── validation.js           # NEW ~300 lines - Form validation utilities
├── rate-limit.js           # NEW ~130 lines - API rate limiting middleware
└── stripe.js               # 8 lines

components/
├── Toast.js                # 66 lines - showToast() and ToastContainer
├── Modal.js                # 173 lines - Modal and ConfirmModal components
├── Header.js               # 115 lines - Header, Logo, button styles
├── ErrorBoundary.js        # NEW ~180 lines - React error boundaries
├── LoadingScreen.js        # ~25 lines - Branded loading screen
├── Tooltip.js              # ~100 lines - Multiple tooltip components
├── RatingStars.js          # ~70 lines - Star rating input/display
├── CustomDropdown.js       # ~150 lines - Styled dropdown with colors
├── ImageUploader.js        # ~180 lines - Multi-image upload
├── EquityCurve.js          # ~400 lines - Full and mini equity charts
└── StatCard.js             # ~150 lines - Stat display components

instrumentation.js          # NEW - Sentry server/edge init
instrumentation-client.js   # NEW - Sentry browser init
schema.sql                  # 655 lines - Complete DB schema (v5)
```

---

## Critical Issues

### 1. Monolithic Files
- `account/[id]/page.js` (6,190 lines) and `dashboard/page.js` (5,252 lines) contain ALL logic
- No component extraction whatsoever
- Makes debugging, testing, and collaboration extremely difficult

### 2. Duplicated Code

**✅ FIXED - `hasValidSubscription()`:**
- Now in `lib/auth.js` - single source of truth

**✅ FIXED - Supabase client creation:**
- All pages now use `getSupabase()` from `lib/supabase.js`

**✅ FIXED - `optionStyles` object:**
- Now in `lib/constants.js` - single source of truth

**✅ FIXED - `defaultInputs` array:**
- Now in `lib/constants.js` - single source of truth

**✅ FIXED - Utility functions (formatCurrency, getOptVal, etc.):**
- Now in `lib/utils.js` - 25+ functions extracted

### 3. Inline Styles (2,129 occurrences)
Every element uses `style={{...}}` instead of CSS classes. Example:
```javascript
style={{ padding: '12px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
```

### 4. State Management Chaos
Dashboard page has 150+ useState hooks. No Context, no state management library.

---

## Bandaids & Poor Practices

| Issue | Count | Status |
|-------|-------|--------|
| `alert()` calls | 51 | ✅ FIXED - replaced with showToast() |
| `console.log/warn/error` | 48 | ✅ FIXED - removed from client pages |
| `createClient()` duplication | 24 | ✅ FIXED - now use getSupabase() |
| `hasValidSubscription()` copies | 4 | ✅ FIXED - now in lib/auth.js |
| `window.location.href` | 23 | ⚠️ Remaining - could use Next.js router |
| Empty `catch {}` blocks | 1+ | ⚠️ Remaining - dashboard/page.js |
| Hardcoded URLs | 1 | ⚠️ Remaining - login/page.js |

---

## UI Inconsistencies

### Spacing/Padding
- Header padding: Some pages use `4px 16px`, others `4px 40px`
- CLAUDE.md specifies locked values that aren't always followed

### Border Radius (no system)
- `4px` - small elements
- `6px` - some buttons
- `8px` - most buttons
- `12px` - modals
- `16px` - cards

### Font Sizes (random)
`10px, 11px, 12px, 13px, 14px, 15px, 16px, 18px, 20px, 24px, 28px, 40px, 42px`

### Colors
- Primary green: `#22c55e`
- Disabled green: `#166534` (sometimes `rgba(34,197,94,0.5)`)
- Background: `#0a0a0f`, `#0d0d12`, `#14141a`, `#141418`
- Border: `#1a1a22`, `#222230`, `#2a2a35`

---

## Schema Notes

### Deprecated Columns (still in DB)
```sql
-- DEPRECATED: drawdown_type, trailing_mode, daily_dd_calc, max_dd_calc
-- They exist in old accounts but new code uses max_dd_* and daily_dd_* fields
drawdown_type TEXT DEFAULT 'static',
trailing_mode TEXT DEFAULT 'eod',
```

### Legacy Field
```sql
-- Legacy max_drawdown field (kept for backwards compatibility)
max_drawdown DECIMAL(5,2) DEFAULT NULL,
```

---

## What's Working Well

1. **Database Schema** - Well-designed, idempotent, proper RLS
2. **Stripe Integration** - Proper webhook validation, fallbacks
3. **Feature Set** - Custom fields, import/export, drawdown tracking
4. **Security** - RLS policies, service role server-side only

---

## Locked Layout Values (from CLAUDE.md)

**DO NOT MODIFY these account page values:**
```
Header padding: 4px 40px
Subheader top: 60px
Subheader padding: 17px 40px 13px 40px
Sidebar top: 60px
Sidebar padding: 12px
Buttons container marginTop: 4px
Buttons container gap: 12px
Main content marginTop: 130px
Trades tab height: calc(100vh - 130px)
Table header th padding: 3px 12px 11px 12px
```

---

## Safe Refactoring Rules

When making changes to this codebase:

1. **Never change dimensions/spacing without checking related elements**
   - Button size changes affect container, adjacent elements, responsive breakpoints

2. **Extract components without changing styles**
   - Copy styles exactly as-is when extracting
   - Test visually before and after

3. **Create shared utilities incrementally**
   - Replace one usage at a time
   - Test each replacement

4. **Don't refactor unrelated code**
   - Only touch what's needed for the current task
   - Resist urge to "clean up" nearby code

---

## Refactoring Priority

### Phase 1: Non-UI Changes (Safe)
- [ ] Create shared `hasValidSubscription()` utility
- [ ] Use lib/supabase.js everywhere
- [ ] Remove console.logs
- [ ] Replace alert() with toast system
- [ ] Add proper error handling

### Phase 2: Component Extraction (Careful)
- [ ] Extract shared Modal component
- [ ] Extract shared Header component
- [ ] Extract shared Button components
- [ ] Extract form input components

### Phase 3: Style System (Risky)
- [ ] Create CSS variables for colors
- [ ] Create CSS variables for spacing
- [ ] Gradually migrate inline styles

---

## Known Quirks

1. **JSON fields** - `custom_inputs` and `extra_data` store JSONB, sometimes double-parsed
2. **Outcome values** - Can be 'win', 'loss', 'breakeven' or 'be' (inconsistent)
3. **Direction values** - Can be 'long'/'short' or 'Long'/'Short' (case inconsistent)
4. **Rating field** - Stored in extra_data, not a direct trade column

---

## Safe Refactoring Guide

### The Golden Rule
**Never change styles during refactoring. Only move code.**

### Why UI Breaks Happen
1. You change a button's padding from `12px` to `14px`
2. The button is inside a flex container with `gap: 12px`
3. The extra 4px (2px each side) pushes adjacent elements
4. Something overflows or wraps unexpectedly

### Before Changing ANY Dimension, Identify:
- Parent container constraints (width, height, overflow)
- Sibling elements (flex gap, margin)
- Child elements (could overflow)
- Responsive breakpoints (might break at mobile)

---

## Refactoring Phases

### Phase 1: Safe Changes (Zero UI Risk)
These touch **logic only**, not visuals:

| Task | How |
|------|-----|
| Create shared `hasValidSubscription()` | New `lib/auth.js`, replace copies one by one |
| Use existing Supabase utility | Replace `createClient()` with `getSupabase()` |
| Remove console.logs | Just delete them |
| Replace `alert()` with toast | Add toast library, replace incrementally |

### Phase 2: Component Extraction (Copy Styles Exactly)
When extracting components, **copy styles character-for-character**:

```javascript
// WRONG - changing styles during extraction
function Button({ children }) {
  return <button style={{ padding: '12px 24px' }}>{children}</button>  // Changed!
}

// RIGHT - exact copy of original
function Button({ children }) {
  return <button style={{ padding: '12px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>{children}</button>
}
```

**Process:**
1. Screenshot current UI
2. Extract with **identical** inline styles
3. Screenshot again
4. Compare - only commit if identical

### Phase 3: Style Variables (Incremental)
Add CSS variables **without changing values**:

```css
:root {
  --color-primary: #22c55e;
  --color-primary-disabled: #166534;
  --color-bg-dark: #0a0a0f;
  --color-bg-card: #14141a;
  --color-border: #1a1a22;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

Replace **one occurrence at a time**, test each.

---

## Task Priority Order

| # | Task | Risk | Status |
|---|------|------|--------|
| 1 | Create `lib/auth.js` with shared functions | None | [x] |
| 2 | Replace Supabase client creation | None | [x] |
| 3 | Remove console.logs | None | [x] |
| 4 | Add toast system, replace alerts | Low | [x] |
| 5 | Extract reusable Modal component | Medium | [x] |
| 6 | Extract Header component | Medium | [x] |
| 7 | Create design tokens in CSS | Medium | [x] |

---

## Claude Instructions

When making changes to this codebase:

1. **Read full component context first** - Not just the line to change
2. **Identify related elements** - What else uses same container/spacing
3. **Make minimal changes** - Only what's needed, nothing extra
4. **Warn about risks** - Flag if change might affect other elements
5. **Never "clean up" nearby code** - Only touch what's requested
6. **Respect FINALISED markers** - Check file headers before editing
