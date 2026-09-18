/**
 * Layout — fixed sidebar + sticky header shell.
 *
 * Sidebar: PIPELINE wordmark, primary nav, active item marked with the deep
 * ink-teal rounded rect. Header: page title, as-of date, theme toggle.
 * Content sits on `bg-background`; header and sidebar are visually distinct.
 */

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListFilter,
  Moon,
  Sun,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Route prefixes that should also mark this item active. */
  match: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Overview",
    icon: LayoutDashboard,
    match: ["/"],
  },
  {
    to: "/deals",
    label: "Deals",
    icon: ListFilter,
    match: ["/deals"],
  },
  {
    to: "/weekly",
    label: "Weekly Review",
    icon: TrendingUp,
    match: ["/weekly"],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.to === "/") return pathname === "/";
  return item.match.some((prefix) => pathname.startsWith(prefix));
}

export interface LayoutProps {
  title: string;
  /** Short context line under the title, e.g. the forecast as-of date. */
  subtitle?: string;
  /** Page-level actions rendered at the right of the header. */
  actions?: ReactNode;
  children: ReactNode;
}

export function Layout({ title, subtitle, actions, children }: LayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const asOf = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <span
            className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"
            aria-hidden="true"
          >
            <TrendingUp className="size-4" />
          </span>
          <span className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-sidebar-foreground">
            Pipeline
          </span>
        </div>

        <nav
          className="flex flex-1 flex-col gap-1 p-3"
          aria-label="Primary"
          data-ocid="nav.primary"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                data-ocid={`nav.${item.label.toLowerCase().replace(/\s+/g, "_")}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-smooth",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-subtle"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <p className="label-section">Data source</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Synthetic CRM dataset · 100–200 deals
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 lg:px-10">
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {subtitle ?? `As of ${asOf}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {actions}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                aria-label={
                  theme === "dark"
                    ? "Switch to light theme"
                    : "Switch to dark theme"
                }
                data-ocid="theme.toggle"
                className="rounded-md"
              >
                {theme === "dark" ? (
                  <Sun className="size-4" aria-hidden="true" />
                ) : (
                  <Moon className="size-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile nav */}
          <nav
            className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden"
            aria-label="Primary mobile"
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-smooth",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 px-6 py-6 lg:px-10 lg:py-8">{children}</main>

        <footer className="border-t border-border bg-muted/40 px-6 py-4 lg:px-10">
          <p className="text-xs text-muted-foreground">
            Pipeline forecasting dashboard · figures are model estimates with a
            confidence range, not commitments.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                typeof window === "undefined" ? "" : window.location.hostname,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 transition-smooth hover:text-foreground"
            >
              © {new Date().getFullYear()}. Built with love using caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
