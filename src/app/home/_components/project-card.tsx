"use client";

import Image from "next/image";
import { useState } from "react";

import { Button as MotionButton } from "@/components/animate-ui/primitives/buttons/button";

import type { Project } from "../_types";

type ProjectCardProps = {
  project: Project;
  onClick?: (project: Project) => void;
};

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const [imageLoaded, setImageLoaded] = useState(!project.cover);
  const [imageFailed, setImageFailed] = useState(false);

  const showImage = Boolean(project.cover) && !imageFailed;

  return (
    <MotionButton asChild hoverScale={1.02} tapScale={0.99}>
      <article
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={() => onClick?.(project)}
        onKeyDown={(e) => {
          if (!onClick) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(project);
          }
        }}
        className="group relative flex aspect-[16/10] cursor-pointer flex-col overflow-hidden rounded-2xl bg-muted/40 text-foreground ring-1 ring-border/50 transition-shadow hover:ring-primary/40 hover:shadow-[0_18px_40px_-22px_color-mix(in_oklab,var(--primary)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div
          aria-hidden
          className={`absolute inset-0 bg-gradient-to-br from-muted/50 via-muted/30 to-muted/50 transition-opacity duration-500 ${
            imageLoaded ? "opacity-0" : "animate-pulse opacity-100"
          }`}
        />

        {showImage ? (
          <Image
            src={project.cover!}
            alt={project.description}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageFailed(true);
              setImageLoaded(true);
            }}
            className={`absolute inset-0 object-cover transition-all duration-500 group-hover:scale-[1.03] ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        <div className="relative z-10 flex items-start justify-between gap-2 p-3">
          <span className="rounded-md bg-black/45 px-2 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
            {project.title}
          </span>
          <span className="flex items-center gap-2 rounded-md bg-black/45 px-2 py-1 text-[11px] text-white/85 backdrop-blur-sm">
            {project.stats.map((stat, index) => (
              <span key={index} className="inline-flex items-center gap-1">
                {stat.icon}
                {stat.value}
              </span>
            ))}
          </span>
        </div>

        <div className="relative z-10 mt-auto p-3">
          <h3 className="line-clamp-1 text-sm font-semibold text-white">
            {project.description}
          </h3>
          <p className="mt-1 text-[11px] text-white/70">
            最后编辑于 {project.time}
          </p>
        </div>
      </article>
    </MotionButton>
  );
}
