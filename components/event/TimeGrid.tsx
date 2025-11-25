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
}

export function TimeGrid({
  dates: propDates,
  startHour = 9,
  endHour = 17,
  selectedSlots: externalSlots,
  onSlotsChange,
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
  const timeSlots: { hour: number; minute: number }[] = [];
  for (let h = startHour; h < endHour; h++) {
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

  // Mouse handlers
  const handleMouseDown = (dateIndex: number, timeIndex: number) => {
    setIsDragging(true);
    const key = getSlotKey(dateIndex, timeIndex);
    const isSelected = selectedSlots.has(key);
    setSelectionMode(isSelected ? "remove" : "add");
    toggleSlot(dateIndex, timeIndex, !isSelected);
  };

  const handleMouseEnter = (dateIndex: number, timeIndex: number) => {
    if (isDragging) {
      toggleSlot(dateIndex, timeIndex, selectionMode === "add");
    }
  };

  // Touch handlers for mobile support
  const handleTouchStart = (dateIndex: number, timeIndex: number, e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling while selecting
    setIsDragging(true);
    const key = getSlotKey(dateIndex, timeIndex);
    const isSelected = selectedSlots.has(key);
    setSelectionMode(isSelected ? "remove" : "add");
    toggleSlot(dateIndex, timeIndex, !isSelected);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !gridRef.current) return;
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element && element.hasAttribute('data-slot')) {
      const dateIndex = parseInt(element.getAttribute('data-date-index') || '0');
      const timeIndex = parseInt(element.getAttribute('data-time-index') || '0');
      toggleSlot(dateIndex, timeIndex, selectionMode === "add");
    }
  }, [isDragging, selectionMode, toggleSlot]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global event listeners
  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchMove, handleTouchEnd]);

  return (
    <div className="select-none overflow-x-auto pb-4 touch-none" ref={gridRef}>
      <div 
        className="grid" 
        style={{ 
          gridTemplateColumns: `60px repeat(${dates.length}, minmax(60px, 1fr))`,
          minWidth: dates.length > 5 ? `${60 + dates.length * 70}px` : undefined
        }}
      >
        {/* Header Row */}
        <div className="h-12 sticky left-0 bg-background z-10"></div> {/* Empty corner */}
        {dates.map((date, i) => (
          <div key={i} className="h-12 flex flex-col items-center justify-center border-b border-border/50 text-sm px-1">
            <span className="font-bold text-foreground">{format(date, "EEE")}</span>
            <span className="text-xs text-muted-foreground">{format(date, "MMM d")}</span>
          </div>
        ))}

        {/* Time Rows */}
        {timeSlots.map((time, timeIndex) => (
          <div key={timeIndex} className="contents">
            {/* Time Label - Sticky */}
            <div className="h-6 text-xs text-muted-foreground text-right pr-2 -mt-2.5 sticky left-0 bg-background z-10">
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
                  className={cn(
                    "h-6 border-r border-b border-border/30 transition-colors cursor-pointer",
                    dateIndex === 0 && "border-l",
                    isSelected ? "bg-primary" : "bg-card hover:bg-primary/10 active:bg-primary/20"
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
