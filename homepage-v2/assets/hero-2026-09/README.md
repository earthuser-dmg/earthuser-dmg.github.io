# Hero design assets — 2026-09-14

Source: Figma file `LYl3YGE9Y4EHVTWslgLjWW`, frame `11946:21313`.

- `11958-21621.svg`: grey knot over clarity.
- `11952-21519.svg`, `11952-21523.svg`: handwritten parentheses around complexity.
- `11954-21568.svg`: orange brush with blue bristles.

These are unmodified Figwright SVG exports. Figma exports the stroke artwork as filled outlines. The three inline Hero SVGs in `index.html` embed those exact exports and reveal them with DrawSVG masks built from the same nodes' original `vectorPaths`, read through the Figma Plugin API. The knot's vertical reflection is preserved. The masks do not replace the visible artwork. Canvas uses the fully revealed SVG with identical bounds so the handoff and subsequent erasing share one coordinate system.

The existing content canvas still starts after the shared 153px navigation rail; artwork positions scale within that canvas. No shared navigation files were changed.
