# Standalone HTML slide decks

This contract applies exclusively to `/generate-slides`. Build decks directly
with HTML, CSS, inline SVG, and JavaScript. No rendering package is required.

## Plan from evidence

1. Establish the topic, audience, purpose, and source material from the request.
   Ask only for missing facts that materially affect the deck. Otherwise, state
   reasonable audience and duration assumptions briefly.
2. Read the source. Map its important claims, decisions, conditions, and risks
   to slides before writing HTML. Cite repository paths or source links where
   useful. Mark assumptions; never invent metrics or provenance.
3. Choose a coherent story with one takeaway per slide. Match length to the
   request and material, not an arbitrary slide count. Preserve decision-critical
   details; put secondary material in appendix slides when necessary.

## One portable file

- Write one HTML file with a doctype, language, charset, viewport, title, inline
  CSS, and inline JavaScript. It must open directly through `file://` offline.
- Embed diagrams as inline SVG and raster images as data URLs. Include all
  required assets. No CDN, external stylesheets, remote fonts, script imports,
  frames, fetch requests, analytics, or neighboring asset files.
- Use available local font stacks by default. Embed fonts only when available
  and redistribution is permitted. Source hyperlinks are allowed, but are not
  required to view it.
- Treat source text as data. Escape HTML and script-sensitive characters; never
  execute pasted source code or insert unsanitized markup. Do not embed secrets
  or private metadata.
- Default to `~/.agent/diagrams/<descriptive-name>.html` or an explicit user
  path. Ask before overwriting an existing file. Do not add PPTX, Markdown, or
  other exports unless requested. Video generation is outside this workflow.

## Design for understanding

- State each slide's takeaway in its heading. Start with the central conclusion
  or question, then explain the mechanism, evidence, and consequences.
- Choose compositions that suit the material: a single figure, before/after,
  sequence, comparison, or a short list. Vary layouts without changing the
  visual meaning of colors, shapes, or labels.
- Use a restrained palette, consistent spacing, and a clear type hierarchy.
  Leave space around the main idea. Avoid decorative animation and dense cards.
- Aim for no more than five short bullets, eight table rows, or ten code lines
  on a slide. These are layout budgets, not permission to omit essential facts.
  Add slides or an appendix when content exceeds a readable budget.
- Draw mechanisms and relationships, not decorative boxes. Label arrows with
  behavior; label quantities with units. Include diagram assumptions when needed.
- Use original examples or analogies only when they clarify a point. Separate
  illustration from factual claims and keep important limits visible.

## Readable slides and usable controls

- Use semantic `section.slide` elements with clear headings. Use figures instead
  of dense bullets when they explain the point. Body text is at least 18px;
  diagram labels remain readable at the rendered size.
- Split crowded slides instead of shrinking text or hiding overflow. Desktop
  slides fit one viewport. At narrow widths or high zoom, allow a readable
  scrolling layout instead of clipping content. Contain wide figures separately.
- Provide visible previous/next buttons, a slide counter, and an outline.
  Support Arrow keys, Space, Home, End, touch navigation, and slide hash links.
  Do not intercept keys or swipes inside controls, editable fields, links,
  selected text, or scrollable figures. Respect reduced motion in JavaScript
  scrolling as well as CSS transitions.
- Give controls accessible names and visible focus. If using an outline/help
  dialog, trap focus while open, make background controls inert, support Escape,
  and restore focus on close. Announce slide changes without reading every slide.
- Keep every slide readable with JavaScript disabled or initialization failed.
  Enable enhanced hiding only after successful initialization. Print all slides
  in order, with navigation hidden, content visible, and no clipping.
- Storage and history support are optional enhancements. Handle expected
  `file://` or blocked-storage restrictions without breaking navigation; surface
  unexpected errors rather than silently swallowing them.
- Maintain text contrast of at least 4.5:1 and meaningful graphic contrast of
  at least 3:1. Do not use color alone to encode status. Check both color schemes
  when both are supplied.

## Review and verify before delivery

1. Review the deck against the source inventory. Check claims, numbers, labels,
   dates, units, caveats, attribution, and appendix coverage.
2. Inspect HTML, CSS, SVG, and JavaScript for external asset references, network
   calls, unresolved paths, unsafe markup, and syntax errors. Inspect the final
   written file, not only an in-memory draft.
3. When browser automation is available, open the final file offline. Monitor
   requests and runtime errors. Exercise every slide at the requested size,
   1280×720, 1280×600, and 390×844, including reduced motion and supplied themes.
4. Check horizontal and vertical overflow and clipped descendant bounds on every
   desktop slide after fonts and images settle. A vertical-only check is
   insufficient. Auto-fit or clipped content is a failure, not a passing
   layout. At narrow widths, verify readable scrolling with no page-wide overflow.
5. Check keyboard and pointer navigation, hash links, outline focus, touch when
   supported, disabled storage, JavaScript-disabled reading, and print layout.
   Fix failures and rerun the affected checks. Do not install browser tooling
   merely for a preview without explaining the dependency and required approval.
6. If a browser check is unavailable, complete static checks and label the deck
   as visually unverified. Do not invent a screenshot, offline pass, or browser
   result. State exactly what remains unchecked.

Write the complete HTML directly to the chosen destination. Opening a browser
does not validate a deck. After review, open it when requested; report an opening
failure without concealing the saved file.

Return the HTML path, slide count, and a brief verification result. Mention
material assumptions or unresolved limitations. Do not paste the full HTML in
chat unless requested.
