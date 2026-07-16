"use client";

import { useState, useRef, useEffect, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Box, BoxSize, Room } from "@/app/generated/prisma/client";
import { placeBox, unplaceBox } from "@/lib/actions/grid";
import { setRetrieved } from "@/lib/actions/boxes";

type BoxWithRelations = Box & { boxSize: BoxSize; room: Room };

/* ─── Constants ─── */
const TW = 60; const TH = TW / 2; const LH = 50; const PAD = 28;

/* ─── Colours ─── */
const CARD = { top:"#D0AA7A", right:"#B08855", front:"#8E6B3E", stroke:"#62461A", tape:"#A07822", tapeW:2.5 };
const FLOOR_FILL = "#EDE8DF"; const FLOOR_STROKE = "#D0C8BA";
const GHOST_FILL = "rgba(232,86,42,0.10)"; const GHOST_STROKE = "rgba(232,86,42,0.55)";

/* ─── Helpers ─── */
function ix(col: number, row: number, ox: number) { return ox + (col - row) * TW / 2; }
function iy(col: number, row: number, z: number, oy: number) { return oy + (col + row) * TH / 2 - z * LH; }
function pts(c: [number,number][]) { return c.map(([x,y]) => `${x},${y}`).join(" "); }
function bwc(bs: BoxSize) { return (bs.widthIn  || bs.widthCells  * 12) / 12; }
function bdc(bs: BoxSize) { return (bs.depthIn  || bs.depthCells  * 12) / 12; }
function bhc(bs: BoxSize) { return (bs.heightIn || bs.heightCells * 12) / 12; }

function Spinner() {
  return (
    <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" opacity="0.9"/>
      <path d="M12 2a10 10 0 0 0-10 10" strokeLinecap="round" opacity="0.3"/>
    </svg>
  );
}

/* ─── Snap + suggestion (pure, no React state) ─── */
function snapPoint(
  svgX: number, svgY: number,
  ox: number, oy: number,
  wCells: number, dCells: number,
  selfBoxSize: BoxSize,
  placed: BoxWithRelations[],
  selfId: string | null,
): { col: number; row: number } | null {
  const fcol = ((svgX - ox) / (TW/2) + (svgY - oy) / (TH/2)) / 2;
  const frow = ((svgY - oy) / (TH/2) - (svgX - ox) / (TW/2)) / 2;
  if (fcol < -0.5 || frow < -0.5 || fcol > wCells + 0.5 || frow > dCells + 0.5) return null;
  const sw = bwc(selfBoxSize); const sd = bdc(selfBoxSize);
  const cc: number[] = []; const rc: number[] = [];
  for (let c = 0; c <= wCells; c++) cc.push(c);
  for (let r = 0; r <= dCells; r++) rc.push(r);
  for (const b of placed) {
    if (b.id === selfId) continue;
    const bw_v = bwc(b.boxSize); const bd_v = bdc(b.boxSize);
    cc.push(b.gridCol! + bw_v);       // adjacent right of support box
    rc.push(b.gridRow! + bd_v);       // adjacent bottom of support box
    cc.push(b.gridCol! + bw_v - sw);  // self right edge aligns with support right (inside)
    rc.push(b.gridRow! + bd_v - sd);  // self bottom edge aligns with support bottom (inside)
  }
  let rawC = cc.reduce((a, c) => Math.abs(a - fcol) <= Math.abs(c - fcol) ? a : c);
  let rawR = rc.reduce((a, r) => Math.abs(a - frow) <= Math.abs(r - frow) ? a : r);

  // Safety: if cursor is inside a support box but the snap snapped outside it (to its
  // right/bottom edge), re-snap using only candidates that keep the dragged-box centre
  // inside that box — otherwise the stacking suggestion never fires.
  for (const b of placed) {
    if (b.id === selfId) continue;
    const bw_v = bwc(b.boxSize); const bd_v = bdc(b.boxSize);
    if (!(fcol >= b.gridCol! && fcol <= b.gridCol! + bw_v &&
          frow >= b.gridRow! && frow <= b.gridRow! + bd_v)) continue;
    if (rawC + sw/2 >= b.gridCol! && rawC + sw/2 <= b.gridCol! + bw_v &&
        rawR + sd/2 >= b.gridRow! && rawR + sd/2 <= b.gridRow! + bd_v) break;
    const icc = cc.filter(c => c + sw/2 >= b.gridCol! && c + sw/2 <= b.gridCol! + bw_v);
    const irc = rc.filter(r => r + sd/2 >= b.gridRow! && r + sd/2 <= b.gridRow! + bd_v);
    rawC = icc.length ? icc.reduce((a,c) => Math.abs(a-fcol)<=Math.abs(c-fcol)?a:c)
                      : Math.max(b.gridCol!-sw/2, Math.min(b.gridCol!+bw_v-sw/2, fcol-sw/2));
    rawR = irc.length ? irc.reduce((a,r) => Math.abs(a-frow)<=Math.abs(r-frow)?a:r)
                      : Math.max(b.gridRow!-sd/2, Math.min(b.gridRow!+bd_v-sd/2, frow-sd/2));
    break;
  }

  return {
    col: Math.max(0, Math.min(wCells - sw, Math.round(rawC * 10000) / 10000)),
    row: Math.max(0, Math.min(dCells - sd, Math.round(rawR * 10000) / 10000)),
  };
}

function stackSuggestion(
  col: number, row: number,
  selfBoxSize: BoxSize,
  placed: BoxWithRelations[],
  selfId: string | null,
): { level: number; onBox: string } | null {
  const sw = bwc(selfBoxSize); const sd = bdc(selfBoxSize);
  // Center-of-mass rule: center of dragged box must be strictly inside the
  // support box's footprint — prevents stacking on a sliver of overlap.
  const cx = col + sw / 2; const cy = row + sd / 2;
  let top = 0; let name: string | null = null;
  for (const b of placed) {
    if (b.id === selfId) continue;
    const bw_v = bwc(b.boxSize); const bd_v = bdc(b.boxSize);
    if (cx >= b.gridCol! && cx <= b.gridCol! + bw_v &&
        cy >= b.gridRow! && cy <= b.gridRow! + bd_v) {
      const t = b.stackLevel! + bhc(b.boxSize);
      if (t > top) { top = t; name = b.labelNumber; }
    }
  }
  return top > 0 ? { level: top, onBox: name! } : null;
}

/* ─── Box faces ─── */
function BoxShape({ box, ox, oy, isSelected, onSelect, inPlaceMode, opacity = 1 }: {
  box: BoxWithRelations; ox: number; oy: number;
  isSelected: boolean; onSelect: () => void; inPlaceMode: boolean; opacity?: number;
}) {
  const { gridCol: c, gridRow: r, stackLevel: sl, boxSize, labelNumber } = box;
  const col = c ?? 0; const row = r ?? 0;
  const w = bwc(boxSize); const d = bdc(boxSize); const h = bhc(boxSize);
  const z0 = (sl ?? 1) - 1; const z1 = z0 + h;

  const TL: [number,number] = [ix(col,   row,   ox), iy(col,   row,   z1, oy)];
  const TR: [number,number] = [ix(col+w, row,   ox), iy(col+w, row,   z1, oy)];
  const BR: [number,number] = [ix(col+w, row+d, ox), iy(col+w, row+d, z1, oy)];
  const BL: [number,number] = [ix(col,   row+d, ox), iy(col,   row+d, z1, oy)];
  const TRb: [number,number] = [ix(col+w, row,   ox), iy(col+w, row,   z0, oy)];
  const BRb: [number,number] = [ix(col+w, row+d, ox), iy(col+w, row+d, z0, oy)];
  const BLb: [number,number] = [ix(col,   row+d, ox), iy(col,   row+d, z0, oy)];

  const topC   = isSelected ? "#FFD060" : CARD.top;
  const rightC = isSelected ? "#D4A030" : CARD.right;
  const frontC = isSelected ? "#A87820" : CARD.front;
  const strokeC = isSelected ? "#806010" : CARD.stroke;
  const sw2 = isSelected ? 1.5 : 0.8;
  const tapeT: [number,number] = [(TL[0]+TR[0])/2, (TL[1]+TR[1])/2];
  const tapeB: [number,number] = [(BL[0]+BR[0])/2, (BL[1]+BR[1])/2];
  const lx = (TL[0]+TR[0]+BR[0]+BL[0])/4;
  const ly = (TL[1]+TR[1]+BR[1]+BL[1])/4;
  // Ellipse must stay inside the parallelogram top face.
  // For the isometric rhombus: (rx/a)²+(ry/b)²≤1 where a=(w+d)·TW/4, b=(w+d)·TH/4.
  const eRx = Math.min(w * TW * 0.28, (w + d) * TW * 0.15);
  const eRy = Math.min(d * TH * 0.48, (w + d) * TH * 0.15);
  const fs  = Math.max(7, Math.min(11, eRx * 0.65));
  const cL = boxSize.heightCells * 2 + 1;
  const cF: [[number,number],[number,number]][] = [];
  const cR: [[number,number],[number,number]][] = [];
  for (let i = 1; i < cL; i++) {
    const z = z0 + (i/cL) * h;
    cF.push([[ix(col,  row+d, ox), iy(col,  row+d, z, oy)], [ix(col+w, row+d, ox), iy(col+w, row+d, z, oy)]]);
    cR.push([[ix(col+w, row,  ox), iy(col+w, row,  z, oy)], [ix(col+w, row+d, ox), iy(col+w, row+d, z, oy)]]);
  }

  return (
    <g opacity={opacity}
       onClick={inPlaceMode ? undefined : (e) => { e.stopPropagation(); onSelect(); }}
       style={{ cursor: inPlaceMode ? "default" : "pointer" }}>
      <polygon points={pts([BL,BR,BRb,BLb])} fill={frontC} stroke={strokeC} strokeWidth={sw2}/>
      {cF.map(([a,b],i)=><line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5}/>)}
      <polygon points={pts([TR,BR,BRb,TRb])} fill={rightC} stroke={strokeC} strokeWidth={sw2}/>
      {cR.map(([a,b],i)=><line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5}/>)}
      <polygon points={pts([TL,TR,BR,BL])} fill={topC} stroke={strokeC} strokeWidth={sw2}/>
      <line x1={tapeT[0]} y1={tapeT[1]} x2={tapeB[0]} y2={tapeB[1]} stroke={CARD.tape} strokeWidth={CARD.tapeW} strokeLinecap="round"/>
      <ellipse cx={lx} cy={ly} rx={eRx} ry={eRy} fill="rgba(255,255,240,0.55)"/>
      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize={fs} fontFamily="'Courier New',monospace" fontWeight="700"
            fill="#3A2008" style={{ pointerEvents:"none", userSelect:"none" }}>
        {labelNumber}
      </text>
    </g>
  );
}

/* ─── Ghost outline ─── */
function GhostBox({ col,row,w,d,h,stackLevel,ox,oy }: {
  col:number;row:number;w:number;d:number;h:number;stackLevel:number;ox:number;oy:number;
}) {
  const z0=stackLevel-1; const z1=z0+h;
  const TL:  [number,number]=[ix(col,  row,  ox),iy(col,  row,  z1,oy)];
  const TR:  [number,number]=[ix(col+w,row,  ox),iy(col+w,row,  z1,oy)];
  const BR:  [number,number]=[ix(col+w,row+d,ox),iy(col+w,row+d,z1,oy)];
  const BL:  [number,number]=[ix(col,  row+d,ox),iy(col,  row+d,z1,oy)];
  const TRb: [number,number]=[ix(col+w,row,  ox),iy(col+w,row,  z0,oy)];
  const BRb: [number,number]=[ix(col+w,row+d,ox),iy(col+w,row+d,z0,oy)];
  const BLb: [number,number]=[ix(col,  row+d,ox),iy(col,  row+d,z0,oy)];
  const g={fill:GHOST_FILL,stroke:GHOST_STROKE,strokeWidth:1.5,strokeDasharray:"5,3"};
  return (
    <g style={{pointerEvents:"none"}}>
      <polygon points={pts([BL,BR,BRb,BLb])} {...g}/>
      <polygon points={pts([TR,BR,BRb,TRb])} {...g}/>
      <polygon points={pts([TL,TR,BR,BL])}   {...g}/>
    </g>
  );
}

/* ─── Main ─── */
export function GridClient({ boxes, widthCells, depthCells, heightCells }: {
  boxes: BoxWithRelations[]; widthCells: number; depthCells: number; heightCells: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const svgRef = useRef<SVGSVGElement>(null);

  const [selectedBox, setSelectedBox] = useState<BoxWithRelations | null>(null);
  const [hoverCell,   setHoverCell]   = useState<{ col: number; row: number } | null>(null);
  const [infoBox,     setInfoBox]     = useState<BoxWithRelations | null>(null);
  const [error,       setError]       = useState("");
  const [mode,        setMode]        = useState<"view" | "place">("view");
  const [suggestion,  setSuggestion]  = useState<{ level: number; onBox: string } | null>(null);
  const [isDragging,  setIsDragging]  = useState(false);

  const [optimisticBoxes, applyOptimistic] = useOptimistic(
    boxes,
    (current: BoxWithRelations[], patch: { id: string; gridCol: number; gridRow: number; stackLevel: number }) =>
      current.map(b => b.id === patch.id ? { ...b, ...patch } : b)
  );

  const placedBoxes   = optimisticBoxes.filter(b => b.gridCol !== null);
  const unplacedBoxes = optimisticBoxes.filter(b => b.gridCol === null);
  const sortedBoxes   = [...placedBoxes].sort((a, b) => {
    const da = a.gridCol! + a.gridRow!; const db = b.gridCol! + b.gridRow!;
    return da !== db ? da - db : (a.stackLevel ?? 1) - (b.stackLevel ?? 1);
  });
  const isMoving = mode === "place" && !!selectedBox && selectedBox.gridCol !== null;
  const effectiveLevel = suggestion?.level ?? 1;

  const OX   = depthCells  * TW/2 + PAD;
  const OY   = heightCells * LH   + PAD;
  const svgW = (widthCells + depthCells) * TW/2 + PAD*2;
  const svgH = (widthCells + depthCells) * TH/2 + heightCells * LH + PAD*2;

  /* Escape cancels place mode */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && mode === "place") cancelPlace(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [mode]);

  /* ── Commit placement: optimistic-first, snap back on failure ── */
  function commitPlacement(boxId: string, col: number, row: number, level: number) {
    startTransition(async () => {
      // All of these fire before the first await → one synchronous render
      applyOptimistic({ id: boxId, gridCol: col, gridRow: row, stackLevel: level });
      setIsDragging(false);
      setSelectedBox(null); setMode("view"); setHoverCell(null); setSuggestion(null);

      const result = await placeBox(boxId, col, row, level);
      if (result.error) {
        // useOptimistic auto-reverts when the transition ends → box snaps back
        setError(result.error);
        return;
      }
      setError("");
      router.refresh();
    });
  }

  /* ── Hover (non-drag place mode) ── */
  function handleSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (isDragging || mode !== "place" || !selectedBox) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * svgW / rect.width;
    const sy = (e.clientY - rect.top)  * svgH / rect.height;
    const snap = snapPoint(sx, sy, OX, OY, widthCells, depthCells, selectedBox.boxSize, placedBoxes, selectedBox.id);
    if (!snap) { setHoverCell(null); setSuggestion(null); return; }
    setHoverCell(snap);
    const sug = stackSuggestion(snap.col, snap.row, selectedBox.boxSize, placedBoxes, selectedBox.id);
    setSuggestion(sug);
  }

  /* ── Click to place (non-drag) ── */
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (mode === "view") { setInfoBox(null); return; }
    if (isDragging || !selectedBox || !hoverCell) return;
    commitPlacement(selectedBox.id, hoverCell.col, hoverCell.row, suggestion?.level ?? 1);
  }

  /* ── Drag: document-level listeners avoid stale-closure issues ── */
  function handleDragPointerDown(e: React.PointerEvent, box: BoxWithRelations) {
    e.stopPropagation();
    e.preventDefault();

    // Snapshot values that won't change during the drag
    const boxId  = box.id;
    const boxSize = box.boxSize;
    const placed  = placedBoxes; // won't change while user is dragging

    let snap = { col: box.gridCol!, row: box.gridRow! };
    let sug: { level: number; onBox: string } | null = null;

    // Kick off React state immediately for rendering
    setIsDragging(true);
    setSelectedBox(box);
    setInfoBox(null);
    setMode("place");
    setHoverCell(snap);
    setSuggestion(null);
    setError("");

    function onMove(ev: PointerEvent) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const sx = (ev.clientX - rect.left) * svgW / rect.width;
      const sy = (ev.clientY - rect.top)  * svgH / rect.height;
      const s = snapPoint(sx, sy, OX, OY, widthCells, depthCells, boxSize, placed, boxId);
      if (!s) return;
      snap = s;
      sug  = stackSuggestion(s.col, s.row, boxSize, placed, boxId);
      // Batch these in one React flush to reduce jank
      setHoverCell({ ...s });
      setSuggestion(sug);
    }

    function onUp() {
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup",   onUp,   true);
      commitPlacement(boxId, snap.col, snap.row, sug?.level ?? 1);
    }

    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup",   onUp,   true);
  }

  /* ── Other actions ── */
  function handleMoveBox(box: BoxWithRelations) {
    setSelectedBox(box); setInfoBox(null); setMode("place");
    setHoverCell(null); setSuggestion(null); setError("");
  }
  function cancelPlace() {
    setSelectedBox(null); setHoverCell(null); setSuggestion(null);
    setMode("view"); setError(""); setIsDragging(false);
  }
  async function handleUnplace() {
    if (!infoBox || isPending) return;
    startTransition(async () => {
      const result = await unplaceBox(infoBox.id);
      if (result.error) { setError(result.error); return; }
      setInfoBox(null); router.refresh();
    });
  }
  async function handleRetrieve() {
    if (!infoBox || isPending) return;
    startTransition(async () => { await setRetrieved(infoBox.id, true); setInfoBox(null); router.refresh(); });
  }

  /* ── Back walls ── */
  function renderWalls() {
    const H = heightCells;
    const rTL: [number,number]=[ix(0,0,OX),iy(0,0,H,OY)]; const rTR: [number,number]=[ix(widthCells,0,OX),iy(widthCells,0,H,OY)];
    const rBR: [number,number]=[ix(widthCells,0,OX),iy(widthCells,0,0,OY)]; const rBL: [number,number]=[ix(0,0,OX),iy(0,0,0,OY)];
    const lTR: [number,number]=[ix(0,0,OX),iy(0,0,H,OY)]; const lTL: [number,number]=[ix(0,depthCells,OX),iy(0,depthCells,H,OY)];
    const lBL: [number,number]=[ix(0,depthCells,OX),iy(0,depthCells,0,OY)]; const lBR: [number,number]=[ix(0,0,OX),iy(0,0,0,OY)];
    const lines = Array.from({length:H-1},(_,i)=>{const z=i+1;return(<g key={z}>
      <line x1={ix(0,0,OX)} y1={iy(0,0,z,OY)} x2={ix(widthCells,0,OX)} y2={iy(widthCells,0,z,OY)} stroke="rgba(0,0,0,0.055)" strokeWidth={0.6}/>
      <line x1={ix(0,0,OX)} y1={iy(0,0,z,OY)} x2={ix(0,depthCells,OX)} y2={iy(0,depthCells,z,OY)} stroke="rgba(0,0,0,0.055)" strokeWidth={0.6}/>
    </g>);});
    return (<>
      <polygon points={pts([lTR,lTL,lBL,lBR])} fill="#C8C3BB" stroke="#A8A098" strokeWidth={0.8}/>
      <polygon points={pts([rTL,rTR,rBR,rBL])} fill="#DDDAD0" stroke="#A8A098" strokeWidth={0.8}/>
      {lines}
      <line x1={ix(0,0,OX)} y1={iy(0,0,0,OY)} x2={ix(0,0,OX)} y2={iy(0,0,H,OY)} stroke="#948D84" strokeWidth={1.5}/>
    </>);
  }

  /* ── SVG overlay buttons above selected box ── */
  function renderBoxOverlay() {
    if (!infoBox || mode !== "view") return null;
    const col=infoBox.gridCol!; const row=infoBox.gridRow!;
    const w=bwc(infoBox.boxSize); const d=bdc(infoBox.boxSize); const h=bhc(infoBox.boxSize);
    const z1=(infoBox.stackLevel??1)-1+h;
    const topY=Math.min(iy(col,row,z1,OY),iy(col+w,row,z1,OY),iy(col+w,row+d,z1,OY),iy(col,row+d,z1,OY));
    const cx=(ix(col,row,OX)+ix(col+w,row,OX)+ix(col+w,row+d,OX)+ix(col,row+d,OX))/4;
    const BW=30; const BH=28; const gap=5;
    const bx=cx-(BW+gap/2);
    const by=topY-BH-12;
    return (
      <g style={{filter:"drop-shadow(0 2px 5px rgba(0,0,0,0.2))"}}>
        {/* Drag handle */}
        <g onPointerDown={e=>handleDragPointerDown(e as unknown as React.PointerEvent, infoBox)}
           style={{cursor:"grab",touchAction:"none"}}>
          <rect x={bx} y={by} width={BW} height={BH} rx={7} fill="white" stroke="#D0C8BA" strokeWidth={1}/>
          <g transform={`translate(${bx+BW/2-7},${by+BH/2-7})`} style={{pointerEvents:"none"}}>
            <path d="M7 0v14M0 7h14M7 0L5 2.5M7 0L9 2.5M7 14L5 11.5M7 14L9 11.5M0 7L2.5 5M0 7L2.5 9M14 7L11.5 5M14 7L11.5 9"
                  fill="none" stroke="#62461A" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"/>
          </g>
        </g>
        {/* Remove (×) */}
        <g onClick={e=>{e.stopPropagation();handleUnplace();}} style={{cursor:"pointer"}}>
          <rect x={bx+BW+gap} y={by} width={BW} height={BH} rx={7} fill="white" stroke="#FFD0C0" strokeWidth={1}/>
          <text x={bx+BW+gap+BW/2} y={by+BH/2+1} textAnchor="middle" dominantBaseline="middle"
                fontSize={17} fill="#E8562A" style={{pointerEvents:"none",userSelect:"none"}}>×</text>
        </g>
      </g>
    );
  }

  /* ── Floor tiles ── */
  const floorTiles: React.ReactNode[] = [];
  for (let diag=0; diag<widthCells+depthCells-1; diag++) {
    for (let col=Math.max(0,diag-depthCells+1); col<=Math.min(diag,widthCells-1); col++) {
      const row=diag-col; const cx=ix(col,row,OX); const cy=iy(col,row,0,OY);
      floorTiles.push(
        <polygon key={`f-${col}-${row}`}
          points={pts([[cx,cy],[cx+TW/2,cy+TH/2],[cx,cy+TH],[cx-TW/2,cy+TH/2]])}
          fill={FLOOR_FILL} stroke={FLOOR_STROKE} strokeWidth={0.5}/>
      );
    }
  }

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* ── Canvas ── */}
      <div className="flex-1 min-w-0 overflow-auto rounded-2xl glass"
           style={{border:"1px solid var(--color-kraft)"}}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          width={svgW} height={svgH}
          style={{display:"block",width:"100%",height:"auto",minWidth:280,
                  cursor:mode==="place"?(isDragging?"grabbing":"crosshair"):"default"}}
          onPointerMove={handleSvgPointerMove}
          onPointerLeave={()=>{ if (!isDragging) { setHoverCell(null); setSuggestion(null); }}}
          onClick={handleSvgClick}
        >
          {renderWalls()}
          {floorTiles}

          {/* Placed boxes (moving box excluded from sorted list; shown separately dimmed) */}
          {sortedBoxes
            .filter(b => !(isMoving && b.id === selectedBox?.id))
            .map(box => (
              <BoxShape key={box.id} box={box} ox={OX} oy={OY}
                        isSelected={infoBox?.id===box.id}
                        onSelect={()=>setInfoBox(box)}
                        inPlaceMode={mode==="place"}/>
            ))}

          {/* Origin of moving box — dimmed */}
          {isMoving && selectedBox && selectedBox.gridCol !== null && (
            <BoxShape box={selectedBox} ox={OX} oy={OY}
                      isSelected={false} onSelect={()=>{}} inPlaceMode={true} opacity={0.22}/>
          )}

          {/* Dragged box at cursor — full opacity while holding */}
          {isDragging && selectedBox && hoverCell && (
            <BoxShape
              box={{...selectedBox, gridCol:hoverCell.col, gridRow:hoverCell.row, stackLevel:effectiveLevel}}
              ox={OX} oy={OY} isSelected={false} onSelect={()=>{}} inPlaceMode={true}/>
          )}

          {/* Ghost for non-drag hover */}
          {!isDragging && hoverCell && selectedBox && mode==="place" && (
            <GhostBox col={hoverCell.col} row={hoverCell.row}
                      w={bwc(selectedBox.boxSize)} d={bdc(selectedBox.boxSize)} h={bhc(selectedBox.boxSize)}
                      stackLevel={effectiveLevel} ox={OX} oy={OY}/>
          )}

          {/* Buttons above selected box */}
          {renderBoxOverlay()}
        </svg>
      </div>

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

        {suggestion && mode==="place" && (
          <div className="rounded-2xl px-3 py-2 text-xs glass"
               style={{background:"var(--color-surface)",border:"1px solid var(--color-kraft)",color:"var(--color-ink)"}}>
            Stacking on <span className="label-number font-semibold">{suggestion.onBox}</span> — level {suggestion.level}
          </div>
        )}

        {error && <p className="text-xs px-1" style={{color:"var(--color-freight)"}}>{error}</p>}

        {/* Unplaced list */}
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider mb-2" style={{color:"var(--color-pencil)"}}>
            Unplaced boxes
          </h2>
          <ul data-testid="unplaced-list" className="space-y-1.5">
            {unplacedBoxes.map(b => (
              <li key={b.id}>
                <button
                  data-testid={`select-box-${b.labelNumber}`}
                  onClick={()=>{setSelectedBox(b);setMode("place");setInfoBox(null);setHoverCell(null);setSuggestion(null);setError("");}}
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

        {mode==="place" && (
          <button onClick={cancelPlace} disabled={isPending}
                  className="w-full rounded-2xl px-4 py-2.5 text-sm glass"
                  style={{background:"var(--color-surface)",border:"1px solid var(--color-kraft)",color:"var(--color-pencil)"}}>
            {isPending ? <><Spinner/> Saving…</> : "Cancel (Esc)"}
          </button>
        )}

        {/* Info panel (sidebar fallback when overlay not visible) */}
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
              <button onClick={handleUnplace} data-testid="unplace-btn" disabled={isPending}
                      className="rounded-lg px-3 py-2 text-xs flex items-center gap-1.5"
                      style={{border:"1px solid color-mix(in srgb, var(--color-freight) 30%, transparent)",color:"var(--color-freight)"}}>
                {isPending?<Spinner/>:null} Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
