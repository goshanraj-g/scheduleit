// Calendar integration utilities

import { format, parse } from 'date-fns';

interface CalendarEvent {
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timezone: string;
  location?: string;
}

// Detect mobile OS
export function getMobileOS(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }
  if (/android/.test(userAgent)) {
    return 'android';
  }
  return 'other';
}

// Check if device is mobile
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
}

// Generate ICS file content
export function generateICS(event: CalendarEvent): string {
  const { title, description, startDate, startTime, endTime, timezone } = event;
  
  // Parse date and times
  const startDateTime = parse(`${startDate} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const endDateTime = parse(`${startDate} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());
  
  // Format for ICS (YYYYMMDDTHHmmss)
  const formatICS = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");
  
  const uid = `${Date.now()}@whenworks.app`;
  const now = formatICS(new Date());
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WhenWorks//Meeting Scheduler//EN',
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
  
  return `https://outlook.live.com/calendar/deeplink/compose?${params.toString()}`;
}

// Generate Outlook Desktop URL (for installed Outlook)
export function getOutlookDesktopUrl(event: CalendarEvent): string {
  // For desktop Outlook, we use the ICS download approach
  // This is handled by downloadICS function
  return '';
}

// Generate Apple Calendar URL (for iOS devices)
export function getAppleCalendarUrl(event: CalendarEvent): string {
  const { title, description, startDate, startTime, endTime, timezone, location } = event;
  
  // Parse dates
  const startDateTime = parse(`${startDate} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const endDateTime = parse(`${startDate} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());
  
  // Apple Calendar uses webcal:// protocol or data URI with ICS
  // For mobile, we create a data URI that triggers the calendar app
  const formatICS = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");
  const uid = `${Date.now()}@whenworks.app`;
  const now = formatICS(new Date());
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WhenWorks//Meeting Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=${timezone}:${formatICS(startDateTime)}`,
    `DTEND;TZID=${timezone}:${formatICS(endDateTime)}`,
    `SUMMARY:${escapeICS(title)}`,
    description ? `DESCRIPTION:${escapeICS(description)}` : '',
    location ? `LOCATION:${escapeICS(location)}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  
  // Create data URI for iOS
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
}

// Generate Google Calendar mobile app deep link
export function getGoogleCalendarMobileUrl(event: CalendarEvent): string {
  // On mobile, Google Calendar app handles the web URL and opens the app if installed
  // The regular Google Calendar URL works for both web and app
  return getGoogleCalendarUrl(event);
}

// Generate Outlook mobile deep link
export function getOutlookMobileUrl(event: CalendarEvent): string {
  const { title, description, startDate, startTime, endTime, location } = event;
  
  // Parse dates
  const startDateTime = parse(`${startDate} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const endDateTime = parse(`${startDate} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());
  
  // Outlook mobile uses the same URL structure
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    startdt: startDateTime.toISOString(),
    enddt: endDateTime.toISOString(),
  });
  
  if (description) {
    params.set('body', description);
  }
  
  if (location) {
    params.set('location', location);
  }
  
  // On mobile, this URL opens the Outlook app if installed
  return `https://outlook.live.com/calendar/deeplink/compose?${params.toString()}`;
}

// Get the best calendar option for the current device
export function getSmartCalendarAction(event: CalendarEvent): {
  primary: { label: string; action: () => void; icon: 'apple' | 'google' | 'download' };
  secondary: { label: string; url: string; icon: 'google' | 'outlook' }[];
} {
  const os = getMobileOS();
  const isMobile = isMobileDevice();
  
  if (os === 'ios') {
    return {
      primary: {
        label: 'Add to Calendar',
        action: () => {
          // Create and trigger ICS download which opens Apple Calendar
          const icsContent = generateICS(event);
          const blob = new Blob([icsContent], { type: 'text/calendar' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
          link.click();
          URL.revokeObjectURL(url);
        },
        icon: 'apple' as const,
      },
      secondary: [
        { label: 'Google Calendar', url: getGoogleCalendarUrl(event), icon: 'google' as const },
        { label: 'Outlook', url: getOutlookMobileUrl(event), icon: 'outlook' as const },
      ],
    };
  }
  
  if (os === 'android') {
    return {
      primary: {
        label: 'Add to Google Calendar',
        action: () => {
          window.open(getGoogleCalendarUrl(event), '_blank');
        },
        icon: 'google' as const,
      },
      secondary: [
        { label: 'Outlook', url: getOutlookMobileUrl(event), icon: 'outlook' as const },
      ],
    };
  }
  
  // Desktop fallback
  return {
    primary: {
      label: 'Download .ics',
      action: () => downloadICS(event),
      icon: 'download' as const,
    },
    secondary: [
      { label: 'Google Calendar', url: getGoogleCalendarUrl(event), icon: 'google' as const },
      { label: 'Outlook', url: getOutlookCalendarUrl(event), icon: 'outlook' as const },
    ],
  };
}