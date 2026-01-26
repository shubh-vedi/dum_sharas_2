import React, { useState, useEffect, useRef } from 'react';
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
  Share,
  Linking,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';

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

interface Player {
  id: string;
  name: string;
}

interface Team {
  name: string;
  players: Player[];
  score: number;
  current_actor_index: number;
}

interface Game {
  id: string;
  team_a: Team;
  team_b: Team;
  settings: { timer_seconds: number; total_rounds: number; difficulty: string };
  current_turn: string;
  current_round: number;
  used_movie_ids: string[];
  status: string;
  winner?: string;
  share_code: string;
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
  const [showShareModal, setShowShareModal] = useState(false);

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
        Alert.alert('No more movies', 'All movies have been used! Resetting movie pool...');
        await fetch(`${BACKEND_URL}/api/movies/reset-used`, { method: 'POST' });
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
              useNativeDriver: useNative,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: useNative,
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

  const shareGame = async () => {
    if (!game) return;
    
    const shareUrl = `${BACKEND_URL}/join/${game.share_code}`;
    const message = `🎬 Join my Dumb Charades game!\n\nGame Code: ${game.share_code}\n\nDownload the app and join using this code!\n\n${shareUrl}`;
    
    try {
      if (Platform.OS === 'web') {
        setShowShareModal(true);
      } else {
        await Share.share({
          message: message,
          title: 'Join Dumb Charades Game',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const shareViaWhatsApp = () => {
    if (!game) return;
    const message = encodeURIComponent(`🎬 Join my Dumb Charades game!\n\nGame Code: ${game.share_code}\n\nJoin us for some Bollywood fun!`);
    const whatsappUrl = `https://wa.me/?text=${message}`;
    Linking.openURL(whatsappUrl);
  };

  const getCurrentTeam = () => {
    if (!game) return null;
    return game.current_turn === 'team_a' ? game.team_a : game.team_b;
  };

  const getCurrentActor = () => {
    const team = getCurrentTeam();
    if (!team || team.players.length === 0) return null;
    return team.players[team.current_actor_index];
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

  const currentActor = getCurrentActor();

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
        <TouchableOpacity onPress={shareGame} style={styles.shareButton}>
          <Ionicons name="share-social" size={24} color="#f8d56b" />
        </TouchableOpacity>
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
      <ScrollView style={styles.mainContent} contentContainerStyle={styles.mainContentContainer}>
        {phase === GamePhase.READY && (
          <View style={styles.readyContainer}>
            <View style={[styles.turnBadge, { backgroundColor: getTeamColor() }]}>
              <Text style={styles.turnBadgeText}>{getCurrentTeam()?.name}'s Turn</Text>
            </View>
            
            {/* Current Actor Display */}
            {currentActor && (
              <View style={styles.actorContainer}>
                <Ionicons name="person-circle" size={60} color={getTeamColor()} />
                <Text style={styles.actorLabel}>Actor</Text>
                <Text style={styles.actorName}>{currentActor.name}</Text>
              </View>
            )}
            
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
            {currentActor && (
              <View style={styles.actorBadge}>
                <Ionicons name="person" size={20} color="#fff" />
                <Text style={styles.actorBadgeText}>{currentActor.name} is acting!</Text>
              </View>
            )}
            
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
                <View style={[styles.hintBox, styles.hintBoxWide]}>
                  <Ionicons name="man" size={24} color="#4ecdc4" />
                  <Text style={styles.hintLabel}>Hero</Text>
                  <Text style={styles.hintValueLarge}>{currentMovie.hero}</Text>
                </View>
                <View style={[styles.hintBox, styles.hintBoxWide]}>
                  <Ionicons name="woman" size={24} color="#e94560" />
                  <Text style={styles.hintLabel}>Heroine</Text>
                  <Text style={styles.hintValueLarge}>{currentMovie.heroine}</Text>
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
      </ScrollView>

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

      {/* Share Modal */}
      <Modal visible={showShareModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.shareModalContent}>
            <TouchableOpacity 
              style={styles.closeShareModal}
              onPress={() => setShowShareModal(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.shareModalTitle}>Share Game</Text>
            
            <View style={styles.qrContainer}>
              {Platform.OS !== 'web' ? (
                <QRCode
                  value={`${BACKEND_URL}/join/${game.share_code}`}
                  size={180}
                  backgroundColor="#fff"
                  color="#1a1a2e"
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code" size={80} color="#f8d56b" />
                </View>
              )}
            </View>
            
            <View style={styles.shareCodeContainer}>
              <Text style={styles.shareCodeLabel}>Game Code</Text>
              <Text style={styles.shareCode}>{game.share_code}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={shareViaWhatsApp}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={28} color="#fff" />
              <Text style={styles.whatsappButtonText}>Share via WhatsApp</Text>
            </TouchableOpacity>
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
  shareButton: {
    padding: 8,
  },
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
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
    fontSize: 14,
    fontWeight: '600',
  },
  score: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  vs: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  mainContent: {
    flex: 1,
  },
  mainContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  readyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  turnBadge: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginBottom: 20,
  },
  turnBadgeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  actorContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(248, 213, 107, 0.1)',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 20,
    marginBottom: 20,
  },
  actorLabel: {
    fontSize: 14,
    color: '#a0a0a0',
    marginTop: 8,
  },
  actorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  instructionText: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 30,
  },
  bigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 40,
    width: '100%',
    maxWidth: 300,
  },
  bigButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  revealContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  actorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 213, 107, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  actorBadgeText: {
    fontSize: 14,
    color: '#f8d56b',
    marginLeft: 8,
    fontWeight: '600',
  },
  revealTitle: {
    fontSize: 18,
    color: '#f8d56b',
    marginBottom: 16,
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
    marginBottom: 24,
  },
  movieTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  movieYear: {
    fontSize: 18,
    color: '#f8d56b',
    marginTop: 8,
  },
  tapToReveal: {
    fontSize: 16,
    color: '#f8d56b',
    marginTop: 16,
  },
  onlyActorText: {
    fontSize: 12,
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
    marginBottom: 12,
  },
  timerText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#f8d56b',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 20,
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
    marginBottom: 20,
  },
  hintsTitle: {
    fontSize: 14,
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
  hintBoxWide: {
    width: '48%',
  },
  hintLabel: {
    fontSize: 11,
    color: '#a0a0a0',
    marginTop: 4,
  },
  hintValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
    textAlign: 'center',
  },
  hintValueLarge: {
    fontSize: 14,
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
    paddingVertical: 16,
    borderRadius: 16,
  },
  skipButton: {
    backgroundColor: '#e94560',
  },
  correctButton: {
    backgroundColor: '#4ecdc4',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
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
  shareModalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '90%',
    maxWidth: 360,
    borderWidth: 2,
    borderColor: '#f8d56b',
  },
  closeShareModal: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  shareModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8d56b',
    marginBottom: 20,
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(248, 213, 107, 0.1)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCodeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shareCodeLabel: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 8,
  },
  shareCode: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f8d56b',
    letterSpacing: 4,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
});
