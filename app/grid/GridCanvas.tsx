"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Text, Html, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { Box, BoxSize, Room, FurnitureItem } from "@/app/generated/prisma/client";

type BoxWithRelations = Box & { boxSize: BoxSize; room: Room };

/* ── Dimension helpers (inches → grid cells) ── */
function bwc(bs: BoxSize) { return (bs.widthIn  || bs.widthCells  * 12) / 12; }
function bdc(bs: BoxSize) { return (bs.depthIn  || bs.depthCells  * 12) / 12; }
function bhc(bs: BoxSize) { return (bs.heightIn || bs.heightCells * 12) / 12; }

function shade(hex: string, factor: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${clamp(r * factor)} ${clamp(g * factor)} ${clamp(b * factor)})`;
}

/* ── Props type ── */
export interface GridCanvas3DProps {
  placedBoxes: BoxWithRelations[];
  placedFurniture: FurnitureItem[];
  widthCells: number;
  depthCells: number;
  heightCells: number;
  selectedBox: BoxWithRelations | null;
  selectedFurniture: FurnitureItem | null;
  hoverCell: { col: number; row: number } | null;
  isDragging: boolean;
  effectiveLevel: number;
  infoBox: BoxWithRelations | null;
  infoFurniture: FurnitureItem | null;
  mode: "view" | "place";
  isMoving: boolean;
  isMovingFurniture: boolean;
  raycastRef: React.MutableRefObject<((cx: number, cy: number) => { col: number; row: number } | null) | null>;
  onSelectBox: (box: BoxWithRelations) => void;
  onSelectFurniture: (item: FurnitureItem) => void;
  onFloorHover: (col: number, row: number) => void;
  onFloorLeave: () => void;
  onFloorClick: () => void;
  onDragBoxStart: (e: PointerEvent, box: BoxWithRelations) => void;
  onDragFurnitureStart: (e: PointerEvent, item: FurnitureItem) => void;
  onUnplaceBox: () => void;
  onUnplaceFurniture: () => void;
}

/* ── Isometric orthographic camera setup ── */
function IsometricCamera({ wc, dc, hc }: { wc: number; dc: number; hc: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const D = Math.max(wc + dc, hc + 4) * 12;
    camera.position.set(wc / 2 + D, D, dc / 2 + D);
    camera.lookAt(wc / 2, hc * 0.35, dc / 2);
    camera.up.set(0, 1, 0);
    camera.updateMatrixWorld();
    /* World extents visible from isometric angle (true isometric math):
       screen width  ≈ (wc + dc) / √2
       screen height ≈ (wc + dc + 2*hc) / √6  */
    const worldW = (wc + dc) / Math.SQRT2 + 2.5;
    const worldH = (wc + dc + 2 * (hc + 1)) / Math.sqrt(6) + 2.5;
    (camera as THREE.OrthographicCamera).zoom = Math.max(
      Math.min(size.width / worldW, size.height / worldH) * 0.82,
      1,
    );
    camera.updateProjectionMatrix();
  }, [camera, size, wc, dc, hc]);
  return null;
}

/* ── Expose floor-raycast to parent (for drag handlers) ── */
function RaycastSetup({
  raycastRef,
}: {
  raycastRef: React.MutableRefObject<((cx: number, cy: number) => { col: number; row: number } | null) | null>;
}) {
  const { camera, gl } = useThree();
  const plane    = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hitPt    = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());

  useEffect(() => {
    raycastRef.current = (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc  = new THREE.Vector2(
        ((clientX - rect.left) / rect.width)  *  2 - 1,
        ((clientY - rect.top)  / rect.height) * -2 + 1,
      );
      raycaster.current.setFromCamera(ndc, camera);
      return raycaster.current.ray.intersectPlane(plane, hitPt.current)
        ? { col: hitPt.current.x, row: hitPt.current.z }
        : null;
    };
    return () => { raycastRef.current = null; };
  }, [camera, gl, plane, raycastRef]);

  return null;
}

/* ── Floor surface + grid lines ── */
function SceneFloor({ wc, dc }: { wc: number; dc: number }) {
  const lineGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let c = 0; c <= wc; c++) {
      pts.push(new THREE.Vector3(c, 0, 0), new THREE.Vector3(c, 0, dc));
    }
    for (let r = 0; r <= dc; r++) {
      pts.push(new THREE.Vector3(0, 0, r), new THREE.Vector3(wc, 0, r));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [wc, dc]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[wc / 2, 0, dc / 2]}>
        <planeGeometry args={[wc, dc]} />
        <meshStandardMaterial color="#EDE8DF" roughness={1} metalness={0} />
      </mesh>
      <lineSegments geometry={lineGeo} renderOrder={1}>
        <lineBasicMaterial color="#D0C8BA" transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
}

/* ── Back walls ── */
function SceneWalls({ wc, dc, hc }: { wc: number; dc: number; hc: number }) {
  const hLineGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let z = 1; z < hc; z++) {
      pts.push(new THREE.Vector3(0, z, 0), new THREE.Vector3(0, z, dc));   // left wall
      pts.push(new THREE.Vector3(0, z, 0), new THREE.Vector3(wc, z, 0));   // right wall
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [wc, dc, hc]);

  const cornerGeo = useMemo(() => {
    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, hc, 0)];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [hc]);

  return (
    <group>
      {/* Left wall: X=0 plane, facing +X (rotation around Y by +π/2) */}
      <mesh position={[0, hc / 2, dc / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[dc, hc]} />
        <meshStandardMaterial color="#C8C3BB" roughness={1} metalness={0} />
      </mesh>
      {/* Right wall: Z=0 plane, default facing +Z */}
      <mesh position={[wc / 2, hc / 2, 0]}>
        <planeGeometry args={[wc, hc]} />
        <meshStandardMaterial color="#DDDAD0" roughness={1} metalness={0} />
      </mesh>
      <lineSegments geometry={hLineGeo} renderOrder={1}>
        <lineBasicMaterial color="#000000" transparent opacity={0.055} />
      </lineSegments>
      {/* Vertical corner edge */}
      <lineSegments geometry={cornerGeo} renderOrder={2}>
        <lineBasicMaterial color="#948D84" />
      </lineSegments>
    </group>
  );
}

/* ── Invisible floor plane — absorbs hover/click for placement ── */
function FloorInteraction({ wc, dc, onMove, onClick }: {
  wc: number; dc: number;
  onMove: (col: number, row: number) => void;
  onClick: () => void;
}) {
  return (
    <mesh
      position={[wc / 2, -0.002, dc / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={(e) => { e.stopPropagation(); onMove(e.point.x, e.point.z); }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <planeGeometry args={[wc + 10, dc + 10]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

/* ── Single moving box ── */
function BoxMesh3D({ box, isSelected, onClick, onPointerDown, inPlaceMode, opacity = 1 }: {
  box: BoxWithRelations;
  isSelected: boolean;
  onClick?: () => void;
  onPointerDown?: (e: PointerEvent) => void;
  inPlaceMode: boolean;
  opacity?: number;
}) {
  const { gridCol: c, gridRow: r, stackLevel: sl, boxSize, labelNumber } = box;
  const col = c ?? 0; const row = r ?? 0;
  const wc  = bwc(boxSize); const dc = bdc(boxSize); const hc = bhc(boxSize);
  const z0  = (sl ?? 1) - 1;

  return (
    <group position={[col + wc / 2, z0 + hc / 2, row + dc / 2]}>
      <mesh
        onClick={inPlaceMode ? undefined : (e) => { e.stopPropagation(); onClick?.(); }}
        onPointerDown={inPlaceMode ? undefined : (e) => { e.stopPropagation(); onPointerDown?.(e.nativeEvent); }}
      >
        <boxGeometry args={[wc, hc, dc]} />
        <meshStandardMaterial
          color={isSelected ? "#FFD060" : "#C89050"}
          roughness={0.85}
          metalness={0}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {opacity > 0.3 && (
        <Text
          position={[0, hc / 2 + 0.01, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={Math.max(0.07, Math.min(wc, dc) * 0.22)}
          color="#3A2008"
          anchorX="center"
          anchorY="middle"
          maxWidth={Math.min(wc, dc) * 0.82}
        >
          {labelNumber}
        </Text>
      )}
    </group>
  );
}

/* ── Single furniture item ── */
function FurnitureMesh3D({ item, isSelected, onClick, onPointerDown, inPlaceMode, opacity = 1 }: {
  item: FurnitureItem;
  isSelected: boolean;
  onClick?: () => void;
  onPointerDown?: (e: PointerEvent) => void;
  inPlaceMode: boolean;
  opacity?: number;
}) {
  const col  = item.gridCol ?? 0; const row = item.gridRow ?? 0;
  const wc   = item.widthIn / 12; const dc = item.depthIn / 12; const hc = item.heightIn / 12;
  const z0   = (item.stackLevel ?? 1) - 1;
  const base = item.color ?? "#7B95AE";
  const col3 = isSelected ? shade(base, 1.28) : base;
  const r    = Math.max(0.005, Math.min((item.borderRadius / 100) * Math.min(wc, hc, dc) * 0.35, 0.15));
  const label = (item.groupName ?? item.name).slice(0, 9);

  return (
    <group position={[col + wc / 2, z0 + hc / 2, row + dc / 2]}>
      <RoundedBox
        args={[wc, hc, dc]}
        radius={r}
        smoothness={4}
        onClick={inPlaceMode ? undefined : (e) => { e.stopPropagation(); onClick?.(); }}
        onPointerDown={inPlaceMode ? undefined : (e) => { e.stopPropagation(); onPointerDown?.(e.nativeEvent); }}
      >
        <meshStandardMaterial
          color={col3}
          roughness={0.72}
          metalness={0}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </RoundedBox>
      {opacity > 0.3 && (
        <Text
          position={[0, hc / 2 + 0.01, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={Math.max(0.07, Math.min(wc, dc) * 0.19)}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          maxWidth={Math.min(wc, dc) * 0.82}
        >
          {label}
        </Text>
      )}
    </group>
  );
}

/* ── Ghost / placement preview ── */
function GhostPreview({ col, row, stackLevel, wc, hc, dc, isFurniture }: {
  col: number; row: number; stackLevel: number;
  wc: number; hc: number; dc: number; isFurniture: boolean;
}) {
  const z0       = stackLevel - 1;
  const edgeGeo  = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(wc, hc, dc)), [wc, hc, dc]);
  const fillColor = isFurniture ? "#5B7ABE" : "#E8562A";

  return (
    <group position={[col + wc / 2, z0 + hc / 2, row + dc / 2]}>
      <mesh>
        <boxGeometry args={[wc, hc, dc]} />
        <meshBasicMaterial color={fillColor} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edgeGeo} renderOrder={2}>
        <lineBasicMaterial color={fillColor} transparent opacity={0.75} />
      </lineSegments>
    </group>
  );
}

/* ── Overlay action buttons via Html ── */
function BoxOverlay({ box, onDragStart, onUnplace }: {
  box: BoxWithRelations;
  onDragStart: (e: PointerEvent, b: BoxWithRelations) => void;
  onUnplace: () => void;
}) {
  const col = box.gridCol!; const row = box.gridRow!;
  const w = bwc(box.boxSize); const d = bdc(box.boxSize); const h = bhc(box.boxSize);
  const z0 = (box.stackLevel ?? 1) - 1;
  const btnBase: React.CSSProperties = {
    width: 30, height: 28, borderRadius: 7, background: "white",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "inherit",
  };
  return (
    <Html position={[col + w / 2, z0 + h + 0.3, row + d / 2]} center>
      <div style={{ display: "flex", gap: 4, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.22))", pointerEvents: "auto" }}>
        <button
          onPointerDown={(e) => onDragStart(e.nativeEvent, box)}
          style={{ ...btnBase, border: "1px solid #D0C8BA", cursor: "grab" }}
        >
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="#62461A" strokeWidth={1.4} strokeLinecap="round">
            <path d="M7 0v14M0 7h14M7 0L5 2.5M7 0L9 2.5M7 14L5 11.5M7 14L9 11.5M0 7L2.5 5M0 7L2.5 9M14 7L11.5 5M14 7L11.5 9"/>
          </svg>
        </button>
        <button
          onClick={onUnplace}
          style={{ ...btnBase, border: "1px solid #FFD0C0", fontSize: 17, color: "#E8562A", lineHeight: 1 }}
        >
          ×
        </button>
      </div>
    </Html>
  );
}

function FurnitureOverlay({ item, onDragStart, onUnplace }: {
  item: FurnitureItem;
  onDragStart: (e: PointerEvent, fi: FurnitureItem) => void;
  onUnplace: () => void;
}) {
  const col = item.gridCol!; const row = item.gridRow!;
  const w = item.widthIn / 12; const d = item.depthIn / 12; const h = item.heightIn / 12;
  const z0 = (item.stackLevel ?? 1) - 1;
  const btnBase: React.CSSProperties = {
    width: 30, height: 28, borderRadius: 7, background: "white",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "inherit",
  };
  return (
    <Html position={[col + w / 2, z0 + h + 0.3, row + d / 2]} center>
      <div style={{ display: "flex", gap: 4, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.22))", pointerEvents: "auto" }}>
        <button
          onPointerDown={(e) => onDragStart(e.nativeEvent, item)}
          style={{ ...btnBase, border: "1px solid #C0CED8", cursor: "grab" }}
        >
          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke="#354D65" strokeWidth={1.4} strokeLinecap="round">
            <path d="M7 0v14M0 7h14M7 0L5 2.5M7 0L9 2.5M7 14L5 11.5M7 14L9 11.5M0 7L2.5 5M0 7L2.5 9M14 7L11.5 5M14 7L11.5 9"/>
          </svg>
        </button>
        <button
          onClick={onUnplace}
          style={{ ...btnBase, border: "1px solid #C0CED8", fontSize: 17, color: "#5C7A96", lineHeight: 1 }}
        >
          ×
        </button>
      </div>
    </Html>
  );
}

/* ── Main exported canvas ── */
export function GridCanvas3D(props: GridCanvas3DProps) {
  const {
    placedBoxes, placedFurniture,
    widthCells: wc, depthCells: dc, heightCells: hc,
    selectedBox, selectedFurniture,
    hoverCell, isDragging, effectiveLevel,
    infoBox, infoFurniture, mode,
    isMoving, isMovingFurniture,
    raycastRef,
    onSelectBox, onSelectFurniture,
    onFloorHover, onFloorLeave, onFloorClick,
    onDragBoxStart, onDragFurnitureStart,
    onUnplaceBox, onUnplaceFurniture,
  } = props;

  /* Depth-sort items so back items render before front items (painter's algorithm).
     In isometric orthographic projection this matters for overlapping at the same Y. */
  const sortedItems = useMemo(() => {
    type SI = { kind: "box"; box: BoxWithRelations } | { kind: "fi"; fi: FurnitureItem };
    const items: SI[] = [
      ...placedBoxes
        .filter(b => !(isMoving && b.id === selectedBox?.id))
        .map(b => ({ kind: "box" as const, box: b })),
      ...placedFurniture
        .filter(f => !(isMovingFurniture && f.id === selectedFurniture?.id))
        .map(f => ({ kind: "fi" as const, fi: f })),
    ];
    return items.sort((a, b) => {
      const ea = a.kind === "box" ? a.box : a.fi;
      const eb = b.kind === "box" ? b.box : b.fi;
      const da = (ea.gridCol ?? 0) + (ea.gridRow ?? 0);
      const db = (eb.gridCol ?? 0) + (eb.gridRow ?? 0);
      return da !== db ? da - db : (ea.stackLevel ?? 1) - (eb.stackLevel ?? 1);
    });
  }, [placedBoxes, placedFurniture, selectedBox, selectedFurniture, isMoving, isMovingFurniture]);

  return (
    <div
      className="flex-1 min-w-0 overflow-hidden rounded-2xl glass"
      style={{ border: "1px solid var(--color-kraft)", height: "min(76vh, 660px)", minHeight: 380 }}
    >
      <Canvas
        orthographic
        camera={{ near: 0.1, far: 3000 }}
        gl={{ antialias: true, alpha: true }}
        style={{
          background: "transparent",
          cursor: mode === "place" ? (isDragging ? "grabbing" : "crosshair") : "default",
        }}
        onPointerLeave={onFloorLeave}
      >
        <IsometricCamera wc={wc} dc={dc} hc={hc} />
        <RaycastSetup raycastRef={raycastRef} />

        {/* Lighting — warm ambient + directional from upper-front-right for isometric face shading */}
        <ambientLight color="#fdf4e8" intensity={0.55} />
        <directionalLight color="#ffffff" intensity={1.65} position={[1, 2.5, 0.5]} />
        <directionalLight color="#8090bb" intensity={0.18} position={[-1, -1, -1]} />

        <SceneFloor wc={wc} dc={dc} />
        <SceneWalls wc={wc} dc={dc} hc={hc} />
        <FloorInteraction wc={wc} dc={dc} onMove={onFloorHover} onClick={onFloorClick} />

        {/* Placed items (depth-sorted) */}
        {sortedItems.map(item =>
          item.kind === "box"
            ? <BoxMesh3D
                key={item.box.id}
                box={item.box}
                isSelected={infoBox?.id === item.box.id}
                onClick={() => onSelectBox(item.box)}
                onPointerDown={(e) => onDragBoxStart(e, item.box)}
                inPlaceMode={mode === "place"}
              />
            : <FurnitureMesh3D
                key={item.fi.id}
                item={item.fi}
                isSelected={infoFurniture?.id === item.fi.id}
                onClick={() => onSelectFurniture(item.fi)}
                onPointerDown={(e) => onDragFurnitureStart(e, item.fi)}
                inPlaceMode={mode === "place"}
              />
        )}

        {/* Dimmed origin when moving a placed item */}
        {isMoving && selectedBox && selectedBox.gridCol !== null && (
          <BoxMesh3D box={selectedBox} isSelected={false} inPlaceMode={true} opacity={0.22} />
        )}
        {isMovingFurniture && selectedFurniture && selectedFurniture.gridCol !== null && (
          <FurnitureMesh3D item={selectedFurniture} isSelected={false} inPlaceMode={true} opacity={0.22} />
        )}

        {/* Live-dragged item at cursor snapped position */}
        {isDragging && selectedBox && hoverCell && (
          <BoxMesh3D
            box={{ ...selectedBox, gridCol: hoverCell.col, gridRow: hoverCell.row, stackLevel: effectiveLevel }}
            isSelected={false}
            inPlaceMode={true}
            opacity={0.9}
          />
        )}
        {isDragging && selectedFurniture && hoverCell && (
          <FurnitureMesh3D
            item={{ ...selectedFurniture, gridCol: hoverCell.col, gridRow: hoverCell.row, stackLevel: effectiveLevel }}
            isSelected={false}
            inPlaceMode={true}
            opacity={0.9}
          />
        )}

        {/* Ghost preview for hover-then-click placement */}
        {!isDragging && hoverCell && selectedBox && mode === "place" && (
          <GhostPreview
            col={hoverCell.col}
            row={hoverCell.row}
            stackLevel={effectiveLevel}
            wc={bwc(selectedBox.boxSize)}
            hc={bhc(selectedBox.boxSize)}
            dc={bdc(selectedBox.boxSize)}
            isFurniture={false}
          />
        )}
        {!isDragging && hoverCell && selectedFurniture && mode === "place" && (
          <GhostPreview
            col={hoverCell.col}
            row={hoverCell.row}
            stackLevel={effectiveLevel}
            wc={selectedFurniture.widthIn / 12}
            hc={selectedFurniture.heightIn / 12}
            dc={selectedFurniture.depthIn / 12}
            isFurniture={true}
          />
        )}

        {/* Action overlays above selected items */}
        {infoBox && mode === "view" && infoBox.gridCol !== null && (
          <BoxOverlay box={infoBox} onDragStart={onDragBoxStart} onUnplace={onUnplaceBox} />
        )}
        {infoFurniture && mode === "view" && infoFurniture.gridCol !== null && (
          <FurnitureOverlay item={infoFurniture} onDragStart={onDragFurnitureStart} onUnplace={onUnplaceFurniture} />
        )}
      </Canvas>
    </div>
  );
}
