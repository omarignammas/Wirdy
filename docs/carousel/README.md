# Wirdy Presentation Carousel

This folder contains a seven-slide, Arabic-first product presentation built
from real screens in the Wirdy virtual iPhone simulator.

## Preview

From the repository root:

```bash
python3 -m http.server 4173
```

Open:

```text
http://127.0.0.1:4173/docs/carousel/index.html
```

Use the arrow buttons, keyboard arrows, or a horizontal swipe to move between
slides. Add `?slide=4` to open a specific slide. Add `&export=1` to render only
the 1080 x 1080 artwork for capture.

## Slides

1. Product introduction and open-source positioning
2. Daily reading dashboard
3. Flexible recurring Wird plan
4. Offline Quran reader and Tafsir sources
5. Reading statistics and weekly activity
6. Collaborative Khatamat
7. Privacy, bilingual UI, backups, and appearance modes

The exported 1080 x 1080 JPEG files in `exports/` are designed for social-media carousel
posts and product presentations.
