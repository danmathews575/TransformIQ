import { createFileRoute, notFound } from "@tanstack/react-router";
import { OpportunitiesView } from "@/components/OpportunitiesView";
import { assessments } from "@/data/mockData";

export const Route = createFileRoute("/assessments/$id/results")({
  loader: ({ params }) => {
    const a = assessments.find((x) => x.id === params.id);
    if (!a) throw notFound();
    return a;
  },
  head: () => ({
    meta: [
      { title: "Assessment results — TransformIQ" },
      { name: "description", content: "AI opportunity results for your assessment, with estimated value and readiness." },
      { property: "og:title", content: "Assessment results — TransformIQ" },
      { property: "og:description", content: "AI opportunity results for your assessment." },
    ],
  }),
  component: () => <OpportunitiesView />,
});
