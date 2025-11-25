"use client";

import { useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Share2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimeGrid } from "@/components/event/TimeGrid";
import { HeatMap } from "@/components/event/HeatMap";

export default function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const eventName = slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  
  const [activeTab, setActiveTab] = useState<"availability" | "group">("availability");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{eventName}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> 30 min slots
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button size="sm">Sign In</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: User Input */}
        <div className={cn(
          "lg:col-span-4 flex flex-col gap-6",
          activeTab === "group" ? "hidden lg:flex" : "flex"
        )}>
          <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm flex flex-col h-full">
            <h2 className="font-semibold mb-4">Your Availability</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Click and drag to paint your available times.
            </p>
            
            <div className="flex-1 overflow-hidden">
              <TimeGrid />
            </div>
          </div>
        </div>

        {/* Right Column: Group Results */}
        <div className={cn(
          "lg:col-span-8 flex flex-col gap-6",
          activeTab === "availability" ? "hidden lg:flex" : "flex"
        )}>
          {/* Best Time Card */}
          <div className="bg-linear-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Best Time to Meet</h3>
                <p className="text-sm text-muted-foreground">Friday, Nov 28 • 2:00 PM - 4:00 PM</p>
              </div>
            </div>
            <Button size="sm" variant="secondary">View Details</Button>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold">Group Availability</h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span> 3/3
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-300"></span> 2/3
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-secondary"></span> 0/3
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <HeatMap />
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
