import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Agency Ops",
};

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-foreground-secondary">
        Vítejte v Agency Ops
      </p>
    </div>
  );
}
