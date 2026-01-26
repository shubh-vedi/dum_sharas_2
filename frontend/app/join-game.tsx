import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Linking,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

enum JoinStep {
  ENTER_CODE = 'enter_code',
  SELECT_TEAM = 'select_team',
  ENTER_NAME = 'enter_name',
  SUCCESS = 'success',
}

export default function JoinGameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [step, setStep] = useState<JoinStep>(JoinStep.ENTER_CODE);
  const [gameCode, setGameCode] = useState('');
  const [game, setGame] = useState<Game | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B' | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    // Check if we have a code from deep link
    if (params.code) {
      setGameCode(params.code as string);
      handleCodeSubmit(params.code as string);
    }
  }, [params.code]);

  const handleCodeSubmit = async (code?: string) => {
    const codeToUse = code || gameCode;
    if (!codeToUse || codeToUse.length < 4) {
      Alert.alert('Invalid Code', 'Please enter a valid game code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/games/share/${codeToUse.toUpperCase()}`);
      if (!response.ok) {
        throw new Error('Game not found');
      }
      const gameData = await response.json();
      setGame(gameData);
      setStep(JoinStep.SELECT_TEAM);
    } catch (error) {
      Alert.alert('Game Not Found', 'No game found with this code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setShowScanner(false);
    // Extract code from URL or use directly
    const code = data.includes('/join/') ? data.split('/join/')[1] : data;
    setGameCode(code);
    handleCodeSubmit(code);
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to scan QR codes');
        return;
      }
    }
    setShowScanner(true);
  };

  const handleTeamSelect = (team: 'A' | 'B') => {
    setSelectedTeam(team);
    setStep(JoinStep.ENTER_NAME);
  };

  const handleJoinTeam = async () => {
    if (!playerName.trim()) {
      Alert.alert('Name Required', 'Please enter your name to join');
      return;
    }

    if (!game || !selectedTeam) return;

    setIsLoading(true);
    try {
      // Add player to the selected team
      const response = await fetch(`${BACKEND_URL}/api/games/${game.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team: selectedTeam === 'A' ? 'team_a' : 'team_b',
          player_name: playerName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to join');
      }

      const updatedGame = await response.json();
      await AsyncStorage.setItem('currentGame', JSON.stringify(updatedGame));
      setGame(updatedGame);
      setStep(JoinStep.SUCCESS);
    } catch (error) {
      Alert.alert('Error', 'Failed to join the game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const joinViaWhatsApp = () => {
    if (!game) return;
    const message = encodeURIComponent(
      `I want to join the Dumb Charades game!\n\nGame Code: ${game.share_code}\n\nPlease add me to the team!`
    );
    Linking.openURL(`https://wa.me/?text=${message}`);
  };

  const goToGame = () => {
    router.replace('/game-play');
  };

  const renderEnterCode = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="game-controller" size={80} color="#f8d56b" />
      </View>
      <Text style={styles.stepTitle}>Join a Game</Text>
      <Text style={styles.stepDescription}>Enter the game code or scan QR to join</Text>

      <View style={styles.codeInputContainer}>
        <TextInput
          style={styles.codeInput}
          placeholder="Enter Game Code"
          placeholderTextColor="#666"
          value={gameCode}
          onChangeText={(text) => setGameCode(text.toUpperCase())}
          autoCapitalize="characters"
          maxLength={8}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={() => handleCodeSubmit()}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Ionicons name="enter" size={24} color="#1a1a2e" />
        <Text style={styles.primaryButtonText}>
          {isLoading ? 'Finding Game...' : 'Join with Code'}
        </Text>
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.divider} />
      </View>

      <TouchableOpacity
        style={styles.scanButton}
        onPress={openScanner}
        activeOpacity={0.8}
      >
        <Ionicons name="qr-code" size={28} color="#f8d56b" />
        <Text style={styles.scanButtonText}>Scan QR Code</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSelectTeam = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="people" size={80} color="#f8d56b" />
      </View>
      <Text style={styles.stepTitle}>Select Your Team</Text>
      <Text style={styles.stepDescription}>Choose which team you want to join</Text>

      {game && (
        <View style={styles.gameInfoCard}>
          <Text style={styles.gameInfoLabel}>Game Code</Text>
          <Text style={styles.gameInfoCode}>{game.share_code}</Text>
        </View>
      )}

      <View style={styles.teamButtonsContainer}>
        <TouchableOpacity
          style={[styles.teamButton, styles.teamAButton]}
          onPress={() => handleTeamSelect('A')}
          activeOpacity={0.8}
        >
          <View style={styles.teamIconCircle}>
            <Ionicons name="people" size={40} color="#e94560" />
          </View>
          <Text style={styles.teamButtonTitle}>Join Team A</Text>
          <Text style={styles.teamPlayerCount}>
            {game?.team_a.players.length || 0} players
          </Text>
          {game && game.team_a.players.length > 0 && (
            <View style={styles.playersList}>
              {game.team_a.players.slice(0, 3).map((p, i) => (
                <Text key={i} style={styles.playerName}>{p.name}</Text>
              ))}
              {game.team_a.players.length > 3 && (
                <Text style={styles.playerName}>+{game.team_a.players.length - 3} more</Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.teamButton, styles.teamBButton]}
          onPress={() => handleTeamSelect('B')}
          activeOpacity={0.8}
        >
          <View style={styles.teamIconCircle}>
            <Ionicons name="people" size={40} color="#4ecdc4" />
          </View>
          <Text style={styles.teamButtonTitle}>Join Team B</Text>
          <Text style={styles.teamPlayerCount}>
            {game?.team_b.players.length || 0} players
          </Text>
          {game && game.team_b.players.length > 0 && (
            <View style={styles.playersList}>
              {game.team_b.players.slice(0, 3).map((p, i) => (
                <Text key={i} style={styles.playerName}>{p.name}</Text>
              ))}
              {game.team_b.players.length > 3 && (
                <Text style={styles.playerName}>+{game.team_b.players.length - 3} more</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.whatsappJoinButton}
        onPress={joinViaWhatsApp}
        activeOpacity={0.8}
      >
        <Ionicons name="logo-whatsapp" size={24} color="#fff" />
        <Text style={styles.whatsappJoinText}>Share via WhatsApp</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEnterName = () => (
    <KeyboardAvoidingView
      style={styles.stepContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.iconContainer}>
        <View style={[
          styles.selectedTeamBadge,
          { backgroundColor: selectedTeam === 'A' ? '#e94560' : '#4ecdc4' }
        ]}>
          <Text style={styles.selectedTeamText}>Team {selectedTeam}</Text>
        </View>
      </View>
      <Text style={styles.stepTitle}>Enter Your Name</Text>
      <Text style={styles.stepDescription}>How should we call you?</Text>

      <View style={styles.nameInputContainer}>
        <Ionicons name="person" size={24} color="#f8d56b" />
        <TextInput
          style={styles.nameInput}
          placeholder="Your Name"
          placeholderTextColor="#666"
          value={playerName}
          onChangeText={setPlayerName}
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[
          styles.joinButton,
          { backgroundColor: selectedTeam === 'A' ? '#e94560' : '#4ecdc4' },
          isLoading && styles.buttonDisabled
        ]}
        onPress={handleJoinTeam}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark-circle" size={28} color="#fff" />
        <Text style={styles.joinButtonText}>
          {isLoading ? 'Joining...' : `Join Team ${selectedTeam}`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backLink}
        onPress={() => setStep(JoinStep.SELECT_TEAM)}
      >
        <Ionicons name="arrow-back" size={20} color="#f8d56b" />
        <Text style={styles.backLinkText}>Change Team</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );

  const renderSuccess = () => (
    <View style={styles.stepContainer}>
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={100} color="#4ecdc4" />
      </View>
      <Text style={styles.successTitle}>You're In!</Text>
      <Text style={styles.successDescription}>
        Successfully joined Team {selectedTeam}
      </Text>

      {game && (
        <View style={styles.joinedInfoCard}>
          <Text style={styles.joinedInfoLabel}>Welcome, {playerName}!</Text>
          <Text style={styles.joinedInfoTeam}>
            You're now part of Team {selectedTeam}
          </Text>
          <View style={styles.teamMatesContainer}>
            <Text style={styles.teamMatesLabel}>Your teammates:</Text>
            {(selectedTeam === 'A' ? game.team_a : game.team_b).players.map((p, i) => (
              <Text key={i} style={styles.teamMateName}>
                {p.name === playerName ? `${p.name} (You)` : p.name}
              </Text>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.playButton}
        onPress={goToGame}
        activeOpacity={0.8}
      >
        <Ionicons name="play" size={28} color="#1a1a2e" />
        <Text style={styles.playButtonText}>Go to Game</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step === JoinStep.ENTER_CODE) {
              router.back();
            } else if (step === JoinStep.SELECT_TEAM) {
              setStep(JoinStep.ENTER_CODE);
            } else if (step === JoinStep.ENTER_NAME) {
              setStep(JoinStep.SELECT_TEAM);
            } else {
              router.replace('/');
            }
          }}
        >
          <Ionicons name="arrow-back" size={28} color="#f8d56b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Game</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {step === JoinStep.ENTER_CODE && renderEnterCode()}
        {step === JoinStep.SELECT_TEAM && renderSelectTeam()}
        {step === JoinStep.ENTER_NAME && renderEnterName()}
        {step === JoinStep.SUCCESS && renderSuccess()}
      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal visible={showScanner} animationType="slide">
        <SafeAreaView style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.closeScannerButton}
              onPress={() => setShowScanner(false)}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <View style={styles.placeholder} />
          </View>
          
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={handleBarCodeScanned}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.scannerHint}>Point at the QR code to scan</Text>
            </View>
          </CameraView>
        </SafeAreaView>
      </Modal>
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
    padding: 24,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 32,
    textAlign: 'center',
  },
  codeInputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  codeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 4,
    borderWidth: 2,
    borderColor: 'rgba(248, 213, 107, 0.3)',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8d56b',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginLeft: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    fontSize: 14,
    color: '#a0a0a0',
    marginHorizontal: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 213, 107, 0.15)',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    borderWidth: 2,
    borderColor: '#f8d56b',
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8d56b',
    marginLeft: 12,
  },
  gameInfoCard: {
    backgroundColor: 'rgba(248, 213, 107, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  gameInfoLabel: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 4,
  },
  gameInfoCode: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8d56b',
    letterSpacing: 4,
  },
  teamButtonsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  teamButton: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 3,
  },
  teamAButton: {
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    borderColor: '#e94560',
  },
  teamBButton: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderColor: '#4ecdc4',
  },
  teamIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  teamButtonTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  teamPlayerCount: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  playersList: {
    marginTop: 12,
    alignItems: 'center',
  },
  playerName: {
    fontSize: 13,
    color: '#888',
  },
  whatsappJoinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
  },
  whatsappJoinText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  selectedTeamBadge: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  selectedTeamText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  nameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    width: '100%',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(248, 213, 107, 0.3)',
  },
  nameInput: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 12,
    fontSize: 18,
    color: '#fff',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 12,
  },
  backLinkText: {
    fontSize: 16,
    color: '#f8d56b',
    marginLeft: 8,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4ecdc4',
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 24,
  },
  joinedInfoCard: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.3)',
  },
  joinedInfoLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  joinedInfoTeam: {
    fontSize: 16,
    color: '#4ecdc4',
    marginBottom: 16,
  },
  teamMatesContainer: {
    alignItems: 'center',
  },
  teamMatesLabel: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 8,
  },
  teamMateName: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8d56b',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 30,
    width: '100%',
  },
  playButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginLeft: 10,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
  },
  closeScannerButton: {
    padding: 8,
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8d56b',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#f8d56b',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scannerHint: {
    color: '#fff',
    fontSize: 16,
    marginTop: 32,
  },
});
