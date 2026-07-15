"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Box, BoxSize, Room } from "@/app/generated/prisma/client";
import { placeBox, unplaceBox } from "@/lib/actions/grid";
import { setRetrieved } from "@/lib/actions/boxes";

type BoxWithRelations = Box & { boxSize: BoxSize; room: Room };

type CellInfo = {
  col: number;
  row: number;
  box?: BoxWithRelations;
};

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

  // Precompute a cell→box map so each render is O(placedBoxes) instead of
  // O(placedBoxes × gridCells).
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

  function getBoxAtCell(col: number, row: number): BoxWithRelations | undefined {
    return cellMap.get(`${col}-${row}`);
  }

  function handleCellClick(col: number, row: number) {
    setError("");
    if (mode === "place" && selectedBox) {
      setCellInfo({ col, row });
      return;
    }
    const box = getBoxAtCell(col, row);
    if (box) {
      setCellInfo({ col, row, box });
    } else {
      setCellInfo(null);
    }
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

  const cellSize = Math.max(40, Math.min(60, Math.floor(640 / widthCells)));

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      <div className="flex-1 min-w-0 overflow-auto">
        <div
          className="inline-grid border border-gray-300"
          style={{ gridTemplateColumns: `repeat(${widthCells}, ${cellSize}px)` }}
        >
          {rows.flatMap((row) =>
            cols.map((col) => {
              const box = getBoxAtCell(col, row);
              const isOriginCell = box && box.gridCol === col && box.gridRow === row;
              const isSelected = selectedBox !== null && mode === "place";
              return (
                <div
                  key={`${col}-${row}`}
                  data-testid={`grid-cell-${col}-${row}`}
                  onClick={() => handleCellClick(col, row)}
                  style={{ width: cellSize, height: cellSize }}
                  className={[
                    "border border-gray-200 flex items-center justify-center cursor-pointer text-xs select-none overflow-hidden",
                    box ? "bg-blue-100 hover:bg-blue-200" : "hover:bg-gray-50",
                    isSelected ? "hover:bg-green-100" : "",
                  ].join(" ")}
                >
                  {isOriginCell && (
                    <span className="text-center leading-tight font-medium text-blue-800 p-0.5 truncate w-full text-center">
                      {box.labelNumber}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="w-full lg:w-64 space-y-4">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Unplaced boxes</h2>
          <ul data-testid="unplaced-list" className="space-y-1">
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
                  className={[
                    "w-full rounded border px-3 py-2 text-left text-sm",
                    selectedBox?.id === b.id
                      ? "border-blue-500 bg-blue-50 font-medium"
                      : "hover:bg-gray-50",
                  ].join(" ")}
                >
                  {b.labelNumber}
                  <span className="ml-2 text-xs text-gray-400">{b.room.name}</span>
                </button>
              </li>
            ))}
            {unplacedBoxes.length === 0 && (
              <li className="text-xs text-gray-400">All boxes placed</li>
            )}
          </ul>
        </section>

        {mode === "place" && selectedBox && cellInfo && (
          <section className="rounded-lg border p-3 space-y-3 bg-green-50">
            <p className="text-sm font-medium">
              Place <strong>{selectedBox.labelNumber}</strong> at Col {cellInfo.col}, Row{" "}
              {cellInfo.row}
            </p>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Stack level</label>
              <input
                type="number"
                min={1}
                value={stackLevel}
                onChange={(e) => setStackLevel(e.target.value)}
                data-testid="stack-level-input"
                className="w-full rounded border px-3 py-1.5 text-sm"
              />
            </div>
            {error && (
              <p data-testid="placement-error" className="text-xs text-red-600">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleConfirmPlacement}
                data-testid="confirm-placement-btn"
                className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
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
                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {cellInfo?.box && mode === "view" && (
          <section
            data-testid="cell-info-panel"
            className="rounded-lg border p-3 space-y-2"
          >
            <p className="font-medium text-sm">{cellInfo.box.labelNumber}</p>
            <p className="text-xs text-gray-500">
              {cellInfo.box.room.name} · {cellInfo.box.boxSize.name}
            </p>
            <p className="text-xs text-gray-400">
              Col {cellInfo.col} · Row {cellInfo.row} · Level {cellInfo.box.stackLevel}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleRetrieve}
                data-testid="retrieve-btn"
                className="flex-1 rounded border px-2 py-1.5 text-xs font-medium hover:bg-gray-50"
              >
                Retrieved
              </button>
              <button
                onClick={handleUnplace}
                data-testid="unplace-btn"
                className="rounded border px-2 py-1.5 text-xs hover:bg-gray-50"
              >
                Unplace
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
