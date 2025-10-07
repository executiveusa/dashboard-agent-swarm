export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageSource = 'text' | 'speech' | 'automation';
export type VoicePlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface VoiceMetadata {
  status: VoicePlaybackStatus;
  audioUrl?: string;
  audioObjectUrl?: string;
  mimeType?: string;
  cached?: boolean;
  requestId?: string;
  error?: string;
  lastUpdated: number;
}

export interface SharedMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  source: MessageSource;
  metadata?: Record<string, unknown>;
  voice?: VoiceMetadata;
}

export interface PlaybackSnapshot {
  activeMessageId?: string;
  status: VoicePlaybackStatus;
}

export interface MessageSnapshot {
  messages: SharedMessage[];
  playback: PlaybackSnapshot;
}

type Listener = () => void;

type MessageUpdater = (message: SharedMessage) => SharedMessage;

type MessageInit = Partial<Omit<SharedMessage, 'id' | 'createdAt' | 'role' | 'content' | 'source'>> & {
  id?: string;
  source?: MessageSource;
  metadata?: Record<string, unknown>;
  voice?: Partial<VoiceMetadata>;
};

const DEFAULT_PLAYBACK: PlaybackSnapshot = { status: 'idle' };

const createId = () => {
  if (typeof globalThis !== 'undefined') {
    const cryptoObject = (globalThis as { crypto?: Crypto }).crypto;
    if (cryptoObject?.randomUUID) {
      return cryptoObject.randomUUID();
    }
  }
  return `msg_${Math.random().toString(36).slice(2, 11)}`;
};

const normalizeVoice = (voice?: Partial<VoiceMetadata>): VoiceMetadata | undefined => {
  if (!voice) return undefined;
  return {
    status: voice.status ?? 'idle',
    audioUrl: voice.audioUrl,
    audioObjectUrl: voice.audioObjectUrl,
    mimeType: voice.mimeType,
    cached: voice.cached ?? false,
    requestId: voice.requestId,
    error: voice.error,
    lastUpdated: voice.lastUpdated ?? Date.now(),
  };
};

const cloneMessage = (message: SharedMessage): SharedMessage => ({
  ...message,
  metadata: message.metadata ? { ...message.metadata } : undefined,
  voice: message.voice ? { ...message.voice } : undefined,
});

export class MessageBus {
  private state: MessageSnapshot = { messages: [], playback: { ...DEFAULT_PLAYBACK } };
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): MessageSnapshot => ({
    messages: this.state.messages.map(cloneMessage),
    playback: { ...this.state.playback },
  });

  appendMessage(role: MessageRole, content: string, init: MessageInit = {}): SharedMessage {
    const message: SharedMessage = {
      id: init.id ?? createId(),
      role,
      content,
      createdAt: Date.now(),
      source: init.source ?? 'text',
      metadata: init.metadata ? { ...init.metadata } : undefined,
      voice: normalizeVoice(init.voice),
    };
    this.state = {
      ...this.state,
      messages: [...this.state.messages, message],
    };
    this.emit();
    return message;
  }

  updateMessage(id: string, updater: MessageUpdater) {
    let updated = false;
    const messages = this.state.messages.map((message) => {
      if (message.id !== id) return message;
      const next = normalizeVoiceOnMessage(updater(cloneMessage(message)));
      updated = true;
      return next;
    });
    if (updated) {
      this.state = { ...this.state, messages };
      this.emit();
    }
  }

  setPlayback(partial: Partial<PlaybackSnapshot>) {
    this.state = {
      ...this.state,
      playback: { ...this.state.playback, ...partial },
    };
    this.emit();
  }

  reset() {
    this.state = { messages: [], playback: { ...DEFAULT_PLAYBACK } };
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

const normalizeVoiceOnMessage = (message: SharedMessage): SharedMessage => ({
  ...message,
  voice: normalizeVoice(message.voice),
});

export const messageBus = new MessageBus();
