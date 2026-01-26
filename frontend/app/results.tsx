import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Game {
  id: string;
  team_a: { name: string; players: { name: string }[]; score: number };
  team_b: { name: string; players: { name: string }[]; score: number };
  settings: { timer_seconds: number; total_rounds: number; difficulty: string };
  current_turn: string;
  current_round: number;
  status: string;
  winner?: string;
}

export default function ResultsScreen() {
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    loadGame();
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadGame = async () => {
    try {
      const gameData = await AsyncStorage.getItem('currentGame');
      if (gameData) {
        setGame(JSON.parse(gameData));
      }
    } catch (error) {
      console.error('Error loading game:', error);
    }
  };

  const getWinnerColor = () => {
    if (!game) return '#f8d56b';
    if (game.winner === 'Team A') return '#e94560';
    if (game.winner === 'Team B') return '#4ecdc4';
    return '#f8d56b';
  };

  const getWinnerIcon = () => {
    if (!game || game.winner === 'Draw') return 'ribbon';
    return 'trophy';
  };

  const playAgain = async () => {
    await AsyncStorage.removeItem('currentGame');
    router.replace('/team-setup');
  };

  const goHome = async () => {
    await AsyncStorage.removeItem('currentGame');
    router.replace('/');
  };

  if (!game) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Trophy/Winner Badge */}
        <Animated.View
          style={[
            styles.trophyContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={[styles.trophyCircle, { backgroundColor: getWinnerColor() }]}>
            <Ionicons name={getWinnerIcon() as any} size={80} color="#fff" />
          </View>
        </Animated.View>

        {/* Winner Text */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.gameOverText}>Game Over!</Text>
          <Text style={[styles.winnerText, { color: getWinnerColor() }]}>
            {game.winner === 'Draw' ? "It's a Draw!" : `${game.winner} Wins!`}
          </Text>
        </Animated.View>

        {/* Final Scores */}
        <Animated.View style={[styles.scoresContainer, { opacity: fadeAnim }]}>
          <View
            style={[
              styles.scoreCard,
              game.winner === 'Team A' && styles.winnerCard,
            ]}
          >
            <Text style={[styles.teamLabel, { color: '#e94560' }]}>Team A</Text>
            <Text style={styles.finalScore}>{game.team_a.score}</Text>
            <Text style={styles.pointsLabel}>points</Text>
            {game.winner === 'Team A' && (
              <View style={styles.winnerBadge}>
                <Ionicons name="star" size={16} color="#f8d56b" />
                <Text style={styles.winnerBadgeText}>Winner</Text>
              </View>
            )}
          </View>

          <View style={styles.scoreDivider}>
            <Text style={styles.scoreVs}>VS</Text>
          </View>

          <View
            style={[
              styles.scoreCard,
              game.winner === 'Team B' && styles.winnerCard,
            ]}
          >
            <Text style={[styles.teamLabel, { color: '#4ecdc4' }]}>Team B</Text>
            <Text style={styles.finalScore}>{game.team_b.score}</Text>
            <Text style={styles.pointsLabel}>points</Text>
            {game.winner === 'Team B' && (
              <View style={styles.winnerBadge}>
                <Ionicons name="star" size={16} color="#f8d56b" />
                <Text style={styles.winnerBadgeText}>Winner</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Game Stats */}
        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
          <View style={styles.statItem}>
            <Ionicons name="sync" size={24} color="#f8d56b" />
            <Text style={styles.statValue}>{game.settings.total_rounds}</Text>
            <Text style={styles.statLabel}>Rounds Played</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="timer" size={24} color="#f8d56b" />
            <Text style={styles.statValue}>{game.settings.timer_seconds}s</Text>
            <Text style={styles.statLabel}>Per Round</Text>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[styles.actionsContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.playAgainButton}
            onPress={playAgain}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={24} color="#1a1a2e" />
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={goHome}
            activeOpacity={0.8}
          >
            <Ionicons name="home" size={24} color="#f8d56b" />
            <Text style={styles.homeButtonText}>Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  trophyContainer: {
    marginBottom: 24,
  },
  trophyCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f8d56b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  gameOverText: {
    fontSize: 24,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  winnerText: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  scoresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  scoreCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  winnerCard: {
    backgroundColor: 'rgba(248, 213, 107, 0.1)',
    borderWidth: 2,
    borderColor: '#f8d56b',
  },
  teamLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  finalScore: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 8,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 213, 107, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  winnerBadgeText: {
    fontSize: 14,
    color: '#f8d56b',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  scoreDivider: {
    paddingHorizontal: 12,
  },
  scoreVs: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#a0a0a0',
    marginTop: 4,
  },
  actionsContainer: {
    width: '100%',
    gap: 16,
  },
  playAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8d56b',
    paddingVertical: 18,
    borderRadius: 30,
  },
  playAgainText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginLeft: 8,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#f8d56b',
  },
  homeButtonText: {
    fontSize: 18,
    color: '#f8d56b',
    marginLeft: 8,
  },
});
