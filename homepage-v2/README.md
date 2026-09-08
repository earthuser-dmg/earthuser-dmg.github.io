# Homepage v2 — isolated preview

Open `/homepage-v2/` through the repository's local server. The production `index.html` and shared components are not changed by this preview.

## Design sources

- Homepage: Figma file `LYl3YGE9Y4EHVTWslgLjWW`, node `11247:9621`.
- Updated folder content and states: node `11756:3209`, read September 6, 2026.
- The existing 153px navigation rail is retained; the design's 1140px content canvas scales within the remaining viewport width.
- SVG files named after node IDs are exact Figwright exports. Photos named after image hashes are original Figma image fills. The two inline paths in HTML come from `11736-383.svg` and `11755-3186.svg`.
- Existing global font and color tokens are reused. Folder colors and component dimensions have no corresponding site tokens and follow the Figma values locally.
- GSAP core and ScrollTrigger reuse the site's 3.13.0 files. DrawSVGPlugin and InertiaPlugin are pinned to the same version in `assets/`.

## Interaction contract

- Hero: drag the desk brush onto the tangle and release to reveal the closure and grow the path once. Passing over it while dragging erases ink; hovering alone does nothing. The brush returns to its desk position after release. Pointer events support touch dragging, and keyboard activation provides an alternative. Reload resets the easter egg.
- Designer: native page scrolling drives a pinned blue → yellow → pink folder stack. Reverse scrolling reverses the stack. Covered content is removed from keyboard navigation. The section works independently of the Hero easter egg.
- Folder images and checklist copy are placeholders from the updated design. `Read more` temporarily leads to this preview's Works section until individual destinations are supplied.
- Works: four existing project destinations retained; styles scoped to this preview.
- Play: images, palette, paper clip and label use pointer-velocity inertia and return to their resting transforms. The dot pattern is decorative. `View all` opens `/play`.
- Footer: closure is always present; path and then thanks text follow scroll progress, in both directions. No click action.
- Reduced motion: folders appear in normal flow; footer is fully visible; idle and inertia effects are disabled. This branch is implemented but has not been exercised through an OS preference change in browser QA.

## Verification

- Browser checked at 1280×720, 1440×900 and 390×844.
- Verified mouse brushing reveals the Hero path; no brushing leaves it hidden.
- Verified all three pinned folder states, reverse scrolling, and transition into Works.
- Verified Footer completion and thanks text at page end.
- Verified Play image and label displacement, then return to identity transform.
- Verified View all navigates to the existing Play page.
- Corrected shared desktop top-nav overlap, inherited heading font, pinned curve stretching and mobile horizontal overflow.
- Local asset paths, JavaScript syntax and whitespace checks passed.

## Next review

Review visual fidelity and motion timing in the preview. Replace placeholder content and assign final Read more destinations after that review. Only replace the production homepage after user approval.

References: [Draw a path](https://demos.gsap.com/demo/draw-a-path/), [GSAP CodePen](https://codepen.io/GreenSock/pen/OJeOewJ), [MWG Inertia tutorial](https://madewithgsap.com/effects/free-tutorial001), [Truus](https://truus.co/). The MWG tutorial was readable; the GSAP demo and CodePen were blocked by the web fetch, and Truus's interactive browser load timed out. No claim of frame-by-frame matching to those inaccessible demos is made.


## September 6 interaction revision

- Explicit headline word masks reveal in reading order, including the knot; the original blue crayon export is then revealed left to right.
- GSAP ScrambleText animates only the date. Its final state restores the original outlined Figma lettering; the tag and Last updated label stay fixed.
- Folder entrance is calculated from the viewport bottom and is no longer clipped by the folder region.
- The entire Works image frame, border and corner marks scale to the card edges on hover, with a white card background.
- Preview top navigation uses the shared monochrome/color logo exports with opacity-only hover.
- Verified at 571×717: folder entry begins at y=717 (viewport bottom), beyond the region bottom at y=602. Hover frame width matches the card within 0.02px; logo layers share identical geometry. Desktop layout checked at 1280×720.
- Animation references: https://gsap.com/docs/v3/Plugins/ScrambleTextPlugin/ and https://gsap.com/docs/v3/Plugins/SplitText/masks/. The supplied demos were unavailable through web fetch; the word masks use explicit markup to preserve the requested token boundaries.


## Latest Figma layout sync

Re-read frame 11247:9621: shared grid across Hero and Designer, top information row, moved headline/date/desk objects, envelope layers around the pinned folders, revised Play collage and its centered CTA, and a new footer curve. Original vector paths were read from Figma for 11786:5909 and 11786:5996; envelope layers were separated from the exported 11784:5187 SVG without redrawing. Updated exports are in assets/latest.

Existing word-mask, crayon reveal, date scramble, optional brush easter egg, folder scroll sequence, Work hover and Play inertia remain in place. The new Hero curve disappears behind the folder/envelope as shown in the design. Verified desktop at 1280×900 and narrow layout at 571×717, including folder transitions and footer completion. Production index.html is unchanged.


## September 7 browser feedback revision

- Hero fills the first viewport below the mobile navigation without a gap; desktop Hero fills the viewport.
- The grid is a fixed background, clipped at the pinned Designer envelope bottom. Folders complete blue → yellow → pink before the opaque Works/Play/Footer layer covers the pinned stage. Folder overflow below the envelope is clipped.
- Brush interaction now uses actual drag and drop, replacing hover-triggered brushing.
- Read more and View all use the latest Figma arrow exports (11786:5942 and 11756:3396).
- Work corner marks appear only on hover or keyboard focus; the existing whole-frame enlargement and white background remain.
- Footer main path finishes before the separate tail is drawn. SplitText masks reveal the responsive text lines with scroll and reach their final position at page end.
- Verified at 571×717 and 1248×717: first-screen bounds, actual brush drag, pinned folder progression, covering content layer, hover marks, reverse-scroll tail visibility, and complete footer text. Browser console has no warnings or errors; JavaScript syntax and whitespace checks pass.
- References: [Pinned panels with overscroll](https://demos.gsap.com/demo/pinned-panels-with-overscroll/), [Responsive line splits on scroll](https://demos.gsap.com/demo/responsive-line-splits-on-scroll/). Both references were readable during this revision.


## September 7 bottom pin and idle motion revision

- Designer pins at `viewport height - stage height`, including narrow layouts; the cover transition scales from the bottom center. Verified bottom=717 at 1008×717 and 655×717.
- Read more and View all move as complete buttons by 2px and increase to font-weight 500 on hover/focus. Verified both in-browser; View all arrow has no extra independent translation.
- Knot idle motion rotates around its center with sine.inOut; removed the previous scale deformation.
- Letter 11791:6118 uses the exported original three-state Figma loop. Figwright keyframe reads failed with Unsupported base value type; official motion read was rate-limited. The video export succeeded: 19 frames at 40ms, with state changes at frames 6 and 12. Cropped the exported canvas and keyed its blank background to transparency; preserved frame durations and loop. Reduced motion retains the static SVG.
- Date investigation: animation uses generic cursive and then swaps to Figma Hand vector lettering. ScrambleText supports repeat and browser fonts; the user will supply a new font before this is changed. Date typography/loop update remains pending.
- Syntax/whitespace checks and browser console checks passed.


## September 7 supplied SVG and Hero choreography

- Source of truth: outputs/svg-animations/Animation_Letter_animated.svg and Animation_Update_card_animated.svg, copied verbatim and inlined in the preview. Existing three-state 904ms loops retained. Card IDs are namespaced in HTML; exported canvas background rectangles are hidden with scoped CSS. Artwork paths remain unchanged.
- Card copy: Last updated / 8/30/2026; Manrope 14 and Finger Paint 16 match Figma nodes 11699:4301/4302. Finger Paint is served locally. ScrambleText updates all three date text layers together, with a four-second pause between cycles; no bitmap/font swap.
- Letter hover imports cat-mail-lab/motion.mjs and its assets, including saved easing-console preferences when available. Photo retracts before flap closes; partial enter/leave reverses from the current pose. Default SVG pauses during hover and resumes on closure.
- Knot: centered 360-degree rotation, 3s sine.inOut, infinite repeat without yoyo. Drag-to-unravel still stops idle motion.
- Hero company uses character rotationX entrance adapted from the supplied Rolling text GSAP demo. Headline reveal and crayon precede the four illustration entrances: upward motion, slight enlargement, then slow elastic settling.
- Verified hover open/close in browser, all four illustration final transforms, SVG loop states, exact card text/font families, and 655×717 layout with no horizontal overflow. Console, syntax and whitespace checks pass.

## September 7 illustration and title refinement

- Inlined supplied Lamp, spark and paper clip animated SVGs with namespaced IDs; canvas backgrounds are hidden without removing clipping geometry.
- Play sticker retains its exported outline and uses local Finger Paint for live text. Active Work marker uses the supplied superscript animated SVG.
- Shifted the intro grid by one pixel to prevent a doubled vertical line beside the navigation rail.
- Designer title uses responsive SplitText line masks with a scroll-linked vertical reveal.
- Browser verified desktop marker, Play artwork and text, title reveal from 120% to zero, and no horizontal overflow. Drag-to-unravel closure/path remains intact. Console, JavaScript syntax and whitespace checks passed.

## September 8 closure, lamp and alignment revision

- Closure is present underneath the erasing canvas from first render. Updated hero curve from Figma 11786:5909 vectorPaths; retained brush-triggered path drawing.
- Designer visible area follows the latest 653px frame below its 79px title offset (1140/732 stage); folder sequencing retained.
- Works and Play use the Designer line-mask scroll reveal. Preview top/mobile navigation now uses the same animated marker and horizontal hover feedback as the rail; top navigation keeps 17.6px type while scrolling.
- Supplied Animation_turn_on_Lamp_animated.svg is inlined with namespaced IDs. Dragging the cord hotspot at least 8px toggles the lamp; the on animation starts at time zero, remains lit, and a subsequent pull closes it. Keyboard activation and cancelled-pointer cleanup included. Idle SVG pauses while lit.
- Centered the rotated Play artwork bounds, View all, footer closure and footer copy in the content canvas. Kept the layout container in place to avoid horizontal overflow.
- Browser checked 1280/927 layouts, actual brush/pull gestures, repeat lamp toggle, title masks and footer. Engineering estimates for a freely draggable cord are in lamp-rope-notes.md.
