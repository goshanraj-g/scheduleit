"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Download, Send, Users, Clock, X, Check, Copy, Mail } from "lucide-react";
import { generateICS, getGoogleCalendarUrl, getOutlookCalendarUrl } from "@/lib/calendar";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import type { BestTimeSlot } from "@/lib/types";

interface ScheduleMeetingProps {
  eventName: string;
  bestTimes: BestTimeSlot[];
  timezone: string;
  totalParticipants: number;
  participantEmails?: string[];
}

type Step = "select-time" | "compose" | "confirm";

export function ScheduleMeeting({ 
  eventName, 
  bestTimes, 
  timezone, 
  totalParticipants,
  participantEmails = []
}: ScheduleMeetingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("select-time");
  const [selectedSlot, setSelectedSlot] = useState<BestTimeSlot | null>(null);
  const [meetingTitle, setMeetingTitle] = useState(eventName);
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [emails, setEmails] = useState(participantEmails.join(", "));
  const [copied, setCopied] = useState(false);

  if (bestTimes.length === 0) {
    return null;
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const getCalendarEvent = () => {
    if (!selectedSlot) return null;
    return {
      title: meetingTitle,
      description: meetingNotes || `Meeting scheduled via ScheduleIt.\n\nParticipants: ${selectedSlot.participants.join(', ')}`,
      startDate: selectedSlot.date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      timezone,
      location: meetingLocation,
    };
  };

  const handleSlotSelect = (slot: BestTimeSlot) => {
    setSelectedSlot(slot);
    setStep("compose");
  };

  const handleBack = () => {
    if (step === "compose") {
      setStep("select-time");
    } else if (step === "confirm") {
      setStep("compose");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep("select-time");
    setSelectedSlot(null);
    setCopied(false);
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
    
    const subject = encodeURIComponent(`Meeting Invitation: ${meetingTitle}`);
    const dateFormatted = format(parse(selectedSlot.date, "yyyy-MM-dd", new Date()), "EEEE, MMMM d, yyyy");
    const timeFormatted = `${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}`;
    
    const body = encodeURIComponent(
`You're invited to a meeting!

${meetingTitle}

📅 Date: ${dateFormatted}
🕐 Time: ${timeFormatted}
${meetingLocation ? `📍 Location: ${meetingLocation}\n` : ''}
${meetingNotes ? `\n${meetingNotes}\n` : ''}
---
Add to your calendar:
• Google Calendar: ${getGoogleCalendarUrl(event)}
• Outlook: ${getOutlookCalendarUrl(event)}

Scheduled via ScheduleIt`
    );

    const emailList = emails.split(',').map(e => e.trim()).filter(Boolean).join(',');
    window.location.href = `mailto:${emailList}?subject=${subject}&body=${body}`;
  };

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
            className="bg-background border-2 border-border shadow-[8px_8px_0px_0px_var(--shadow-color)] w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent flex items-center justify-center border-2 border-border">
                  <Calendar className="w-4 h-4 text-accent-foreground" />
                </div>
                <div>
                  <h2 className="font-bold uppercase text-sm">
                    {step === "select-time" && "Select a Time"}
                    {step === "compose" && "Meeting Details"}
                    {step === "confirm" && "Meeting Scheduled!"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {step === "select-time" && "Choose the best time for everyone"}
                    {step === "compose" && "Add details and send invites"}
                    {step === "confirm" && "Share with participants"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-secondary transition-colors border-2 border-transparent hover:border-border"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {step === "select-time" && (
                <div className="space-y-2">
                  {bestTimes.slice(0, 10).map((slot, idx) => (
                    <button
                      key={`${slot.date}-${slot.startTime}`}
                      onClick={() => handleSlotSelect(slot)}
                      className={cn(
                        "w-full p-3 border-2 text-left transition-all",
                        "hover:bg-accent hover:text-accent-foreground hover:border-accent",
                        idx === 0 
                          ? "border-accent bg-accent/20" 
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">
                          {format(parse(slot.date, "yyyy-MM-dd", new Date()), "EEE, MMM d")}
                        </span>
                        <span className={cn(
                          "text-xs font-mono px-2 py-0.5 border-2",
                          slot.count === totalParticipants 
                            ? "bg-emerald-500 border-emerald-600 text-white"
                            : "bg-secondary border-border"
                        )}>
                          {slot.count}/{totalParticipants}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <Users className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            {slot.participants.slice(0, 3).join(', ')}
                            {slot.participants.length > 3 && ` +${slot.participants.length - 3}`}
                          </span>
                        </span>
                      </div>
                      {idx === 0 && (
                        <span className="text-xs text-accent font-bold mt-1 inline-block">
                          ★ BEST OPTION
                        </span>
                      )}
                    </button>
                  ))}
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
                      {selectedSlot.count}/{totalParticipants} available: {selectedSlot.participants.join(', ')}
                    </p>
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

                  {/* Share options */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Share with participants</p>
                    
                    <button
                      onClick={openMailClient}
                      className="w-full flex items-center gap-3 p-3 border-2 border-border bg-card hover:bg-secondary transition-colors text-left"
                    >
                      <Mail className="w-5 h-5" />
                      <div className="flex-1">
                        <span className="font-bold block">Send Email Invites</span>
                        <span className="text-xs text-muted-foreground">Opens your email client</span>
                      </div>
                      <Send className="w-4 h-4 text-muted-foreground" />
                    </button>

                    <button
                      onClick={downloadICS}
                      className="w-full flex items-center gap-3 p-3 border-2 border-border bg-card hover:bg-secondary transition-colors text-left"
                    >
                      <Download className="w-5 h-5" />
                      <div className="flex-1">
                        <span className="font-bold block">Download .ics File</span>
                        <span className="text-xs text-muted-foreground">For Apple Calendar, Outlook desktop, etc.</span>
                      </div>
                    </button>

                    <button
                      onClick={copyICSContent}
                      className="w-full flex items-center gap-3 p-3 border-2 border-border bg-card hover:bg-secondary transition-colors text-left"
                    >
                      {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                      <div className="flex-1">
                        <span className="font-bold block">
                          {copied ? "Copied!" : "Copy Calendar Data"}
                        </span>
                        <span className="text-xs text-muted-foreground">ICS content to clipboard</span>
                      </div>
                    </button>
                  </div>

                  {/* Direct calendar links */}
                  <div className="pt-2 border-t-2 border-border">
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Add to your calendar</p>
                    <div className="flex gap-2">
                      <a
                        href={getGoogleCalendarUrl(getCalendarEvent()!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 p-2 border-2 border-border bg-card hover:bg-secondary transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
                        </svg>
                        Google
                      </a>
                      <a
                        href={getOutlookCalendarUrl(getCalendarEvent()!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 p-2 border-2 border-border bg-card hover:bg-secondary transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V12zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3.05-1.83zm-5.25-9v3h3.75v-3zm0 4.5v3h3.75v-3zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73zM9 3.75V6h2l.13.01.12.04v-2.3zM5.98 15.98q.9 0 1.6-.3.7-.32 1.19-.86.48-.55.73-1.28.25-.74.25-1.61 0-.83-.25-1.55-.24-.71-.71-1.24t-1.15-.83q-.68-.3-1.55-.3-.92 0-1.64.32-.71.32-1.2.87-.48.55-.74 1.29-.25.73-.25 1.56 0 .85.26 1.56.26.72.74 1.23.48.52 1.17.81.69.3 1.55.3zM7.5 21h12.39L12 16.08V17q0 .41-.3.7-.29.3-.7.3H7.5zm15-.13v-7.24l-5.9 3.54Z"/>
                        </svg>
                        Outlook
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {step !== "confirm" && (
              <div className="p-4 border-t-2 border-border bg-card flex justify-between">
                {step === "compose" ? (
                  <>
                    <Button variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                    <Button onClick={handleSchedule} disabled={!meetingTitle.trim()}>
                      <Check className="w-4 h-4 mr-2" />
                      Schedule Meeting
                    </Button>
                  </>
                ) : (
                  <div className="w-full text-center text-sm text-muted-foreground">
                    Pick a time slot above
                  </div>
                )}
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
