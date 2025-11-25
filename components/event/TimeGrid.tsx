"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { format, addDays, startOfDay, addMinutes } from "date-fns";

interface TimeGridProps {
  startDate?: Date;
  days?: number;
  startHour?: number;
  endHour?: number;
}

export function TimeGrid({
  startDate = new Date(),
  days = 5,
  startHour = 9,
  endHour = 17,
}: TimeGridProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"add" | "remove">("add");
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);

  // Generate dates
  const dates = Array.from({ length: days }).map((_, i) => addDays(startDate, i));

  // Generate time slots (30 min intervals)
  const timeSlots = [];
  for (let h = startHour; h < endHour; h++) {
    timeSlots.push({ hour: h, minute: 0 });
    timeSlots.push({ hour: h, minute: 30 });
  }

  const toggleSlot = (dateIndex: number, timeIndex: number, force?: boolean) => {
    const key = `${dateIndex}-${timeIndex}`;
    const newSet = new Set(selectedSlots);
    
    if (force === true) {
      newSet.add(key);
    } else if (force === false) {
      newSet.delete(key);
    } else {
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
    }
    
    setSelectedSlots(newSet);
  };

  const handleMouseDown = (dateIndex: number, timeIndex: number) => {
    setIsDragging(true);
    const key = `${dateIndex}-${timeIndex}`;
    const isSelected = selectedSlots.has(key);
    setSelectionMode(isSelected ? "remove" : "add");
    toggleSlot(dateIndex, timeIndex, !isSelected);
  };

  const handleMouseEnter = (dateIndex: number, timeIndex: number) => {
    if (isDragging) {
      toggleSlot(dateIndex, timeIndex, selectionMode === "add");
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <div className="select-none overflow-x-auto pb-4">
      <div className="min-w-[300px] grid" style={{ gridTemplateColumns: `auto repeat(${days}, 1fr)` }}>
        {/* Header Row */}
        <div className="h-12"></div> {/* Empty corner */}
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
              const key = `${dateIndex}-${timeIndex}`;
              const isSelected = selectedSlots.has(key);
              
              return (
                <div
                  key={key}
                  onMouseDown={() => handleMouseDown(dateIndex, timeIndex)}
                  onMouseEnter={() => handleMouseEnter(dateIndex, timeIndex)}
                  className={cn(
                    "h-6 border-r border-b border-border/30 transition-colors cursor-pointer",
                    dateIndex === 0 && "border-l",
                    isSelected ? "bg-primary" : "bg-card hover:bg-primary/10"
                  )}
                />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
