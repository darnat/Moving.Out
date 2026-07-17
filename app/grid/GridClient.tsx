"use client";

import { useState, useRef, useEffect, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Box, BoxSize, Room, FurnitureItem } from "@/app/generated/prisma/client";
import { placeBox, unplaceBox } from "@/lib/actions/grid";
import { setRetrieved } from "@/lib/actions/boxes";
import { placeFurnitureItem, unplaceFurnitureItem } from "@/lib/actions/furniture";
import { GridCanvas3D } from "./GridCanvas";

type BoxWithRelations = Box & { boxSize: BoxSize; room: Room };

/* ── Footprint: generic placed-item shape for snap/stack logic ── */
type Footprint = {
  id: string;
  gridCol: number;
  gridRow: number;
  stackLevel: number;
  wc: number; dc: number; hc: number;
  label: string;
};

/* ── Dimension helpers ── */
function bwc(bs: BoxSize) { return (bs.widthIn  || bs.widthCells  * 12) / 12; }
function bdc(bs: BoxSize) { return (bs.depthIn  || bs.depthCells  * 12) / 12; }
function bhc(bs: BoxSize) { return (bs.heightIn || bs.heightCells * 12) / 12; }

function boxFootprint(b: BoxWithRelations): Footprint {
  return { id: b.id, gridCol: b.gridCol!, gridRow: b.gridRow!, stackLevel: b.stackLevel!,
           wc: bwc(b.boxSize), dc: bdc(b.boxSize), hc: bhc(b.boxSize), label: b.labelNumber };
}
function furnitureFootprint(f: FurnitureItem): Footprint {
  return { id: f.id, gridCol: f.gridCol!, gridRow: f.gridRow!, stackLevel: f.stackLevel!,
           wc: f.widthIn / 12, dc: f.depthIn / 12, hc: f.heightIn / 12,
           label: f.groupName ?? f.name };
}

function Spinner() {
  return (
    <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" opacity="0.9"/>
      <path d="M12 2a10 10 0 0 0-10 10" strokeLinecap="round" opacity="0.3"/>
    </svg>
  );
}

/* ── Snap: accepts grid-space fractional coordinates directly (no SVG math) ── */
function snapPoint(
  fcol: number, frow: number,
  wCells: number, dCells: number,
  selfW: number, selfD: number,
  placed: Footprint[],
  selfId: string | null,
): { col: number; row: number } | null {
  if (fcol < -0.5 || frow < -0.5 || fcol > wCells + 0.5 || frow > dCells + 0.5) return null;
  const sw = selfW; const sd = selfD;
  const cc: number[] = []; const rc: number[] = [];
  for (let c = 0; c <= wCells; c++) cc.push(c);
  for (let r = 0; r <= dCells; r++) rc.push(r);
  for (const b of placed) {
    if (b.id === selfId) continue;
    cc.push(b.gridCol + b.wc);
    rc.push(b.gridRow + b.dc);
    cc.push(b.gridCol + b.wc - sw);
    rc.push(b.gridRow + b.dc - sd);
  }
  let rawC = cc.reduce((a, c) => Math.abs(a - fcol) <= Math.abs(c - fcol) ? a : c);
  let rawR = rc.reduce((a, r) => Math.abs(a - frow) <= Math.abs(r - frow) ? a : r);

  for (const b of placed) {
    if (b.id === selfId) continue;
    if (!(fcol >= b.gridCol && fcol <= b.gridCol + b.wc &&
          frow >= b.gridRow && frow <= b.gridRow + b.dc)) continue;
    if (rawC + sw/2 >= b.gridCol && rawC + sw/2 <= b.gridCol + b.wc &&
        rawR + sd/2 >= b.gridRow && rawR + sd/2 <= b.gridRow + b.dc) break;
    const icc = cc.filter(c => c + sw/2 >= b.gridCol && c + sw/2 <= b.gridCol + b.wc);
    const irc = rc.filter(r => r + sd/2 >= b.gridRow && r + sd/2 <= b.gridRow + b.dc);
    rawC = icc.length ? icc.reduce((a,c) => Math.abs(a-fcol)<=Math.abs(c-fcol)?a:c)
                      : Math.max(b.gridCol-sw/2, Math.min(b.gridCol+b.wc-sw/2, fcol-sw/2));
    rawR = irc.length ? irc.reduce((a,r) => Math.abs(a-frow)<=Math.abs(r-frow)?a:r)
                      : Math.max(b.gridRow-sd/2, Math.min(b.gridRow+b.dc-sd/2, frow-sd/2));
    break;
  }

  return {
    col: Math.max(0, Math.min(wCells - sw, Math.round(rawC * 10000) / 10000)),
    row: Math.max(0, Math.min(dCells - sd, Math.round(rawR * 10000) / 10000)),
  };
}

function stackSuggestion(
  col: number, row: number,
  selfW: number, selfD: number,
  placed: Footprint[],
  selfId: string | null,
): { level: number; onBox: string } | null {
  const cx = col + selfW / 2; const cy = row + selfD / 2;
  let top = 0; let name: string | null = null;
  for (const b of placed) {
    if (b.id === selfId) continue;
    if (cx >= b.gridCol && cx <= b.gridCol + b.wc &&
        cy >= b.gridRow && cy <= b.gridRow + b.dc) {
      const t = b.stackLevel + b.hc;
      if (t > top) { top = t; name = b.label; }
    }
  }
  return top > 0 ? { level: top, onBox: name! } : null;
}

/* ── Main ── */
export function GridClient({ boxes, furnitureItems, widthCells, depthCells, heightCells }: {
  boxes: BoxWithRelations[];
  furnitureItems: FurnitureItem[];
  widthCells: number; depthCells: number; heightCells: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedBox,       setSelectedBox]       = useState<BoxWithRelations | null>(null);
  const [selectedFurniture, setSelectedFurniture] = useState<FurnitureItem | null>(null);
  const [hoverCell,         setHoverCell]         = useState<{ col: number; row: number } | null>(null);
  const [infoBox,           setInfoBox]           = useState<BoxWithRelations | null>(null);
  const [infoFurniture,     setInfoFurniture]     = useState<FurnitureItem | null>(null);
  const [error,             setError]             = useState("");
  const [mode,              setMode]              = useState<"view" | "place">("view");
  const [suggestion,        setSuggestion]        = useState<{ level: number; onBox: string } | null>(null);
  const [isDragging,        setIsDragging]        = useState(false);

  /* Ref to floor-raycast function exposed by the 3D canvas */
  const raycastRef = useRef<((cx: number, cy: number) => { col: number; row: number } | null) | null>(null);

  const [optimisticBoxes, applyOptimisticBox] = useOptimistic(
    boxes,
    (current: BoxWithRelations[], patch: { id: string; gridCol: number; gridRow: number; stackLevel: number }) =>
      current.map(b => b.id === patch.id ? { ...b, ...patch } : b)
  );

  const [optimisticFurniture, applyOptimisticFurniture] = useOptimistic(
    furnitureItems,
    (current: FurnitureItem[], patch: { id: string; gridCol: number; gridRow: number; stackLevel: number }) =>
      current.map(f => f.id === patch.id ? { ...f, ...patch } : f)
  );

  const placedBoxes       = optimisticBoxes.filter(b => b.gridCol !== null);
  const unplacedBoxes     = optimisticBoxes.filter(b => b.gridCol === null);
  const placedFurniture   = optimisticFurniture.filter(f => f.gridCol !== null);
  const unplacedFurniture = optimisticFurniture.filter(f => f.gridCol === null);

  const isMoving          = mode === "place" && !!selectedBox       && selectedBox.gridCol !== null;
  const isMovingFurniture = mode === "place" && !!selectedFurniture && selectedFurniture.gridCol !== null;
  const effectiveLevel    = suggestion?.level ?? 1;

  const allPlacedFootprints: Footprint[] = [
    ...placedBoxes.map(boxFootprint),
    ...placedFurniture.map(furnitureFootprint),
  ];

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && mode === "place") cancelPlace(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [mode]);

  /* ── Placement commits ── */
  function commitBoxPlacement(boxId: string, col: number, row: number, level: number) {
    startTransition(async () => {
      applyOptimisticBox({ id: boxId, gridCol: col, gridRow: row, stackLevel: level });
      setIsDragging(false);
      setSelectedBox(null); setMode("view"); setHoverCell(null); setSuggestion(null);
      const result = await placeBox(boxId, col, row, level);
      if (result.error) { setError(result.error); return; }
      setError(""); router.refresh();
    });
  }

  function commitFurniturePlacement(itemId: string, col: number, row: number, level: number) {
    startTransition(async () => {
      applyOptimisticFurniture({ id: itemId, gridCol: col, gridRow: row, stackLevel: level });
      setIsDragging(false);
      setSelectedFurniture(null); setMode("view"); setHoverCell(null); setSuggestion(null);
      const result = await placeFurnitureItem(itemId, col, row, level);
      if (result.error) { setError(result.error); return; }
      setError(""); router.refresh();
    });
  }

  /* ── Floor hover (non-drag placement preview) ── */
  function handleFloorHover(col: number, row: number) {
    if (isDragging || mode !== "place") return;
    if (selectedBox) {
      const sw = bwc(selectedBox.boxSize); const sd = bdc(selectedBox.boxSize);
      const snap = snapPoint(col, row, widthCells, depthCells, sw, sd, allPlacedFootprints, selectedBox.id);
      if (!snap) { setHoverCell(null); setSuggestion(null); return; }
      setHoverCell(snap);
      setSuggestion(stackSuggestion(snap.col, snap.row, sw, sd, allPlacedFootprints, selectedBox.id));
    } else if (selectedFurniture) {
      const sw = selectedFurniture.widthIn / 12; const sd = selectedFurniture.depthIn / 12;
      const snap = snapPoint(col, row, widthCells, depthCells, sw, sd, allPlacedFootprints, selectedFurniture.id);
      if (!snap) { setHoverCell(null); setSuggestion(null); return; }
      setHoverCell(snap);
      setSuggestion(stackSuggestion(snap.col, snap.row, sw, sd, allPlacedFootprints, selectedFurniture.id));
    }
  }

  /* ── Floor click (place or deselect) ── */
  function handleFloorClick() {
    if (mode === "view") { setInfoBox(null); setInfoFurniture(null); return; }
    if (isDragging || !hoverCell) return;
    if (selectedBox)       commitBoxPlacement(selectedBox.id, hoverCell.col, hoverCell.row, effectiveLevel);
    else if (selectedFurniture) commitFurniturePlacement(selectedFurniture.id, hoverCell.col, hoverCell.row, effectiveLevel);
  }

  /* ── Box drag (pointer-capture on native event) ── */
  function handleDragBoxStart(e: PointerEvent, box: BoxWithRelations) {
    e.stopPropagation();
    const boxId = box.id;
    const sw = bwc(box.boxSize); const sd = bdc(box.boxSize);
    const placed = allPlacedFootprints;

    let snap = { col: box.gridCol!, row: box.gridRow! };
    let sug: { level: number; onBox: string } | null = null;

    setIsDragging(true); setSelectedBox(box); setInfoBox(null);
    setMode("place"); setHoverCell(snap); setSuggestion(null); setError("");

    function onMove(ev: PointerEvent) {
      const hit = raycastRef.current?.(ev.clientX, ev.clientY);
      if (!hit) return;
      const s = snapPoint(hit.col, hit.row, widthCells, depthCells, sw, sd, placed, boxId);
      if (!s) return;
      snap = s; sug = stackSuggestion(s.col, s.row, sw, sd, placed, boxId);
      setHoverCell({ ...s }); setSuggestion(sug);
    }
    function onUp() {
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup",   onUp,   true);
      commitBoxPlacement(boxId, snap.col, snap.row, sug?.level ?? 1);
    }
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup",   onUp,   true);
  }

  /* ── Furniture drag ── */
  function handleDragFurnitureStart(e: PointerEvent, item: FurnitureItem) {
    e.stopPropagation();
    const itemId = item.id;
    const sw = item.widthIn / 12; const sd = item.depthIn / 12;
    const placed = allPlacedFootprints;

    let snap = { col: item.gridCol!, row: item.gridRow! };
    let sug: { level: number; onBox: string } | null = null;

    setIsDragging(true); setSelectedFurniture(item); setInfoFurniture(null);
    setMode("place"); setHoverCell(snap); setSuggestion(null); setError("");

    function onMove(ev: PointerEvent) {
      const hit = raycastRef.current?.(ev.clientX, ev.clientY);
      if (!hit) return;
      const s = snapPoint(hit.col, hit.row, widthCells, depthCells, sw, sd, placed, itemId);
      if (!s) return;
      snap = s; sug = stackSuggestion(s.col, s.row, sw, sd, placed, itemId);
      setHoverCell({ ...s }); setSuggestion(sug);
    }
    function onUp() {
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup",   onUp,   true);
      commitFurniturePlacement(itemId, snap.col, snap.row, sug?.level ?? 1);
    }
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup",   onUp,   true);
  }

  /* ── Other actions ── */
  function handleMoveBox(box: BoxWithRelations) {
    setSelectedBox(box); setSelectedFurniture(null); setInfoBox(null); setInfoFurniture(null);
    setMode("place"); setHoverCell(null); setSuggestion(null); setError("");
  }
  function handleMoveFurniture(item: FurnitureItem) {
    setSelectedFurniture(item); setSelectedBox(null); setInfoFurniture(null); setInfoBox(null);
    setMode("place"); setHoverCell(null); setSuggestion(null); setError("");
  }
  function cancelPlace() {
    setSelectedBox(null); setSelectedFurniture(null);
    setHoverCell(null); setSuggestion(null);
    setMode("view"); setError(""); setIsDragging(false);
  }
  async function handleUnplaceBox() {
    if (!infoBox || isPending) return;
    startTransition(async () => {
      const result = await unplaceBox(infoBox.id);
      if (result.error) { setError(result.error); return; }
      setInfoBox(null); router.refresh();
    });
  }
  async function handleUnplaceFurniture() {
    if (!infoFurniture || isPending) return;
    startTransition(async () => {
      const result = await unplaceFurnitureItem(infoFurniture.id);
      if (result.error) { setError(result.error); return; }
      setInfoFurniture(null); router.refresh();
    });
  }
  async function handleRetrieve() {
    if (!infoBox || isPending) return;
    startTransition(async () => { await setRetrieved(infoBox.id, true); setInfoBox(null); router.refresh(); });
  }

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* ── 3D canvas ── */}
      <GridCanvas3D
        placedBoxes={placedBoxes}
        placedFurniture={placedFurniture}
        widthCells={widthCells}
        depthCells={depthCells}
        heightCells={heightCells}
        selectedBox={selectedBox}
        selectedFurniture={selectedFurniture}
        hoverCell={hoverCell}
        isDragging={isDragging}
        effectiveLevel={effectiveLevel}
        infoBox={infoBox}
        infoFurniture={infoFurniture}
        mode={mode}
        isMoving={isMoving}
        isMovingFurniture={isMovingFurniture}
        raycastRef={raycastRef}
        onSelectBox={(b) => { setInfoBox(b); setInfoFurniture(null); }}
        onSelectFurniture={(f) => { setInfoFurniture(f); setInfoBox(null); }}
        onFloorHover={handleFloorHover}
        onFloorLeave={() => { if (!isDragging) { setHoverCell(null); setSuggestion(null); } }}
        onFloorClick={handleFloorClick}
        onDragBoxStart={handleDragBoxStart}
        onDragFurnitureStart={handleDragFurnitureStart}
        onUnplaceBox={handleUnplaceBox}
        onUnplaceFurniture={handleUnplaceFurniture}
      />

      {/* ── Sidebar ── */}
      <div className="w-full lg:w-60 space-y-4 shrink-0">
        {mode==="place" && selectedBox && (
          <div className="rounded-2xl px-3 py-2 text-xs leading-relaxed glass-orange"
               style={{background:"var(--color-freight-tint)",
                       border:"1px solid rgba(255,107,43,0.28)",
                       color:"var(--color-freight)"}}>
            {isMoving ? "Moving" : "Placing"}{" "}
            <span className="font-bold label-number">{selectedBox.labelNumber}</span>
            {isDragging ? " — release to drop" : " — hover & click to place"}
          </div>
        )}
        {mode==="place" && selectedFurniture && (
          <div className="rounded-2xl px-3 py-2 text-xs leading-relaxed"
               style={{background:"rgba(91,122,150,0.14)",
                       border:"1px solid rgba(91,140,190,0.3)",
                       color:"#9DC0E0"}}>
            {isMovingFurniture ? "Moving" : "Placing"}{" "}
            <span className="font-bold">{selectedFurniture.name}</span>
            {isDragging ? " — release to drop" : " — hover & click to place"}
          </div>
        )}

        {suggestion && mode==="place" && (
          <div className="rounded-2xl px-3 py-2 text-xs glass"
               style={{background:"var(--color-surface)",border:"1px solid var(--color-kraft)",color:"var(--color-ink)"}}>
            Stacking on <span className="label-number font-semibold">{suggestion.onBox}</span> — level {suggestion.level}
          </div>
        )}

        {error && <p className="text-xs px-1" style={{color:"var(--color-freight)"}}>{error}</p>}

        {/* Unplaced boxes */}
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider mb-2" style={{color:"var(--color-pencil)"}}>
            Unplaced boxes
          </h2>
          <ul data-testid="unplaced-list" className="space-y-1.5">
            {unplacedBoxes.map(b => (
              <li key={b.id}>
                <button
                  data-testid={`select-box-${b.labelNumber}`}
                  onClick={()=>{setSelectedBox(b);setSelectedFurniture(null);setMode("place");setInfoBox(null);setInfoFurniture(null);setHoverCell(null);setSuggestion(null);setError("");}}
                  className="w-full rounded-2xl px-3 py-2.5 text-left text-sm glass"
                  style={{background:selectedBox?.id===b.id?"var(--color-freight-tint)":"var(--color-surface)",
                          border:selectedBox?.id===b.id?"1px solid color-mix(in srgb, var(--color-freight) 40%, transparent)":"1px solid var(--color-kraft)"}}>
                  <span className="label-number font-semibold block text-sm"
                        style={{color:selectedBox?.id===b.id?"var(--color-freight)":"var(--color-ink)"}}>
                    {b.labelNumber}
                  </span>
                  <span className="text-xs" style={{color:"var(--color-pencil)"}}>
                    {b.room.name} · {b.boxSize.name}
                  </span>
                </button>
              </li>
            ))}
            {unplacedBoxes.length===0 && (
              <li className="text-xs py-2" style={{color:"var(--color-pencil)"}}>All boxes placed</li>
            )}
          </ul>
        </div>

        {/* Unplaced furniture */}
        {(unplacedFurniture.length > 0 || placedFurniture.length > 0) && (
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider mb-2" style={{color:"var(--color-pencil)"}}>
              Furniture
            </h2>
            <ul className="space-y-1.5">
              {unplacedFurniture.map(fi => (
                <li key={fi.id}>
                  <button
                    onClick={()=>{setSelectedFurniture(fi);setSelectedBox(null);setMode("place");setInfoFurniture(null);setInfoBox(null);setHoverCell(null);setSuggestion(null);setError("");}}
                    className="w-full rounded-2xl px-3 py-2.5 text-left text-sm glass"
                    style={{background:selectedFurniture?.id===fi.id?"rgba(91,122,150,0.18)":"var(--color-surface)",
                            border:selectedFurniture?.id===fi.id?"1px solid rgba(91,140,190,0.4)":"1px solid var(--color-kraft)"}}>
                    <span className="font-semibold block text-sm"
                          style={{color:selectedFurniture?.id===fi.id?"#9DC0E0":"var(--color-ink)"}}>
                      {fi.name}
                    </span>
                    {fi.groupName && (
                      <span className="text-xs" style={{color:"var(--color-pencil)"}}>
                        {fi.groupName} · {fi.widthIn}"×{fi.depthIn}"
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {unplacedFurniture.length===0 && placedFurniture.length > 0 && (
                <li className="text-xs py-1" style={{color:"var(--color-pencil)"}}>All placed on map</li>
              )}
            </ul>
          </div>
        )}

        {mode==="place" && (
          <button onClick={cancelPlace} disabled={isPending}
                  className="w-full rounded-2xl px-4 py-2.5 text-sm glass"
                  style={{background:"var(--color-surface)",border:"1px solid var(--color-kraft)",color:"var(--color-pencil)"}}>
            {isPending ? <><Spinner/> Saving…</> : "Cancel (Esc)"}
          </button>
        )}

        {/* Box info panel */}
        {infoBox && mode==="view" && (
          <div data-testid="cell-info-panel" className="rounded-2xl p-4 space-y-3 glass"
               style={{background:"var(--color-surface)",border:"1px solid var(--color-kraft)"}}>
            <div>
              <p className="label-number font-bold text-lg" style={{color:"var(--color-ink)"}}>{infoBox.labelNumber}</p>
              <p className="text-xs mt-1" style={{color:"var(--color-pencil)"}}>{infoBox.room.name} · {infoBox.boxSize.name}</p>
              <p className="text-xs mt-0.5" style={{color:"var(--color-pencil)"}}>
                {Math.round(infoBox.gridCol!*12)}" from left · {Math.round(infoBox.gridRow!*12)}" from back · Level {Math.round(infoBox.stackLevel!)}
              </p>
            </div>
            <button onClick={()=>handleMoveBox(infoBox)} disabled={isPending}
                    className="w-full rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2"
                    style={{background:"var(--color-freight)",color:"#fff"}}>
              Move box
            </button>
            <div className="flex gap-2">
              <button onClick={handleRetrieve} data-testid="retrieve-btn" disabled={isPending}
                      className="flex-1 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1.5"
                      style={{background:"var(--color-paper)",border:"1px solid var(--color-kraft)",color:"var(--color-ink)"}}>
                {isPending?<Spinner/>:null} Retrieved
              </button>
              <button onClick={handleUnplaceBox} data-testid="unplace-btn" disabled={isPending}
                      className="rounded-lg px-3 py-2 text-xs flex items-center gap-1.5"
                      style={{border:"1px solid color-mix(in srgb, var(--color-freight) 30%, transparent)",color:"var(--color-freight)"}}>
                {isPending?<Spinner/>:null} Remove
              </button>
            </div>
          </div>
        )}

        {/* Furniture info panel */}
        {infoFurniture && mode==="view" && (
          <div className="rounded-2xl p-4 space-y-3 glass"
               style={{background:"var(--color-surface)",border:"1px solid rgba(91,140,190,0.25)"}}>
            <div>
              <p className="font-bold text-base" style={{color:"var(--color-ink)"}}>{infoFurniture.name}</p>
              {infoFurniture.groupName && (
                <p className="text-xs mt-0.5" style={{color:"var(--color-pencil)"}}>{infoFurniture.groupName}</p>
              )}
              <p className="text-xs mt-1 label-number" style={{color:"var(--color-pencil)"}}>
                {infoFurniture.widthIn}"W × {infoFurniture.depthIn}"D × {infoFurniture.heightIn}"H
              </p>
              <p className="text-xs mt-0.5" style={{color:"var(--color-pencil)"}}>
                {Math.round(infoFurniture.gridCol!*12)}" from left · {Math.round(infoFurniture.gridRow!*12)}" from back
              </p>
            </div>
            <button onClick={()=>handleMoveFurniture(infoFurniture)} disabled={isPending}
                    className="w-full rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2"
                    style={{background:"rgba(91,122,150,0.25)",border:"1px solid rgba(91,140,190,0.35)",color:"#9DC0E0"}}>
              Move
            </button>
            <button onClick={handleUnplaceFurniture} disabled={isPending}
                    className="w-full rounded-lg py-2 text-xs flex items-center justify-center gap-1.5"
                    style={{border:"1px solid rgba(91,140,190,0.25)",color:"var(--color-pencil)"}}>
              {isPending?<Spinner/>:null} Remove from map
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
