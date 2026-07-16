"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, BoxSize, Room } from "@/app/generated/prisma/client";
import { placeBox, unplaceBox } from "@/lib/actions/grid";
import { setRetrieved } from "@/lib/actions/boxes";

type BoxWithRelations = Box & { boxSize: BoxSize; room: Room };

/* ─── Isometric projection constants ─── */
const TW = 60;
const TH = TW / 2;
const LH = 50;
const PAD = 28;

/* ─── Cardboard colours ─── */
const CARD = {
  top:    "#D0AA7A",
  right:  "#B08855",
  front:  "#8E6B3E",
  stroke: "#62461A",
  tape:   "#A07822",
  tapeW:  2.5,
};
const FLOOR_FILL   = "#EDE8DF";
const FLOOR_STROKE = "#D0C8BA";
const GHOST_FILL   = "rgba(232,86,42,0.10)";
const GHOST_STROKE = "rgba(232,86,42,0.55)";

/* ─── Helpers ─── */
function ix(col: number, row: number, ox: number) { return ox + (col - row) * TW / 2; }
function iy(col: number, row: number, z: number, oy: number) { return oy + (col + row) * TH / 2 - z * LH; }
function pts(coords: [number, number][]) { return coords.map(([x, y]) => `${x},${y}`).join(" "); }

// Physical size in cells using inch data (falls back to widthCells×12 for old rows)
function bwc(bs: BoxSize) { return (bs.widthIn  || bs.widthCells  * 12) / 12; }
function bdc(bs: BoxSize) { return (bs.depthIn  || bs.depthCells  * 12) / 12; }
function bhc(bs: BoxSize) { return (bs.heightIn || bs.heightCells * 12) / 12; }

function GridSpinner() {
  return (
    <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" opacity="0.9" />
      <path d="M12 2a10 10 0 0 0-10 10" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

/* ─── Box faces ─── */
function BoxShape({
  box, ox, oy, isSelected, onSelect, inPlaceMode,
}: {
  box: BoxWithRelations; ox: number; oy: number;
  isSelected: boolean; onSelect: () => void; inPlaceMode: boolean;
}) {
  const { gridCol: c, gridRow: r, stackLevel: sl, boxSize, labelNumber } = box;
  const col = c!; const row = r!;
  const w = bwc(boxSize); const d = bdc(boxSize); const h = bhc(boxSize);
  const z0 = (sl ?? 1) - 1; const z1 = z0 + h;

  const TL:  [number, number] = [ix(col,   row,   ox), iy(col,   row,   z1, oy)];
  const TR:  [number, number] = [ix(col+w, row,   ox), iy(col+w, row,   z1, oy)];
  const BR:  [number, number] = [ix(col+w, row+d, ox), iy(col+w, row+d, z1, oy)];
  const BL:  [number, number] = [ix(col,   row+d, ox), iy(col,   row+d, z1, oy)];
  const TRb: [number, number] = [ix(col+w, row,   ox), iy(col+w, row,   z0, oy)];
  const BRb: [number, number] = [ix(col+w, row+d, ox), iy(col+w, row+d, z0, oy)];
  const BLb: [number, number] = [ix(col,   row+d, ox), iy(col,   row+d, z0, oy)];

  const topC    = isSelected ? "#FFD060" : CARD.top;
  const rightC  = isSelected ? "#D4A030" : CARD.right;
  const frontC  = isSelected ? "#A87820" : CARD.front;
  const strokeC = isSelected ? "#806010" : CARD.stroke;
  const sw      = isSelected ? 1.5 : 0.8;

  const tapeT: [number, number] = [(TL[0]+TR[0])/2, (TL[1]+TR[1])/2];
  const tapeB: [number, number] = [(BL[0]+BR[0])/2, (BL[1]+BR[1])/2];
  const lx = (TL[0]+TR[0]+BR[0]+BL[0]) / 4;
  const ly = (TL[1]+TR[1]+BR[1]+BL[1]) / 4;
  const fontSize = Math.max(7, Math.min(11, TW * 0.18));
  const corrLines = boxSize.heightCells * 2 + 1;
  const corrFront: [number, number][][] = [];
  const corrRight: [number, number][][] = [];
  for (let i = 1; i < corrLines; i++) {
    const z = z0 + (i / corrLines) * h;
    corrFront.push([[ix(col, row+d, ox), iy(col, row+d, z, oy)], [ix(col+w, row+d, ox), iy(col+w, row+d, z, oy)]]);
    corrRight.push([[ix(col+w, row, ox), iy(col+w, row, z, oy)], [ix(col+w, row+d, ox), iy(col+w, row+d, z, oy)]]);
  }

  return (
    <g onClick={inPlaceMode ? undefined : onSelect} style={{ cursor: inPlaceMode ? "default" : "pointer" }}>
      <polygon points={pts([BL, BR, BRb, BLb])} fill={frontC} stroke={strokeC} strokeWidth={sw} />
      {corrFront.map(([a, b], i) => <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />)}
      <polygon points={pts([TR, BR, BRb, TRb])} fill={rightC} stroke={strokeC} strokeWidth={sw} />
      {corrRight.map(([a, b], i) => <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />)}
      <polygon points={pts([TL, TR, BR, BL])} fill={topC} stroke={strokeC} strokeWidth={sw} />
      <line x1={tapeT[0]} y1={tapeT[1]} x2={tapeB[0]} y2={tapeB[1]} stroke={CARD.tape} strokeWidth={CARD.tapeW} strokeLinecap="round" />
      <ellipse cx={lx} cy={ly} rx={TW * w * 0.28} ry={TH * 0.55} fill="rgba(255,255,240,0.55)" />
      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize={fontSize} fontFamily="'Courier New', monospace" fontWeight="700"
            fill="#3A2008" style={{ pointerEvents: "none", userSelect: "none" }}>
        {labelNumber}
      </text>
    </g>
  );
}

/* ─── Ghost / preview box ─── */
function GhostBox({
  col, row, w, d, h, stackLevel, ox, oy,
}: { col: number; row: number; w: number; d: number; h: number; stackLevel: number; ox: number; oy: number }) {
  const z0 = stackLevel - 1; const z1 = z0 + h;
  const TL:  [number, number] = [ix(col,   row,   ox), iy(col,   row,   z1, oy)];
  const TR:  [number, number] = [ix(col+w, row,   ox), iy(col+w, row,   z1, oy)];
  const BR:  [number, number] = [ix(col+w, row+d, ox), iy(col+w, row+d, z1, oy)];
  const BL:  [number, number] = [ix(col,   row+d, ox), iy(col,   row+d, z1, oy)];
  const TRb: [number, number] = [ix(col+w, row,   ox), iy(col+w, row,   z0, oy)];
  const BRb: [number, number] = [ix(col+w, row+d, ox), iy(col+w, row+d, z0, oy)];
  const BLb: [number, number] = [ix(col,   row+d, ox), iy(col,   row+d, z0, oy)];
  const g = { fill: GHOST_FILL, stroke: GHOST_STROKE, strokeWidth: 1.5, strokeDasharray: "5,3" };
  return (
    <g style={{ pointerEvents: "none" }}>
      <polygon points={pts([BL, BR, BRb, BLb])} {...g} />
      <polygon points={pts([TR, BR, BRb, TRb])} {...g} />
      <polygon points={pts([TL, TR, BR, BL])}   {...g} />
    </g>
  );
}

/* ─── Main component ─── */
export function GridClient({
  boxes, widthCells, depthCells, heightCells,
}: {
  boxes: BoxWithRelations[];
  widthCells: number; depthCells: number; heightCells: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedBox, setSelectedBox]   = useState<BoxWithRelations | null>(null);
  const [stackLevel, setStackLevel]     = useState("1");
  const [placeTarget, setPlaceTarget]   = useState<{ col: number; row: number } | null>(null);
  const [hoverCell, setHoverCell]       = useState<{ col: number; row: number } | null>(null);
  const [infoBox, setInfoBox]           = useState<BoxWithRelations | null>(null);
  const [error, setError]               = useState("");
  const [mode, setMode]                 = useState<"view" | "place">("view");
  const [stackSuggestion, setStackSuggestion] = useState<{ level: number; onBox: string } | null>(null);

  const placedBoxes   = boxes.filter((b) => b.gridCol !== null);
  const unplacedBoxes = boxes.filter((b) => b.gridCol === null);

  const sortedBoxes = [...placedBoxes].sort((a, b) => {
    const da = a.gridCol! + a.gridRow!;
    const db = b.gridCol! + b.gridRow!;
    return da !== db ? da - db : (a.stackLevel ?? 1) - (b.stackLevel ?? 1);
  });

  /* ── Scene geometry ── */
  const OX = depthCells * TW / 2 + PAD;
  const OY = heightCells * LH + PAD;
  const svgW = (widthCells + depthCells) * TW / 2 + PAD * 2;
  const svgH = (widthCells + depthCells) * TH / 2 + heightCells * LH + PAD * 2;

  /* ── Snap computation ── */
  function computeSnap(svgX: number, svgY: number) {
    if (!selectedBox) return null;
    // Inverse iso transform
    const fcol = ((svgX - OX) / (TW / 2) + (svgY - OY) / (TH / 2)) / 2;
    const frow = ((svgY - OY) / (TH / 2) - (svgX - OX) / (TW / 2)) / 2;
    if (fcol < -0.5 || frow < -0.5 || fcol > widthCells + 0.5 || frow > depthCells + 0.5) return null;

    const sw = bwc(selectedBox.boxSize);
    const sd = bdc(selectedBox.boxSize);

    // Snap candidates: integer cell edges + box right/front edges
    const colCands: number[] = [];
    const rowCands: number[] = [];
    for (let c = 0; c <= widthCells; c++) colCands.push(c);
    for (let r = 0; r <= depthCells; r++) rowCands.push(r);
    for (const b of placedBoxes) {
      colCands.push(b.gridCol! + bwc(b.boxSize));
      rowCands.push(b.gridRow! + bdc(b.boxSize));
    }

    // Nearest in each axis, clamped so new box stays inside storage
    const rawCol = colCands.reduce((a, c) => Math.abs(a - fcol) <= Math.abs(c - fcol) ? a : c);
    const rawRow = rowCands.reduce((a, r) => Math.abs(a - frow) <= Math.abs(r - frow) ? a : r);
    const col = Math.max(0, Math.min(widthCells - sw, Math.round(rawCol * 10000) / 10000));
    const row = Math.max(0, Math.min(depthCells - sd, Math.round(rawRow * 10000) / 10000));
    return { col, row };
  }

  /* ── Stacking suggestion ── */
  function findStackSuggestion(col: number, row: number) {
    if (!selectedBox) return null;
    const sw = bwc(selectedBox.boxSize);
    const sd = bdc(selectedBox.boxSize);
    const EPS = 0.001;
    let topLevel = 0;
    let onBox: string | null = null;
    for (const b of placedBoxes) {
      const bwv = bwc(b.boxSize); const bdv = bdc(b.boxSize);
      const colOk = col < b.gridCol! + bwv - EPS && col + sw > b.gridCol! + EPS;
      const rowOk = row < b.gridRow! + bdv - EPS && row + sd > b.gridRow! + EPS;
      if (colOk && rowOk) {
        const top = b.stackLevel! + b.boxSize.heightCells;
        if (top > topLevel) { topLevel = top; onBox = b.labelNumber; }
      }
    }
    return topLevel > 0 ? { level: topLevel, onBox: onBox! } : null;
  }

  /* ── SVG mouse handlers ── */
  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (mode !== "place" || !selectedBox) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = svgW / rect.width;
    const scaleY = svgH / rect.height;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;

    const snap = computeSnap(sx, sy);
    if (!snap) { setHoverCell(null); setStackSuggestion(null); return; }

    setHoverCell(snap);
    const suggestion = findStackSuggestion(snap.col, snap.row);
    setStackSuggestion(suggestion);
    // Only auto-update level while position isn't locked; reset to floor when over empty space
    if (!placeTarget) {
      setStackLevel(suggestion ? String(suggestion.level) : "1");
    }
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (mode !== "place" || !selectedBox || !hoverCell) return;
    e.stopPropagation();
    setPlaceTarget(hoverCell);
  }

  /* ── Other handlers ── */
  async function handleConfirmPlacement() {
    if (!selectedBox || !placeTarget || isPending) return;
    const level = Number(stackLevel);
    if (!level || level < 1) { setError("Stack level must be ≥ 1"); return; }
    startTransition(async () => {
      const result = await placeBox(selectedBox.id, placeTarget.col, placeTarget.row, level);
      if (result.error) { setError(result.error); return; }
      setSelectedBox(null); setPlaceTarget(null); setMode("view");
      router.refresh();
    });
  }

  async function handleUnplace() {
    if (!infoBox || isPending) return;
    startTransition(async () => { await unplaceBox(infoBox.id); setInfoBox(null); router.refresh(); });
  }

  async function handleRetrieve() {
    if (!infoBox || isPending) return;
    startTransition(async () => { await setRetrieved(infoBox.id, true); setInfoBox(null); router.refresh(); });
  }

  function handleMoveBox(box: BoxWithRelations) {
    setSelectedBox(box);
    setInfoBox(null);
    setMode("place");
    setPlaceTarget(null);
    setHoverCell(null);
    setStackSuggestion(null);
    setStackLevel("1");
    setError("");
  }

  function cancelPlace() {
    setSelectedBox(null); setPlaceTarget(null); setHoverCell(null);
    setStackSuggestion(null); setMode("view"); setError("");
  }

  // True when the box being "placed" is actually a repositioning of an already-placed box
  const isMoving = mode === "place" && !!selectedBox && selectedBox.gridCol !== null;

  /* ── Back walls ── */
  function renderWalls() {
    const wallH = heightCells;
    const rTL: [number,number] = [ix(0, 0, OX), iy(0, 0, wallH, OY)];
    const rTR: [number,number] = [ix(widthCells, 0, OX), iy(widthCells, 0, wallH, OY)];
    const rBR: [number,number] = [ix(widthCells, 0, OX), iy(widthCells, 0, 0, OY)];
    const rBL: [number,number] = [ix(0, 0, OX), iy(0, 0, 0, OY)];
    const lTR: [number,number] = [ix(0, 0, OX), iy(0, 0, wallH, OY)];
    const lTL: [number,number] = [ix(0, depthCells, OX), iy(0, depthCells, wallH, OY)];
    const lBL: [number,number] = [ix(0, depthCells, OX), iy(0, depthCells, 0, OY)];
    const lBR: [number,number] = [ix(0, 0, OX), iy(0, 0, 0, OY)];
    const panelLines = Array.from({ length: wallH - 1 }, (_, i) => {
      const z = i + 1;
      return (
        <g key={z}>
          <line x1={ix(0,0,OX)} y1={iy(0,0,z,OY)} x2={ix(widthCells,0,OX)} y2={iy(widthCells,0,z,OY)} stroke="rgba(0,0,0,0.055)" strokeWidth={0.6} />
          <line x1={ix(0,0,OX)} y1={iy(0,0,z,OY)} x2={ix(0,depthCells,OX)} y2={iy(0,depthCells,z,OY)} stroke="rgba(0,0,0,0.055)" strokeWidth={0.6} />
        </g>
      );
    });
    return (
      <>
        <polygon points={pts([lTR, lTL, lBL, lBR])} fill="#C8C3BB" stroke="#A8A098" strokeWidth={0.8} />
        <polygon points={pts([rTL, rTR, rBR, rBL])} fill="#DDDAD0" stroke="#A8A098" strokeWidth={0.8} />
        {panelLines}
        <line x1={ix(0,0,OX)} y1={iy(0,0,0,OY)} x2={ix(0,0,OX)} y2={iy(0,0,wallH,OY)} stroke="#948D84" strokeWidth={1.5} />
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
      floorTiles.push(
        <polygon
          key={`f-${col}-${row}`}
          points={pts([[cx, cy], [cx+TW/2, cy+TH/2], [cx, cy+TH], [cx-TW/2, cy+TH/2]])}
          fill={FLOOR_FILL}
          stroke={FLOOR_STROKE}
          strokeWidth={0.5}
        />
      );
    }
  }

  /* ── Ghost ── */
  const ghostTarget = mode === "place" && selectedBox ? (hoverCell ?? placeTarget) : null;
  const effectiveLevel = stackSuggestion ? stackSuggestion.level : (Number(stackLevel) || 1);

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* ── Isometric canvas ── */}
      <div
        className="flex-1 min-w-0 overflow-auto rounded-2xl"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
      >
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          width={svgW}
          height={svgH}
          style={{ display: "block", width: "100%", height: "auto", minWidth: 280,
                   cursor: mode === "place" ? "crosshair" : "default" }}
          onMouseMove={mode === "place" ? handleSvgMouseMove : undefined}
          onMouseLeave={() => { setHoverCell(null); setStackSuggestion(null); }}
          onClick={mode === "place" ? handleSvgClick : undefined}
        >
          {renderWalls()}
          {floorTiles}
          {sortedBoxes
            .filter((b) => !(isMoving && b.id === selectedBox?.id))
            .map((box) => (
              <BoxShape
                key={box.id}
                box={box}
                ox={OX} oy={OY}
                isSelected={infoBox?.id === box.id}
                onSelect={() => { if (mode === "view") setInfoBox(box); }}
                inPlaceMode={mode === "place"}
              />
            ))}
          {/* Moving box shown dimmed at its original position */}
          {isMoving && selectedBox && selectedBox.gridCol !== null && (
            <g opacity={0.25} style={{ pointerEvents: "none" }}>
              <BoxShape
                box={selectedBox}
                ox={OX} oy={OY}
                isSelected={false}
                onSelect={() => {}}
                inPlaceMode={true}
              />
            </g>
          )}
          {ghostTarget && selectedBox && (
            <GhostBox
              col={ghostTarget.col}
              row={ghostTarget.row}
              w={bwc(selectedBox.boxSize)}
              d={bdc(selectedBox.boxSize)}
              h={bhc(selectedBox.boxSize)}
              stackLevel={effectiveLevel}
              ox={OX} oy={OY}
            />
          )}
        </svg>
      </div>

      {/* ── Sidebar ── */}
      <div className="w-full lg:w-64 space-y-4 shrink-0">
        {/* Place / move hint */}
        {mode === "place" && selectedBox && (
          <div className="rounded-xl px-3 py-2 text-xs leading-relaxed"
               style={{ background: "var(--color-freight-tint)",
                        border: "1px solid color-mix(in srgb, var(--color-freight) 30%, transparent)",
                        color: "var(--color-freight)" }}>
            {isMoving ? "Moving" : "Placing"}{" "}
            <span className="font-bold label-number">{selectedBox.labelNumber}</span> —
            hover to snap, click to lock position.
          </div>
        )}

        {/* Stacking suggestion */}
        {stackSuggestion && mode === "place" && (
          <div className="rounded-xl px-3 py-2 text-xs leading-relaxed"
               style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}>
            📦 Stack on <span className="label-number font-semibold">{stackSuggestion.onBox}</span> — level {stackSuggestion.level} suggested
          </div>
        )}

        {/* Unplaced list */}
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--color-pencil)" }}>
            Unplaced boxes
          </h2>
          <ul data-testid="unplaced-list" className="space-y-1.5">
            {unplacedBoxes.map((b) => (
              <li key={b.id}>
                <button
                  data-testid={`select-box-${b.labelNumber}`}
                  onClick={() => { setSelectedBox(b); setMode("place"); setPlaceTarget(null); setInfoBox(null); setError(""); setStackSuggestion(null); }}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
                  style={{
                    background: selectedBox?.id === b.id ? "var(--color-freight-tint)" : "var(--color-surface)",
                    border: selectedBox?.id === b.id
                      ? "1px solid color-mix(in srgb, var(--color-freight) 40%, transparent)"
                      : "1px solid var(--color-kraft)",
                  }}
                >
                  <span className="label-number font-semibold block text-sm"
                        style={{ color: selectedBox?.id === b.id ? "var(--color-freight)" : "var(--color-ink)" }}>
                    {b.labelNumber}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-pencil)" }}>
                    {b.room.name} · {b.boxSize.name}
                  </span>
                </button>
              </li>
            ))}
            {unplacedBoxes.length === 0 && (
              <li className="text-xs py-2" style={{ color: "var(--color-pencil)" }}>All boxes placed</li>
            )}
          </ul>
        </div>

        {/* Placement confirmation */}
        {mode === "place" && selectedBox && placeTarget && (
          <div className="rounded-xl p-4 space-y-3"
               style={{ background: "var(--color-freight-tint)",
                        border: "1px solid color-mix(in srgb, var(--color-freight) 30%, transparent)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
              Place <span className="label-number font-bold" style={{ color: "var(--color-freight)" }}>{selectedBox.labelNumber}</span>{" "}
              at ({Math.round(placeTarget.col * 12)}", {Math.round(placeTarget.row * 12)}")
            </p>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--color-pencil)" }}>Stack level</label>
              <input
                type="number"
                min={1}
                value={stackLevel}
                onChange={(e) => { setStackLevel(e.target.value); setStackSuggestion(null); }}
                data-testid="stack-level-input"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
              />
            </div>
            {error && <p data-testid="placement-error" className="text-xs" style={{ color: "var(--color-freight)" }}>{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleConfirmPlacement}
                data-testid="confirm-placement-btn"
                disabled={isPending}
                className="flex-1 rounded-lg py-2 text-sm font-medium text-white flex items-center justify-center gap-2"
                style={{ background: "var(--color-freight)" }}
              >
                {isPending ? <><GridSpinner /> Placing…</> : "Place"}
              </button>
              <button
                onClick={cancelPlace}
                disabled={isPending}
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid var(--color-kraft)", color: "var(--color-pencil)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Box info */}
        {infoBox && mode === "view" && (
          <div data-testid="cell-info-panel" className="rounded-xl p-4 space-y-3"
               style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}>
            <div>
              <p className="label-number font-bold text-lg leading-none" style={{ color: "var(--color-ink)" }}>{infoBox.labelNumber}</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-pencil)" }}>{infoBox.room.name} · {infoBox.boxSize.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-pencil)" }}>
                {Math.round(infoBox.gridCol! * 12)}" from left · {Math.round(infoBox.gridRow! * 12)}" from back · Level {infoBox.stackLevel}
              </p>
            </div>

            {/* Move button */}
            <button
              onClick={() => handleMoveBox(infoBox)}
              disabled={isPending}
              className="w-full rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: "var(--color-freight)", color: "#fff" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" />
                <polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" />
                <line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
              </svg>
              Move box
            </button>

            {/* Secondary actions */}
            <div className="flex gap-2">
              <button
                onClick={handleRetrieve}
                data-testid="retrieve-btn"
                disabled={isPending}
                className="flex-1 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1.5"
                style={{ background: "var(--color-paper)", border: "1px solid var(--color-kraft)", color: "var(--color-ink)" }}
              >
                {isPending ? <GridSpinner /> : null} Retrieved
              </button>
              <button
                onClick={handleUnplace}
                data-testid="unplace-btn"
                disabled={isPending}
                className="rounded-lg px-3 py-2 text-xs flex items-center gap-1.5"
                style={{ border: "1px solid color-mix(in srgb, var(--color-freight) 30%, transparent)", color: "var(--color-freight)" }}
              >
                {isPending ? <GridSpinner /> : null} Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
