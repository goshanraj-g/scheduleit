"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface EventConfig {
  name: string;
  dates: string[];
  startTime: string;
  endTime: string;
  timezone: string;
  nameOption: "required" | "optional" | "anonymous";
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: EventConfig) => void;
  initialName: string;
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Pacific/Auckland", label: "New Zealand (NZST)" },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    value: `${hour.toString().padStart(2, "0")}:00`,
    label: `${hour12}:00 ${ampm}`,
  };
});

export function CreateEventModal({
  isOpen,
  onClose,
  onSubmit,
  initialName,
}: CreateEventModalProps) {
  const [step, setStep] = useState(1);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [config, setConfig] = useState<EventConfig>({
    name: initialName,
    dates: [],
    startTime: "09:00",
    endTime: "17:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    nameOption: "required",
  });

  // Update name when initialName changes
  if (config.name !== initialName && initialName) {
    setConfig(prev => ({ ...prev, name: initialName }));
  }

  // Sync selectedDates with config.dates
  const handleDatesChange = (dates: Date[]) => {
    setSelectedDates(dates);
    setConfig(prev => ({
      ...prev,
      dates: dates.map(d => format(d, "yyyy-MM-dd")),
    }));
  };

  const handleSubmit = () => {
    if (config.name && config.dates.length > 0) {
      onSubmit(config);
    }
  };

  const canProceed = () => {
    if (step === 1) return config.dates.length > 0;
    if (step === 2) return config.startTime < config.endTime;
    return true;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background border-2 border-border shadow-[8px_8px_0px_0px_var(--shadow-color)] z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-border">
              <h2 className="text-xl font-bold uppercase tracking-tight">Create Event</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center border-2 border-border hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 p-4 border-b border-border/50">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "flex-1 h-2 transition-colors",
                    s <= step ? "bg-accent" : "bg-secondary"
                  )}
                />
              ))}
            </div>

            {/* Step Content */}
            <div className="p-6">
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 border-2 border-border bg-accent flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold">Select Dates</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose which days to poll ({config.dates.length} selected)
                      </p>
                    </div>
                  </div>

                  <CalendarPicker
                    selectedDates={selectedDates}
                    onDatesChange={handleDatesChange}
                    minDate={new Date()}
                  />
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 border-2 border-border bg-accent flex items-center justify-center">
                      <Clock className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold">Time Range</h3>
                      <p className="text-sm text-muted-foreground">What hours should be available?</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold uppercase mb-2 block">Start Time</label>
                      <Select
                        value={config.startTime}
                        onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-bold uppercase mb-2 block">End Time</label>
                      <Select
                        value={config.endTime}
                        onChange={(e) => setConfig({ ...config, endTime: e.target.value })}
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <label className="text-sm font-bold uppercase">Timezone</label>
                    </div>
                    <Select
                      value={config.timezone}
                      onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      Participants will see times converted to their local timezone.
                    </p>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 border-2 border-border bg-accent flex items-center justify-center">
                      <Users className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold">Participant Names</h3>
                      <p className="text-sm text-muted-foreground">How should responses be identified?</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        value: "required" as const,
                        label: "Name Required",
                        description: "Participants must enter their name",
                      },
                      {
                        value: "optional" as const,
                        label: "Name Optional",
                        description: "Participants can choose to be anonymous",
                      },
                      {
                        value: "anonymous" as const,
                        label: "Fully Anonymous",
                        description: "No names, just availability counts",
                      },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setConfig({ ...config, nameOption: option.value })}
                        className={cn(
                          "w-full p-4 border-2 text-left transition-all",
                          config.nameOption === option.value
                            ? "border-accent bg-accent/10 shadow-[2px_2px_0px_0px_var(--shadow-color)]"
                            : "border-border hover:border-foreground/50"
                        )}
                      >
                        <div className="font-bold">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </button>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="mt-6 p-4 bg-secondary border-2 border-border">
                    <h4 className="font-bold text-sm uppercase mb-3">Summary</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Event</dt>
                        <dd className="font-medium">{config.name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Dates</dt>
                        <dd className="font-medium">{config.dates.length} days</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Hours</dt>
                        <dd className="font-medium">
                          {TIME_OPTIONS.find((t) => t.value === config.startTime)?.label} -{" "}
                          {TIME_OPTIONS.find((t) => t.value === config.endTime)?.label}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t-2 border-border">
              <Button
                variant="ghost"
                onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
              >
                {step > 1 ? "Back" : "Cancel"}
              </Button>

              <Button
                onClick={() => (step < 3 ? setStep(step + 1) : handleSubmit())}
                disabled={!canProceed()}
              >
                {step < 3 ? "Continue" : "Create Event"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
