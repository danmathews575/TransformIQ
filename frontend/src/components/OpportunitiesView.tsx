import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dataLimitations, formatUSD, functions, kpis, opportunities, overallReadinessPct, type Opportunity } from "@/data/mockData";

type Col = { key: keyof Opportunity; label: string; fmt?: (o: Opportunity) => string; right?: boolean };
const cols: Col[] = [
  { key: "name", label: "Opportunity" },
  { key: "function", label: "Function" },
  { key: "impact", label: "Impact" },
  { key: "feasibility", label: "Feasibility", right: true },
  { key: "effort", label: "Effort" },
  { key: "investmentUSD", label: "Est. investment", right: true, fmt: (o) => formatUSD(o.investmentUSD) },
  { key: "netAnnualBenefitUSD", label: "Est. net benefit/yr", right: true, fmt: (o) => formatUSD(o.netAnnualBenefitUSD) },
  { key: "paybackMonths", label: "Payback (mo)", right: true },
  { key: "priorityScore", label: "Score", right: true },
];
const levelRank: Record<string, number> = { Low: 1, Medium: 2, High: 3 };

export function OpportunitiesView({ initialFunction }: { initialFunction?: string | undefined }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [fn, setFn] = useState(initialFunction && functions.includes(initialFunction) ? initialFunction : "all");
  const [effort, setEffort] = useState("all");
  const [group, setGroup] = useState(false);
  const [sort, setSort] = useState<{ key: keyof Opportunity; dir: 1 | -1 }>({ key: "priorityScore", dir: -1 });

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return opportunities
      .filter((o) => (fn === "all" || o.function === fn) && (effort === "all" || o.effort === effort))
      .filter((o) => !t || o.name.toLowerCase().includes(t) || o.function.toLowerCase().includes(t))
      .sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key];
        const an = typeof av === "number" ? av : levelRank[String(av)] ?? String(av);
        const bn = typeof bv === "number" ? bv : levelRank[String(bv)] ?? String(bv);
        return (an < bn ? -1 : an > bn ? 1 : 0) * sort.dir;
      });
  }, [q, fn, effort, sort]);

  const groups = group
    ? functions.map((f) => ({ name: f, items: rows.filter((r) => r.function === f) })).filter((g) => g.items.length)
    : [{ name: "", items: rows }];

  const top = [...opportunities].sort((a, b) => b.priorityScore - a.priorityScore)[0]!;
  const summary = [
    { label: "Opportunities identified", value: String(opportunities.length) },
    { label: "Estimated value potential", value: kpis.estimatedAnnualValue, note: "Estimated, per year" },
    { label: "Overall readiness", value: `${overallReadinessPct}%` },
    { label: "Top opportunity", value: top.name, small: true },
  ];

  const toggleSort = (key: keyof Opportunity) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label} className="shadow-none">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={s.small ? "mt-1 text-sm font-semibold" : "mt-1 text-2xl font-semibold"}>{s.value}</p>
              {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 rounded-lg border bg-muted p-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p><span className="font-medium">Data limitations: </span><span className="text-muted-foreground">{dataLimitations}</span></p>
      </div>

      <Card className="shadow-none">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-52 flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input aria-label="Search opportunities" placeholder="Search opportunities" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
            </div>
            <Select value={fn} onValueChange={setFn}>
              <SelectTrigger className="w-44" aria-label="Business function"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All functions</SelectItem>
                {functions.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={effort} onValueChange={setEffort}>
              <SelectTrigger className="w-36" aria-label="Effort"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All effort</SelectItem>
                {["Low", "Medium", "High"].map((e) => <SelectItem key={e} value={e}>{e} effort</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch id="group" checked={group} onCheckedChange={setGroup} />
              <Label htmlFor="group" className="text-sm">Group by function</Label>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No opportunities match your filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {cols.map((c) => (
                    <TableHead key={c.key} className={c.right ? "text-right" : ""}>
                      <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 rounded hover:text-foreground">
                        {c.label}
                        {sort.key === c.key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => [
                  g.name && (
                    <TableRow key={`g-${g.name}`} className="bg-muted hover:bg-muted">
                      <TableCell colSpan={cols.length} className="py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.name} · {g.items.length}</TableCell>
                    </TableRow>
                  ),
                  ...g.items.map((o) => (
                    <TableRow key={o.id} tabIndex={0} className="cursor-pointer"
                      onClick={() => navigate({ to: "/opportunities/$id", params: { id: o.id } })}
                      onKeyDown={(e) => e.key === "Enter" && navigate({ to: "/opportunities/$id", params: { id: o.id } })}>
                      {cols.map((c) => (
                        <TableCell key={c.key} className={c.right ? "text-right tabular-nums" : c.key === "name" ? "font-medium" : ""}>
                          {c.key === "impact" ? <Badge variant={o.impact === "High" ? "default" : o.impact === "Medium" ? "secondary" : "outline"}>{o.impact}</Badge>
                            : c.fmt ? c.fmt(o) : String(o[c.key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  )),
                ])}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground">All financial figures are estimates, not guaranteed results.</p>
        </CardContent>
      </Card>
    </div>
  );
}
