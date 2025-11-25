"use client";

import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";

interface HeatMapProps {
  startDate?: Date;
  days?: number;
  startHour?: number;
  endHour?: number;
}

export function HeatMap({
  startDate = new Date(),
  days = 5,
  startHour = 9,
  endHour = 17,
}: HeatMapProps) {
  // Generate dates
  const dates = Array.from({ length: days }).map((_, i) => addDays(startDate, i));

  // Generate time slots
  const timeSlots = [];
  for (let h = startHour; h < endHour; h++) {
    timeSlots.push({ hour: h, minute: 0 });
    timeSlots.push({ hour: h, minute: 30 });
  }

  // Mock data generator
  const getOpacity = (d: number, t: number) => {
    // Create a pattern that looks somewhat realistic
    const isLunch = t >= 6 && t <= 8; // 12pm - 1pm approx
    const isLate = t > 12;
    if (isLunch) return 0.2;
    if (isLate) return 0.1;
    return Math.random() * 0.8 + 0.2;
  };

  return (
    <div className="select-none overflow-x-auto pb-4">
      <div className="min-w-[300px] grid" style={{ gridTemplateColumns: `auto repeat(${days}, 1fr)` }}>
        {/* Header Row */}
        <div className="h-12"></div>
        {dates.map((date, i) => (
          <div key={i} className="h-12 flex flex-col items-center justify-center border-b border-border/50 text-sm">
            <span className="font-bold text-foreground">{format(date, "EEE")}</span>
            <span className="text-xs text-muted-foreground">{format(date, "MMM d")}</span>
          </div>
        ))}

        {/* Time Rows */}
        {timeSlots.map((time, timeIndex) => (
          <>
            {/* Time Label */}
            <div className="h-6 text-xs text-muted-foreground text-right pr-2 -mt-2.5">
              {time.minute === 0 ? format(new Date().setHours(time.hour, 0), "h a") : ""}
            </div>
            
            {/* Grid Cells */}
            {dates.map((_, dateIndex) => {
              const opacity = getOpacity(dateIndex, timeIndex);
              
              return (
                <div
                  key={`${dateIndex}-${timeIndex}`}
                  className={cn(
                    "h-6 border-r border-b border-border/30 transition-colors",
                    dateIndex === 0 && "border-l",
                    "bg-emerald-500"
                  )}
                  style={{ opacity }}
                  title={`${Math.round(opacity * 3)}/3 Available`}
                />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
