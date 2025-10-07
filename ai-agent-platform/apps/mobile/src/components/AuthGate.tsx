import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useLovableCloud } from '../providers/LovableCloudProvider';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { projectId, apiKey, apiUrl, setCredentials, isAuthenticated } = useLovableCloud();
  const [projectInput, setProjectInput] = useState(projectId);
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);
  const [apiUrlInput, setApiUrlInput] = useState(apiUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (!projectInput.trim() || !apiKeyInput.trim()) {
        throw new Error('Project ID and API key are required');
      }
      setCredentials({
        projectId: projectInput.trim(),
        apiKey: apiKeyInput.trim(),
        apiUrl: apiUrlInput.trim() || '/api/lovable',
      });
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : String(authError));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Connect to Lovable Cloud</Text>
      <TextInput
        style={styles.input}
        placeholder="Project ID"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        value={projectInput}
        onChangeText={setProjectInput}
      />
      <TextInput
        style={styles.input}
        placeholder="API Key"
        placeholderTextColor="#9ca3af"
        secureTextEntry
        value={apiKeyInput}
        onChangeText={setApiKeyInput}
      />
      <TextInput
        style={styles.input}
        placeholder="Lovable API URL (optional)"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        value={apiUrlInput}
        onChangeText={setApiUrlInput}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleConnect} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Connect</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderRadius: 12,
    borderColor: '#1e293b',
    borderWidth: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    marginBottom: 12,
  },
  button: {
    width: '100%',
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  error: {
    color: '#fb7185',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
});
