import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/AppShell";

export const Route = createFileRoute("/roi")({
  head: () => ({
    meta: [
      { title: "ROI & Business Cases — TransformIQ" },
      { name: "description", content: "ROI & Business Cases in TransformIQ, AI transformation intelligence for e-commerce." },
      { property: "og:title", content: "ROI & Business Cases — TransformIQ" },
      { property: "og:description", content: "ROI & Business Cases in TransformIQ, AI transformation intelligence for e-commerce." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { opportunity?: string } =>
    typeof s["opportunity"] === "string" ? { opportunity: s["opportunity"] } : {},
  component: () => <ComingNext title="ROI & Business Cases" />,
});
