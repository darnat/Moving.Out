"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Box, BoxSize, Room } from "@/app/generated/prisma/client";
import { placeBox, unplaceBox } from "@/lib/actions/grid";
import { setRetrieved } from "@/lib/actions/boxes";

type BoxWithRelations = Box & { boxSize: BoxSize; room: Room };
type CellInfo = { col: number; row: number; box?: BoxWithRelations };

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
  const [selectedBox, setSelectedBox] = useState<BoxWithRelations | null>(null);
  const [stackLevel, setStackLevel] = useState("1");
  const [cellInfo, setCellInfo] = useState<CellInfo | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"view" | "place">("view");

  const placedBoxes = boxes.filter((b) => b.gridCol !== null);
  const unplacedBoxes = boxes.filter((b) => b.gridCol === null);

  const cellMap = useMemo(() => {
    const map = new Map<string, BoxWithRelations>();
    for (const b of placedBoxes) {
      const { widthCells: w, depthCells: d } = b.boxSize;
      for (let dc = 0; dc < w; dc++) {
        for (let dr = 0; dr < d; dr++) {
          map.set(`${b.gridCol! + dc}-${b.gridRow! + dr}`, b);
        }
      }
    }
    return map;
  }, [placedBoxes]);

  function getBoxAtCell(col: number, row: number) {
    return cellMap.get(`${col}-${row}`);
  }

  function handleCellClick(col: number, row: number) {
    setError("");
    if (mode === "place" && selectedBox) {
      setCellInfo({ col, row });
      return;
    }
    const box = getBoxAtCell(col, row);
    setCellInfo(box ? { col, row, box } : null);
  }

  async function handleConfirmPlacement() {
    if (!selectedBox || !cellInfo) return;
    const level = Number(stackLevel);
    if (!level || level < 1) {
      setError("Stack level must be 1 or higher");
      return;
    }
    const result = await placeBox(selectedBox.id, cellInfo.col, cellInfo.row, level);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSelectedBox(null);
    setCellInfo(null);
    setMode("view");
    router.refresh();
  }

  async function handleUnplace() {
    if (!cellInfo?.box) return;
    await unplaceBox(cellInfo.box.id);
    setCellInfo(null);
    router.refresh();
  }

  async function handleRetrieve() {
    if (!cellInfo?.box) return;
    await setRetrieved(cellInfo.box.id, true);
    setCellInfo(null);
    router.refresh();
  }

  const cols = Array.from({ length: widthCells }, (_, i) => i);
  const rows = Array.from({ length: depthCells }, (_, i) => i);
  const cellSize = Math.max(36, Math.min(56, Math.floor(580 / widthCells)));

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* Grid — the signature element: dot-paper floor plan */}
      <div className="flex-1 min-w-0 overflow-auto">
        <div
          className="relative inline-block rounded-xl p-3"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-kraft)",
            // Dot-grid background — makes it feel like a blueprint/floor plan sketch
            backgroundImage:
              "radial-gradient(circle, var(--color-kraft) 1px, transparent 1px)",
            backgroundSize: "12px 12px",
            backgroundPosition: "6px 6px",
          }}
        >
          <div
            className="inline-grid"
            style={{ gridTemplateColumns: `repeat(${widthCells}, ${cellSize}px)` }}
          >
            {rows.flatMap((row) =>
              cols.map((col) => {
                const box = getBoxAtCell(col, row);
                const isOrigin = box?.gridCol === col && box?.gridRow === row;
                const isPlaceTarget =
                  mode === "place" && cellInfo?.col === col && cellInfo?.row === row;

                return (
                  <div
                    key={`${col}-${row}`}
                    data-testid={`grid-cell-${col}-${row}`}
                    onClick={() => handleCellClick(col, row)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: isPlaceTarget
                        ? "color-mix(in srgb, var(--color-freight) 20%, transparent)"
                        : box
                        ? "color-mix(in srgb, var(--color-freight) 15%, var(--color-surface))"
                        : "transparent",
                      border: box
                        ? "1px solid color-mix(in srgb, var(--color-freight) 35%, transparent)"
                        : "1px solid var(--color-kraft)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      transition: "background 0.1s",
                    }}
                  >
                    {isOrigin && (
                      <span
                        className="label-number font-semibold text-center leading-tight px-0.5"
                        style={{
                          fontSize: Math.max(8, cellSize / 5),
                          color: "var(--color-freight)",
                        }}
                      >
                        {box.labelNumber}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-60 space-y-4 shrink-0">
        {/* Unplaced list */}
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
                    setCellInfo(null);
                    setError("");
                  }}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
                  style={{
                    background:
                      selectedBox?.id === b.id
                        ? "var(--color-freight-tint)"
                        : "var(--color-surface)",
                    border:
                      selectedBox?.id === b.id
                        ? "1px solid color-mix(in srgb, var(--color-freight) 40%, transparent)"
                        : "1px solid var(--color-kraft)",
                  }}
                >
                  <span
                    className="label-number font-semibold block text-sm"
                    style={{
                      color:
                        selectedBox?.id === b.id ? "var(--color-freight)" : "var(--color-ink)",
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
        {mode === "place" && selectedBox && cellInfo && (
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
              at ({cellInfo.col}, {cellInfo.row})
            </p>
            <div>
              <label
                className="block text-xs mb-1"
                style={{ color: "var(--color-pencil)" }}
              >
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
                onClick={() => {
                  setSelectedBox(null);
                  setMode("view");
                  setCellInfo(null);
                  setError("");
                }}
                className="rounded-lg px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--color-kraft)",
                  color: "var(--color-pencil)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Cell info panel */}
        {cellInfo?.box && mode === "view" && (
          <div
            data-testid="cell-info-panel"
            className="rounded-xl p-4 space-y-2"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-kraft)",
            }}
          >
            <div>
              <p
                className="label-number font-bold text-lg leading-none"
                style={{ color: "var(--color-ink)" }}
              >
                {cellInfo.box.labelNumber}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-pencil)" }}>
                {cellInfo.box.room.name} · {cellInfo.box.boxSize.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-pencil)" }}>
                Col {cellInfo.col} · Row {cellInfo.row} · Level {cellInfo.box.stackLevel}
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
                style={{
                  border: "1px solid var(--color-kraft)",
                  color: "var(--color-pencil)",
                }}
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
