// Types for ScheduleIt

export interface EventConfig {
  id: string;
  name: string;
  slug: string;
  dates: string[]; // ISO date strings (YYYY-MM-DD)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  timezone: string;
  nameOption: "required" | "optional" | "anonymous";
  createdAt: string;
}

export interface TimeSlot {
  dateIndex: number;
  timeIndex: number;
}

export interface Availability {
  id: string;
  eventId: string;
  participantName: string;
  slots: string[]; // Array of "dateIndex-timeIndex" keys
  submittedAt: string;
}

export interface GroupAvailability {
  slots: {
    [slotKey: string]: {
      count: number;
      participants: string[];
    };
  };
}

export interface BestTimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  count: number;
  participants: string[];
}
