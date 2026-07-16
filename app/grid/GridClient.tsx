"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, BoxSize, Room } from "@/app/generated/prisma/client";
import { placeBox, unplaceBox } from "@/lib/actions/grid";
import { setRetrieved } from "@/lib/actions/boxes";

type BoxWithRelations = Box & { boxSize: BoxSize; room: Room };

/* ─── Isometric constants ─── */
const TW = 60; const TH = TW / 2; const LH = 50; const PAD = 28;

/* ─── Colours ─── */
const CARD = { top:"#D0AA7A", right:"#B08855", front:"#8E6B3E", stroke:"#62461A", tape:"#A07822", tapeW:2.5 };
const FLOOR_FILL="#EDE8DF"; const FLOOR_STROKE="#D0C8BA";
const GHOST_FILL="rgba(232,86,42,0.10)"; const GHOST_STROKE="rgba(232,86,42,0.55)";

/* ─── Helpers ─── */
function ix(col:number,row:number,ox:number){return ox+(col-row)*TW/2;}
function iy(col:number,row:number,z:number,oy:number){return oy+(col+row)*TH/2-z*LH;}
function pts(c:[number,number][]){return c.map(([x,y])=>`${x},${y}`).join(" ");}
function bwc(bs:BoxSize){return(bs.widthIn ||bs.widthCells *12)/12;}
function bdc(bs:BoxSize){return(bs.depthIn ||bs.depthCells *12)/12;}
function bhc(bs:BoxSize){return(bs.heightIn||bs.heightCells*12)/12;}

function Spinner(){
  return(
    <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" opacity="0.9"/>
      <path d="M12 2a10 10 0 0 0-10 10" strokeLinecap="round" opacity="0.3"/>
    </svg>
  );
}

/* ─── Box faces ─── */
function BoxShape({box,ox,oy,isSelected,onSelect,inPlaceMode,opacity=1}:{
  box:BoxWithRelations;ox:number;oy:number;
  isSelected:boolean;onSelect:()=>void;inPlaceMode:boolean;opacity?:number;
}){
  const{gridCol:c,gridRow:r,stackLevel:sl,boxSize,labelNumber}=box;
  const col=c??0; const row=r??0;
  const w=bwc(boxSize); const d=bdc(boxSize); const h=bhc(boxSize);
  const z0=(sl??1)-1; const z1=z0+h;

  const TL:[number,number]=[ix(col,  row,  ox),iy(col,  row,  z1,oy)];
  const TR:[number,number]=[ix(col+w,row,  ox),iy(col+w,row,  z1,oy)];
  const BR:[number,number]=[ix(col+w,row+d,ox),iy(col+w,row+d,z1,oy)];
  const BL:[number,number]=[ix(col,  row+d,ox),iy(col,  row+d,z1,oy)];
  const TRb:[number,number]=[ix(col+w,row,  ox),iy(col+w,row,  z0,oy)];
  const BRb:[number,number]=[ix(col+w,row+d,ox),iy(col+w,row+d,z0,oy)];
  const BLb:[number,number]=[ix(col,  row+d,ox),iy(col,  row+d,z0,oy)];

  const topC  =isSelected?"#FFD060":CARD.top;
  const rightC=isSelected?"#D4A030":CARD.right;
  const frontC=isSelected?"#A87820":CARD.front;
  const strokeC=isSelected?"#806010":CARD.stroke;
  const sw=isSelected?1.5:0.8;
  const tapeT:[number,number]=[(TL[0]+TR[0])/2,(TL[1]+TR[1])/2];
  const tapeB:[number,number]=[(BL[0]+BR[0])/2,(BL[1]+BR[1])/2];
  const lx=(TL[0]+TR[0]+BR[0]+BL[0])/4;
  const ly=(TL[1]+TR[1]+BR[1]+BL[1])/4;
  const fs=Math.max(7,Math.min(11,TW*0.18));
  const cL=boxSize.heightCells*2+1;
  const cF:[[number,number],[number,number]][]=[];
  const cR:[[number,number],[number,number]][]=[];
  for(let i=1;i<cL;i++){
    const z=z0+(i/cL)*h;
    cF.push([[ix(col,row+d,ox),iy(col,row+d,z,oy)],[ix(col+w,row+d,ox),iy(col+w,row+d,z,oy)]]);
    cR.push([[ix(col+w,row,ox),iy(col+w,row,z,oy)],[ix(col+w,row+d,ox),iy(col+w,row+d,z,oy)]]);
  }

  return(
    <g opacity={opacity}
       onClick={inPlaceMode?undefined:(e)=>{e.stopPropagation();onSelect();}}
       style={{cursor:inPlaceMode?"default":"pointer"}}>
      <polygon points={pts([BL,BR,BRb,BLb])} fill={frontC} stroke={strokeC} strokeWidth={sw}/>
      {cF.map(([a,b],i)=><line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5}/>)}
      <polygon points={pts([TR,BR,BRb,TRb])} fill={rightC} stroke={strokeC} strokeWidth={sw}/>
      {cR.map(([a,b],i)=><line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5}/>)}
      <polygon points={pts([TL,TR,BR,BL])} fill={topC} stroke={strokeC} strokeWidth={sw}/>
      <line x1={tapeT[0]} y1={tapeT[1]} x2={tapeB[0]} y2={tapeB[1]} stroke={CARD.tape} strokeWidth={CARD.tapeW} strokeLinecap="round"/>
      <ellipse cx={lx} cy={ly} rx={TW*w*0.28} ry={TH*0.55} fill="rgba(255,255,240,0.55)"/>
      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize={fs} fontFamily="'Courier New',monospace" fontWeight="700"
            fill="#3A2008" style={{pointerEvents:"none",userSelect:"none"}}>
        {labelNumber}
      </text>
    </g>
  );
}

/* ─── Ghost outline ─── */
function GhostBox({col,row,w,d,h,stackLevel,ox,oy}:{
  col:number;row:number;w:number;d:number;h:number;stackLevel:number;ox:number;oy:number;
}){
  const z0=stackLevel-1; const z1=z0+h;
  const TL:[number,number]=[ix(col,  row,  ox),iy(col,  row,  z1,oy)];
  const TR:[number,number]=[ix(col+w,row,  ox),iy(col+w,row,  z1,oy)];
  const BR:[number,number]=[ix(col+w,row+d,ox),iy(col+w,row+d,z1,oy)];
  const BL:[number,number]=[ix(col,  row+d,ox),iy(col,  row+d,z1,oy)];
  const TRb:[number,number]=[ix(col+w,row,  ox),iy(col+w,row,  z0,oy)];
  const BRb:[number,number]=[ix(col+w,row+d,ox),iy(col+w,row+d,z0,oy)];
  const BLb:[number,number]=[ix(col,  row+d,ox),iy(col,  row+d,z0,oy)];
  const g={fill:GHOST_FILL,stroke:GHOST_STROKE,strokeWidth:1.5,strokeDasharray:"5,3"};
  return(
    <g style={{pointerEvents:"none"}}>
      <polygon points={pts([BL,BR,BRb,BLb])} {...g}/>
      <polygon points={pts([TR,BR,BRb,TRb])} {...g}/>
      <polygon points={pts([TL,TR,BR,BL])}   {...g}/>
    </g>
  );
}

/* ─── Main component ─── */
export function GridClient({boxes,widthCells,depthCells,heightCells}:{
  boxes:BoxWithRelations[];widthCells:number;depthCells:number;heightCells:number;
}){
  const router=useRouter();
  const [isPending,startTransition]=useTransition();
  const svgRef=useRef<SVGSVGElement>(null);

  /* state */
  const [selectedBox,setSelectedBox]=useState<BoxWithRelations|null>(null);
  const [hoverCell,setHoverCell]=useState<{col:number;row:number}|null>(null);
  const [infoBox,setInfoBox]=useState<BoxWithRelations|null>(null);
  const [error,setError]=useState("");
  const [mode,setMode]=useState<"view"|"place">("view");
  const [stackSuggestion,setStackSuggestion]=useState<{level:number;onBox:string}|null>(null);
  const [isDragging,setIsDragging]=useState(false);

  /* derived */
  const placedBoxes=boxes.filter(b=>b.gridCol!==null);
  const unplacedBoxes=boxes.filter(b=>b.gridCol===null);
  const sortedBoxes=[...placedBoxes].sort((a,b)=>{
    const da=a.gridCol!+a.gridRow!; const db=b.gridCol!+b.gridRow!;
    return da!==db?da-db:(a.stackLevel??1)-(b.stackLevel??1);
  });
  const isMoving=mode==="place"&&!!selectedBox&&selectedBox.gridCol!==null;
  const effectiveLevel=stackSuggestion?.level??1;

  /* scene geometry */
  const OX=depthCells*TW/2+PAD;
  const OY=heightCells*LH+PAD;
  const svgW=(widthCells+depthCells)*TW/2+PAD*2;
  const svgH=(widthCells+depthCells)*TH/2+heightCells*LH+PAD*2;

  /* Escape key cancels place mode */
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{if(e.key==="Escape"&&mode==="place")cancelPlace();};
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[mode]);

  /* ── Snap ── */
  function computeSnap(svgX:number,svgY:number):{col:number;row:number}|null{
    if(!selectedBox)return null;
    const fcol=((svgX-OX)/(TW/2)+(svgY-OY)/(TH/2))/2;
    const frow=((svgY-OY)/(TH/2)-(svgX-OX)/(TW/2))/2;
    if(fcol<-0.5||frow<-0.5||fcol>widthCells+0.5||frow>depthCells+0.5)return null;
    const sw=bwc(selectedBox.boxSize); const sd=bdc(selectedBox.boxSize);
    const cc:number[]=[]; const rc:number[]=[];
    for(let c=0;c<=widthCells;c++)cc.push(c);
    for(let r=0;r<=depthCells;r++)rc.push(r);
    for(const b of placedBoxes){
      if(isMoving&&b.id===selectedBox.id)continue;
      cc.push(b.gridCol!+bwc(b.boxSize));
      rc.push(b.gridRow!+bdc(b.boxSize));
    }
    const rawC=cc.reduce((a,c)=>Math.abs(a-fcol)<=Math.abs(c-fcol)?a:c);
    const rawR=rc.reduce((a,r)=>Math.abs(a-frow)<=Math.abs(r-frow)?a:r);
    return{
      col:Math.max(0,Math.min(widthCells-sw,Math.round(rawC*10000)/10000)),
      row:Math.max(0,Math.min(depthCells-sd,Math.round(rawR*10000)/10000)),
    };
  }

  /* ── Stack suggestion ── */
  function findStackSuggestion(col:number,row:number):{level:number;onBox:string}|null{
    if(!selectedBox)return null;
    const sw=bwc(selectedBox.boxSize); const sd=bdc(selectedBox.boxSize);
    const EPS=0.001;
    let top=0; let name:string|null=null;
    for(const b of placedBoxes){
      if(isMoving&&b.id===selectedBox.id)continue;
      const bw=bwc(b.boxSize); const bd=bdc(b.boxSize);
      const co=col<b.gridCol!+bw-EPS&&col+sw>b.gridCol!+EPS;
      const ro=row<b.gridRow!+bd-EPS&&row+sd>b.gridRow!+EPS;
      if(co&&ro){const t=b.stackLevel!+b.boxSize.heightCells;if(t>top){top=t;name=b.labelNumber;}}
    }
    return top>0?{level:top,onBox:name!}:null;
  }

  /* ── Pointer move (place + drag) ── */
  function handleSvgPointerMove(e:React.PointerEvent<SVGSVGElement>){
    if(mode!=="place"||!selectedBox)return;
    const svg=e.currentTarget;
    const rect=svg.getBoundingClientRect();
    const sx=(e.clientX-rect.left)*svgW/rect.width;
    const sy=(e.clientY-rect.top)*svgH/rect.height;
    const snap=computeSnap(sx,sy);
    if(!snap){if(!isDragging){setHoverCell(null);setStackSuggestion(null);}return;}
    setHoverCell(snap);
    const sug=findStackSuggestion(snap.col,snap.row);
    setStackSuggestion(sug);
    setStackLevel(sug?String(sug.level):"1");
  }

  /* ── Immediate placement ── */
  async function placeImmediately(col:number,row:number,level:number){
    if(!selectedBox||isPending)return;
    const result=await placeBox(selectedBox.id,col,row,level);
    if(result.error){setError(result.error);setIsDragging(false);}
    else{setSelectedBox(null);setMode("view");setHoverCell(null);setStackSuggestion(null);setIsDragging(false);setError("");router.refresh();}
  }

  /* ── SVG click (non-drag place) ── */
  function handleSvgClick(e:React.MouseEvent<SVGSVGElement>){
    if(mode==="view"){setInfoBox(null);return;}
    if(mode==="place"&&!isDragging&&selectedBox&&hoverCell){
      startTransition(async()=>await placeImmediately(hoverCell.col,hoverCell.row,effectiveLevel));
    }
  }

  /* ── Pointer up (drag release) ── */
  function handleSvgPointerUp(){
    if(!isDragging)return;
    if(selectedBox&&hoverCell){
      startTransition(async()=>await placeImmediately(hoverCell.col,hoverCell.row,effectiveLevel));
    }else{setIsDragging(false);}
  }

  /* ── Drag button pressed ── */
  function handleDragPointerDown(e:React.PointerEvent,box:BoxWithRelations){
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setSelectedBox(box);
    setInfoBox(null);
    setMode("place");
    setHoverCell({col:box.gridCol!,row:box.gridRow!});
    setStackSuggestion(null);
    setError("");
    if(svgRef.current)svgRef.current.setPointerCapture(e.pointerId);
  }

  /* ── Other actions ── */
  function handleMoveBox(box:BoxWithRelations){
    setSelectedBox(box);setInfoBox(null);setMode("place");
    setHoverCell(null);setStackSuggestion(null);setError("");
  }

  // Dummy state kept for API compat with handleSvgPointerMove's setStackLevel call
  const [,setStackLevel]=useState("1");

  async function handleUnplace(){
    if(!infoBox||isPending)return;
    startTransition(async()=>{await unplaceBox(infoBox.id);setInfoBox(null);router.refresh();});
  }
  async function handleRetrieve(){
    if(!infoBox||isPending)return;
    startTransition(async()=>{await setRetrieved(infoBox.id,true);setInfoBox(null);router.refresh();});
  }
  function cancelPlace(){
    setSelectedBox(null);setHoverCell(null);
    setStackSuggestion(null);setMode("view");setError("");setIsDragging(false);
  }

  /* ── Back walls ── */
  function renderWalls(){
    const wH=heightCells;
    const rTL:[number,number]=[ix(0,0,OX),iy(0,0,wH,OY)];
    const rTR:[number,number]=[ix(widthCells,0,OX),iy(widthCells,0,wH,OY)];
    const rBR:[number,number]=[ix(widthCells,0,OX),iy(widthCells,0,0,OY)];
    const rBL:[number,number]=[ix(0,0,OX),iy(0,0,0,OY)];
    const lTR:[number,number]=[ix(0,0,OX),iy(0,0,wH,OY)];
    const lTL:[number,number]=[ix(0,depthCells,OX),iy(0,depthCells,wH,OY)];
    const lBL:[number,number]=[ix(0,depthCells,OX),iy(0,depthCells,0,OY)];
    const lBR:[number,number]=[ix(0,0,OX),iy(0,0,0,OY)];
    const lines=Array.from({length:wH-1},(_,i)=>{const z=i+1;return(
      <g key={z}>
        <line x1={ix(0,0,OX)} y1={iy(0,0,z,OY)} x2={ix(widthCells,0,OX)} y2={iy(widthCells,0,z,OY)} stroke="rgba(0,0,0,0.055)" strokeWidth={0.6}/>
        <line x1={ix(0,0,OX)} y1={iy(0,0,z,OY)} x2={ix(0,depthCells,OX)} y2={iy(0,depthCells,z,OY)} stroke="rgba(0,0,0,0.055)" strokeWidth={0.6}/>
      </g>
    );});
    return(<>
      <polygon points={pts([lTR,lTL,lBL,lBR])} fill="#C8C3BB" stroke="#A8A098" strokeWidth={0.8}/>
      <polygon points={pts([rTL,rTR,rBR,rBL])} fill="#DDDAD0" stroke="#A8A098" strokeWidth={0.8}/>
      {lines}
      <line x1={ix(0,0,OX)} y1={iy(0,0,0,OY)} x2={ix(0,0,OX)} y2={iy(0,0,wH,OY)} stroke="#948D84" strokeWidth={1.5}/>
    </>);
  }

  /* ── Overlay buttons above selected box ── */
  function renderBoxOverlay(){
    if(!infoBox||mode!=="view")return null;
    const col=infoBox.gridCol!; const row=infoBox.gridRow!;
    const w=bwc(infoBox.boxSize); const d=bdc(infoBox.boxSize); const h=bhc(infoBox.boxSize);
    const z1=(infoBox.stackLevel??1)-1+h;
    const topY=Math.min(iy(col,row,z1,OY),iy(col+w,row,z1,OY),iy(col+w,row+d,z1,OY),iy(col,row+d,z1,OY));
    const cx=(ix(col,row,OX)+ix(col+w,row,OX)+ix(col+w,row+d,OX)+ix(col,row+d,OX))/4;
    const BW=30; const BH=28; const gap=5;
    const bx=cx-(BW+gap/2);
    const by=topY-BH-10;
    return(
      <g style={{filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.18))"}}>
        {/* Drag / move button */}
        <g onPointerDown={e=>handleDragPointerDown(e as unknown as React.PointerEvent,infoBox)}
           style={{cursor:"grab",touchAction:"none"}}>
          <rect x={bx} y={by} width={BW} height={BH} rx={7} fill="white" stroke="#E2DDD4" strokeWidth={1}/>
          {/* 4-direction arrows icon */}
          <g transform={`translate(${bx+BW/2-7},${by+BH/2-7})`} style={{pointerEvents:"none"}}>
            <path d="M7 0v14M0 7h14M7 0L5 2.5M7 0L9 2.5M7 14L5 11.5M7 14L9 11.5M0 7L2.5 5M0 7L2.5 9M14 7L11.5 5M14 7L11.5 9"
                  fill="none" stroke="#62461A" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"/>
          </g>
        </g>
        {/* Remove button */}
        <g onClick={e=>{e.stopPropagation();handleUnplace();}} style={{cursor:"pointer"}}>
          <rect x={bx+BW+gap} y={by} width={BW} height={BH} rx={7} fill="white" stroke="#FFD0C0" strokeWidth={1}/>
          <text x={bx+BW+gap+BW/2} y={by+BH/2+1} textAnchor="middle" dominantBaseline="middle"
                fontSize={17} fill="#E8562A" style={{pointerEvents:"none",userSelect:"none"}}>×</text>
        </g>
      </g>
    );
  }

  /* ── Floor tiles ── */
  const floorTiles:React.ReactNode[]=[];
  for(let diag=0;diag<widthCells+depthCells-1;diag++){
    for(let col=Math.max(0,diag-depthCells+1);col<=Math.min(diag,widthCells-1);col++){
      const row=diag-col;
      const cx=ix(col,row,OX); const cy=iy(col,row,0,OY);
      floorTiles.push(
        <polygon key={`f-${col}-${row}`}
          points={pts([[cx,cy],[cx+TW/2,cy+TH/2],[cx,cy+TH],[cx-TW/2,cy+TH/2]])}
          fill={FLOOR_FILL} stroke={FLOOR_STROKE} strokeWidth={0.5}/>
      );
    }
  }

  return(
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* ── Canvas ── */}
      <div className="flex-1 min-w-0 overflow-auto rounded-2xl"
           style={{background:"var(--color-surface)",border:"1px solid var(--color-kraft)"}}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          width={svgW} height={svgH}
          style={{display:"block",width:"100%",height:"auto",minWidth:280,
                  cursor:mode==="place"?(isDragging?"grabbing":"crosshair"):"default"}}
          onPointerMove={mode==="place"?handleSvgPointerMove:undefined}
          onPointerUp={handleSvgPointerUp}
          onPointerLeave={()=>{if(!isDragging){setHoverCell(null);setStackSuggestion(null);}}}
          onClick={handleSvgClick}
        >
          {renderWalls()}
          {floorTiles}

          {/* All placed boxes except the one being moved */}
          {sortedBoxes.filter(b=>!(isMoving&&b.id===selectedBox?.id)).map(box=>(
            <BoxShape key={box.id} box={box} ox={OX} oy={OY}
                      isSelected={infoBox?.id===box.id}
                      onSelect={()=>setInfoBox(box)}
                      inPlaceMode={mode==="place"}/>
          ))}

          {/* Origin ghost (dimmed) when moving a placed box */}
          {isMoving&&selectedBox&&selectedBox.gridCol!==null&&(
            <BoxShape box={selectedBox} ox={OX} oy={OY}
                      isSelected={false} onSelect={()=>{}} inPlaceMode={true}
                      opacity={0.22}/>
          )}

          {/* Dragged box at cursor — solid while holding */}
          {isDragging&&selectedBox&&hoverCell&&(
            <BoxShape
              box={{...selectedBox,gridCol:hoverCell.col,gridRow:hoverCell.row,stackLevel:effectiveLevel}}
              ox={OX} oy={OY} isSelected={false} onSelect={()=>{}} inPlaceMode={true}/>
          )}

          {/* Ghost for hover-to-place (non-drag) */}
          {!isDragging&&hoverCell&&selectedBox&&mode==="place"&&(
            <GhostBox col={hoverCell.col} row={hoverCell.row}
                      w={bwc(selectedBox.boxSize)} d={bdc(selectedBox.boxSize)} h={bhc(selectedBox.boxSize)}
                      stackLevel={effectiveLevel} ox={OX} oy={OY}/>
          )}

          {/* Box overlay buttons */}
          {renderBoxOverlay()}
        </svg>
      </div>

      {/* ── Sidebar ── */}
      <div className="w-full lg:w-60 space-y-4 shrink-0">
        {/* Mode hint */}
        {mode==="place"&&selectedBox&&(
          <div className="rounded-xl px-3 py-2 text-xs leading-relaxed"
               style={{background:"var(--color-freight-tint)",border:"1px solid color-mix(in srgb, var(--color-freight) 30%, transparent)",color:"var(--color-freight)"}}>
            {isMoving?"Moving":"Placing"}{" "}
            <span className="font-bold label-number">{selectedBox.labelNumber}</span>
            {isDragging?" — release to place":" — hover to snap, click to place"}
          </div>
        )}

        {/* Stacking hint */}
        {stackSuggestion&&mode==="place"&&(
          <div className="rounded-xl px-3 py-2 text-xs"
               style={{background:"var(--color-surface)",border:"1px solid var(--color-kraft)",color:"var(--color-ink)"}}>
            Stacking on <span className="label-number font-semibold">{stackSuggestion.onBox}</span> — level {stackSuggestion.level}
          </div>
        )}

        {error&&(
          <p className="text-xs px-1" style={{color:"var(--color-freight)"}}>{error}</p>
        )}

        {/* Unplaced list */}
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider mb-2" style={{color:"var(--color-pencil)"}}>
            Unplaced boxes
          </h2>
          <ul data-testid="unplaced-list" className="space-y-1.5">
            {unplacedBoxes.map(b=>(
              <li key={b.id}>
                <button
                  data-testid={`select-box-${b.labelNumber}`}
                  onClick={()=>{setSelectedBox(b);setMode("place");setInfoBox(null);setHoverCell(null);setStackSuggestion(null);setError("");}}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm"
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
            {unplacedBoxes.length===0&&(
              <li className="text-xs py-2" style={{color:"var(--color-pencil)"}}>All boxes placed</li>
            )}
          </ul>
        </div>

        {/* Cancel move / place */}
        {mode==="place"&&(
          <button onClick={cancelPlace} disabled={isPending}
                  className="w-full rounded-xl px-4 py-2.5 text-sm"
                  style={{border:"1px solid var(--color-kraft)",color:"var(--color-pencil)"}}>
            {isPending?<><Spinner/> Saving…</>:"Cancel (Esc)"}
          </button>
        )}

        {/* Box info (shown when selected in view mode via sidebar) */}
        {infoBox&&mode==="view"&&(
          <div data-testid="cell-info-panel" className="rounded-xl p-4 space-y-3"
               style={{background:"var(--color-surface)",border:"1px solid var(--color-kraft)"}}>
            <div>
              <p className="label-number font-bold text-lg" style={{color:"var(--color-ink)"}}>{infoBox.labelNumber}</p>
              <p className="text-xs mt-1" style={{color:"var(--color-pencil)"}}>{infoBox.room.name} · {infoBox.boxSize.name}</p>
              <p className="text-xs mt-0.5" style={{color:"var(--color-pencil)"}}>
                {Math.round(infoBox.gridCol!*12)}" from left · {Math.round(infoBox.gridRow!*12)}" from back · Level {infoBox.stackLevel}
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
