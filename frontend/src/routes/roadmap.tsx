import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/AppShell";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap — TransformIQ" },
      { name: "description", content: "Roadmap in TransformIQ, AI transformation intelligence for e-commerce." },
      { property: "og:title", content: "Roadmap — TransformIQ" },
      { property: "og:description", content: "Roadmap in TransformIQ, AI transformation intelligence for e-commerce." },
    ],
  }),
  component: () => <ComingNext title="Roadmap" />,
});
