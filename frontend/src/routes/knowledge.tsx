import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/AppShell";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Center — TransformIQ" },
      { name: "description", content: "Knowledge Center in TransformIQ, AI transformation intelligence for e-commerce." },
      { property: "og:title", content: "Knowledge Center — TransformIQ" },
      { property: "og:description", content: "Knowledge Center in TransformIQ, AI transformation intelligence for e-commerce." },
    ],
  }),
  component: () => <ComingNext title="Knowledge Center" />,
});
