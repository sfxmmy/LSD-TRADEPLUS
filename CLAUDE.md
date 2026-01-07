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
- **Header padding**: `4px 40px`
- **Subheader top**: `60px`
- **Sidebar top**: `60px`
- **Sidebar padding**: `12px`
- **Buttons container marginTop**: `4px`
- **Buttons container gap**: `12px`
- **Main content marginTop**: `126px`
- **Trades tab height**: `calc(100vh - 126px)`

For sidebar flex items (buttons, Stats View Selector):
- Use flex `gap: '12px'` for spacing between items
- Stats View Selector has NO marginTop (flex gap handles spacing)

## Subheader Content Centering
To center content vertically in the subheader WITHOUT moving borders:
- Use asymmetric padding: `15px 40px 11px 40px` (more top, less bottom)
- Total vertical padding stays 26px so border position unchanged
- DO NOT use marginTop on elements - it affects layout
- Asymmetric padding shifts content down within fixed container height
