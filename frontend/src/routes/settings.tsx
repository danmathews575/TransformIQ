import { createFileRoute } from "@tanstack/react-router";
import { ComingNext } from "@/components/AppShell";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TransformIQ" },
      { name: "description", content: "Settings in TransformIQ, AI transformation intelligence for e-commerce." },
      { property: "og:title", content: "Settings — TransformIQ" },
      { property: "og:description", content: "Settings in TransformIQ, AI transformation intelligence for e-commerce." },
    ],
  }),
  component: () => <ComingNext title="Settings" />,
});
