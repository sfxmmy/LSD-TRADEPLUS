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

## Border/Spacing Fixes (Account Page Layout)
When adjusting header/border positions, ALL these values must change together:
1. **Header padding** (e.g., `4px 40px`) - determines header height
2. **Subheader top** (e.g., `top: '45px'`) - must match header height
3. **Sidebar top** (e.g., `top: '45px'`) - must match header height
4. **Sidebar buttons marginTop** - adjust to keep buttons in same visual position
5. **Main content marginTop** (e.g., `111px`) - subheader top + subheader height
6. **Trades tab height calc** - must match main content marginTop

Formula: If header padding changes by Xpx, then:
- Subheader/sidebar top changes by 2X (top + bottom padding)
- Buttons marginTop increases by 2X to maintain position
- Main content marginTop decreases by 2X

For sidebar flex items (buttons, Stats View Selector):
- Use flex `gap: '12px'` for spacing between items
- Don't add extra marginTop to items inside flex - causes cutoff issues
- The flex gap handles all spacing automatically
