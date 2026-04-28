"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  Download,
  FolderKanban,
  House,
  Languages,
  Settings,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { Button as MotionButton } from "@/components/animate-ui/primitives/buttons/button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页", icon: House },
  { href: "/workspace", label: "工作区", icon: BriefcaseBusiness },
  { href: "/inspiration", label: "灵感广场", icon: Sparkles },
  { href: "/assets", label: "资产中心", icon: FolderKanban },
  { href: "/settings", label: "设置中心", icon: Settings },
];

export function AppNavbar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-40 flex h-screen w-[88px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <BrandHeader />

      <nav
        aria-label="主导航"
        className="flex flex-1 flex-col items-stretch gap-1 overflow-y-auto px-3 py-3"
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/home")
              : pathname.startsWith(item.href);

          return <SidebarItem key={item.label} item={item} active={isActive} />;
        })}
      </nav>

      <FooterActions />
    </aside>
  );
}

function BrandHeader() {
  return (
    <div className="flex flex-col items-center gap-1.5 border-b border-sidebar-border px-3 py-4">
      <Link
        href="/"
        aria-label="返回首页"
        className="group relative block size-11 overflow-hidden rounded-xl ring-1 ring-sidebar-border transition hover:ring-sidebar-ring/60"
      >
        <Image
          src="/app-logo.png"
          alt="WTF Director"
          fill
          sizes="44px"
          className="object-cover transition duration-500 group-hover:scale-105"
          priority
        />
      </Link>
      <span className="text-[9px] font-semibold tracking-[0.24em] text-sidebar-foreground/60">
        DIRECTOR
      </span>
    </div>
  );
}

function SidebarItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-[11px] font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon
        className={cn(
          "size-[18px] transition-colors",
          active ? "text-sidebar-primary" : "text-current",
        )}
        strokeWidth={active ? 2 : 1.75}
      />
      <span className="leading-none tracking-wide">{item.label}</span>
    </Link>
  );
}

function FooterActions() {
  return (
    <div className="flex flex-col items-center gap-1 border-t border-sidebar-border px-3 py-3">
      <FooterIconButton icon={Languages} label="语言" />
      <FooterIconButton icon={Download} label="日志" />

      <MotionButton asChild hoverScale={1.08} tapScale={0.92}>
        <button
          type="button"
          aria-label="账号"
          className="mt-1 flex size-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground transition-colors hover:border-sidebar-ring/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <UserRound className="size-4" />
        </button>
      </MotionButton>
    </div>
  );
}

function FooterIconButton({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <MotionButton asChild hoverScale={1.1} tapScale={0.9}>
      <button
        type="button"
        aria-label={label}
        className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      >
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </button>
    </MotionButton>
  );
}
