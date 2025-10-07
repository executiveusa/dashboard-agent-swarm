'use client';

import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function VoiceToggle() {
  const [enabled, setEnabled] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setEnabled((prev) => !prev)}
      className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-sky-500"
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      {enabled ? 'Voice streaming on' : 'Voice streaming off'}
    </button>
  );
}

