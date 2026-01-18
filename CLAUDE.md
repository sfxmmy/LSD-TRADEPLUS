# CLAUDE.md

## Image Handling
- Always analyse every image before responding
- Never skip or assume image content
- Analyse UI screenshots in detail
- If there are multiple images do not skip any, they are sent for a reason

## Project
- Trading journal web app

# Project Rules

## Code Protection
- Files marked with "// FINALISED" at the top should NOT be modified
- Before editing any file, state which file you're editing and why
- Only edit the specific section requested — don't refactor surrounding code
- If a previous edit is working, don't touch it when working on something else
- Moving one segment or anything can potentially move others. Make sure this is kept in mind, and you are aware of what is being impacted by your code. 

## Workflow
- When asked to fix/add something, ONLY touch the relevant code
- Don't "improve" or "clean up" code that wasn't mentioned
- If you need to modify finalised code, ASK FIRST

## FINALISED Layout Values (Account Page) - DO NOT MODIFY
These values are LOCKED. Do not change them under any circumstances:

### Header & Navigation
- **Header padding**: `4px 40px`
- **Subheader top**: `60px`
- **Subheader padding**: `17px 40px 13px 40px` (total 30px vertical)
- **Sidebar top**: `60px`
- **Sidebar padding**: `12px`

### Sidebar Buttons
- **Buttons container marginTop**: `4px`
- **Buttons container gap**: `12px`
- Stats View Selector has NO marginTop (flex gap handles spacing)

### Main Content
- **Main content marginTop**: `130px`
- **Trades tab height**: `calc(100vh - 130px)`

### Table Header
- **Table header th padding**: `3px 12px 11px 12px` (total 14px vertical)

## Content Centering Notes
- DO NOT use marginTop on subheader elements - it affects layout
- To shift content without moving borders: adjust top/bottom padding asymmetrically while keeping total the same

# Schema and SQL stuff
- All SQL has to be done in the schema file - I want one file that handles it all.

# Shared Utilities & Components

## Use These Instead of Duplicating Code

### Constants (`lib/constants.js`)
```javascript
import { optionStyles, defaultInputs, knownImportFields } from '@/lib/constants'
```

### Utility Functions (`lib/utils.js`)
```javascript
import { formatCurrency, formatPnl, getOptVal, getOptTextColor, parseFlexibleDate, getExtraData, calcWinRate } from '@/lib/utils'
```

### Custom Hooks (`lib/hooks.js`)
```javascript
import { useIsMobile, useTooltip, useClickOutside, useDebounce } from '@/lib/hooks'
```

### Shared Components
| Component | Import |
|-----------|--------|
| Loading | `import { LoadingScreen } from '@/components/LoadingScreen'` |
| Tooltips | `import { DataTooltip, ButtonTooltip } from '@/components/Tooltip'` |
| Stars | `import { RatingStars, RatingDisplay } from '@/components/RatingStars'` |
| Dropdown | `import { CustomDropdown } from '@/components/CustomDropdown'` |
| Images | `import { ImageUploader } from '@/components/ImageUploader'` |
| Charts | `import { EquityCurve, MiniEquityCurve } from '@/components/EquityCurve'` |
| Stats | `import { StatCard, StatCardGrid } from '@/components/StatCard'` |

## Refactoring Approach
- **DO NOT** refactor the main page.js files all at once
- **DO** use shared utilities when adding NEW features or fixing bugs
- **DO** extract components only when you need to edit that section
- **DO** leave working code alone - refactoring for its own sake risks breaking things
- The foundation exists in `lib/` and `components/` - use it incrementally

## CSS & Styling
Use the design tokens defined in `app/globals.css` instead of hardcoded values.

### For New Code
Always use CSS variables:
```jsx
// ✅ Good
<div style={{ background: 'var(--color-bg-card)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>

// ❌ Bad
<div style={{ background: '#14141a', borderRadius: '8px', padding: '12px' }}>
```

### Available Tokens
| Category | Examples |
|----------|----------|
| Backgrounds | `--color-bg-body`, `--color-bg-dark`, `--color-bg-card`, `--color-bg-elevated` |
| Borders | `--color-border`, `--color-border-light`, `--color-border-lighter` |
| Text | `--color-text-primary`, `--color-text-secondary`, `--color-text-muted` |
| Semantic | `--color-primary`, `--color-success`, `--color-warning`, `--color-error` |
| Radius | `--radius-sm` (6px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-xl` (16px) |
| Spacing | `--space-xs` (4px), `--space-sm` (8px), `--space-md` (12px), `--space-lg` (16px), `--space-xl` (24px) |
| Font sizes | `--text-xs`, `--text-sm`, `--text-base`, `--text-md`, `--text-lg`, `--text-xl` |
| Z-index | `--z-dropdown`, `--z-modal`, `--z-modal-overlay`, `--z-tooltip` |

### Migration Approach
- **DO NOT** do a bulk migration of existing inline styles
- **DO** swap hardcoded values for tokens when you're already editing that code
- **DO** leave working styles alone if you're not touching that section

# Dual Page Sync (Dashboard & Account Page)

## The Two Areas
The app has two main pages that share similar UI elements:
1. **Dashboard** (`app/dashboard/page.js`) - Shows all journal cards, quick trade entry
2. **Account Page** (`app/account/[id]/page.js`) - Individual journal view with sidebar journal select

## Sync Requirement
When editing shared UI patterns, **the same changes should be applied to both pages** unless explicitly specified otherwise. Key shared elements include:
- Journal selector dropdowns/buttons
- Journal card/item styling (borders, colors, transitions)
- Drag-and-drop effects (cursor, opacity, border color)
- Trade entry form styling
- Option styles (direction, outcome, confidence, etc.)

## Current Shared Patterns
| Pattern | Dashboard | Account Page |
|---------|-----------|--------------|
| Journal drag reorder | Journal cards (purple border, grab cursor) | Journal Select sidebar items |
| Quick trade entry | Log Trade modal | Add Trade modal |
| Option colors | `optionStyles` object | Same `optionStyles` object |

**Rule:** If you edit a UI pattern in one page, check if the same pattern exists in the other page and apply matching changes.