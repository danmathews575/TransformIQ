import { createFileRoute } from "@tanstack/react-router";
import { OpportunitiesView } from "@/components/OpportunitiesView";

export const Route = createFileRoute("/opportunities/")({
  head: () => ({
    meta: [
      { title: "AI Opportunities — TransformIQ" },
      { name: "description", content: "Ranked AI opportunities with estimated value, feasibility and payback." },
      { property: "og:title", content: "AI Opportunities — TransformIQ" },
      { property: "og:description", content: "Ranked AI opportunities with estimated value, feasibility and payback." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { function?: string } =>
    typeof s["function"] === "string" ? { function: s["function"] } : {},
  component: Page,
});

function Page() {
  const { function: fn } = Route.useSearch();
  return <OpportunitiesView key={fn ?? "all"} initialFunction={fn} />;
}
