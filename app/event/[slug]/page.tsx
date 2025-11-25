"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Copy, Check, Globe, Users, AlertCircle } from "lucide-react";
import { cn, sanitizeName } from "@/lib/utils";
import { TimeGrid } from "@/components/event/TimeGrid";
import { HeatMap } from "@/components/event/HeatMap";
import { ScheduleMeeting } from "@/components/event/ScheduleMeeting";
import { format, parse } from "date-fns";
import { getEvent, saveAvailability, calculateGroupAvailability, findBestTimeSlots, getParticipantCount } from "@/lib/storage";
import { getSessionToken } from "@/lib/rate-limit";
import type { EventConfig, Availability, GroupAvailability, BestTimeSlot } from "@/lib/types";

export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"availability" | "group">("availability");
  const [userName, setUserName] = useState("");
  const [hasSubmittedName, setHasSubmittedName] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [groupAvailability, setGroupAvailability] = useState<GroupAvailability | null>(null);
  const [bestTimes, setBestTimes] = useState<BestTimeSlot[]>([]);
  const [participantCount, setParticipantCount] = useState(0);

  // Load event from storage
  useEffect(() => {
    async function loadEvent() {
      const loadedEvent = await getEvent(slug);
      if (loadedEvent) {
        setEvent(loadedEvent);
        if (loadedEvent.nameOption === "anonymous") {
          setHasSubmittedName(true);
        }
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }
    loadEvent();
  }, [slug]);

  // Load group availability
  const refreshGroupData = useCallback(async () => {
    if (!event) return;
    
    const [group, best, count] = await Promise.all([
      calculateGroupAvailability(event.id),
      findBestTimeSlots(event.id),
      getParticipantCount(event.id),
    ]);
    
    setGroupAvailability(group);
    setBestTimes(best);
    setParticipantCount(count);
  }, [event]);

  useEffect(() => {
    if (event) {
      refreshGroupData();
    }
  }, [event, refreshGroupData]);

  // Parse event data
  const parsedDates = event?.dates.map(d => parse(d, "yyyy-MM-dd", new Date())) || [];
  const startHour = event ? parseInt(event.startTime.split(":")[0]) : 9;
  const endHour = event ? parseInt(event.endTime.split(":")[0]) : 17;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (event?.nameOption === "optional" || userName.trim()) {
      setSaveError(null); // Clear any previous error
      setHasSubmittedName(true);
    }
  };

  const handleSlotsChange = (slots: Set<string>) => {
    setSelectedSlots(slots);
    setHasUnsavedChanges(true);
    setSaveError(null); // Clear error when user makes changes
  };

  // Generate a unique session ID for anonymous users
  const getParticipantName = () => {
    const sanitized = sanitizeName(userName);
    if (sanitized) return sanitized;
    
    // For anonymous users, create a unique ID stored in sessionStorage
    // so the same tab always uses the same anonymous ID
    let anonId = sessionStorage.getItem(`whenworks_anon_${event?.id}`);
    if (!anonId) {
      anonId = `Anonymous-${crypto.randomUUID().slice(0, 8)}`;
      sessionStorage.setItem(`whenworks_anon_${event?.id}`, anonId);
    }
    return anonId;
  };

  const handleSaveAvailability = async () => {
    if (!event) return;
    
    setSaving(true);
    setSaveError(null);
    const participantName = getParticipantName();
    const sessionToken = getSessionToken(event.id);
    
    const availability: Availability = {
      id: `${event.id}-${participantName}-${Date.now()}`,
      eventId: event.id,
      participantName,
      slots: Array.from(selectedSlots),
      submittedAt: new Date().toISOString(),
    };
    
    const result = await saveAvailability(availability, sessionToken);
    if (result.error) {
      setSaveError(result.error);
      setSaving(false);
      return;
    }
    if (result.data) {
      setHasUnsavedChanges(false);
      await refreshGroupData();
    }
    setSaving(false);
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hourStr, minuteStr] = time.split(":");
    const hour = parseInt(hourStr);
    const minute = minuteStr || "00";
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minute} ${ampm}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-border bg-accent mx-auto mb-4 animate-pulse"></div>
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-2 border-border bg-destructive/20 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This event doesn&apos;t exist or the link may have expired.
          </p>
          <Button onClick={() => router.push("/")}>
            Create New Event
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-accent flex items-center justify-center border-2 border-border">
              <Calendar className="w-4 h-4 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{event.name}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" /> {event.timezone.split("/").pop()?.replace("_", " ")}
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={handleCopyLink}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? "Copied!" : "Copy to Share"}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Name Entry Modal */}
      {!hasSubmittedName && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border-2 border-border shadow-[8px_8px_0px_0px_var(--shadow-color)] p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 border-2 border-border bg-accent flex items-center justify-center">
                <Users className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Enter Your Name</h2>
                <p className="text-sm text-muted-foreground">
                  {event.nameOption === "required" 
                    ? "Your name is required to submit availability"
                    : "Your name is optional"}
                </p>
              </div>
            </div>
            
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <Input
                placeholder="Your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="h-12"
                autoFocus
              />
              <div className="flex gap-2">
                {event.nameOption === "optional" && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setHasSubmittedName(true)}
                  >
                    Skip
                  </Button>
                )}
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={event.nameOption === "required" && !userName.trim()}
                >
                  Continue
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: User Input */}
        <div className={cn(
          "lg:col-span-4 flex flex-col gap-6",
          activeTab === "group" ? "hidden lg:flex" : "flex"
        )}>
          <div className="bg-card border-2 border-border p-6 shadow-[4px_4px_0px_0px_var(--shadow-color)] flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold uppercase">Your Availability</h2>
              {userName && (
                <span className="text-xs font-mono bg-secondary px-2 py-1 border border-border">
                  {userName}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Click and drag to paint your available times.
            </p>
            
            <div className="flex-1 overflow-hidden mb-4">
              <TimeGrid 
                dates={parsedDates.length > 0 ? parsedDates : undefined}
                startHour={startHour}
                endHour={endHour}
                selectedSlots={selectedSlots}
                onSlotsChange={handleSlotsChange}
              />
            </div>
            
            {/* Error Message */}
            {saveError && (
              <div className="mb-4 p-3 bg-destructive/10 border-2 border-destructive text-destructive text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Unable to save</p>
                  <p>{saveError}</p>
                  <p className="text-xs mt-1 opacity-75">Reload the page to use a different name.</p>
                </div>
              </div>
            )}
            
            <Button 
              onClick={handleSaveAvailability}
              disabled={!hasUnsavedChanges || saving || selectedSlots.size === 0}
              className="w-full"
            >
              {saving ? "Saving..." : hasUnsavedChanges ? "Save Availability" : "Saved"}
            </Button>
          </div>
        </div>

        {/* Right Column: Group Results */}
        <div className={cn(
          "lg:col-span-8 flex flex-col gap-6",
          activeTab === "availability" ? "hidden lg:flex" : "flex"
        )}>
          {/* Best Time Card */}
          <div className="bg-accent/20 border-2 border-accent p-4 shadow-[4px_4px_0px_0px_var(--shadow-color)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent flex items-center justify-center border-2 border-border shrink-0">
                  <Check className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground">Best Time to Meet</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {bestTimes.length > 0 
                      ? bestTimes[0].count === participantCount
                        ? `Everyone's free ${format(parse(bestTimes[0].date, "yyyy-MM-dd", new Date()), "EEE, MMM d")} • ${formatTime(bestTimes[0].startTime)} - ${formatTime(bestTimes[0].endTime)}`
                        : `${bestTimes[0].count} available ${format(parse(bestTimes[0].date, "yyyy-MM-dd", new Date()), "EEE, MMM d")} • ${formatTime(bestTimes[0].startTime)} - ${formatTime(bestTimes[0].endTime)}`
                      : participantCount === 0 
                        ? "No responses yet"
                        : "Finding best time..."
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                {bestTimes.length > 0 && (
                  <span className="text-sm font-mono bg-accent px-2 py-1 border-2 border-border text-accent-foreground">
                    {bestTimes[0].count}/{participantCount}
                  </span>
                )}
                {participantCount > 0 && event && parsedDates.length > 0 && (
                  <ScheduleMeeting 
                    eventName={event.name}
                    dates={parsedDates}
                    startHour={startHour}
                    endHour={endHour}
                    groupAvailability={groupAvailability}
                    timezone={event.timezone}
                    totalParticipants={participantCount}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="bg-card border-2 border-border p-6 shadow-[4px_4px_0px_0px_var(--shadow-color)] h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold uppercase">Group Availability ({participantCount} responses)</h2>
              {participantCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-emerald-500 border border-border"></span> All
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-emerald-300 border border-border"></span> Some
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-secondary border border-border"></span> None
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-hidden">
              <HeatMap 
                dates={parsedDates.length > 0 ? parsedDates : undefined}
                startHour={startHour}
                endHour={endHour}
                groupAvailability={groupAvailability}
                totalParticipants={participantCount}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border p-2 flex gap-2 z-20">
        <Button 
          variant={activeTab === "availability" ? "default" : "ghost"} 
          className="flex-1"
          onClick={() => setActiveTab("availability")}
        >
          My Availability
        </Button>
        <Button 
          variant={activeTab === "group" ? "default" : "ghost"} 
          className="flex-1"
          onClick={() => setActiveTab("group")}
        >
          Group Results
        </Button>
      </div>
    </div>
  );
}
