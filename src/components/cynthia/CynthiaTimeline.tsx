import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { TelemetryEvent } from "@/services/cynthiaTelemetry";
import { formatTimestamp, getEventTypeStyle } from "@/services/cynthiaTelemetry";

interface CynthiaTimelineProps {
  events: TelemetryEvent[];
  autoScroll?: boolean;
}

export function CynthiaTimeline({ events, autoScroll = true }: CynthiaTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [events, autoScroll]);

  if (events.length === 0) {
    return (
      <Card className="p-8  border-muted/20">
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-muted-foreground mb-2">No events yet</p>
          <p className="text-sm text-muted-foreground/70">
            Events will appear here as Cynthia works
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className=" border-muted/20">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Event Timeline
          <Badge variant="secondary" className="ml-auto">
            {events.length} events
          </Badge>
        </h3>
      </div>
      <ScrollArea className="h-[600px]" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {events.map((event, index) => {
            const style = getEventTypeStyle(event.event_type);
            const isLast = index === events.length - 1;

            return (
              <div key={event.id || index} className="relative">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-[15px] top-[40px] w-[2px] h-full bg-border/30" />
                )}

                {/* Event card */}
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className={`w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center text-lg ${
                        isLast ? "ring-2 ring-primary/30 ring-offset-2 ring-offset-background" : ""
                      }`}
                    >
                      {style.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <Card className="p-4 bg-background border-border hover:border-primary/30 transition-colors">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={style.color}>
                            {event.event_type}
                          </Badge>
                          {event.timestamp && (
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(event.timestamp)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Summary */}
                      {event.summary && (
                        <p className="text-sm mb-2 text-foreground/90">{event.summary}</p>
                      )}

                      {/* Data */}
                      {event.data && Object.keys(event.data).length > 0 && (
                        <div className="mt-2 p-3 bg-muted/30 rounded-md border border-border">
                          <details className="cursor-pointer">
                            <summary className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors select-none">
                              Event Data
                            </summary>
                            <div className="mt-2 space-y-1">
                              {Object.entries(event.data).map(([key, value]) => (
                                <div key={key} className="flex gap-2 text-xs">
                                  <span className="font-mono text-muted-foreground min-w-[100px]">
                                    {key}:
                                  </span>
                                  <span className="font-mono text-foreground/80 break-all">
                                    {typeof value === "object"
                                      ? JSON.stringify(value, null, 2)
                                      : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </Card>
  );
}
