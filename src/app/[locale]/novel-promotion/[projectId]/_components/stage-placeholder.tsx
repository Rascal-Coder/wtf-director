"use client";

import { useTranslations } from "next-intl";

import { AppIcon } from "@/components/icons";

export function StagePlaceholder() {
  const t = useTranslations("NovelPromotion.placeholder");

  return (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center rounded-2xl border border-border/40 bg-card/30 px-8 py-16 text-center lg:min-h-0">
      <div className="relative mb-6 flex size-20 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
        <AppIcon name="video" className="size-10 text-primary/80" />
      </div>
      <h2 className="text-3xl font-semibold tracking-tight text-foreground">
        {t("title")}
      </h2>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        {t("subtitle")}
      </p>
    </div>
  );
}
