import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nastavení | Agency Ops",
};

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Nastavení</h1>
      <p className="mt-2 text-foreground-secondary">
        Správa účtu a nastavení aplikace.
      </p>
    </div>
  );
}
