"use client";

import Image from "next/image";
import { useTransition } from "react";
import {
  BriefcaseBusiness,
  Check,
  Download,
  FolderKanban,
  House,
  Languages,
  Settings,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button as MotionButton } from "@/components/animate-ui/primitives/buttons/button";
import {
  Popover,
  PopoverPanel,
  PopoverTrigger,
} from "@/components/animate-ui/components/base/popover";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  labelKey: "home" | "workspace" | "inspiration" | "assets" | "settings";
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "home", icon: House },
  { href: "/workspace", labelKey: "workspace", icon: BriefcaseBusiness },
  { href: "/inspiration", labelKey: "inspiration", icon: Sparkles },
  { href: "/assets", labelKey: "assets", icon: FolderKanban },
  { href: "/settings", labelKey: "settings", icon: Settings },
];

export function AppNavbar() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-40 flex h-screen w-[88px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <BrandHeader backHomeLabel={t("backHome")} />

      <nav
        aria-label={t("mainNav")}
        className="flex flex-1 flex-col items-stretch gap-1 overflow-y-auto px-3 py-3"
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/home")
              : pathname.startsWith(item.href);

          return (
            <SidebarItem
              key={item.labelKey}
              item={item}
              label={t(item.labelKey)}
              active={isActive}
            />
          );
        })}
      </nav>

      <FooterActions />
    </aside>
  );
}

function BrandHeader({ backHomeLabel }: { backHomeLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 border-b border-sidebar-border px-3 py-4">
      <Link
        href="/"
        aria-label={backHomeLabel}
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

function SidebarItem({
  item,
  label,
  active,
}: {
  item: NavItem;
  label: string;
  active: boolean;
}) {
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
      <span className="leading-none tracking-wide">{label}</span>
    </Link>
  );
}

function FooterActions() {
  const t = useTranslations("Nav");

  return (
    <div className="flex flex-col items-center gap-1 border-t border-sidebar-border px-3 py-3">
      <LanguageSwitcher />
      <FooterIconButton icon={Download} label={t("logs")} />

      <MotionButton asChild hoverScale={1.08} tapScale={0.92}>
        <button
          type="button"
          aria-label={t("account")}
          className="mt-1 flex size-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground transition-colors hover:border-sidebar-ring/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <UserRound className="size-4" />
        </button>
      </MotionButton>
    </div>
  );
}

function LanguageSwitcher() {
  const tNav = useTranslations("Nav");
  const tLang = useTranslations("Languages");
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  const handleSelect = (next: Locale) => {
    if (next === currentLocale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <Popover>
      <PopoverTrigger
        aria-label={tNav("switchLanguage")}
        className={cn(
          "flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
          isPending && "opacity-60",
        )}
      >
        <Languages className="size-[18px]" strokeWidth={1.75} />
      </PopoverTrigger>
      <PopoverPanel
        side="right"
        align="end"
        sideOffset={12}
        className="min-w-[160px] rounded-xl border border-border/60 bg-popover/95 p-1 shadow-xl backdrop-blur-xl"
      >
        <div role="listbox" aria-label={tNav("language")} className="flex flex-col">
          {routing.locales.map((locale) => {
            const isActive = locale === currentLocale;
            return (
              <button
                key={locale}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(locale)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/60",
                )}
              >
                <span>{tLang(locale)}</span>
                {isActive ? <Check className="size-4 text-primary" /> : null}
              </button>
            );
          })}
        </div>
      </PopoverPanel>
    </Popover>
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
