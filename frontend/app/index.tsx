import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({ total_movies: 0, total_games: 0 });
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.log('Error fetching stats:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Logo/Title */}
          <View style={styles.logoContainer}>
            <Text style={styles.filmIcon}>🎬</Text>
            <Text style={styles.title}>Dumb Charades</Text>
            <Text style={styles.subtitle}>Hindi Movie Edition</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total_movies}</Text>
              <Text style={styles.statLabel}>Movies</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>50+</Text>
              <Text style={styles.statLabel}>Years</Text>
            </View>
          </View>

          {/* Main Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => router.push('/team-setup')}
              activeOpacity={0.8}
            >
              <Ionicons name="play-circle" size={32} color="#1a1a2e" />
              <Text style={styles.playButtonText}>Play Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/rules')}
              activeOpacity={0.8}
            >
              <Ionicons name="book-outline" size={24} color="#f8d56b" />
              <Text style={styles.secondaryButtonText}>How to Play</Text>
            </TouchableOpacity>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Ionicons name="people" size={24} color="#f8d56b" />
              <Text style={styles.featureText}>Team vs Team</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="timer-outline" size={24} color="#f8d56b" />
              <Text style={styles.featureText}>Timed Rounds</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="trophy" size={24} color="#f8d56b" />
              <Text style={styles.featureText}>Live Scores</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  filmIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f8d56b',
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: '#e94560',
    marginTop: 8,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 213, 107, 0.1)',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 40,
  },
  statBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f8d56b',
  },
  statLabel: {
    fontSize: 14,
    color: '#a0a0a0',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(248, 213, 107, 0.3)',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8d56b',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 30,
    marginBottom: 16,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#f8d56b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginLeft: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#f8d56b',
    width: '100%',
    maxWidth: 300,
  },
  secondaryButtonText: {
    fontSize: 18,
    color: '#f8d56b',
    marginLeft: 10,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 16,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 8,
    textAlign: 'center',
  },
});
