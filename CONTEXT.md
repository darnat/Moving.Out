# Moving Out — Domain Context

A solo-use web app for tracking the contents of moving boxes and their physical location inside a single storage unit. The core loop: label a box, log its items, place it on the storage grid, find anything later by searching.

---

## Glossary

**Box** — a physical container with a pre-made sticker label attached. Has an origin room, a size, an item list, optional photos, a grid position, and a retrieved status. The unit of tracking throughout the app.

**Label** — the sequential number printed on a pre-made sticker (e.g. from Amazon) affixed to a physical box. The label number is the box's primary identifier in the app. Can be entered by scanning the sticker or typing it manually.

**Item** — a single thing inside a box. Stored as a text entry (e.g. "coffee machine"). Items are the searchable unit — search resolves to items, which belong to boxes, which have grid positions.

**Room** — the origin room a box was packed from (e.g. "Kitchen," "Master Bedroom"). Used as a filter. Configurable list with sensible defaults; not tied to the destination.

**Box size** — a named configuration defined in the app settings, expressed in grid cells (W × D × H). Examples: Small = 1×1×1, Medium = 1×2×2, Large = 2×2×2. Box sizes determine how many cells a box occupies on the storage grid.

**Storage unit** — the single physical storage space being used. Has configurable dimensions (width × depth in cells). Represented as a 2D grid.

**Grid** — the top-down floor plan of the storage unit divided into cells. Each cell has a column and row coordinate (e.g. C3). A box occupies one or more cells depending on its size.

**Stack level** — the vertical position of a box within a grid column. Level 1 = on the floor. Level 2 = resting on top of a level-1 box. A box occupies one or more stack levels depending on its size (H dimension in cells).

**Cell** — the base unit of the grid, representing a physical floor area. One cell = the footprint of a Small box. Box sizes are defined relative to this unit.

**Retrieved** — a box that has been physically removed from the storage unit. Retrieved boxes are excluded from the active grid view but remain searchable in history.

**Settings** — the configuration area where the user defines: storage unit dimensions, box sizes, and the room list. Configured once before packing begins.

---

## Core flows

### Register a box
Scan label (barcode/QR via camera) or type the label number manually → assign an origin room → add items one by one → optionally attach photos → save. Grid placement is optional at this stage and can be done later.

### Place a box on the grid
Open the grid view → select an unplaced box → tap the target cell → confirm stack level. The app validates that the cells are unoccupied (accounting for the box's size). A box cannot overlap an already-placed box.

### Find an item
Enter a search term (matches against item text) and/or select a room filter → results list shows matching items with their box label, origin room, and grid position (cell + stack level) → tap a result to see the full box detail.

### Retrieve a box
From the grid or box detail view → mark box as "Retrieved" → it disappears from the active grid. The box and its items remain in search history with a "Retrieved" badge.

---

## What this app is NOT

- **Not a packing planner.** The app does not suggest what to put in which box. The user decides; the app records.
- **Not multi-user.** Single owner, authenticated via Google OAuth (email whitelist). No sharing, invites, or permissions model.
- **Not offline-first.** No service worker or local sync. Assumes cell signal at the storage unit.
- **Not multi-unit.** One storage unit per account. No concept of transferring boxes between units.
- **Not an unpacking manager.** Retrieval is tracked at the box level only, not item by item.

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Hosting | Vercel |
| Database | Vercel Postgres (Neon) via Prisma ORM |
| File storage | Vercel Blob (box photos) |
| Auth | NextAuth v5 — Google OAuth, single-email whitelist |
| Label scanning | Browser camera API (barcode/QR via a scanning library, e.g. `zxing-js`) |

---

## Default configuration (shipped in settings)

**Rooms:** Kitchen, Living Room, Bedroom, Master Bedroom, Bathroom, Office, Garage, Other

**Box sizes (in grid cells W × D × H):**
- Small — 1 × 1 × 1
- Medium — 1 × 1 × 2
- Large — 2 × 2 × 2
- Extra Large — 2 × 2 × 3

All defaults are editable in Settings.
