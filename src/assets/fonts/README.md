# Eclipse fonts

Copied from Foom commit `245a4d44f45c0c833bedfee19791abf3235beba8`,
`src/renderer/fonts/`. Upstream: [Google Fonts revision
23e54b51ddffbc7713c583748e3bd86f62b1fa4a](https://github.com/google/fonts/tree/23e54b51ddffbc7713c583748e3bd86f62b1fa4a/ofl).
Each family's SIL Open Font License is included beside its WOFF2.

Archivo Black is the regular display/wordmark face; Courier Prime is the regular
voice face. Geist and Geist Mono retain their variable weights (100–900).
The original font names are preserved; these licenses declare no reserved font
names. No terminal fonts or third-party logo glyphs are included.

Converted from the pinned TTFs with fontTools 4.46.0 and Brotli. Subset includes
U+0020–00FF, U+2000–206F, U+20AC, U+2122, U+2190, U+2192 and U+2212 (Latin,
common punctuation, euro, trademark, arrows and minus). Expand this set before
adding copy in other scripts. Reproduce for each of `archivo-black`,
`courier-prime`, `geist` and `geist-mono`:

```python
from fontTools import subset
from fontTools.ttLib import TTFont

font = TTFont(source_ttf, recalcTimestamp=False)
options = subset.Options()
options.flavor = 'woff2'
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=list(range(0x20, 0x100)) + list(range(0x2000, 0x2070))
                   + [0x20ac, 0x2122, 0x2190, 0x2192, 0x2212])
subsetter.subset(font)
font.flavor = 'woff2'
font.save(destination_woff2)
```

CSS imports all four through the build pipeline. The shell preloads its three
visible faces; every face uses `font-display: swap`. Adjusted local fallbacks
match x-height and vertical metrics to reduce movement during swapping; explicit
line heights reserve line boxes. Browser checks observe layout shifts and verify
that the actual bundled faces load. Fallback availability still varies by OS.
