"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Users, ArrowRight, Coffee, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn, sanitizeName } from "@/lib/utils";
import { CreateEventModal } from "@/components/create-event-modal";
import { saveEvent, generateId } from "@/lib/storage";
import { checkRateLimit, getClientFingerprint } from "@/lib/rate-limit";
import type { EventConfig } from "@/lib/types";

export default function Home() {
  const [eventName, setEventName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleCreateClick = (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleCreateEvent = async (config: {
    name: string;
    dates: string[];
    startTime: string;
    endTime: string;
    timezone: string;
    nameOption: "required" | "optional" | "anonymous";
  }) => {
    // Sanitize event name
    const sanitizedName = sanitizeName(config.name);
    
    // Validate event name
    if (!sanitizedName) {
      alert("Please enter a valid event name.");
      return;
    }
    if (sanitizedName.length > 100) {
      alert("Event name must be 100 characters or less.");
      return;
    }

    // Check rate limit (max 10 events per hour per client)
    const fingerprint = getClientFingerprint();
    const rateLimit = checkRateLimit(`create_event_${fingerprint}`, 10, 3600000);
    if (!rateLimit.success) {
      alert(`Too many events created. Please try again in ${Math.ceil(rateLimit.resetIn / 60)} minutes.`);
      return;
    }
    
    setIsCreating(true);
    
    // Generate unique slug
    const baseSlug = sanitizedName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 50);
    const uniqueSlug = `${baseSlug}-${generateId().slice(0, 6)}`;
    
    // Create event config
    const eventConfig: EventConfig = {
      id: generateId(),
      name: sanitizedName,
      slug: uniqueSlug,
      dates: config.dates,
      startTime: config.startTime,
      endTime: config.endTime,
      timezone: config.timezone,
      nameOption: config.nameOption,
      createdAt: new Date().toISOString(),
    };
    
    // Save to Supabase
    const saved = await saveEvent(eventConfig);
    
    if (saved) {
      // Navigate to event page
      router.push(`/event/${uniqueSlug}`);
    } else {
      setIsCreating(false);
      alert("Failed to create event. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 relative">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:p-6 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[16px_16px] opacity-20"></div>

        <div className="container max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Copy & Input */}
          <div className="flex flex-col gap-8 text-center lg:text-left z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 border-2 border-border bg-accent text-accent-foreground text-xs font-bold mx-auto lg:mx-0 w-fit shadow-[2px_2px_0px_0px_var(--shadow-color)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
                </span>
                The modern alternative to When2Meet
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter text-foreground leading-[0.9]">
                LESS CHAOS, <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-foreground to-zinc-400" style={{ WebkitTextStroke: "2px var(--text-stroke-color)", color: "transparent" }}>MORE MEETINGS.</span>
              </h1>
              
              <p className="text-base sm:text-xl font-medium text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed border-l-4 border-border pl-4">
                Whether it's a quick <span className="text-black font-bold bg-yellow-300 px-1 shadow-[2px_2px_0px_0px_var(--shadow-color)]">coffee chat</span> or a <span className="text-black font-bold bg-blue-300 px-1 shadow-[2px_2px_0px_0px_var(--shadow-color)]">20-person team meeting</span>, find the time that works for everyone!
              </p>

              <form 
                onSubmit={handleCreateClick}
                className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto lg:mx-0 mt-8"
              >
                <Input 
                  placeholder="Event name (e.g. Chat w/ Bob)" 
                  className="h-14 text-lg font-medium"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  autoFocus
                />
                <Button size="lg" className="h-14 px-8 text-lg">
                  Create
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            </motion.div>

            <div className="flex items-center justify-center lg:justify-start gap-6 text-sm font-bold">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-foreground text-background flex items-center justify-center rounded-full text-xs">✓</div>
                <span>Free forever</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-foreground text-background flex items-center justify-center rounded-full text-xs">✓</div>
                <span>No login required</span>
              </div>
            </div>
          </div>

          {/* Right: Visuals (The "Unique" part) */}
          <div className="relative hidden lg:block h-[500px] w-full">
            {/* Floating Card 1: Coffee Chat */}
            <motion.div 
              initial={{ opacity: 0, x: 50, rotate: -10 }}
              animate={{ opacity: 1, x: 0, rotate: -6 }}
              transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
              className="absolute top-10 left-20 bg-background p-4 border-2 border-border shadow-[8px_8px_0px_0px_var(--shadow-color)] w-64 z-10 hover:z-30 hover:scale-105 transition-all duration-300 cursor-default"
            >
              <div className="flex items-center gap-3 mb-4 border-b-2 border-border pb-2">
                <div className="w-10 h-10 border-2 border-border bg-yellow-300 flex items-center justify-center">
                  <Coffee className="w-5 h-5 text-black" />
                </div>
                <div>
                  <div className="font-bold text-sm uppercase">Coffee Chat</div>
                  <div className="text-xs font-mono">1 on 1 • 30 min</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full border-2 border-border bg-secondary overflow-hidden">
                  <div className="h-full w-3/4 bg-foreground"></div>
                </div>
                <div className="flex justify-between text-[10px] font-bold font-mono uppercase">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                </div>
                <div className="grid grid-cols-3 gap-1 h-16">
                  <div className="border-2 border-border bg-background"></div>
                  <div className="border-2 border-border bg-foreground pattern-diagonal-lines-sm text-background"></div>
                  <div className="border-2 border-border bg-background"></div>
                </div>
              </div>
            </motion.div>

            {/* Floating Card 2: Group Meeting */}
            <motion.div 
              initial={{ opacity: 0, x: 50, rotate: 10 }}
              animate={{ opacity: 1, x: 0, rotate: 3 }}
              transition={{ delay: 0.4, duration: 0.8, type: "spring" }}
              className="absolute top-32 right-0 bg-background p-4 border-2 border-border shadow-[8px_8px_0px_0px_var(--shadow-color)] w-72 z-20 hover:z-30 hover:scale-105 transition-all duration-300 cursor-default"
            >
              <div className="flex items-center gap-3 mb-4 border-b-2 border-border pb-2">
                <div className="w-10 h-10 border-2 border-border bg-blue-300 flex items-center justify-center">
                  <Users className="w-5 h-5 text-black" />
                </div>
                <div>
                  <div className="font-bold text-sm uppercase">Team Sync</div>
                  <div className="text-xs font-mono">8 people • 1 hour</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center text-[8px] font-bold z-10">
                        {String.fromCharCode(64+i)}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold font-mono ml-2">+4 others</span>
                </div>
                <div className="grid grid-cols-5 gap-1 h-24">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "border border-border",
                        i === 7 || i === 8 || i === 12 ? "bg-foreground" : 
                        i % 2 === 0 ? "bg-secondary" : "bg-background"
                      )}
                    ></div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateEvent}
        initialName={eventName}
      />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all bg-white">
      <div className="w-12 h-12 border-2 border-black bg-accent flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2 uppercase">{title}</h3>
      <p className="text-muted-foreground font-medium">{description}</p>
    </div>
  );
}
