# [Go to the Site!](https://brackets.jodymickey.com)

This project provides historical data (1956-present) for the NCAA Men's Basketball Tournament
in a unique circular/radial format, where each round is represented as a ring with 64 teams on
the outer ring, 32 on the next, etc.

The team logos used to display this information are property of their respective institutions and
used in this context as informational and for personal use only.

[![Netlify Status](https://api.netlify.com/api/v1/badges/c8c5ddfb-69b9-4f0c-a33e-221d333e9e5c/deploy-status)](https://app.netlify.com/sites/circlebracket/deploys)

## How the Bracket Rendering Works

The circular bracket visualization (`src/js/bracket.js`) uses HTML5 Canvas and polar coordinates to draw the tournament as concentric rings. Here's the rendering flow:

### Rendering Pipeline (via `render()` method)

1. **Reset & Setup** - Clear canvas, calculate dimensions based on canvas size
2. **Preload Images** - Load all team logos into cache for synchronous drawing
3. **Draw Title** - Tournament year and title text at top
4. **Draw Region Names** - Position labels in four quadrants (TL, TR, BL, BR)
5. **Draw Seeds** - Seed numbers (1-16) around the outer ring if enabled
6. **Draw Background** - Light gray circle behind the bracket
7. **Draw Team Logos** - Fill each slot with team logo on colored background
   - Slots are wedge-shaped paths between two radii at specific angles
   - Teams positioned using `seedSlotMap` which maps seeds to specific slots
   - Logos are clipped to wedge shapes and clickable for game details
8. **Draw Grid** - White radial and circular lines with shadows
9. **Draw Champion** - Center circle with winning team logo

### Key Concepts

- **Rounds as Rings**: Each round is a concentric circle with radius calculated via `getRadiiForRound()`
- **Slots**: Each team occupies a slot (wedge) defined by two angles and two radii
- **Polar Math**: Positions calculated using angles (degrees) and radii, converted with `TO_RADIANS`
- **Regions**: Four quadrants (TL/TR/BL/BR) organize teams by region through Final Four
- **Seed Mapping**: `seedSlotMap` arrays define exact slot positions for each seed in each round
- **Performance**: Images preloaded and cached, operations batched by round for efficiency
