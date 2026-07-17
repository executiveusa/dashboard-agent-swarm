import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

interface Persona {
  id: string;
  label: string;
  tone: string;
  model: string;
}

const SKILLS_API = "https://api.thepaulieffect.com/skills-api";

export function PersonaPicker() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activePersona, setActivePersona] = useState<string>("default");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${SKILLS_API}/personas`)
      .then((r) => r.json())
      .then((data) => {
        setPersonas(data.personas || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${SKILLS_API}/personas/active`)
      .then((r) => r.json())
      .then((data) => {
        if (data.persona_id) setActivePersona(data.persona_id);
      })
      .catch(() => {});
  }, []);

  const handleSwitch = (personaId: string) => {
    setActivePersona(personaId);
    fetch(`${SKILLS_API}/personas/active`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona_id: personaId }),
    }).catch(() => {});
  };

  const current = personas.find((p) => p.id === activePersona);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1 text-[0.7rem] font-medium text-muted-foreground">
        <User className="h-3 w-3" />
        Loading personas...
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={activePersona} onValueChange={handleSwitch}>
        <SelectTrigger className="h-8 w-[180px] text-[0.7rem] border-border bg-secondary">
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {current?.label || activePersona}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {personas.map((p) => (
            <SelectItem key={p.id} value={p.id} className="text-xs">
              <span className="flex items-center gap-2">
                {p.label}
                <Badge variant="outline" className="text-[0.6rem] ml-auto">
                  {p.tone}
                </Badge>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current && (
        <Badge variant="secondary" className="text-[0.6rem] hidden sm:inline-flex">
          {current.model}
        </Badge>
      )}
    </div>
  );
}
