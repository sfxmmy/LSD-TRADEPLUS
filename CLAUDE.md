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