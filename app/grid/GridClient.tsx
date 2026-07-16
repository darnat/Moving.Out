"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, BoxSize, Room } from "@/app/generated/prisma/client";
import { placeBox, unplaceBox } from "@/lib/actions/grid";
import { setRetrieved } from "@/lib/actions/boxes";

type BoxWithRelations = Box & { boxSize: BoxSize; room: Room };

/* ─── Isometric projection constants ─── */
const TW = 60;       // tile width (one cell → screen px)
const TH = TW / 2;  // tile height (2:1 isometric)
const LH = 50;       // screen px per stack level
const MAX_VIS_LEVELS = 8;
const PAD = 28;

/* ─── Cardboard colour palette ─── */
const CARD = {
  top:    "#D0AA7A",   // lit from above
  right:  "#B08855",   // col+ face  (right on screen)
  front:  "#8E6B3E",   // row+ face  (left on screen, shadow)
  stroke: "#62461A",
  tape:   "#A07822",
  tapeW:  2.5,
};

const FLOOR_FILL    = "#EDE8DF";
const FLOOR_STROKE  = "#D0C8BA";
const GHOST_FILL    = "rgba(232,86,42,0.10)";
const GHOST_STROKE  = "rgba(232,86,42,0.55)";

/* ─── Helpers ─── */
function ix(col: number, row: number, ox: number) {
  return ox + (col - row) * TW / 2;
}
function iy(col: number, row: number, z: number, oy: number) {
  return oy + (col + row) * TH / 2 - z * LH;
}
function pts(coords: [number, number][]) {
  return coords.map(([x, y]) => `${x},${y}`).join(" ");
}

/* ─── Box faces ─── */
function BoxShape({
  box,
  ox, oy,
  isSelected,
  onSelect,
  inPlaceMode,
}: {
  box: BoxWithRelations;
  ox: number;
  oy: number;
  isSelected: boolean;
  onSelect: () => void;
  inPlaceMode: boolean;
}) {
  const { gridCol: c, gridRow: r, stackLevel: sl, boxSize, labelNumber } = box;
  const col = c!; const row = r!;
  const { widthCells: w, depthCells: d, heightCells: h } = boxSize;
  const z0 = (sl ?? 1) - 1;
  const z1 = z0 + h;

  // Top-face corners
  const TL: [number, number] = [ix(col,   row,   ox), iy(col,   row,   z1, oy)];
  const TR: [number, number] = [ix(col+w, row,   ox), iy(col+w, row,   z1, oy)];
  const BR: [number, number] = [ix(col+w, row+d, ox), iy(col+w, row+d, z1, oy)];
  const BL: [number, number] = [ix(col,   row+d, ox), iy(col,   row+d, z1, oy)];
  // Bottom corners of visible side faces
  const TRb: [number, number] = [ix(col+w, row,   ox), iy(col+w, row,   z0, oy)];
  const BRb: [number, number] = [ix(col+w, row+d, ox), iy(col+w, row+d, z0, oy)];
  const BLb: [number, number] = [ix(col,   row+d, ox), iy(col,   row+d, z0, oy)];

  // Visual highlights for selected state
  const topC   = isSelected ? "#FFD060" : CARD.top;
  const rightC = isSelected ? "#D4A030" : CARD.right;
  const frontC = isSelected ? "#A87820" : CARD.front;
  const strokeC = isSelected ? "#806010" : CARD.stroke;
  const sw = isSelected ? 1.5 : 0.8;

  // Tape seam: midpoint of top edge → midpoint of bottom edge
  const tapeT: [number, number] = [(TL[0]+TR[0])/2, (TL[1]+TR[1])/2];
  const tapeB: [number, number] = [(BL[0]+BR[0])/2, (BL[1]+BR[1])/2];

  // Label position: centre of top face
  const lx = (TL[0]+TR[0]+BR[0]+BL[0]) / 4;
  const ly = (TL[1]+TR[1]+BR[1]+BL[1]) / 4;
  const fontSize = Math.max(7, Math.min(11, TW * 0.18));

  // Corrugation lines on side faces
  const corrLines = h * 2 + 1;
  const corrFront: [number, number][][] = [];
  const corrRight: [number, number][][] = [];
  for (let i = 1; i < corrLines; i++) {
    const z = z0 + (i / corrLines) * h;
    corrFront.push([[ix(col, row+d, ox), iy(col, row+d, z, oy)], [ix(col+w, row+d, ox), iy(col+w, row+d, z, oy)]]);
    corrRight.push([[ix(col+w, row, ox), iy(col+w, row, z, oy)], [ix(col+w, row+d, ox), iy(col+w, row+d, z, oy)]]);
  }

  return (
    <g
      onClick={inPlaceMode ? undefined : onSelect}
      style={{ cursor: inPlaceMode ? "default" : "pointer" }}
    >
      {/* Front face (row+d side — left on screen, darkest) */}
      <polygon points={pts([BL, BR, BRb, BLb])} fill={frontC} stroke={strokeC} strokeWidth={sw} />
      {corrFront.map(([a, b], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
              stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
      ))}

      {/* Right face (col+w side — right on screen, medium) */}
      <polygon points={pts([TR, BR, BRb, TRb])} fill={rightC} stroke={strokeC} strokeWidth={sw} />
      {corrRight.map(([a, b], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
              stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
      ))}

      {/* Top face */}
      <polygon points={pts([TL, TR, BR, BL])} fill={topC} stroke={strokeC} strokeWidth={sw} />

      {/* Tape seam */}
      <line x1={tapeT[0]} y1={tapeT[1]} x2={tapeB[0]} y2={tapeB[1]}
            stroke={CARD.tape} strokeWidth={CARD.tapeW} strokeLinecap="round" />

      {/* Label sticker */}
      <ellipse cx={lx} cy={ly}
               rx={TW * w * 0.28} ry={TH * 0.55}
               fill="rgba(255,255,240,0.55)" />
      <text
        x={lx} y={ly}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize}
        fontFamily="'Courier New', monospace"
        fontWeight="700"
        fill="#3A2008"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {labelNumber}
      </text>
    </g>
  );
}

/* ─── Ghost / preview box ─── */
function GhostBox({
  col, row, w, d, h,
  stackLevel,
  ox, oy,
}: {
  col: number; row: number;
  w: number; d: number; h: number;
  stackLevel: number;
  ox: number; oy: number;
}) {
  const z0 = stackLevel - 1;
  const z1 = z0 + h;

  const TL: [number, number] = [ix(col,   row,   ox), iy(col,   row,   z1, oy)];
  const TR: [number, number] = [ix(col+w, row,   ox), iy(col+w, row,   z1, oy)];
  const BR: [number, number] = [ix(col+w, row+d, ox), iy(col+w, row+d, z1, oy)];
  const BL: [number, number] = [ix(col,   row+d, ox), iy(col,   row+d, z1, oy)];
  const TRb: [number, number] = [ix(col+w, row,   ox), iy(col+w, row,   z0, oy)];
  const BRb: [number, number] = [ix(col+w, row+d, ox), iy(col+w, row+d, z0, oy)];
  const BLb: [number, number] = [ix(col,   row+d, ox), iy(col,   row+d, z0, oy)];

  const gProps = { fill: GHOST_FILL, stroke: GHOST_STROKE, strokeWidth: 1.5, strokeDasharray: "5,3" };
  return (
    <g style={{ pointerEvents: "none" }}>
      <polygon points={pts([BL, BR, BRb, BLb])} {...gProps} />
      <polygon points={pts([TR, BR, BRb, TRb])} {...gProps} />
      <polygon points={pts([TL, TR, BR, BL])} {...gProps} />
    </g>
  );
}

/* ─── Main component ─── */
export function GridClient({
  boxes,
  widthCells,
  depthCells,
}: {
  boxes: BoxWithRelations[];
  widthCells: number;
  depthCells: number;
}) {
  const router = useRouter();
  const [selectedBox, setSelectedBox]   = useState<BoxWithRelations | null>(null);
  const [stackLevel, setStackLevel]     = useState("1");
  const [placeTarget, setPlaceTarget]   = useState<{ col: number; row: number } | null>(null);
  const [hoverCell, setHoverCell]       = useState<{ col: number; row: number } | null>(null);
  const [infoBox, setInfoBox]           = useState<BoxWithRelations | null>(null);
  const [error, setError]               = useState("");
  const [mode, setMode]                 = useState<"view" | "place">("view");

  const placedBoxes  = boxes.filter((b) => b.gridCol !== null);
  const unplacedBoxes = boxes.filter((b) => b.gridCol === null);

  // Painter's sort: back-left first (low col+row), then lower stack first
  const sortedBoxes = [...placedBoxes].sort((a, b) => {
    const da = a.gridCol! + a.gridRow!;
    const db = b.gridCol! + b.gridRow!;
    return da !== db ? da - db : (a.stackLevel ?? 1) - (b.stackLevel ?? 1);
  });

  /* ── Scene geometry ── */
  const OX = depthCells * TW / 2 + PAD;
  const OY = MAX_VIS_LEVELS * LH + PAD;
  const svgW = (widthCells + depthCells) * TW / 2 + PAD * 2;
  const svgH = (widthCells + depthCells) * TH / 2 + MAX_VIS_LEVELS * LH + PAD * 2;

  /* ── Ghost target ── */
  const ghostTarget = mode === "place" && selectedBox
    ? (hoverCell ?? placeTarget)
    : null;

  /* ── Handlers ── */
  function handleFloorClick(col: number, row: number) {
    setError("");
    if (mode === "place" && selectedBox) {
      setPlaceTarget({ col, row });
    }
  }

  async function handleConfirmPlacement() {
    if (!selectedBox || !placeTarget) return;
    const level = Number(stackLevel);
    if (!level || level < 1) { setError("Stack level must be ≥ 1"); return; }
    const result = await placeBox(selectedBox.id, placeTarget.col, placeTarget.row, level);
    if (result.error) { setError(result.error); return; }
    setSelectedBox(null);
    setPlaceTarget(null);
    setMode("view");
    router.refresh();
  }

  async function handleUnplace() {
    if (!infoBox) return;
    await unplaceBox(infoBox.id);
    setInfoBox(null);
    router.refresh();
  }

  async function handleRetrieve() {
    if (!infoBox) return;
    await setRetrieved(infoBox.id, true);
    setInfoBox(null);
    router.refresh();
  }

  function cancelPlace() {
    setSelectedBox(null);
    setPlaceTarget(null);
    setHoverCell(null);
    setMode("view");
    setError("");
  }

  /* ── Back walls ── */
  function renderWalls() {
    const wallH = MAX_VIS_LEVELS;

    // Right wall — vertical plane at row=0, spans col 0..widthCells (appears on the right)
    const rTL: [number, number] = [ix(0,          0, OX), iy(0,          0, wallH, OY)];
    const rTR: [number, number] = [ix(widthCells, 0, OX), iy(widthCells, 0, wallH, OY)];
    const rBR: [number, number] = [ix(widthCells, 0, OX), iy(widthCells, 0, 0,     OY)];
    const rBL: [number, number] = [ix(0,          0, OX), iy(0,          0, 0,     OY)];

    // Left wall — vertical plane at col=0, spans row 0..depthCells (appears on the left)
    const lTR: [number, number] = [ix(0, 0,          OX), iy(0, 0,          wallH, OY)];
    const lTL: [number, number] = [ix(0, depthCells, OX), iy(0, depthCells, wallH, OY)];
    const lBL: [number, number] = [ix(0, depthCells, OX), iy(0, depthCells, 0,     OY)];
    const lBR: [number, number] = [ix(0, 0,          OX), iy(0, 0,          0,     OY)];

    const panelLines = Array.from({ length: wallH - 1 }, (_, i) => {
      const z = i + 1;
      return (
        <g key={z}>
          <line x1={ix(0, 0, OX)} y1={iy(0, 0, z, OY)}
                x2={ix(widthCells, 0, OX)} y2={iy(widthCells, 0, z, OY)}
                stroke="rgba(0,0,0,0.055)" strokeWidth={0.6} />
          <line x1={ix(0, 0, OX)} y1={iy(0, 0, z, OY)}
                x2={ix(0, depthCells, OX)} y2={iy(0, depthCells, z, OY)}
                stroke="rgba(0,0,0,0.055)" strokeWidth={0.6} />
        </g>
      );
    });

    return (
      <>
        {/* Left wall — col=0 side, slightly darker (shadow) */}
        <polygon points={pts([lTR, lTL, lBL, lBR])} fill="#C8C3BB" stroke="#A8A098" strokeWidth={0.8} />
        {/* Right wall — row=0 side, lighter (lit) */}
        <polygon points={pts([rTL, rTR, rBR, rBL])} fill="#DDDAD0" stroke="#A8A098" strokeWidth={0.8} />
        {panelLines}
        {/* Corner where the two walls meet */}
        <line x1={ix(0, 0, OX)} y1={iy(0, 0, 0, OY)}
              x2={ix(0, 0, OX)} y2={iy(0, 0, wallH, OY)}
              stroke="#948D84" strokeWidth={1.5} />
      </>
    );
  }

  /* ── Floor tiles ── */
  const floorTiles: React.ReactNode[] = [];
  for (let diag = 0; diag < widthCells + depthCells - 1; diag++) {
    for (let col = Math.max(0, diag - depthCells + 1); col <= Math.min(diag, widthCells - 1); col++) {
      const row = diag - col;
      const cx = ix(col, row, OX);
      const cy = iy(col, row, 0, OY);
      const isTarget = mode === "place" && hoverCell?.col === col && hoverCell?.row === row;
      const isPlaced = mode === "place" && placeTarget?.col === col && placeTarget?.row === row;
      floorTiles.push(
        <polygon
          key={`f-${col}-${row}`}
          points={pts([
            [cx,          cy          ],
            [cx + TW / 2, cy + TH / 2],
            [cx,          cy + TH     ],
            [cx - TW / 2, cy + TH / 2],
          ])}
          fill={isPlaced ? "rgba(232,86,42,0.22)" : isTarget ? "rgba(232,86,42,0.11)" : FLOOR_FILL}
          stroke={FLOOR_STROKE}
          strokeWidth={0.5}
          onClick={() => handleFloorClick(col, row)}
          onMouseEnter={mode === "place" ? () => setHoverCell({ col, row }) : undefined}
          style={{ cursor: mode === "place" ? "crosshair" : "default" }}
        />
      );
    }
  }

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* ── Isometric canvas ── */}
      <div
        className="flex-1 min-w-0 overflow-auto rounded-2xl"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
        onMouseLeave={() => setHoverCell(null)}
      >
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ display: "block" }}
        >
          {/* Back walls — rendered first (furthest from viewer) */}
          {renderWalls()}

          {/* Floor */}
          {floorTiles}

          {/* Boxes — back-to-front */}
          {sortedBoxes.map((box) => (
            <BoxShape
              key={box.id}
              box={box}
              ox={OX}
              oy={OY}
              isSelected={infoBox?.id === box.id}
              onSelect={() => { if (mode === "view") setInfoBox(box); }}
              inPlaceMode={mode === "place"}
            />
          ))}

          {/* Ghost placement preview */}
          {ghostTarget && selectedBox && (
            <GhostBox
              col={ghostTarget.col}
              row={ghostTarget.row}
              w={selectedBox.boxSize.widthCells}
              d={selectedBox.boxSize.depthCells}
              h={selectedBox.boxSize.heightCells}
              stackLevel={Number(stackLevel) || 1}
              ox={OX}
              oy={OY}
            />
          )}
        </svg>
      </div>

      {/* ── Sidebar ── */}
      <div className="w-full lg:w-60 space-y-4 shrink-0">
        {/* Mode hint */}
        {mode === "place" && selectedBox && (
          <div
            className="rounded-xl px-3 py-2 text-xs leading-relaxed"
            style={{
              background: "var(--color-freight-tint)",
              border: "1px solid color-mix(in srgb, var(--color-freight) 30%, transparent)",
              color: "var(--color-freight)",
            }}
          >
            Hover over the floor then click to position{" "}
            <span className="font-bold label-number">{selectedBox.labelNumber}</span>
          </div>
        )}

        {/* Unplaced boxes */}
        <div>
          <h2
            className="text-xs font-medium uppercase tracking-wider mb-2"
            style={{ color: "var(--color-pencil)" }}
          >
            Unplaced boxes
          </h2>
          <ul data-testid="unplaced-list" className="space-y-1.5">
            {unplacedBoxes.map((b) => (
              <li key={b.id}>
                <button
                  data-testid={`select-box-${b.labelNumber}`}
                  onClick={() => {
                    setSelectedBox(b);
                    setMode("place");
                    setPlaceTarget(null);
                    setInfoBox(null);
                    setError("");
                  }}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
                  style={{
                    background: selectedBox?.id === b.id
                      ? "var(--color-freight-tint)"
                      : "var(--color-surface)",
                    border: selectedBox?.id === b.id
                      ? "1px solid color-mix(in srgb, var(--color-freight) 40%, transparent)"
                      : "1px solid var(--color-kraft)",
                  }}
                >
                  <span
                    className="label-number font-semibold block text-sm"
                    style={{
                      color: selectedBox?.id === b.id
                        ? "var(--color-freight)"
                        : "var(--color-ink)",
                    }}
                  >
                    {b.labelNumber}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-pencil)" }}>
                    {b.room.name} · {b.boxSize.name}
                  </span>
                </button>
              </li>
            ))}
            {unplacedBoxes.length === 0 && (
              <li className="text-xs py-2" style={{ color: "var(--color-pencil)" }}>
                All boxes placed
              </li>
            )}
          </ul>
        </div>

        {/* Placement panel */}
        {mode === "place" && selectedBox && placeTarget && (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "var(--color-freight-tint)",
              border: "1px solid color-mix(in srgb, var(--color-freight) 30%, transparent)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
              Place{" "}
              <span className="label-number font-bold" style={{ color: "var(--color-freight)" }}>
                {selectedBox.labelNumber}
              </span>{" "}
              at ({placeTarget.col}, {placeTarget.row})
            </p>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--color-pencil)" }}>
                Stack level
              </label>
              <input
                type="number"
                min={1}
                value={stackLevel}
                onChange={(e) => setStackLevel(e.target.value)}
                data-testid="stack-level-input"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-kraft)",
                  color: "var(--color-ink)",
                }}
              />
            </div>
            {error && (
              <p data-testid="placement-error" className="text-xs" style={{ color: "var(--color-freight)" }}>
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleConfirmPlacement}
                data-testid="confirm-placement-btn"
                className="flex-1 rounded-lg py-2 text-sm font-medium text-white"
                style={{ background: "var(--color-freight)" }}
              >
                Place
              </button>
              <button
                onClick={cancelPlace}
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid var(--color-kraft)", color: "var(--color-pencil)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Box info panel (view mode) */}
        {infoBox && mode === "view" && (
          <div
            data-testid="cell-info-panel"
            className="rounded-xl p-4 space-y-2"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
          >
            <div>
              <p
                className="label-number font-bold text-lg leading-none"
                style={{ color: "var(--color-ink)" }}
              >
                {infoBox.labelNumber}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-pencil)" }}>
                {infoBox.room.name} · {infoBox.boxSize.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-pencil)" }}>
                Col {infoBox.gridCol} · Row {infoBox.gridRow} · Level {infoBox.stackLevel}
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleRetrieve}
                data-testid="retrieve-btn"
                className="flex-1 rounded-lg py-2 text-xs font-medium"
                style={{
                  background: "var(--color-paper)",
                  border: "1px solid var(--color-kraft)",
                  color: "var(--color-ink)",
                }}
              >
                Retrieved
              </button>
              <button
                onClick={handleUnplace}
                data-testid="unplace-btn"
                className="rounded-lg px-3 py-2 text-xs"
                style={{ border: "1px solid var(--color-kraft)", color: "var(--color-pencil)" }}
              >
                Unplace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
