// Storage utilities using Supabase
import { supabase, DbEvent, DbAvailability } from './supabase';
import type { EventConfig, Availability, GroupAvailability, BestTimeSlot } from './types';

// ===== HELPERS =====

export function generateId(): string {
  return crypto.randomUUID();
}

// Convert DB format to app format
function dbEventToConfig(dbEvent: DbEvent): EventConfig {
  return {
    id: dbEvent.id,
    name: dbEvent.name,
    slug: dbEvent.slug,
    dates: dbEvent.dates,
    startTime: dbEvent.start_time,
    endTime: dbEvent.end_time,
    timezone: dbEvent.timezone,
    nameOption: dbEvent.name_option,
    createdAt: dbEvent.created_at,
  };
}

function dbAvailabilityToApp(db: DbAvailability): Availability {
  return {
    id: db.id,
    eventId: db.event_id,
    participantName: db.participant_name,
    slots: db.slots,
    submittedAt: db.submitted_at,
  };
}

// ===== EVENTS =====

export async function saveEvent(event: EventConfig): Promise<EventConfig | null> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      id: event.id,
      name: event.name,
      slug: event.slug,
      dates: event.dates,
      start_time: event.startTime,
      end_time: event.endTime,
      timezone: event.timezone,
      name_option: event.nameOption,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving event:', error);
    return null;
  }

  return dbEventToConfig(data);
}

export async function getEvent(slug: string): Promise<EventConfig | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching event:', error);
    return null;
  }

  return dbEventToConfig(data);
}

export async function getEventById(id: string): Promise<EventConfig | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching event:', error);
    return null;
  }

  return dbEventToConfig(data);
}

// ===== AVAILABILITY =====

export async function saveAvailability(availability: Availability): Promise<Availability | null> {
  // Upsert: update if exists, insert if not
  const { data, error } = await supabase
    .from('availability')
    .upsert(
      {
        event_id: availability.eventId,
        participant_name: availability.participantName,
        slots: availability.slots,
        submitted_at: availability.submittedAt,
      },
      {
        onConflict: 'event_id,participant_name',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error saving availability:', error);
    return null;
  }

  return dbAvailabilityToApp(data);
}

export async function getEventAvailability(eventId: string): Promise<Availability[]> {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('event_id', eventId);

  if (error) {
    console.error('Error fetching availability:', error);
    return [];
  }

  return data.map(dbAvailabilityToApp);
}

export async function getParticipantAvailability(
  eventId: string,
  participantName: string
): Promise<Availability | null> {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('event_id', eventId)
    .ilike('participant_name', participantName)
    .single();

  if (error) {
    return null;
  }

  return dbAvailabilityToApp(data);
}

// ===== AGGREGATION =====

export async function calculateGroupAvailability(eventId: string): Promise<GroupAvailability> {
  const availabilities = await getEventAvailability(eventId);
  const result: GroupAvailability = { slots: {} };

  for (const availability of availabilities) {
    for (const slotKey of availability.slots) {
      if (!result.slots[slotKey]) {
        result.slots[slotKey] = { count: 0, participants: [] };
      }
      result.slots[slotKey].count++;
      result.slots[slotKey].participants.push(availability.participantName);
    }
  }

  return result;
}

export async function findBestTimeSlots(
  eventId: string,
  limit: number = 3
): Promise<BestTimeSlot[]> {
  const groupAvailability = await calculateGroupAvailability(eventId);
  const availabilities = await getEventAvailability(eventId);
  const totalParticipants = availabilities.length;

  if (totalParticipants === 0) return [];

  // Convert to array and sort by count
  const slots = Object.entries(groupAvailability.slots)
    .map(([key, data]) => {
      // Key format: "YYYY-MM-DDTHH:mm"
      const [date, time] = key.split('T');
      const [hour, minute] = time.split(':').map(Number);
      const endMinute = minute === 30 ? 0 : 30;
      const endHour = minute === 30 ? hour + 1 : hour;

      return {
        date,
        startTime: time,
        endTime: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
        count: data.count,
        participants: data.participants,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return slots;
}

export async function getParticipantCount(eventId: string): Promise<number> {
  const { count, error } = await supabase
    .from('availability')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (error) {
    console.error('Error counting participants:', error);
    return 0;
  }

  return count || 0;
}
