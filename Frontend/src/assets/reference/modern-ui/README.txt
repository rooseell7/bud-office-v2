BUD OFFICE — Modern UI Reference Pack (for Cursor Agent)

PRIMARY reference:
- ref_primary_dashboard.png
  Use as source of truth for: colors, glass surfaces, shadows, spacing, header+sidebar proportions, button styles.

SECONDARY references:
- ref_secondary_suite.png
  Use for alternative card/grid compositions and overall premium feel.
- ref_variant_dashboard.png
  Use for typography hierarchy + green accent usage.
- ref_alt_screens.png
  Use for extra component ideas (cards, charts, tables) — do not copy text, only style.

Rules for the agent:
1) Do NOT try to match random micro-grain pixels. Match: layout, tokens, radii, shadow levels, glass borders, and contrast.
2) Keep accent color GREEN; minimize BLUE (blue allowed only inside charts as default).
3) Do not change business logic; only styling/layout classes and theme overrides.
4) Implement as design tokens + MUI theme + stable CSS overrides (no generated .css-xxxx selectors).

Suggested repo location after download:
frontend/src/assets/reference/modern-ui/

CURRENT (for 90–95% comparison):
Add screenshots at 1440×900 or 1536×864, zoom 100%:
- current_home.png   (/home)
- current_acts.png   (/estimate/acts)
- current_orders.png (/supply/orders or any list/table page)
Compare with ref_primary_dashboard.png: premium gray (not black), glass surfaces, tables lighter gray, green accent only where needed.
