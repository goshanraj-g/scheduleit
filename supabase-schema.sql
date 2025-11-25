-- WhenWorks Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/witxholkjwbdczguntav/sql)

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  dates TEXT[] NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  timezone TEXT NOT NULL,
  name_option TEXT NOT NULL CHECK (name_option IN ('required', 'optional', 'anonymous')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Availability table
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  slots TEXT[] NOT NULL,
  session_token TEXT, -- Token for ownership verification (allows updates)
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One response per participant per event (can update)
  UNIQUE(event_id, participant_name)
);

-- Migration: Add session_token column if it doesn't exist
-- ALTER TABLE availability ADD COLUMN IF NOT EXISTS session_token TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_availability_event_id ON availability(event_id);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Policies: Allow public read/write (no auth required for this app)
CREATE POLICY "Allow public read events" ON events
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert events" ON events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read availability" ON availability
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert availability" ON availability
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update availability" ON availability
  FOR UPDATE USING (true);
