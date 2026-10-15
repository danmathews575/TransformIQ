import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { assessments, type Assessment } from "@/data/mockData";

export const Route = createFileRoute("/assessments/")({
  head: () => ({
    meta: [
      { title: "Assessments — TransformIQ" },
      { name: "description", content: "All AI readiness assessments for your business." },
      { property: "og:title", content: "Assessments — TransformIQ" },
      { property: "og:description", content: "All AI readiness assessments for your business." },
    ],
  }),
  component: AssessmentsPage,
});

const cols: { key: keyof Assessment; label: string }[] = [
  { key: "name", label: "Business" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "opportunitiesCount", label: "Opportunities" },
  { key: "valuePotential", label: "Est. value potential" },
  { key: "topOpportunity", label: "Top opportunity" },
];
const sortVal = (a: Assessment, k: keyof Assessment) => {
  if (k === "date") return Date.parse(a.date);
  if (k === "valuePotential") return parseFloat(a.valuePotential.replace(/[^0-9.]/g, "")) || 0;
  return a[k];
};

function AssessmentsPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: keyof Assessment; dir: 1 | -1 }>({ key: "date", dir: -1 });
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return assessments
      .filter((a) => !t || [a.name, a.status, a.topOpportunity, a.date].some((v) => v.toLowerCase().includes(t)))
      .sort((a, b) => {
        const av = sortVal(a, sort.key), bv = sortVal(b, sort.key);
        return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
      });
  }, [q, sort]);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search assessments" placeholder="Search assessments" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Button asChild><Link to="/assessments/new"><Plus className="h-4 w-4" /> New Assessment</Link></Button>
      </div>
      <Card className="shadow-none">
        <CardContent className="p-4">
          {rows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium">No assessments found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search term.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setQ("")}>Clear search</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {cols.map((c) => (
                    <TableHead key={c.key}>
                      <button className="inline-flex items-center gap-1 rounded hover:text-foreground"
                        onClick={() => setSort((s) => (s.key === c.key ? { key: c.key, dir: (s.dir * -1) as 1 | -1 } : { key: c.key, dir: 1 }))}>
                        {c.label}
                        {sort.key === c.key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </TableHead>
                  ))}
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.date}</TableCell>
                    <TableCell><Badge variant={a.status === "Completed" ? "secondary" : "outline"}>{a.status}</Badge></TableCell>
                    <TableCell>{a.opportunitiesCount}</TableCell>
                    <TableCell>{a.valuePotential}</TableCell>
                    <TableCell>{a.topOpportunity}</TableCell>
                    <TableCell className="text-right">
                      {a.status === "Completed" ? (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/assessments/$id/results" params={{ id: a.id }}>Open report</Link>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" disabled>Open report</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
