"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay
} from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarPickerProps {
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  minDate?: Date;
}

export function CalendarPicker({ 
  selectedDates, 
  onDatesChange,
  minDate = new Date()
}: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const isSelected = (day: Date) => 
    selectedDates.some(d => isSameDay(d, day));

  const isDisabled = (day: Date) => 
    isBefore(startOfDay(day), startOfDay(minDate));

  const toggleDate = (day: Date) => {
    if (isDisabled(day)) return;

    if (isSelected(day)) {
      onDatesChange(selectedDates.filter(d => !isSameDay(d, day)));
    } else {
      onDatesChange([...selectedDates, day].sort((a, b) => a.getTime() - b.getTime()));
    }
  };

  const clearAll = () => {
    onDatesChange([]);
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h3 className="font-bold text-lg">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div 
            key={day} 
            className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const selected = isSelected(day);
          const disabled = isDisabled(day);
          const today = isToday(day);
          const inCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleDate(day)}
              disabled={disabled}
              className={cn(
                "h-10 flex items-center justify-center text-sm font-medium transition-all border-2",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                // Base states
                !inCurrentMonth && "text-muted-foreground/40",
                inCurrentMonth && !selected && !disabled && "text-foreground hover:bg-accent hover:text-accent-foreground",
                // Disabled
                disabled && "opacity-30 cursor-not-allowed",
                // Today indicator
                today && !selected && "border-primary bg-secondary",
                !today && !selected && "border-transparent",
                // Selected state
                selected && "bg-primary text-primary-foreground border-primary shadow-[2px_2px_0px_0px_var(--shadow-color)]",
                !selected && "border-border/50"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Selected dates summary */}
      {selectedDates.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {selectedDates.length} day{selectedDates.length !== 1 ? "s" : ""} selected
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-6 text-xs text-muted-foreground hover:text-destructive"
            >
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedDates.slice(0, 10).map((date, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 border border-primary/30"
              >
                {format(date, "MMM d")}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDate(date);
                  }}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {selectedDates.length > 10 && (
              <span className="text-xs text-muted-foreground px-2 py-1">
                +{selectedDates.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
