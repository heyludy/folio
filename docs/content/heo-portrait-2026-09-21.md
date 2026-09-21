# Heo example portrait

- Original: `src/sample-portrait.jpg`, retained unchanged.
- Cutout: `src/sample-portrait-cutout.png`, 880 × 1320, RGBA.
- Used by all three static examples and Folio's template picker previews.

The user approved a non-generative cutout after two image-generation attempts changed the face. Neither generated portrait is used. The final asset was made from the original photo by masking the connected white backdrop, removing the small shaded opening between the arm and jacket, and decontaminating the two-pixel silhouette edge. Interior pixels, including the face and white shirt, remain unchanged and opaque. No generative prompt was used for the final asset.

Classic now defaults to a 250 px portrait on desktop (previously 176 px), 200 px on tablet, and a bounded 128 px on mobile. Manual size settings still take precedence. The color hero has a transparent photo surface, with the desktop portrait meeting the bottom of the green band.

Validation: built the three standalone HTML examples, passed 203 existing tests, compared the cutout against dark green and white, and checked desktop and narrow mobile layouts. The public professor site is not automatically republished by an examples update.
