import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function TeamSetupScreen() {
  const router = useRouter();
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>(['']);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>(['']);
  const [timerSeconds, setTimerSeconds] = useState('60');
  const [totalRounds, setTotalRounds] = useState('10');
  const [difficulty, setDifficulty] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  const addPlayer = (team: 'A' | 'B') => {
    if (team === 'A') {
      setTeamAPlayers([...teamAPlayers, '']);
    } else {
      setTeamBPlayers([...teamBPlayers, '']);
    }
  };

  const removePlayer = (team: 'A' | 'B', index: number) => {
    if (team === 'A') {
      if (teamAPlayers.length > 1) {
        setTeamAPlayers(teamAPlayers.filter((_, i) => i !== index));
      }
    } else {
      if (teamBPlayers.length > 1) {
        setTeamBPlayers(teamBPlayers.filter((_, i) => i !== index));
      }
    }
  };

  const updatePlayer = (team: 'A' | 'B', index: number, value: string) => {
    if (team === 'A') {
      const updated = [...teamAPlayers];
      updated[index] = value;
      setTeamAPlayers(updated);
    } else {
      const updated = [...teamBPlayers];
      updated[index] = value;
      setTeamBPlayers(updated);
    }
  };

  const startGame = async () => {
    const validTeamA = teamAPlayers.filter((p) => p.trim() !== '');
    const validTeamB = teamBPlayers.filter((p) => p.trim() !== '');

    if (validTeamA.length === 0 || validTeamB.length === 0) {
      Alert.alert('Error', 'Each team needs at least one player');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_a_players: validTeamA,
          team_b_players: validTeamB,
          timer_seconds: parseInt(timerSeconds) || 60,
          total_rounds: parseInt(totalRounds) || 10,
          difficulty: difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create game');
      }

      const game = await response.json();
      await AsyncStorage.setItem('currentGame', JSON.stringify(game));
      router.push('/game-play');
    } catch (error) {
      console.error('Error creating game:', error);
      Alert.alert('Error', 'Failed to start game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlayerInputs = (team: 'A' | 'B') => {
    const players = team === 'A' ? teamAPlayers : teamBPlayers;
    const teamColor = team === 'A' ? '#e94560' : '#4ecdc4';

    return (
      <View style={[styles.teamCard, { borderColor: teamColor }]}>
        <View style={[styles.teamHeader, { backgroundColor: teamColor }]}>
          <Text style={styles.teamTitle}>Team {team}</Text>
          <Text style={styles.playerCount}>{players.filter((p) => p.trim()).length} players</Text>
        </View>

        {players.map((player, index) => (
          <View key={index} style={styles.playerInputRow}>
            <TextInput
              style={styles.playerInput}
              placeholder={`Player ${index + 1}`}
              placeholderTextColor="#666"
              value={player}
              onChangeText={(value) => updatePlayer(team, index, value)}
            />
            {players.length > 1 && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePlayer(team, index)}
              >
                <Ionicons name="close-circle" size={24} color="#e94560" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addPlayerButton, { borderColor: teamColor }]}
          onPress={() => addPlayer(team)}
        >
          <Ionicons name="add-circle-outline" size={24} color={teamColor} />
          <Text style={[styles.addPlayerText, { color: teamColor }]}>Add Player</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={28} color="#f8d56b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Setup</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderPlayerInputs('A')}
          {renderPlayerInputs('B')}

          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Game Settings</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Timer (seconds)</Text>
              <View style={styles.timerOptions}>
                {['30', '45', '60', '90'].map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timerOption,
                      timerSeconds === time && styles.timerOptionActive,
                    ]}
                    onPress={() => setTimerSeconds(time)}
                  >
                    <Text
                      style={[
                        styles.timerOptionText,
                        timerSeconds === time && styles.timerOptionTextActive,
                      ]}
                    >
                      {time}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Total Rounds</Text>
              <View style={styles.timerOptions}>
                {['5', '10', '15', '20'].map((rounds) => (
                  <TouchableOpacity
                    key={rounds}
                    style={[
                      styles.timerOption,
                      totalRounds === rounds && styles.timerOptionActive,
                    ]}
                    onPress={() => setTotalRounds(rounds)}
                  >
                    <Text
                      style={[
                        styles.timerOptionText,
                        totalRounds === rounds && styles.timerOptionTextActive,
                      ]}
                    >
                      {rounds}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Difficulty</Text>
              <View style={styles.difficultyOptions}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'easy', label: 'Easy' },
                  { key: 'medium', label: 'Medium' },
                  { key: 'hard', label: 'Hard' },
                ].map((diff) => (
                  <TouchableOpacity
                    key={diff.key}
                    style={[
                      styles.difficultyOption,
                      difficulty === diff.key && styles.difficultyOptionActive,
                    ]}
                    onPress={() => setDifficulty(diff.key)}
                  >
                    <Text
                      style={[
                        styles.difficultyText,
                        difficulty === diff.key && styles.difficultyTextActive,
                      ]}
                    >
                      {diff.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.startButton, isLoading && styles.startButtonDisabled]}
            onPress={startGame}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <Text style={styles.startButtonText}>Creating Game...</Text>
            ) : (
              <>
                <Ionicons name="play" size={24} color="#1a1a2e" />
                <Text style={styles.startButtonText}>Start Game</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(248, 213, 107, 0.2)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8d56b',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  teamCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  teamTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  playerCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  playerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  playerInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  removeButton: {
    marginLeft: 10,
    padding: 4,
  },
  addPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addPlayerText: {
    fontSize: 16,
    marginLeft: 8,
  },
  settingsCard: {
    backgroundColor: 'rgba(248, 213, 107, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8d56b',
    marginBottom: 16,
  },
  settingRow: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
  },
  timerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timerOption: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
    marginBottom: 8,
  },
  timerOptionActive: {
    backgroundColor: '#f8d56b',
  },
  timerOptionText: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  timerOptionTextActive: {
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
  difficultyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  difficultyOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
    marginBottom: 8,
  },
  difficultyOptionActive: {
    backgroundColor: '#e94560',
  },
  difficultyText: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  difficultyTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8d56b',
    paddingVertical: 18,
    borderRadius: 30,
    marginTop: 8,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginLeft: 8,
  },
});
