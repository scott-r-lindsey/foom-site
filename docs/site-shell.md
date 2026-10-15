# Shared site shell

`src/layouts/SiteLayout.astro` renders the document, English language, viewport,
metadata, header, main landmark, and footer. Pass a required `title` and
`description`; the layout appends ` | foom` to titles other than `foom`.
Descriptions should summarize the specific page. Put one `h1` in the page slot,
then use sequential heading levels for any future sections. Do not nest another
`main` inside the slot.

The first keyboard stop is a skip link targeting `#main-content`. The main is
programmatically focusable so native fragment navigation moves focus past the
header. All keyboard focus uses a visible outline. The 404 page offers a direct
home link; hosting must serve the generated `dist/404.html` for missing routes
(hosting configuration belongs to issue #9).

`src/styles/global.css` defines color, system typography, spacing, content width,
and motion tokens. Fluid gutters and heading sizes work without a mobile menu
or JavaScript. `.container` sets page width; `.prose` limits reading width.
Text wraps rather than clipping at narrow widths. Reduced-motion preferences
disable transitions, animations, and smooth scrolling. New components should
reuse the tokens and preserve these accessibility behaviors.

## Static content and hydration

The home and 404 pages are ordinary Astro-rendered HTML. There are no scripts,
React islands, or `client:*` directives in this shell. Links and the skip link
work with JavaScript disabled. Keep ordinary text, navigation, and essential
product content in static HTML. Add a React island only for an interaction that
needs browser state or event handlers, and choose the least eager appropriate
`client:*` trigger. A future island must preserve keyboard access, focus
visibility, reduced motion, and useful content before hydration. React
integration remains configured for that future work.

## Content boundary

This is a restrained foundation, not final marketing design or positioning.
The only product claim is that foom is a terminal, supplied in the task and
confirmed by the read-only reference `inspiration/foom/README.md` introduction
(“A minimal Electron terminal…”). No terminal application UI, download links,
feature claims, screenshots, or testimonials are carried over. Final brand
assets and broader content remain future work. Import any future source assets
through Astro's build pipeline as described in [contributing](contributing.md).

## Local verification

Run `pnpm typecheck`, `pnpm build`, and `git diff --check`. Preview the production
build with `pnpm serve`. Check `/` and `/404.html` at narrow and wide widths,
including 320 CSS pixels, and with enlarged text. Verify one `h1`, one of each
page landmark, page-specific metadata, no horizontal overflow, and the home
return link. Tab first to the skip link, check its outline, press Enter, and
confirm focus reaches main. Check the other links and reduced-motion styles.
Check text and focus contrast against their backgrounds. Run any browser
automation headless; this issue adds no browser-test infrastructure (issue #7
owns that). Record actual local results separately from CI in the PR.
