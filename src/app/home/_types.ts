import type { ReactNode } from "react";

export type ProjectStat = {
  icon: ReactNode;
  value: string;
};

export type Project = {
  title: string;
  description: string;
  stats: ProjectStat[];
  time: string;
  cover?: string;
};
