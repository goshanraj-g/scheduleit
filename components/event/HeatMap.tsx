"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { Users } from "lucide-react";
import type { GroupAvailability } from "@/lib/types";

interface HeatMapProps {
  dates?: Date[];
  startHour?: number;
  endHour?: number;
  groupAvailability?: GroupAvailability | null;
  totalParticipants?: number;
}

interface TooltipData {
  count: number;
  participants: string[];
  time: string;
  endTime: string;
  date: string;
  x: number;
  y: number;
}

export function HeatMap({
  dates: propDates,
  startHour = 9,
  endHour = 17,
  groupAvailability,
  totalParticipants = 0,
}: HeatMapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Use provided dates or generate default 5 days from today
  const dates = propDates || Array.from({ length: 5 }).map((_, i) => addDays(new Date(), i));

  // Generate time slots
  const timeSlots: { hour: number; minute: number }[] = [];
  for (let h = startHour; h < endHour; h++) {
    timeSlots.push({ hour: h, minute: 0 });
    timeSlots.push({ hour: h, minute: 30 });
  }

  // Get slot key in the same format as TimeGrid
  const getSlotKey = (date: Date, time: { hour: number; minute: number }) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const timeStr = `${time.hour.toString().padStart(2, "0")}:${time.minute.toString().padStart(2, "0")}`;
    return `${dateStr}T${timeStr}`;
  };

  // Format time for display
  const formatTimeDisplay = (time: { hour: number; minute: number }) => {
    const hour = time.hour;
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${time.minute.toString().padStart(2, "0")} ${ampm}`;
  };

  // Get availability data for a slot
  const getSlotData = (date: Date, time: { hour: number; minute: number }) => {
    if (!groupAvailability || totalParticipants === 0) {
      return { count: 0, participants: [], opacity: 0 };
    }
    
    const key = getSlotKey(date, time);
    const slotData = groupAvailability.slots[key];
    
    if (!slotData) {
      return { count: 0, participants: [], opacity: 0 };
    }
    
    const count = slotData.count;
    const opacity = count / totalParticipants;
    
    return { 
      count, 
      participants: slotData.participants, 
      opacity: Math.max(0.1, opacity) // Minimum visibility
    };
  };

  const handleMouseEnter = (
    e: React.MouseEvent,
    date: Date,
    time: { hour: number; minute: number },
    count: number,
    participants: string[]
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Calculate end time (each slot is 30 minutes)
    const endMinute = time.minute === 0 ? 30 : 0;
    const endHour = time.minute === 0 ? time.hour : time.hour + 1;
    setTooltip({
      count,
      participants,
      time: formatTimeDisplay(time),
      endTime: formatTimeDisplay({ hour: endHour, minute: endMinute }),
      date: format(date, "EEE, MMM d"),
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div className="select-none overflow-x-auto pb-4 relative">
      {/* Tooltip */}
      {tooltip && totalParticipants > 0 && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-zinc-900 border-2 border-border shadow-[4px_4px_0px_0px_var(--shadow-color)] p-3 min-w-40 max-w-60">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-muted-foreground">{tooltip.date}</span>
              <span className="text-xs font-mono bg-secondary px-1.5 py-0.5 border border-border">
                {tooltip.time} - {tooltip.endTime}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 border-2 border-border",
                tooltip.count === totalParticipants ? "bg-emerald-500" : 
                tooltip.count > 0 ? "bg-emerald-500/50" : "bg-secondary"
              )}>
                <span className="text-sm font-bold text-white">{tooltip.count}</span>
              </div>
              <div>
                <p className="text-sm font-bold">
                  {tooltip.count}/{totalParticipants} available
                </p>
                <p className="text-xs text-muted-foreground">
                  {tooltip.count === totalParticipants ? "Everyone can make it!" :
                   tooltip.count === 0 ? "No one available" :
                   `${totalParticipants - tooltip.count} unavailable`}
                </p>
              </div>
            </div>
            
            {tooltip.participants.length > 0 && (
              <div className="border-t border-border pt-2 mt-2">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Who&apos;s available:
                </p>
                <div className="flex flex-wrap gap-1">
                  {tooltip.participants.slice(0, 5).map((name, i) => (
                    <span 
                      key={i} 
                      className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 border border-emerald-500/30"
                    >
                      {name}
                    </span>
                  ))}
                  {tooltip.participants.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{tooltip.participants.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Arrow */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900 border-r-2 border-b-2 border-border rotate-45"
            style={{ bottom: -6 }}
          />
        </div>
      )}

      <div className="min-w-[300px] grid" style={{ gridTemplateColumns: `auto repeat(${dates.length}, 1fr)` }}>
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
          <div key={timeIndex} className="contents">
            {/* Time Label */}
            <div className="h-6 text-xs text-muted-foreground text-right pr-2 -mt-2.5">
              {time.minute === 0 ? format(new Date().setHours(time.hour, 0), "h a") : ""}
            </div>
            
            {/* Grid Cells */}
            {dates.map((date, dateIndex) => {
              const { count, participants, opacity } = getSlotData(date, time);
              const hasData = totalParticipants > 0;
              
              return (
                <div
                  key={`${dateIndex}-${timeIndex}`}
                  className={cn(
                    "h-6 border-r border-b border-border/30 transition-all cursor-pointer",
                    dateIndex === 0 && "border-l",
                    hasData && count > 0 ? "bg-emerald-500 hover:ring-2 hover:ring-emerald-400 hover:ring-inset" : "bg-secondary hover:bg-secondary/80"
                  )}
                  style={hasData && count > 0 ? { opacity } : undefined}
                  onMouseEnter={(e) => handleMouseEnter(e, date, time, count, participants)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })}
          </div>
        ))}
      </div>
      
      {totalParticipants === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No responses yet. Share the link to get started!</p>
        </div>
      )}
    </div>
  );
}
