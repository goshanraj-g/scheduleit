// Calendar integration utilities

import { format, parse, addMinutes } from 'date-fns';

interface CalendarEvent {
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timezone: string;
  location?: string;
}

// Generate ICS file content
export function generateICS(event: CalendarEvent): string {
  const { title, description, startDate, startTime, endTime, timezone } = event;
  
  // Parse date and times
  const startDateTime = parse(`${startDate} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const endDateTime = parse(`${startDate} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());
  
  // Format for ICS (YYYYMMDDTHHmmss)
  const formatICS = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");
  
  const uid = `${Date.now()}@scheduleit.app`;
  const now = formatICS(new Date());
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ScheduleIt//Meeting Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${timezone}:${formatICS(startDateTime)}`,
    `DTEND;TZID=${timezone}:${formatICS(endDateTime)}`,
    `SUMMARY:${escapeICS(title)}`,
    description ? `DESCRIPTION:${escapeICS(description)}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  
  return icsContent;
}

// Escape special characters for ICS format
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Download ICS file
export function downloadICS(event: CalendarEvent): void {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/\s+/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate Google Calendar URL
export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const { title, description, startDate, startTime, endTime, timezone } = event;
  
  // Parse and format dates for Google Calendar (YYYYMMDDTHHmmssZ format)
  const startDateTime = parse(`${startDate} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const endDateTime = parse(`${startDate} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());
  
  const formatGoogle = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGoogle(startDateTime)}/${formatGoogle(endDateTime)}`,
    ctz: timezone,
  });
  
  if (description) {
    params.set('details', description);
  }
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Generate Outlook Calendar URL (Office 365 / Outlook.com)
export function getOutlookCalendarUrl(event: CalendarEvent): string {
  const { title, description, startDate, startTime, endTime, timezone } = event;
  
  // Parse dates
  const startDateTime = parse(`${startDate} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const endDateTime = parse(`${startDate} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());
  
  // Outlook uses ISO format
  const formatOutlook = (date: Date) => date.toISOString();
  
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    startdt: formatOutlook(startDateTime),
    enddt: formatOutlook(endDateTime),
  });
  
  if (description) {
    params.set('body', description);
  }
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// Generate Outlook Desktop URL (for installed Outlook)
export function getOutlookDesktopUrl(event: CalendarEvent): string {
  // For desktop Outlook, we use the ICS download approach
  // This is handled by downloadICS function
  return '';
}
