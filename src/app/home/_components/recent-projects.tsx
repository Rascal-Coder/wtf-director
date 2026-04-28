import { recentProjects } from "../_data/recent-projects";
import { CreateProjectCard } from "./create-project-card";
import { ProjectCard } from "./project-card";

type RecentProjectsProps = {
  viewAllHref?: string;
  onCreate?: () => void;
};

export function RecentProjects({
  viewAllHref = "#",
  onCreate,
}: RecentProjectsProps) {
  return (
    <section className="mt-20">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-foreground">
          最近项目
        </h2>
        <a
          href={viewAllHref}
          className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          查看全部项目
        </a>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CreateProjectCard onClick={onCreate} />
        {recentProjects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
    </section>
  );
}
