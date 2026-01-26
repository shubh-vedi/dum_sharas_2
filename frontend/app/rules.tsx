import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const rules = [
  {
    icon: 'people',
    title: 'Team Setup',
    description: 'Divide players into Team A and Team B. Each team takes turns guessing movies.',
  },
  {
    icon: 'person-circle',
    title: 'The Actor',
    description: 'One player from the acting team sees the movie name and acts it out without speaking.',
  },
  {
    icon: 'eye',
    title: 'Hints Shown',
    description: 'Guessing team sees: Number of words, Release year, Hero name, and Heroine name.',
  },
  {
    icon: 'volume-mute',
    title: 'No Speaking',
    description: 'Actor cannot speak, spell, mouth words, or use any verbal hints.',
  },
  {
    icon: 'timer',
    title: 'Timer',
    description: 'Each turn has a time limit. Guess the movie before time runs out!',
  },
  {
    icon: 'hand-left',
    title: 'Gestures Only',
    description: 'Use hand signals, body movements, and creative acting to convey the movie.',
  },
  {
    icon: 'checkmark-circle',
    title: 'Scoring',
    description: 'Correct guess = +1 point. Skip = 0 points. Highest score wins!',
  },
  {
    icon: 'trophy',
    title: 'Winning',
    description: 'Team with the highest score after all rounds wins the game!',
  },
];

const actingTips = [
  'Show number of words using fingers first',
  'Indicate which word you\'re acting (1st, 2nd, etc.)',
  'Use "sounds like" by cupping your ear',
  'Break long words into syllables',
  'Act out the movie\'s famous scenes',
  'Mime the movie\'s genre (action, romance, etc.)',
];

export default function RulesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={28} color="#f8d56b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How to Play</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Game Rules</Text>

        {rules.map((rule, index) => (
          <View key={index} style={styles.ruleCard}>
            <View style={styles.ruleIconContainer}>
              <Ionicons name={rule.icon as any} size={28} color="#f8d56b" />
            </View>
            <View style={styles.ruleContent}>
              <Text style={styles.ruleTitle}>{rule.title}</Text>
              <Text style={styles.ruleDescription}>{rule.description}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Acting Tips</Text>

        <View style={styles.tipsContainer}>
          {actingTips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Ionicons name="bulb" size={20} color="#f8d56b" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push('/team-setup')}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Start Playing</Text>
          <Ionicons name="arrow-forward" size={24} color="#1a1a2e" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
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
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  ruleCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(248, 213, 107, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  ruleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(248, 213, 107, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 20,
  },
  tipsContainer: {
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 12,
    flex: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8d56b',
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 32,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginRight: 8,
  },
});
