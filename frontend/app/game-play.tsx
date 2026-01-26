import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const useNative = Platform.OS !== 'web';

interface Movie {
  id: string;
  title: string;
  year: number;
  hero: string;
  heroine: string;
  word_count: number;
  difficulty: string;
  genre?: string;
}

interface Game {
  id: string;
  team_a: { name: string; players: { name: string }[]; score: number };
  team_b: { name: string; players: { name: string }[]; score: number };
  settings: { timer_seconds: number; total_rounds: number; difficulty: string };
  current_turn: string;
  current_round: number;
  used_movie_ids: string[];
  status: string;
  winner?: string;
}

enum GamePhase {
  READY = 'ready',
  REVEAL = 'reveal',
  ACTING = 'acting',
  RESULT = 'result',
}

export default function GamePlayScreen() {
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.READY);
  const [timeLeft, setTimeLeft] = useState(60);
  const [showMovie, setShowMovie] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadGame = async () => {
    try {
      const gameData = await AsyncStorage.getItem('currentGame');
      if (gameData) {
        const parsedGame = JSON.parse(gameData);
        setGame(parsedGame);
        setTimeLeft(parsedGame.settings.timer_seconds);
      }
    } catch (error) {
      console.error('Error loading game:', error);
    }
  };

  const fetchRandomMovie = async () => {
    if (!game) return;

    try {
      const excludeIds = game.used_movie_ids.join(',');
      const url = `${BACKEND_URL}/api/movies/random?difficulty=${game.settings.difficulty}&exclude_ids=${excludeIds}`;
      const response = await fetch(url);

      if (!response.ok) {
        Alert.alert('No more movies', 'All movies have been used in this game!');
        return;
      }

      const movie = await response.json();
      setCurrentMovie(movie);

      // Add movie to used list
      await fetch(`${BACKEND_URL}/api/games/${game.id}/add-used-movie?movie_id=${movie.id}`, {
        method: 'POST',
      });

      // Update local game state
      const updatedGame = {
        ...game,
        used_movie_ids: [...game.used_movie_ids, movie.id],
      };
      setGame(updatedGame);
      await AsyncStorage.setItem('currentGame', JSON.stringify(updatedGame));
    } catch (error) {
      console.error('Error fetching movie:', error);
      Alert.alert('Error', 'Failed to fetch movie');
    }
  };

  const startTurn = async () => {
    await fetchRandomMovie();
    setPhase(GamePhase.REVEAL);
  };

  const startActing = () => {
    if (!game) return;
    setShowMovie(false);
    setPhase(GamePhase.ACTING);
    setTimeLeft(game.settings.timer_seconds);

    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: game.settings.timer_seconds * 1000,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        if (prev <= 10) {
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    handleResult(false);
  };

  const handleCorrect = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    handleResult(true);
  };

  const handleSkip = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    handleResult(false);
  };

  const handleResult = async (correct: boolean) => {
    if (!game) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/games/${game.id}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: game.id, correct }),
      });

      const updatedGame = await response.json();
      setGame(updatedGame);
      await AsyncStorage.setItem('currentGame', JSON.stringify(updatedGame));

      if (updatedGame.status === 'completed') {
        router.replace('/results');
      } else {
        setPhase(GamePhase.RESULT);
        setTimeout(() => {
          setPhase(GamePhase.READY);
          setCurrentMovie(null);
          setTimeLeft(game.settings.timer_seconds);
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting turn:', error);
    }
  };

  const exitGame = () => {
    setShowExitModal(true);
  };

  const confirmExit = async () => {
    if (game) {
      try {
        await fetch(`${BACKEND_URL}/api/games/${game.id}`, { method: 'DELETE' });
      } catch (error) {
        console.log('Error deleting game:', error);
      }
    }
    await AsyncStorage.removeItem('currentGame');
    router.replace('/');
  };

  const getCurrentTeam = () => {
    if (!game) return null;
    return game.current_turn === 'team_a' ? game.team_a : game.team_b;
  };

  const getTeamColor = () => {
    if (!game) return '#f8d56b';
    return game.current_turn === 'team_a' ? '#e94560' : '#4ecdc4';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!game) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading game...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={exitGame} style={styles.exitButton}>
          <Ionicons name="close" size={28} color="#e94560" />
        </TouchableOpacity>
        <Text style={styles.roundText}>
          Round {game.current_round}/{game.settings.total_rounds}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Scoreboard */}
      <View style={styles.scoreboard}>
        <View style={[styles.teamScore, game.current_turn === 'team_a' && styles.activeTeam]}>
          <Text style={[styles.teamName, { color: '#e94560' }]}>Team A</Text>
          <Text style={styles.score}>{game.team_a.score}</Text>
        </View>
        <View style={styles.vs}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <View style={[styles.teamScore, game.current_turn === 'team_b' && styles.activeTeam]}>
          <Text style={[styles.teamName, { color: '#4ecdc4' }]}>Team B</Text>
          <Text style={styles.score}>{game.team_b.score}</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {phase === GamePhase.READY && (
          <View style={styles.readyContainer}>
            <View style={[styles.turnBadge, { backgroundColor: getTeamColor() }]}>
              <Text style={styles.turnBadgeText}>{getCurrentTeam()?.name}'s Turn</Text>
            </View>
            <Text style={styles.instructionText}>Get ready to act!</Text>
            <TouchableOpacity
              style={[styles.bigButton, { backgroundColor: getTeamColor() }]}
              onPress={startTurn}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={40} color="#fff" />
              <Text style={styles.bigButtonText}>Start Turn</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === GamePhase.REVEAL && currentMovie && (
          <View style={styles.revealContainer}>
            <Text style={styles.revealTitle}>Movie for Actor</Text>
            <TouchableOpacity
              style={styles.revealCard}
              onPress={() => setShowMovie(!showMovie)}
              activeOpacity={0.9}
            >
              {showMovie ? (
                <>
                  <Text style={styles.movieTitle}>{currentMovie.title}</Text>
                  <Text style={styles.movieYear}>({currentMovie.year})</Text>
                </>
              ) : (
                <>
                  <Ionicons name="eye-off" size={48} color="#f8d56b" />
                  <Text style={styles.tapToReveal}>Tap to Reveal</Text>
                  <Text style={styles.onlyActorText}>Only the actor should see this!</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.startActingButton, { backgroundColor: getTeamColor() }]}
              onPress={startActing}
              activeOpacity={0.8}
            >
              <Text style={styles.startActingText}>Ready! Start Timer</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === GamePhase.ACTING && currentMovie && (
          <View style={styles.actingContainer}>
            {/* Timer */}
            <Animated.View
              style={[
                styles.timerContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Text
                style={[
                  styles.timerText,
                  timeLeft <= 10 && { color: '#e94560' },
                ]}
              >
                {formatTime(timeLeft)}
              </Text>
            </Animated.View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: timeLeft <= 10 ? '#e94560' : '#f8d56b',
                  },
                ]}
              />
            </View>

            {/* Hints */}
            <View style={styles.hintsContainer}>
              <Text style={styles.hintsTitle}>Hints for Guessing Team</Text>
              <View style={styles.hintsGrid}>
                <View style={styles.hintBox}>
                  <Ionicons name="text" size={24} color="#f8d56b" />
                  <Text style={styles.hintLabel}>Words</Text>
                  <Text style={styles.hintValue}>{currentMovie.word_count}</Text>
                </View>
                <View style={styles.hintBox}>
                  <Ionicons name="calendar" size={24} color="#f8d56b" />
                  <Text style={styles.hintLabel}>Year</Text>
                  <Text style={styles.hintValue}>{currentMovie.year}</Text>
                </View>
                <View style={styles.hintBox}>
                  <Ionicons name="man" size={24} color="#f8d56b" />
                  <Text style={styles.hintLabel}>Hero</Text>
                  <Text style={styles.hintValue}>{currentMovie.hero}</Text>
                </View>
                <View style={styles.hintBox}>
                  <Ionicons name="woman" size={24} color="#f8d56b" />
                  <Text style={styles.hintLabel}>Heroine</Text>
                  <Text style={styles.hintValue}>{currentMovie.heroine}</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.skipButton]}
                onPress={handleSkip}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={32} color="#fff" />
                <Text style={styles.actionButtonText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.correctButton]}
                onPress={handleCorrect}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={32} color="#fff" />
                <Text style={styles.actionButtonText}>Correct!</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {phase === GamePhase.RESULT && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>Next team's turn...</Text>
          </View>
        )}
      </View>

      {/* Exit Modal */}
      <Modal visible={showExitModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning" size={48} color="#f8d56b" />
            <Text style={styles.modalTitle}>Exit Game?</Text>
            <Text style={styles.modalText}>Your progress will be lost.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowExitModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmExit}
              >
                <Text style={styles.modalConfirmText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#f8d56b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  exitButton: {
    padding: 8,
  },
  roundText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8d56b',
  },
  placeholder: {
    width: 44,
  },
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  teamScore: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeTeam: {
    backgroundColor: 'rgba(248, 213, 107, 0.15)',
    borderWidth: 2,
    borderColor: '#f8d56b',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
  },
  score: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  vs: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  readyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnBadge: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginBottom: 20,
  },
  turnBadgeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  instructionText: {
    fontSize: 18,
    color: '#a0a0a0',
    marginBottom: 40,
  },
  bigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 48,
    borderRadius: 40,
    width: '100%',
    maxWidth: 300,
  },
  bigButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  revealContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealTitle: {
    fontSize: 20,
    color: '#f8d56b',
    marginBottom: 20,
  },
  revealCard: {
    width: '100%',
    aspectRatio: 1.5,
    backgroundColor: 'rgba(248, 213, 107, 0.1)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#f8d56b',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginBottom: 30,
  },
  movieTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  movieYear: {
    fontSize: 20,
    color: '#f8d56b',
    marginTop: 8,
  },
  tapToReveal: {
    fontSize: 18,
    color: '#f8d56b',
    marginTop: 16,
  },
  onlyActorText: {
    fontSize: 14,
    color: '#e94560',
    marginTop: 8,
  },
  startActingButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  startActingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  actingContainer: {
    flex: 1,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#f8d56b',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  hintsContainer: {
    backgroundColor: 'rgba(248, 213, 107, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  hintsTitle: {
    fontSize: 16,
    color: '#f8d56b',
    textAlign: 'center',
    marginBottom: 16,
  },
  hintsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  hintBox: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  hintLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 4,
  },
  hintValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
  },
  skipButton: {
    backgroundColor: '#e94560',
  },
  correctButton: {
    backgroundColor: '#4ecdc4',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    fontSize: 24,
    color: '#f8d56b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    borderWidth: 2,
    borderColor: '#f8d56b',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#fff',
  },
  modalConfirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: '#e94560',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
