'use client';

import { Volume2, VolumeX } from 'lucide-react';

interface VoiceToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function VoiceToggle({ enabled, onToggle }: VoiceToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm transition-colors ${
        enabled ? 'bg-slate-800 text-slate-100 border-sky-500' : 'bg-slate-900 text-slate-200 hover:border-sky-500'
      }`}
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      {enabled ? 'Voice streaming on' : 'Voice streaming off'}
    </button>
  );
}
