"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Badge, RoleChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/lib/AuthProvider";
import { cx, initials } from "@/lib/format";

import { NAV } from "./nav";

const COLLAPSE_KEY = "portal.sidebar.collapsed";

export function PortalShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // storage unavailable — keep expanded
    }
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        // ignore
      }
      return !c;
    });
  }

  return (
    <div className="min-h-screen bg-page">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow-lift"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[72px]" : "w-60"
        )}
      >
        <SidebarContent collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 animate-slide-in-left flex-col bg-white shadow-lift">
            <SidebarContent collapsed={false} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className={cx("transition-[padding] duration-200 ease-out", collapsed ? "lg:pl-[72px]" : "lg:pl-60")}>
        <TopBar onMenu={() => setMobileOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  collapsed,
  onToggle,
  onClose,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { canWrite, role } = useAuth();

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className={cx("flex h-16 items-center gap-2.5 border-b border-slate-100", collapsed ? "justify-center px-2" : "px-5")}>
        <Logo />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="font-display text-[17px] font-semibold leading-none text-slate-900">Mendyr</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">Admin console</p>
          </div>
        )}
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close navigation">
            <Icon name="x" size={18} />
          </Button>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
        {NAV.map((group) => {
          const items = group.items.filter((i) => !i.adminOnly || canWrite);
          if (!items.length) return null;
          return (
            <div key={group.section} className="mb-5">
              {!collapsed ? (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.section}</p>
              ) : (
                <div className="mx-auto mb-2 h-px w-6 bg-slate-200" />
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = [item.href, ...(item.also ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cx(
                          "group flex items-center gap-3 rounded-xl text-sm font-medium transition-colors",
                          collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
                          active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <Icon
                          name={item.icon}
                          size={18}
                          className={active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {collapsed && <span className="sr-only">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {!canWrite && role && !collapsed && (
          <p className="mx-3 rounded-xl bg-warning-50 px-3 py-2 text-xs leading-relaxed text-warning-700">
            Ops access: you can view everything and manage bookings. Reviews, suspensions and config need an admin.
          </p>
        )}
      </nav>

      {onToggle && (
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={cx(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              collapsed && "justify-center px-0"
            )}
          >
            <Icon name="chevrons-left" size={18} className={cx("transition-transform", collapsed && "rotate-180")} />
            {!collapsed && "Collapse"}
          </button>
        </div>
      )}
    </>
  );
}

function Logo() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-sm">
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 18V7l8 7 8-7v11" />
      </svg>
    </span>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { me, role, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Icon name="menu" size={20} />
      </Button>
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 hover:bg-slate-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initials(me?.full_name ?? role ?? "A")}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-[160px] truncate text-sm font-medium leading-tight text-slate-800">
                {me?.full_name ?? "Signed in"}
              </span>
            </span>
            {role && (
              <span className="hidden sm:block">
                <RoleChip role={role} />
              </span>
            )}
            <Icon name="chevron-down" size={16} className="text-slate-400" />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-12 w-64 animate-pop-in rounded-card border border-slate-200 bg-white p-2 shadow-lift">
              <div className="border-b border-slate-100 px-3 pb-3 pt-1">
                <p className="truncate text-sm font-semibold text-slate-900">{me?.full_name ?? "Admin"}</p>
                {me?.email && <p className="truncate text-xs text-slate-500">{me.email}</p>}
                {role && (
                  <div className="mt-2">
                    <RoleChip role={role} />
                  </div>
                )}
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Icon name="logout" size={16} className="text-slate-400" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/** Jump to a booking (by code) or search users / professionals / bookings by name or phone. */
function GlobalSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = value.trim();
  const looksLikeCode = /^mndyr-?/i.test(q) || /^[A-Z0-9]{6}$/.test(q);

  const options = q
    ? [
        { href: `/bookings?q=${encodeURIComponent(q)}`, label: `Bookings matching “${q}”`, icon: "calendar" as const },
        { href: `/users?q=${encodeURIComponent(q)}`, label: `Users matching “${q}”`, icon: "users" as const },
        { href: `/professionals?q=${encodeURIComponent(q)}`, label: `Professionals matching “${q}”`, icon: "stethoscope" as const },
      ]
    : [];
  if (!looksLikeCode && options.length) options.push(options.shift()!);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    router.push(href);
    setOpen(false);
    setValue("");
    inputRef.current?.blur();
  }

  return (
    <div className="relative w-full max-w-md">
      <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!options.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % options.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + options.length) % options.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(options[active]!.href);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search booking code, name or phone"
        aria-label="Search bookings, users and professionals"
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls="global-search-list"
        aria-autocomplete="list"
        className="h-10 w-full rounded-input border border-slate-200 bg-slate-50 pl-9 pr-14 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 sm:block">
        <Badge>⌘K</Badge>
      </span>
      {open && options.length > 0 && (
        <ul
          id="global-search-list"
          role="listbox"
          className="absolute left-0 right-0 top-12 z-30 animate-pop-in rounded-card border border-slate-200 bg-white p-1.5 shadow-lift"
        >
          {options.map((o, i) => (
            <li key={o.href} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(o.href)}
                onMouseEnter={() => setActive(i)}
                className={cx(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm",
                  i === active ? "bg-brand-50 text-brand-800" : "text-slate-700"
                )}
              >
                <Icon name={o.icon} size={16} className="text-slate-400" />
                <span className="truncate">{o.label}</span>
                {i === active && <Icon name="arrow-right" size={14} className="ml-auto text-brand-500" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
