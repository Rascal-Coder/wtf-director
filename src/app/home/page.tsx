import { HeroSection } from "./_components/hero-section";
import { RecentProjects } from "./_components/recent-projects";

export default function HomePage() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <HeroSection />
      <div className="relative mx-auto w-full max-w-7xl px-6 pb-20 sm:px-10 lg:px-16">
        <RecentProjects />
      </div>
    </main>
  );
}
