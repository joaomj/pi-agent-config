# Diagram Output Contract

## Default files

Create one equivalent pair for each focused view:

- `<name>.html`: self-contained dark-themed HTML with inline SVG and CSS.
- `<name>.svg`: self-contained static SVG with the same content and structure.

Produce Mermaid only when the user explicitly requests it. If the user requests
another format, follow that request instead of creating the default pair.

## HTML

- Include all CSS and SVG in the document.
- Do not require JavaScript, external images, stylesheets, or fonts.
- Use a responsive viewport and preserve text readability at common window
  sizes.
- Include a title, the diagram, a compact legend when needed, and explicit
  assumptions or unknowns.

## SVG

- Include a useful `viewBox`, `<title>`, and `<desc>`.
- Use basic SVG shapes, text, paths, and inline styles.
- Do not use scripts, external resources, or `foreignObject`.
- Keep text readable without the HTML wrapper.

## Visual rules

- Use consistent spacing, alignment, type scale, colors, borders, and arrow
  styles.
- Distinguish internal, external, data-store, queue, and trust-boundary elements
  only when those distinctions exist.
- Put legends outside system boundaries.
- Avoid crossed arrows and dense labels. Split crowded diagrams into focused
  views.
- Keep the HTML and SVG semantically equivalent.

## GitHub Markdown

Embed the SVG with a repository-relative image path. Link the HTML only when a
rendered hosted URL exists because GitHub displays repository HTML as source.

## Completion check

Confirm that both files open independently, contain no external dependency,
show matching participants and relationships, and answer the requested
question without undocumented assumptions.
