import { cn } from "@/lib/utils";
import { appointments, weekDays } from "@/mock/appointments";

const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

const eventStyles: Record<string, string> = {
  mint: "border-[#B8E8DC] bg-[#E7F7F2]",
  blue: "border-[#C9DEF9] bg-[#EEF6FF]",
  purple: "border-[#E4D7F6] bg-[#F5EEFF]",
  sand: "border-[#F1DFC0] bg-[#FFF5E7]",
  selected: "border-[#2A9D8F] bg-[#E4F7F0] shadow-[0_12px_26px_rgba(42,157,143,0.16)]",
};

export function CalendarWeek() {
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[980px] rounded-[22px] border border-black/[0.07] bg-white/82"
        style={{ gridTemplateColumns: "72px repeat(7, minmax(118px, 1fr))" }}
      >
        <div className="border-black/[0.06] border-r border-b bg-white/50" />
        {weekDays.map((day) => (
          <div
            className="flex h-[88px] flex-col items-center justify-center border-black/[0.06] border-r border-b last:border-r-0"
            key={`${day.label}-${day.day}`}
          >
            <span className="text-[#6B6B6B] text-xs">{day.label}</span>
            <span
              className={cn(
                "mt-1 grid size-10 place-items-center rounded-full font-semibold text-[#1A1916] text-lg",
                day.active && "bg-[#2A9D8F] text-white",
              )}
            >
              {day.day}
            </span>
            <span className="text-[#6B6B6B] text-xs">{day.month}</span>
          </div>
        ))}

        {hours.map((hour, hourIndex) => (
          <div className="contents" key={hour}>
            <div className="relative h-20 border-black/[0.06] border-r border-b px-3 pt-3 text-[#6B6B6B] text-xs">
              {hour}
              {hour === "14:00" && <span className="absolute top-10 left-0 h-px w-[980px] bg-[#E25B5B]/55" />}
            </div>
            {weekDays.map((day, dayIndex) => (
              <div
                className="relative h-20 border-black/[0.06] border-r border-b last:border-r-0"
                key={`${hour}-${day.day}`}
              >
                {appointments
                  .filter((appointment) => appointment.dayIndex === dayIndex && appointment.row === hourIndex + 3)
                  .map((appointment) => (
                    <div
                      className={cn(
                        "absolute inset-x-2 top-2 rounded-xl border p-2 text-[#1A1916] text-xs",
                        eventStyles[appointment.color],
                      )}
                      key={appointment.id}
                    >
                      <p className="font-semibold">{appointment.time}</p>
                      <p className="mt-1 font-medium">{appointment.customer}</p>
                      <p className="mt-0.5 text-[#6B6B6B]">{appointment.device}</p>
                      <p className="text-[#6B6B6B]">{appointment.issue}</p>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
