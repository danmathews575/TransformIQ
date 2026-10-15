import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, ClipboardList, Lightbulb, Calculator, Map, MessageSquare, BookOpen, Settings, Bell, ChevronDown, Bot, X,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { currentUser, workspaces } from "@/data/mockData";

export const navItems = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Assessments", url: "/assessments", icon: ClipboardList },
  { title: "AI Opportunities", url: "/opportunities", icon: Lightbulb },
  { title: "ROI & Business Cases", url: "/roi", icon: Calculator },
  { title: "Roadmap", url: "/roadmap", icon: Map },
  { title: "AI Consultant", url: "/consultant", icon: MessageSquare },
  { title: "Knowledge Center", url: "/knowledge", icon: BookOpen },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

function titleFor(path: string) {
  if (path === "/") return "Overview";
  if (path.startsWith("/assessments/new")) return "New Assessment";
  const m = navItems.find((i) => i.url !== "/" && path.startsWith(i.url));
  return m?.title ?? "TransformIQ";
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [ws, setWs] = useState(workspaces[0]);
  const [chatOpen, setChatOpen] = useState(false);
  const isActive = (u: string) => (u === "/" ? path === "/" : path.startsWith(u));

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader className="px-3 py-4">
            <div className="flex items-center gap-2 font-semibold">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">TQ</span>
              <span className="truncate group-data-[collapsible=icon]:hidden">TransformIQ</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                        <Link to={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger />
            <h1 className="text-base font-semibold">{titleFor(path)}</h1>
            <Badge variant="outline" className="hidden text-muted-foreground sm:inline-flex">Sample data</Badge>
            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                    {ws} <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                  {workspaces.map((w) => (
                    <DropdownMenuItem key={w} onClick={() => setWs(w)}>{w}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full" aria-label="User menu">
                  <Avatar className="h-8 w-8"><AvatarFallback className="bg-accent text-xs text-accent-foreground">{currentUser.initials}</AvatarFallback></Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{currentUser.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
                  <DropdownMenuItem>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>

      <Button onClick={() => setChatOpen(true)} size="icon" className="fixed bottom-5 right-5 h-12 w-12 rounded-full shadow-md" aria-label="Open assistant">
        <Bot className="h-5 w-5" />
      </Button>
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent className="flex flex-col">
          <SheetHeader><SheetTitle>AI Assistant</SheetTitle></SheetHeader>
          <div className="flex-1 space-y-3 overflow-y-auto text-sm">
            <div className="max-w-[85%] rounded-lg bg-muted p-3">Hi Priya — what would you like to explore today?</div>
            <div className="ml-auto max-w-[85%] rounded-lg bg-primary p-3 text-primary-foreground">Where should we start with AI?</div>
            <div className="max-w-[85%] rounded-lg bg-muted p-3">Based on your latest assessment, Customer Support Automation has the highest priority score (92) with an estimated 7-month payback.</div>
          </div>
          <Button asChild onClick={() => setChatOpen(false)}>
            <Link to="/consultant">Open full consultant</Link>
          </Button>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}

export function ComingNext({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border bg-card p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">Coming next.</p>
    </div>
  );
}
