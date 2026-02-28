import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Technický audit | Agency Ops",
};

export default function TechnicalAuditPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Technický audit</h1>
      <p className="mt-2 text-foreground-secondary">
        SEO technický audit webových stránek.
      </p>
    </div>
  );
}
