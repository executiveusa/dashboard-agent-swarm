import { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useSharedMessages } from '../hooks/useSharedMessageBus';

export const DashboardScreen: React.FC = () => {
  const messages = useSharedMessages();
  const summary = useMemo(() => {
    const total = messages.length;
    const userMessages = messages.filter((message) => message.role === 'user').length;
    const assistantMessages = messages.filter((message) => message.role === 'assistant').length;
    const voiceResponses = messages.filter((message) => Boolean(message.voice?.audioUrl)).length;
    return { total, userMessages, assistantMessages, voiceResponses };
  }, [messages]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Activity summary</Text>
      <View style={styles.statsRow}>
        <View>
          <Text style={styles.statLabel}>Total exchanges</Text>
          <Text style={styles.statValue}>{summary.total}</Text>
        </View>
        <View>
          <Text style={styles.statLabel}>Voice responses</Text>
          <Text style={styles.statValue}>{summary.voiceResponses}</Text>
        </View>
      </View>
      <FlatList
        data={messages.slice().reverse()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.messageCard}>
            <Text style={styles.role}>{item.role}</Text>
            <Text style={styles.message}>{item.content}</Text>
            {item.voice?.audioUrl && (
              <Text style={styles.voiceInfo}>Audio cached: {item.voice.cached ? 'yes' : 'no'}</Text>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Start a conversation from the console tab.</Text>}
      />
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
  heading: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#0f172a',
    padding: 16,
    marginBottom: 24,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
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
  voiceInfo: {
    color: '#38bdf8',
    fontSize: 12,
    marginTop: 4,
  },
  empty: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
});
