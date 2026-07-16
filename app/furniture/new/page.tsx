import { Nav } from "@/app/components/Nav";
import { NewFurnitureForm } from "./NewFurnitureForm";

export default function NewFurniturePage() {
  return (
    <div className="min-h-screen">
      <Nav active="furniture" />
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <h1 className="font-display font-semibold text-2xl" style={{ color: "var(--color-ink)" }}>
          Add furniture
        </h1>
        <NewFurnitureForm />
      </main>
    </div>
  );
}
