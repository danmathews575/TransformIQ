import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/AppShell";

export const Route = createFileRoute("/consultant")({
  head: () => ({
    meta: [
      { title: "AI Consultant — TransformIQ" },
      { name: "description", content: "AI Consultant in TransformIQ, AI transformation intelligence for e-commerce." },
      { property: "og:title", content: "AI Consultant — TransformIQ" },
      { property: "og:description", content: "AI Consultant in TransformIQ, AI transformation intelligence for e-commerce." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { topic?: string } =>
    typeof s["topic"] === "string" ? { topic: s["topic"] } : {},
  component: () => <ComingNext title="AI Consultant" />,
});
