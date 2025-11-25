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
    sessionToken: db.session_token || undefined,
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

export async function saveAvailability(
  availability: Availability,
  sessionToken?: string
): Promise<{ data: Availability | null; error?: string }> {
  // First, check if this availability already exists
  const { data: existing } = await supabase
    .from('availability')
    .select('session_token')
    .eq('event_id', availability.eventId)
    .eq('participant_name', availability.participantName)
    .single();

  // If exists and has a session token, verify ownership
  if (existing?.session_token && existing.session_token !== sessionToken) {
    return { 
      data: null, 
      error: 'This name is already taken. Please use a different name.' 
    };
  }

  // Upsert: update if exists, insert if not
  const { data, error } = await supabase
    .from('availability')
    .upsert(
      {
        event_id: availability.eventId,
        participant_name: availability.participantName,
        slots: availability.slots,
        session_token: sessionToken || null,
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
    return { data: null, error: 'Failed to save availability' };
  }

  return { data: dbAvailabilityToApp(data) };
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

  // Group slots by date and find continuous blocks
  const slotsByDate: Record<string, { time: string; count: number; participants: string[] }[]> = {};
  
  Object.entries(groupAvailability.slots).forEach(([key, data]) => {
    const [date, time] = key.split('T');
    if (!slotsByDate[date]) {
      slotsByDate[date] = [];
    }
    slotsByDate[date].push({ time, count: data.count, participants: data.participants });
  });

  // Sort slots within each date by time
  Object.keys(slotsByDate).forEach(date => {
    slotsByDate[date].sort((a, b) => a.time.localeCompare(b.time));
  });

  // Helper to get the end time of a 30-min slot
  const getSlotEndTime = (startTime: string): string => {
    const [hour, minute] = startTime.split(':').map(Number);
    const endMinute = minute === 0 ? 30 : 0;
    const endHour = minute === 0 ? hour : hour + 1;
    return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  };

  // Find continuous blocks where everyone (or most people) are available
  const blocks: BestTimeSlot[] = [];

  Object.entries(slotsByDate).forEach(([date, slots]) => {
    let blockStartTime: string | null = null;
    let blockEndTime: string | null = null;
    let blockCount = 0;
    let blockParticipants: string[] = [];

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const slotEnd = getSlotEndTime(slot.time);
      
      if (blockStartTime !== null && blockEndTime !== null) {
        // Check if this slot is consecutive (starts where previous ended) 
        // AND has the same availability count
        const isConsecutive = slot.time === blockEndTime;
        const sameCount = slot.count === blockCount;
        
        if (isConsecutive && sameCount) {
          // Extend the current block
          blockEndTime = slotEnd;
          // Keep intersection of participants
          blockParticipants = blockParticipants.filter(p => slot.participants.includes(p));
        } else {
          // Save current block and start new one
          blocks.push({
            date,
            startTime: blockStartTime,
            endTime: blockEndTime,
            count: blockCount,
            participants: blockParticipants,
          });
          
          // Start new block with this slot
          blockStartTime = slot.time;
          blockEndTime = slotEnd;
          blockCount = slot.count;
          blockParticipants = [...slot.participants];
        }
      } else {
        // Start first block
        blockStartTime = slot.time;
        blockEndTime = slotEnd;
        blockCount = slot.count;
        blockParticipants = [...slot.participants];
      }
    }

    // Don't forget the last block
    if (blockStartTime !== null && blockEndTime !== null) {
      blocks.push({
        date,
        startTime: blockStartTime,
        endTime: blockEndTime,
        count: blockCount,
        participants: blockParticipants,
      });
    }
  });

  // Calculate duration for each block in minutes
  const blocksWithDuration = blocks.map(block => {
    const [startHour, startMin] = block.startTime.split(':').map(Number);
    const [endHour, endMin] = block.endTime.split(':').map(Number);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    return { ...block, duration };
  });

  // Sort by: 1) highest count (most participants), 2) longest duration, 3) earliest date/time
  blocksWithDuration.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.duration !== a.duration) return b.duration - a.duration;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  // Return top blocks (remove duration from output)
  return blocksWithDuration.slice(0, limit).map(({ duration, ...block }) => block);
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
