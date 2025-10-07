'use client';

import { Volume2, VolumeX, Mic, PlayCircle, Square } from 'lucide-react';
import { useVoiceController } from '../hooks/useVoiceController';

const statusMessage = (params: {
  enabled: boolean;
  isListening: boolean;
  pendingTranscript: string | null;
  playbackState: { status: string; messageId?: string; error?: string };
  isSupported: boolean;
}) => {
  if (!params.enabled) return 'Voice streaming off';
  if (!params.isSupported) return 'Voice controls unavailable';
  if (params.pendingTranscript) return `Heard: "${params.pendingTranscript}"`;
  if (params.isListening) return 'Listening…';
  switch (params.playbackState.status) {
    case 'playing':
      return 'Playing response';
    case 'loading':
      return 'Preparing audio…';
    case 'error':
      return params.playbackState.error ?? 'Audio failed';
    default:
      return 'Voice streaming on';
  }
};

/**
 * Renders a voice control toggle with a status button and optional inline voice/playback indicators.
 *
 * The button shows an icon (speaker on/off) and a dynamic status label derived from the voice controller state.
 * When voice is enabled an adjacent status area appears showing listening state, playback status, and any error message.
 *
 * @returns The JSX element for the voice toggle control: a button that toggles voice streaming and, when enabled, an informational area with listening and playback indicators and error text.
 */
export function VoiceToggle() {
  const { enabled, toggle, isListening, playbackState, pendingTranscript, isSupported, error } = useVoiceController();
  const Icon = enabled ? Volume2 : VolumeX;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-sky-500 disabled:opacity-60"
        disabled={!isSupported && !enabled}
      >
        <Icon className="h-4 w-4" />
        {statusMessage({
          enabled,
          isListening,
          pendingTranscript,
          playbackState,
          isSupported,
        })}
      </button>
      {enabled && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Mic className={`h-4 w-4 ${isListening ? 'text-sky-400' : ''}`} />
          {isListening ? 'Listening' : 'Idle'}
          <span className="inline-flex items-center gap-1">
            {playbackState.status === 'playing' ? (
              <PlayCircle className="h-4 w-4 text-emerald-400" />
            ) : (
              <Square className="h-3 w-3" />
            )}
            {playbackState.status}
          </span>
          {error && <span className="text-rose-400">{error}</span>}
        </div>
      )}
    </div>
  );
}
