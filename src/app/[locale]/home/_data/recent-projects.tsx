import { AppIcon } from "@/components/icons";

import type { Project } from "../_types";

export const recentProjects: Project[] = [
  {
    title: "新项目 04-28 14:06",
    description: "全员恶仙-我有一座种仙观",
    stats: [
      {
        icon: <AppIcon name="barChart" className="size-3.5 text-chart-1" />,
        value: "1",
      },
      {
        icon: <AppIcon name="fileText" className="size-3.5 text-chart-2" />,
        value: "1",
      },
    ],
    time: "19分钟前",
    cover: "/image.png",
  },
  {
    title: "测试",
    description:
      "废弃地铁站内，空气弥漫陈腐铁锈味，林默，一名刚下班疲惫不堪的...",
    stats: [
      {
        icon: <AppIcon name="barChart" className="size-3.5 text-chart-1" />,
        value: "1",
      },
      {
        icon: <AppIcon name="fileText" className="size-3.5 text-chart-2" />,
        value: "23",
      },
      {
        icon: (
          <AppIcon name="layers" className="size-3.5 text-muted-foreground" />
        ),
        value: "23",
      },
    ],
    time: "40分钟前",
    cover: "/image.png",
  },
];
