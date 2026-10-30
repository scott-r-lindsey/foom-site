# Eclipse brand assets

Source: [Foom](https://github.com/scott-r-lindsey/foom), commit
`245a4d44f45c0c833bedfee19791abf3235beba8`. Read-only brand specification:
`docs/brand.md`; master ray tracer: `scripts/icon/{blackhole,foom-icon}.mjs`.
The older brand mockup is illustrative; the current specification requires a
plain-text “foom” wordmark in Archivo Black and the ray-traced black-hole icon.

Generated without modifying the reference checkout (Node 24.17.0):

```sh
node /var/www/html/scott/foom/scripts/icon/foom-icon.mjs /tmp/issue29-foom-icons
```

`favicon-16.png`, `favicon-32.png`, `foom-256.png` and `foom-1024.png` are exact
copies of the corresponding `foom-<size>.png` outputs. The small favicons use the
master's deliberately simplified ray trace. No approximate SVG mark is shipped.
`apple-touch-icon.png` is the 256px output resized to 180px with Pillow 10.2.0
LANCZOS. All assets are imported by Astro for fingerprinted URLs.

`social.png` is a 1200×630 RGB PNG composed with Pillow: background `#05040A`,
1024px master resized to 600×600 with LANCZOS at (12, 15), and “foom” in the
pinned Archivo Black TTF, 144px, `#F4EFFF`, anchored left-middle at (632, 315).
No tagline is included pending approved copy in #28. The art keeps the master's
violet-to-white light ramp; amber/orange and magenta are reserved for status.

Foom: Copyright 2026 Scott Lindsey, Apache-2.0. The upstream Apache license and
NOTICE are included verbatim. The icons are unmodified outputs; the apple-touch
and social compositions are the size/layout adaptations described above. Fonts
retain their separate SIL licenses in `../fonts/`.
`third-party-notices.txt` combines those verbatim license/notice texts with an
adaptation note; the layout links this fingerprinted file so web distributions
carry the attributions as well as the source repository.

The shell now follows system light preference with dark as its default, and uses
this PNG social image with absolute OG/Twitter URLs and `summary_large_image`.
This supersedes the provisional system typography and SVG/no-social-image notes
in `docs/site-shell.md` and `docs/metadata.md`; those docs are outside this
worker's assigned ownership and need reconciliation by the integration owner.
