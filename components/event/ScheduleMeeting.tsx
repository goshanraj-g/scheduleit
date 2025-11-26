"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Calendar, Download, Send, Users, X, Check, Copy, Mail, ChevronLeft } from "lucide-react";
import { generateICS, getGoogleCalendarUrl, getOutlookCalendarUrl, getMobileOS, isMobileDevice, getSmartCalendarAction } from "@/lib/calendar";
import { format, parse, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import type { GroupAvailability } from "@/lib/types";

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
];

interface ScheduleMeetingProps {
  eventName: string;
  dates: Date[];
  startHour: number;
  endHour: number;
  groupAvailability: GroupAvailability | null;
  timezone: string;
  totalParticipants: number;
}

interface SelectedTimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  count: number;
  participants: string[];
}

type Step = "select-time" | "compose" | "confirm";

export function ScheduleMeeting({ 
  eventName, 
  dates,
  startHour,
  endHour,
  groupAvailability,
  timezone, 
  totalParticipants,
}: ScheduleMeetingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("select-time");
  const [selectedSlot, setSelectedSlot] = useState<SelectedTimeSlot | null>(null);
  const [meetingTitle, setMeetingTitle] = useState(eventName);
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [emails, setEmails] = useState("");
  const [copied, setCopied] = useState(false);
  const [duration, setDuration] = useState(30);
  const [hoveredSlot, setHoveredSlot] = useState<{ date: Date; time: { hour: number; minute: number }; count: number; participants: string[] } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOS, setMobileOS] = useState<'ios' | 'android' | 'other'>('other');

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
    setMobileOS(getMobileOS());
  }, []);

  // Generate time slots with safety bounds
  const safeStartHour = Math.max(0, Math.min(23, startHour));
  const safeEndHour = Math.max(safeStartHour + 1, Math.min(24, endHour));
  
  const timeSlots: { hour: number; minute: number }[] = [];
  for (let h = safeStartHour; h < safeEndHour; h++) {
    timeSlots.push({ hour: h, minute: 0 });
    timeSlots.push({ hour: h, minute: 30 });
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatTimeFromSlot = (time: { hour: number; minute: number }) => {
    const ampm = time.hour >= 12 ? 'PM' : 'AM';
    const hour12 = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
    return `${hour12}:${time.minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatTimeRangeFromSlot = (time: { hour: number; minute: number }) => {
    const startTime = formatTimeFromSlot(time);
    // Calculate end time (each slot is 30 minutes)
    const endMinute = time.minute === 0 ? 30 : 0;
    const endHour = time.minute === 0 ? time.hour : time.hour + 1;
    const endTime = formatTimeFromSlot({ hour: endHour, minute: endMinute });
    return `${startTime} - ${endTime}`;
  };

  const getSlotKey = (date: Date, time: { hour: number; minute: number }) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const timeStr = `${time.hour.toString().padStart(2, "0")}:${time.minute.toString().padStart(2, "0")}`;
    return `${dateStr}T${timeStr}`;
  };

  const getSlotData = useCallback((date: Date, time: { hour: number; minute: number }) => {
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
      opacity: Math.max(0.15, opacity)
    };
  }, [groupAvailability, totalParticipants]);

  const calculateEndTime = (dateStr: string, startTime: string, durationMinutes: number) => {
    const startDate = parse(`${dateStr} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const endDate = addMinutes(startDate, durationMinutes);
    return format(endDate, "HH:mm");
  };

  const handleSlotClick = (date: Date, time: { hour: number; minute: number }) => {
    const data = getSlotData(date, time);
    const dateStr = format(date, "yyyy-MM-dd");
    const startTime = `${time.hour.toString().padStart(2, "0")}:${time.minute.toString().padStart(2, "0")}`;
    
    // Calculate end time based on selected duration
    const endTime = calculateEndTime(dateStr, startTime, duration);

    setSelectedSlot({
      date: dateStr,
      startTime,
      endTime,
      count: data.count,
      participants: data.participants,
    });
    setStep("compose");
  };

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    if (selectedSlot) {
      const newEndTime = calculateEndTime(selectedSlot.date, selectedSlot.startTime, newDuration);
      setSelectedSlot({
        ...selectedSlot,
        endTime: newEndTime,
      });
    }
  };

  const getCalendarEvent = () => {
    if (!selectedSlot) return null;
    return {
      title: meetingTitle,
      description: meetingNotes || `Meeting scheduled via WhenWorks.\n\nParticipants: ${selectedSlot.participants.join(', ')}`,
      startDate: selectedSlot.date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      timezone,
      location: meetingLocation,
    };
  };

  const handleBack = () => {
    if (step === "compose") {
      setStep("select-time");
      setSelectedSlot(null);
    } else if (step === "confirm") {
      setStep("compose");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep("select-time");
    setSelectedSlot(null);
    setCopied(false);
    setHoveredSlot(null);
  };

  const handleSchedule = () => {
    setStep("confirm");
  };

  const downloadICS = () => {
    const event = getCalendarEvent();
    if (!event) return;
    
    const icsContent = generateICS(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyICSContent = () => {
    const event = getCalendarEvent();
    if (!event) return;
    
    const icsContent = generateICS(event);
    navigator.clipboard.writeText(icsContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openMailClient = () => {
    const event = getCalendarEvent();
    if (!event || !selectedSlot) return;
    
    const dateFormatted = format(parse(selectedSlot.date, "yyyy-MM-dd", new Date()), "EEEE, MMMM d, yyyy");
    const timeFormatted = `${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}`;
    
    const emailList = emails.split(',').map(e => e.trim()).filter(Boolean).join(',');
    
    // Build email content
    const subject = `Meeting Invitation: ${meetingTitle}`;
    const body = `You're invited to a meeting!

${meetingTitle}

Date: ${dateFormatted}
Time: ${timeFormatted}${meetingLocation ? `\nLocation: ${meetingLocation}` : ''}${meetingNotes ? `\n\n${meetingNotes}` : ''}

--
Scheduled via WhenWorks`;

    // Use Gmail compose URL - opens in new tab
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailList)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.open(gmailUrl, '_blank');
  };

  if (totalParticipants === 0) {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Calendar className="w-4 h-4" />
        Schedule Meeting
      </Button>

      {/* Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <div 
            className={cn(
              "bg-background border-2 border-border shadow-[8px_8px_0px_0px_var(--shadow-color)] max-h-[90vh] overflow-hidden flex flex-col",
              step === "select-time" ? "w-full max-w-3xl" : "w-full max-w-lg"
            )}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-border bg-card">
              <div className="flex items-center gap-3">
                {step !== "select-time" && (
                  <button
                    onClick={handleBack}
                    className="p-1.5 hover:bg-secondary transition-colors border-2 border-border cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="w-8 h-8 bg-accent flex items-center justify-center border-2 border-border">
                  <Calendar className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <h2 className="font-bold uppercase text-sm">
                    {step === "select-time" && "Click to Select a Time"}
                    {step === "compose" && "Meeting Details"}
                    {step === "confirm" && "Meeting Scheduled!"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {step === "select-time" && "Click on the availability grid to pick a time slot"}
                    {step === "compose" && "Add details and send invites"}
                    {step === "confirm" && "Share with participants"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-secondary transition-colors border-2 border-transparent hover:border-border cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {step === "select-time" && (
                <div className="space-y-4">
                  {/* Legend */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Click a time slot to schedule the meeting
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-emerald-500 border border-border"></span> All
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-emerald-500/50 border border-border"></span> Some
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 bg-secondary border border-border"></span> None
                      </span>
                    </div>
                  </div>

                  {/* Interactive Grid */}
                  <div className="overflow-x-auto pb-2">
                    <div 
                      className="grid" 
                      style={{ 
                        gridTemplateColumns: `60px repeat(${dates.length}, minmax(70px, 1fr))`,
                        minWidth: dates.length > 5 ? `${60 + dates.length * 75}px` : undefined
                      }}
                    >
                      {/* Header Row */}
                      <div className="h-12 sticky left-0 bg-background z-10"></div>
                      {dates.map((date, i) => (
                        <div key={i} className="h-12 flex flex-col items-center justify-center border-b-2 border-border text-sm px-1">
                          <span className="font-bold text-foreground">{format(date, "EEE")}</span>
                          <span className="text-xs text-muted-foreground">{format(date, "MMM d")}</span>
                        </div>
                      ))}

                      {/* Time Rows */}
                      {timeSlots.map((time, timeIndex) => (
                        <div key={timeIndex} className="contents">
                          {/* Time Label */}
                          <div className="h-8 text-xs text-muted-foreground text-right pr-2 flex items-center justify-end sticky left-0 bg-background z-10">
                            {time.minute === 0 ? formatTimeFromSlot(time) : ""}
                          </div>
                          
                          {/* Grid Cells */}
                          {dates.map((date, dateIndex) => {
                            const { count, participants, opacity } = getSlotData(date, time);
                            const isHovered = hoveredSlot && 
                              format(hoveredSlot.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd") &&
                              hoveredSlot.time.hour === time.hour && 
                              hoveredSlot.time.minute === time.minute;
                            
                            return (
                              <div
                                key={`${dateIndex}-${timeIndex}`}
                                onClick={() => handleSlotClick(date, time)}
                                onMouseEnter={() => setHoveredSlot({ date, time, count, participants })}
                                onMouseLeave={() => setHoveredSlot(null)}
                                className={cn(
                                  "h-8 border-r border-b border-border/30 transition-all cursor-pointer relative",
                                  dateIndex === 0 && "border-l",
                                  count > 0 
                                    ? "bg-emerald-500 hover:ring-2 hover:ring-accent hover:ring-inset" 
                                    : "bg-secondary hover:bg-muted",
                                  isHovered && "ring-2 ring-accent ring-inset"
                                )}
                                style={count > 0 ? { opacity } : undefined}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hover Info */}
                  <div className={cn(
                    "p-3 border-2 border-border bg-card transition-opacity",
                    hoveredSlot ? "opacity-100" : "opacity-50"
                  )}>
                    {hoveredSlot ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">
                            {format(hoveredSlot.date, "EEE, MMM d")} at {formatTimeRangeFromSlot(hoveredSlot.time)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {hoveredSlot.count}/{totalParticipants} available
                            {hoveredSlot.participants.length > 0 && (
                              <span className="ml-2">
                                ({hoveredSlot.participants.slice(0, 3).join(', ')}
                                {hoveredSlot.participants.length > 3 && ` +${hoveredSlot.participants.length - 3}`})
                              </span>
                            )}
                          </p>
                        </div>
                        <div className={cn(
                          "px-3 py-1 border-2 font-mono text-sm",
                          hoveredSlot.count === totalParticipants 
                            ? "bg-emerald-500 border-emerald-600 text-white"
                            : hoveredSlot.count > 0
                            ? "bg-emerald-500/30 border-emerald-600 text-emerald-400"
                            : "bg-secondary border-border"
                        )}>
                          {hoveredSlot.count}/{totalParticipants}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center">
                        Hover over a time slot to see availability details
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === "compose" && selectedSlot && (
                <div className="space-y-4">
                  {/* Selected time summary */}
                  <div className="bg-accent p-3 border-2 border-border">
                    <div className="flex items-center gap-2 text-accent-foreground">
                      <Check className="w-4 h-4" />
                      <span className="font-bold">
                        {format(parse(selectedSlot.date, "yyyy-MM-dd", new Date()), "EEEE, MMM d")}
                      </span>
                      <span className="text-sm">
                        {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                      </span>
                    </div>
                    <p className="text-xs text-accent-foreground/80 mt-1">
                      {selectedSlot.count}/{totalParticipants} available
                      {selectedSlot.participants.length > 0 && `: ${selectedSlot.participants.join(', ')}`}
                    </p>
                  </div>

                  {/* Duration selector */}
                  <div>
                    <label className="text-xs font-bold uppercase mb-1.5 block">Duration</label>
                    <Select
                      value={duration.toString()}
                      onChange={(e) => handleDurationChange(parseInt(e.target.value))}
                    >
                      {DURATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Meeting title */}
                  <div>
                    <label className="text-xs font-bold uppercase mb-1.5 block">Meeting Title</label>
                    <Input
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      placeholder="Enter meeting title"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="text-xs font-bold uppercase mb-1.5 block">Location (optional)</label>
                    <Input
                      value={meetingLocation}
                      onChange={(e) => setMeetingLocation(e.target.value)}
                      placeholder="Zoom link, room number, address..."
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-bold uppercase mb-1.5 block">Notes (optional)</label>
                    <textarea
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      placeholder="Agenda, preparation notes, etc..."
                      className="w-full min-h-20 p-3 border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>

                  {/* Participant emails */}
                  <div>
                    <label className="text-xs font-bold uppercase mb-1.5 block">
                      Participant Emails (optional)
                    </label>
                    <textarea
                      value={emails}
                      onChange={(e) => setEmails(e.target.value)}
                      placeholder="email1@example.com, email2@example.com"
                      className="w-full min-h-16 p-3 border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated. Used to pre-fill email recipients.
                    </p>
                  </div>
                </div>
              )}

              {step === "confirm" && selectedSlot && (
                <div className="space-y-4">
                  {/* Success message */}
                  <div className="bg-emerald-500 p-4 border-2 border-emerald-600 text-center">
                    <div className="w-12 h-12 bg-white border-2 border-emerald-600 mx-auto mb-3 flex items-center justify-center">
                      <Check className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-white text-lg">Meeting Ready!</h3>
                    <p className="text-emerald-100 text-sm mt-1">
                      {format(parse(selectedSlot.date, "yyyy-MM-dd", new Date()), "EEEE, MMMM d")} at {formatTime(selectedSlot.startTime)}
                    </p>
                  </div>

                  {/* Smart Calendar Actions - Mobile Optimized */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Add to your calendar</p>
                    
                    {/* Primary action based on device */}
                    {isMobile ? (
                      <>
                        {/* iOS - Primary action is Add to Calendar (opens native calendar) */}
                        {mobileOS === 'ios' && (
                          <button
                            onClick={() => {
                              const event = getCalendarEvent();
                              if (!event) return;
                              const action = getSmartCalendarAction(event);
                              action.primary.action();
                            }}
                            className="w-full flex items-center gap-3 p-4 border-2 border-border bg-card hover:bg-secondary transition-colors text-left cursor-pointer"
                          >
                            <Calendar className="w-5 h-5" />
                            <div className="flex-1">
                              <span className="font-bold block">Add to Apple Calendar</span>
                              <span className="text-xs text-muted-foreground">Opens your iPhone/iPad calendar</span>
                            </div>
                          </button>
                        )}

                        {/* Android - Primary action is Google Calendar */}
                        {mobileOS === 'android' && (
                          <a
                            href={getGoogleCalendarUrl(getCalendarEvent()!)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-3 p-4 border-2 border-border bg-card hover:bg-secondary transition-colors text-left cursor-pointer"
                          >
                            <Calendar className="w-5 h-5" />
                            <div className="flex-1">
                              <span className="font-bold block">Add to Google Calendar</span>
                              <span className="text-xs text-muted-foreground">Opens Google Calendar app</span>
                            </div>
                          </a>
                        )}

                        {/* Outlook option for mobile */}
                        <a
                          href={getOutlookCalendarUrl(getCalendarEvent()!)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center gap-3 p-3 border-2 border-border bg-card hover:bg-secondary transition-colors text-left cursor-pointer"
                        >
                          <Calendar className="w-4 h-4" />
                          <div className="flex-1">
                            <span className="font-bold block text-sm">Add to Outlook</span>
                            <span className="text-xs text-muted-foreground">Opens Outlook app</span>
                          </div>
                        </a>

                        {/* Google Calendar for iOS as secondary option */}
                        {mobileOS === 'ios' && (
                          <a
                            href={getGoogleCalendarUrl(getCalendarEvent()!)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-3 p-3 border-2 border-border bg-card hover:bg-secondary transition-colors text-left cursor-pointer"
                          >
                            <Calendar className="w-4 h-4" />
                            <div className="flex-1">
                              <span className="font-bold block text-sm">Add to Google Calendar</span>
                              <span className="text-xs text-muted-foreground">If you use Google Calendar</span>
                            </div>
                          </a>
                        )}
                      </>
                    ) : (
                      /* Desktop Calendar Options */
                      <>
                        <button
                          onClick={downloadICS}
                          className="w-full flex items-center gap-3 p-3 border-2 border-border bg-card hover:bg-secondary transition-colors text-left cursor-pointer"
                        >
                          <Download className="w-5 h-5" />
                          <div className="flex-1">
                            <span className="font-bold block">Download .ics File</span>
                            <span className="text-xs text-muted-foreground">For Apple Calendar, Outlook desktop, etc.</span>
                          </div>
                        </button>

                        <div className="flex gap-2">
                          <a
                            href={getGoogleCalendarUrl(getCalendarEvent()!)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 p-2 border-2 border-border bg-card hover:bg-secondary transition-colors text-sm font-medium cursor-pointer"
                          >
                            Google Calendar
                          </a>
                          <a
                            href={getOutlookCalendarUrl(getCalendarEvent()!)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 p-2 border-2 border-border bg-card hover:bg-secondary transition-colors text-sm font-medium cursor-pointer"
                          >
                            Outlook
                          </a>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Share options */}
                  <div className="space-y-2 pt-2 border-t-2 border-border">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Share with participants</p>
                    
                    <button
                      onClick={openMailClient}
                      className="w-full flex items-center gap-3 p-3 border-2 border-border bg-card hover:bg-secondary transition-colors text-left cursor-pointer"
                    >
                      <Mail className="w-5 h-5" />
                      <div className="flex-1">
                        <span className="font-bold block">Send Email Invites</span>
                        <span className="text-xs text-muted-foreground">Opens your email client</span>
                      </div>
                      <Send className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {!isMobile && (
                      <button
                        onClick={copyICSContent}
                        className="w-full flex items-center gap-3 p-3 border-2 border-border bg-card hover:bg-secondary transition-colors text-left cursor-pointer"
                      >
                        {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                        <div className="flex-1">
                          <span className="font-bold block">
                            {copied ? "Copied!" : "Copy Calendar Data"}
                          </span>
                          <span className="text-xs text-muted-foreground">ICS content to clipboard</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {step === "compose" && (
              <div className="p-4 border-t-2 border-border bg-card flex justify-end">
                <Button onClick={handleSchedule} disabled={!meetingTitle.trim()}>
                  <Check className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </Button>
              </div>
            )}

            {step === "confirm" && (
              <div className="p-4 border-t-2 border-border bg-card">
                <Button onClick={handleClose} className="w-full">
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
