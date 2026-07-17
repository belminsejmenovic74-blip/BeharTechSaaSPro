import { describe, expect, it } from "vitest";

import {
  defaultWorkshopWeeklyHours,
  formatWorkshopWeeklyHours,
  weeklyHoursToScheduleConfig,
} from "@/lib/workshop-hours";

describe("workshop weekly hours", () => {
  it("publishes split opening ranges and the lunch break", () => {
    const hours = defaultWorkshopWeeklyHours();
    const schedule = weeklyHoursToScheduleConfig(hours);
    expect(schedule.weeklyHours["1"]).toEqual([
      { start: "09:00", end: "12:00" },
      { start: "13:00", end: "18:00" },
    ]);
    expect(schedule.breaks["1"]).toEqual([{ start: "12:00", end: "13:00" }]);
    expect(schedule.weeklyHours["7"]).toEqual([]);
  });

  it("keeps every day in the human-readable summary", () => {
    const summary = formatWorkshopWeeklyHours(defaultWorkshopWeeklyHours());
    expect(summary).toContain("Lun 09:00-12:00 / 13:00-18:00");
    expect(summary).toContain("Dim fermé");
  });
});
