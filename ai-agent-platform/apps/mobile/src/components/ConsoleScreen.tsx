import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useSharedMessages } from '../hooks/useSharedMessageBus';
import { useAgentMessenger } from '../hooks/useAgentMessenger';
import { useNativeSpeech } from '../hooks/useNativeSpeech';

export const ConsoleScreen: React.FC = () => {
  const messages = useSharedMessages();
  const { send, queue } = useAgentMessenger('general');
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const speech = useNativeSpeech({
    onTranscript: (transcript) => {
      void send(transcript, { source: 'speech', archetype: 'voice' });
    },
  });
  const lastSpokenRef = useRef<string | null>(null);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;
    setIsSubmitting(true);
    setLastError(null);
    try {
      await send(input);
      setInput('');
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [input, send]);

  const toggleVoice = useCallback(async () => {
    if (!voiceEnabled) {
      await speech.start();
    } else {
      await speech.stop();
      speech.cancelSpeech();
    }
    setVoiceEnabled((prev) => !prev);
  }, [speech, voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled) return;
    const latest = messages
      .slice()
      .reverse()
      .find(
        (message) =>
          message.role === 'assistant' &&
          message.content.length > 0 &&
          !(message.metadata as { pending?: boolean } | undefined)?.pending,
      );
    if (!latest) return;
    if (lastSpokenRef.current === latest.id) return;
    lastSpokenRef.current = latest.id;
    void speech.speak(latest.content);
  }, [messages, speech, voiceEnabled]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Command console</Text>
        <TouchableOpacity style={styles.voiceButton} onPress={toggleVoice} disabled={!speech.isAvailable}>
          <Text style={styles.voiceButtonText}>{voiceEnabled ? 'Disable voice' : 'Enable voice'}</Text>
        </TouchableOpacity>
      </View>
      {!speech.isAvailable && <Text style={styles.notice}>Native speech recognition not available on this device.</Text>}
      {queue.queue.length > 0 && (
        <Text style={styles.queueWarning}>{queue.queue.length} command(s) queued offline.</Text>
      )}
      <FlatList
        data={messages.slice().reverse()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.messageCard}>
            <Text style={styles.role}>{item.role}</Text>
            <Text style={styles.message}>{item.content}</Text>
            {item.voice?.status === 'loading' && <Text style={styles.messageMuted}>Preparing audio…</Text>}
            {item.voice?.status === 'error' && <Text style={styles.error}>{item.voice.error}</Text>}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Start a conversation by entering a prompt below.</Text>}
        contentContainerStyle={messages.length === 0 ? styles.emptyContainer : undefined}
      />
      <View style={styles.composerRow}>
        <TextInput
          style={styles.input}
          placeholder="Describe the task"
          placeholderTextColor="#9ca3af"
          value={input}
          onChangeText={setInput}
          editable={!isSubmitting}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>
      {lastError && <Text style={styles.error}>{lastError}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f8fafc',
  },
  voiceButton: {
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  voiceButtonText: {
    color: '#f8fafc',
    fontSize: 14,
  },
  notice: {
    color: '#fbbf24',
    fontSize: 12,
    marginBottom: 12,
  },
  queueWarning: {
    color: '#f59e0b',
    fontSize: 12,
    marginBottom: 8,
  },
  messageCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#0f172a',
    padding: 12,
    marginBottom: 12,
  },
  role: {
    color: '#64748b',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  message: {
    color: '#f8fafc',
    marginTop: 4,
    fontSize: 14,
  },
  messageMuted: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  error: {
    color: '#fb7185',
    fontSize: 12,
    marginTop: 4,
  },
  empty: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
  },
  sendButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 12,
  },
  sendText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
