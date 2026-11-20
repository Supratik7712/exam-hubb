import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, BookOpen, ClipboardList, BarChart3, MessageSquare, Award, Sparkles, Users, FileQuestion,
  Activity, Settings, UserCircle, LogOut, Menu, Bell, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { homePathFor, type AppRole, type Me } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = { label: string; icon: LucideIcon; to?: string; soon?: boolean };

const NAV: Record<AppRole, NavItem[]> = {
  student: [
    { label: "Dashboard", icon: LayoutDashboard, to: "/student" },
    { label: "Available exams", icon: BookOpen, to: "/student/exams" },
    { label: "Results", icon: ClipboardList, to: "/student/results" },
    { label: "Performance", icon: BarChart3, soon: true },
    { label: "Recommendations", icon: Sparkles, soon: true },
    { label: "Certificates", icon: Award, soon: true },
    { label: "Feedback", icon: MessageSquare, soon: true },
    { label: "Profile", icon: UserCircle, to: "/profile" },
  ],
  teacher: [
    { label: "Dashboard", icon: LayoutDashboard, to: "/teacher" },
    { label: "Exams", icon: BookOpen, to: "/teacher/exams" },
    { label: "Question bank", icon: FileQuestion, to: "/teacher/questions" },
    { label: "AI generator", icon: Sparkles, soon: true },
    { label: "Results", icon: ClipboardList, to: "/teacher/results" },
    { label: "Monitoring", icon: Activity, soon: true },
    { label: "Profile", icon: UserCircle, to: "/profile" },
  ],
  admin: [
    { label: "Overview", icon: LayoutDashboard, to: "/admin" },
    { label: "Users", icon: Users, to: "/admin/users" },
    { label: "All exams", icon: BookOpen, to: "/admin/exams" },
    { label: "Feedback", icon: MessageSquare, soon: true },
    { label: "Reports", icon: BarChart3, soon: true },
    { label: "Settings", icon: Settings, soon: true },
    { label: "Profile", icon: UserCircle, to: "/profile" },
  ],
};

function SideNav({ role, onNavigate }: { role: AppRole; onNavigate?: (() => void) | undefined }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV[role].map((item) =>
        item.to ? (
          <Link key={item.label} to={item.to} onClick={onNavigate} activeOptions={{ exact: true }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent !text-sidebar-accent-foreground font-semibold" }}>
            <item.icon className="size-4" />{item.label}
          </Link>
        ) : (
          <span key={item.label} aria-disabled className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/40">
            <item.icon className="size-4" />{item.label}
            <span className="ml-auto rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Soon</span>
          </span>
        ),
      )}
    </nav>
  );
}

export function AppShell({ me, role, title, children }: { me: Me; role: AppRole; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const name = me.profile?.full_name || me.email || "Account";

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col gap-6 bg-sidebar py-5 text-sidebar-foreground">
      <div className="px-6"><Logo inverted /></div>
      <p className="px-6 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">{role} workspace</p>
      <SideNav role={role} onNavigate={onNavigate} />
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebar()}</aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebar(() => setOpen(false))}
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></Button>
          <h1 className="truncate text-lg font-bold">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notifications"><Bell /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-sm">
                  <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{name.charAt(0).toUpperCase()}</span>
                  <span className="hidden max-w-32 truncate sm:inline">{name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{me.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {me.roles.filter(assignedRole => assignedRole !== role).map(assignedRole => (
                  <DropdownMenuItem key={assignedRole} asChild>
                    <Link to={homePathFor(me, assignedRole)}><LayoutDashboard className="size-4" /><span className="capitalize">{assignedRole} dashboard</span></Link>
                  </DropdownMenuItem>
                ))}
                {!me.roles.includes("teacher") && me.profile?.account_status === "active" && (
                  <DropdownMenuItem asChild><Link to="/teacher-access"><LayoutDashboard className="size-4" />Teacher dashboard</Link></DropdownMenuItem>
                )}
                <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive"><LogOut className="size-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className={cn("flex-1 p-4 md:p-8")}>{children}</main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: ReactNode; hint?: string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground"><Icon className="size-4" /></span>
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card p-10 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
