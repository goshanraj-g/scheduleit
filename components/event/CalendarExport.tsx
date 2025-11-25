"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Download, ExternalLink, X, Users, Clock } from "lucide-react";
import { downloadICS, getGoogleCalendarUrl, getOutlookCalendarUrl } from "@/lib/calendar";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import type { BestTimeSlot } from "@/lib/types";

interface CalendarExportProps {
  eventName: string;
  bestTimes: BestTimeSlot[];
  timezone: string;
  totalParticipants: number;
}

export function CalendarExport({ eventName, bestTimes, timezone, totalParticipants }: CalendarExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<BestTimeSlot | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);

  if (bestTimes.length === 0) {
    return null;
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const getCalendarEvent = (slot: BestTimeSlot) => ({
    title: eventName,
    description: `Meeting scheduled via ScheduleIt. ${slot.participants.length}/${totalParticipants} participant(s) available: ${slot.participants.join(', ')}`,
    startDate: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    timezone,
  });

  const handleDownloadICS = () => {
    downloadICS(calendarEvent);
    setIsOpen(false);
  };

  const handleGoogleCalendar = () => {
    window.open(getGoogleCalendarUrl(calendarEvent), '_blank');
    setIsOpen(false);
  };

  const handleOutlookCalendar = () => {
    window.open(getOutlookCalendarUrl(calendarEvent), '_blank');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Calendar className="w-4 h-4" />
        Add to Calendar
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-background border-2 border-border shadow-[4px_4px_0px_0px_var(--shadow-color)]">
            <div className="p-1">
              <button
                onClick={handleGoogleCalendar}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
                </svg>
                Google Calendar
                <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
              </button>
              
              <button
                onClick={handleOutlookCalendar}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V12zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3.05-1.83zm-5.25-9v3h3.75v-3zm0 4.5v3h3.75v-3zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73zM9 3.75V6h2l.13.01.12.04v-2.3zM5.98 15.98q.9 0 1.6-.3.7-.32 1.19-.86.48-.55.73-1.28.25-.74.25-1.61 0-.83-.25-1.55-.24-.71-.71-1.24t-1.15-.83q-.68-.3-1.55-.3-.92 0-1.64.32-.71.32-1.2.87-.48.55-.74 1.29-.25.73-.25 1.56 0 .85.26 1.56.26.72.74 1.23.48.52 1.17.81.69.3 1.55.3zM7.5 21h12.39L12 16.08V17q0 .41-.3.7-.29.3-.7.3H7.5zm15-.13v-7.24l-5.9 3.54Z"/>
                </svg>
                Outlook.com
                <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
              </button>
              
              <div className="h-px bg-border my-1" />
              
              <button
                onClick={handleDownloadICS}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
              >
                <Download className="w-4 h-4" />
                Download .ics file
                <span className="text-xs text-muted-foreground ml-auto">Apple, etc.</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
