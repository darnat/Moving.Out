import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/app/components/Nav";
import { SettingsClient } from "@/app/settings/SettingsClient";
import { SignOutButton } from "./SignOutButton";
import { getCachedBoxSizes, getCachedRooms, getCachedStorageUnit } from "@/lib/data";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;
  const user   = session.user;

  const [boxSizes, rooms, storageUnit] = await Promise.all([
    getCachedBoxSizes(userId),
    getCachedRooms(userId),
    getCachedStorageUnit(userId),
  ]);

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?";

  return (
    <div className="min-h-screen">
      <Nav active="profile" />
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">

        {/* Profile card */}
        <div
          className="rounded-3xl p-5 glass"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
        >
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="w-14 h-14 rounded-full object-cover shrink-0"
                style={{ border: "1px solid var(--color-kraft)" }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold text-white shrink-0"
                style={{ background: "var(--color-freight)" }}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-base leading-tight truncate" style={{ color: "var(--color-ink)" }}>
                {user.name}
              </p>
              <p className="text-sm mt-0.5 truncate" style={{ color: "var(--color-pencil)" }}>
                {user.email}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>

        {/* Settings card */}
        <div
          className="rounded-3xl p-5 glass"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-kraft)" }}
        >
          <h2
            className="font-display font-semibold text-base mb-5"
            style={{ color: "var(--color-ink)" }}
          >
            Settings
          </h2>
          <SettingsClient
            boxSizes={boxSizes}
            rooms={rooms}
            storageUnit={
              storageUnit ?? { widthCells: 10, depthCells: 20, heightCells: 8, id: "", userId }
            }
          />
        </div>
      </main>
    </div>
  );
}
