"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";

interface TimeGridProps {
  dates?: Date[];
  startHour?: number;
  endHour?: number;
  selectedSlots?: Set<string>;
  onSlotsChange?: (slots: Set<string>) => void;
  isMobile?: boolean;
}

export function TimeGrid({
  dates: propDates,
  startHour = 9,
  endHour = 17,
  selectedSlots: externalSlots,
  onSlotsChange,
  isMobile = false,
}: TimeGridProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"add" | "remove">("add");
  const [internalSlots, setInternalSlots] = useState<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);

  // Use controlled or uncontrolled mode
  const selectedSlots = externalSlots ?? internalSlots;
  const setSelectedSlots = useCallback((slots: Set<string>) => {
    if (onSlotsChange) {
      onSlotsChange(slots);
    } else {
      setInternalSlots(slots);
    }
  }, [onSlotsChange]);

  // Use provided dates or generate default 5 days from today
  const dates = propDates || Array.from({ length: 5 }).map((_, i) => addDays(new Date(), i));

  // Generate time slots (30 min intervals)
  // Ensure valid range to prevent empty grid
  const safeStartHour = Math.max(0, Math.min(23, startHour));
  const safeEndHour = Math.max(safeStartHour + 1, Math.min(24, endHour));
  
  const timeSlots: { hour: number; minute: number }[] = [];
  for (let h = safeStartHour; h < safeEndHour; h++) {
    timeSlots.push({ hour: h, minute: 0 });
    timeSlots.push({ hour: h, minute: 30 });
  }

  const getSlotKey = useCallback((dateIndex: number, timeIndex: number) => {
    const date = dates[dateIndex];
    const time = timeSlots[timeIndex];
    const dateStr = format(date, "yyyy-MM-dd");
    const timeStr = `${time.hour.toString().padStart(2, "0")}:${time.minute.toString().padStart(2, "0")}`;
    return `${dateStr}T${timeStr}`;
  }, [dates, timeSlots]);

  const toggleSlot = useCallback((dateIndex: number, timeIndex: number, force?: boolean) => {
    const key = getSlotKey(dateIndex, timeIndex);
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
  }, [getSlotKey, selectedSlots, setSelectedSlots]);

  // Track if we just handled a touch event (to prevent mouse event duplication)
  const justTouched = useRef(false);

  // Mouse handlers - support both click and drag (desktop only)
  const handleMouseDown = (dateIndex: number, timeIndex: number) => {
    // Skip if this was triggered by a touch (mobile browsers fire both touch and mouse events)
    if (justTouched.current) {
      return;
    }
    
    setIsDragging(true);
    const key = getSlotKey(dateIndex, timeIndex);
    const isSelected = selectedSlots.has(key);
    setSelectionMode(isSelected ? "remove" : "add");
    toggleSlot(dateIndex, timeIndex, !isSelected);
  };

  const handleMouseEnter = (dateIndex: number, timeIndex: number) => {
    if (isDragging && !justTouched.current) {
      toggleSlot(dateIndex, timeIndex, selectionMode === "add");
    }
  };

  // Touch handlers for mobile - tap to toggle
  const handleTouchStart = (dateIndex: number, timeIndex: number, e: React.TouchEvent) => {
    // Mark that we're handling a touch event
    justTouched.current = true;
    
    // Prevent default to stop mouse event simulation
    e.preventDefault();
    e.stopPropagation();
    
    // Simple toggle on tap
    toggleSlot(dateIndex, timeIndex);
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    // Prevent simulated mouse events after touch
    e.preventDefault();
    e.stopPropagation();
    
    // Reset the touch flag after a delay (mouse events can be delayed)
    setTimeout(() => {
      justTouched.current = false;
    }, 500);
  };

  // Global event listeners for mouse (desktop drag support)
  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    
    window.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="select-none overflow-x-auto pb-4" ref={gridRef}>
      <div 
        className="grid" 
        style={{ 
          gridTemplateColumns: `60px repeat(${dates.length}, minmax(${isMobile ? '50px' : '60px'}, 1fr))`,
          minWidth: dates.length > 5 ? `${60 + dates.length * (isMobile ? 55 : 70)}px` : undefined
        }}
      >
        {/* Header Row */}
        <div className={cn("sticky left-0 bg-background z-10", isMobile ? "h-10" : "h-12")}></div> {/* Empty corner */}
        {dates.map((date, i) => (
          <div key={i} className={cn(
            "flex flex-col items-center justify-center border-b border-border/50 px-1",
            isMobile ? "h-10 text-xs" : "h-12 text-sm"
          )}>
            <span className="font-bold text-foreground">{format(date, "EEE")}</span>
            <span className="text-xs text-muted-foreground">{format(date, "MMM d")}</span>
          </div>
        ))}

        {/* Time Rows */}
        {timeSlots.map((time, timeIndex) => (
          <div key={timeIndex} className="contents">
            {/* Time Label - Sticky */}
            <div className={cn(
              "text-xs text-muted-foreground text-right pr-2 sticky left-0 bg-background z-10",
              isMobile ? "h-8 -mt-3" : "h-6 -mt-2.5"
            )}>
              {time.minute === 0 ? format(new Date().setHours(time.hour, 0), "h a") : ""}
            </div>
            
            {/* Grid Cells */}
            {dates.map((_, dateIndex) => {
              const key = getSlotKey(dateIndex, timeIndex);
              const isSelected = selectedSlots.has(key);
              
              return (
                <div
                  key={key}
                  data-slot
                  data-date-index={dateIndex}
                  data-time-index={timeIndex}
                  onMouseDown={() => handleMouseDown(dateIndex, timeIndex)}
                  onMouseEnter={() => handleMouseEnter(dateIndex, timeIndex)}
                  onTouchStart={(e) => handleTouchStart(dateIndex, timeIndex, e)}
                  onTouchEnd={handleTouchEnd}
                  className={cn(
                    "border-r border-b border-border/30 transition-colors cursor-pointer",
                    isMobile ? "h-8" : "h-6",
                    dateIndex === 0 && "border-l",
                    isSelected 
                      ? "bg-primary" 
                      : "bg-card hover:bg-primary/10 active:bg-primary/20"
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
