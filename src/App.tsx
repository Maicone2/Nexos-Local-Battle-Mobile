import { useCallback, useEffect, useState } from 'react';
import { AboutScreen } from './components/AboutScreen';
import { CharacterSelect } from './components/CharacterSelect';
import { CombatScreen } from './components/CombatScreen';
import { LanMenu } from './components/LanMenu';
import { LobbyScreen } from './components/LobbyScreen';
import { MainMenu } from './components/MainMenu';
import { ModeSelect } from './components/ModeSelect';
import { SettingsScreen } from './components/SettingsScreen';
import { StageSelect } from './components/StageSelect';
import { TitleScreen } from './components/TitleScreen';
import { audioManager } from './game/AudioManager';
import { DEFAULT_SETTINGS } from './game/constants';
import { lanClient, LanConnectionStatus } from './game/LanClient';
import {
  FighterId,
  GameMode,
  LobbyState,
  MatchState,
  ScreenState,
  SettingsConfig,
  StageId,
} from './game/types';

const SETTINGS_STORAGE_KEY = 'neon_clash_settings_v1';

function loadSettings(): SettingsConfig {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      touchLayout: {
        ...DEFAULT_SETTINGS.touchLayout,
        ...(parsed.touchLayout || {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function App() {
  const [autostart] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  });

  const [screen, setScreen] = useState<ScreenState>(() => (autostart ? 'combat' : 'title'));
  const [mode, setMode] = useState<GameMode>('training');
  const [p1Fighter, setP1Fighter] = useState<FighterId>('kael');
  const [p2Fighter, setP2Fighter] = useState<FighterId>('vexa');
  const [stage, setStage] = useState<StageId>('orbital_arena');
  const [settings, setSettings] = useState<SettingsConfig>(loadSettings);

  // LAN state
  const [lanStatus, setLanStatus] = useState<LanConnectionStatus>('disconnected');
  const [lanError, setLanError] = useState<string | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [lanMatchState, setLanMatchState] = useState<MatchState | null>(null);
  const [pingMs, setPingMs] = useState(0);
  const [lobbyNotice, setLobbyNotice] = useState<string | null>(null);
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const updateOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  const requestLandscapeLock = useCallback(() => {
    try {
      const orientation = window.screen.orientation as
        | (ScreenOrientation & { lock?: (orientation: string) => Promise<void> })
        | undefined;
      orientation?.lock?.('landscape')?.catch(() => {});
    } catch {
      // Orientation lock unsupported in non-fullscreen desktop/iOS browsers
    }
  }, []);

  // Sync audio settings
  useEffect(() => {
    audioManager.setMuted(settings.muted);
    audioManager.setVolume(settings.volume);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage quota errors
    }
  }, [settings]);

  // Mirror game state machine to document.body.dataset.state
  useEffect(() => {
    if (screen === 'combat') {
      document.body.dataset.state = 'playing';
    } else if (screen === 'title') {
      document.body.dataset.state = 'title';
    } else {
      document.body.dataset.state = 'menu';
    }
  }, [screen]);

  const wireLanCallbacks = useCallback(() => {
    lanClient.setCallbacks({
      onStatusChange: (st, err) => {
        setLanStatus(st);
        setLanError(err || null);
      },
      onLobbyUpdate: (nextLobby) => {
        setLobby(nextLobby);
        setLobbyNotice(null);
        setScreen((prev) => (prev === 'lan_menu' ? 'lobby' : prev));
      },
      onMatchState: (state) => {
        setLanMatchState(state);
        setP1Fighter(state.p1.id);
        setP2Fighter(state.p2.id);
        setStage(state.stage);
        setMode('lan');
        setScreen('combat');
      },
      onPingUpdate: (ms) => setPingMs(ms),
      onOpponentDisconnected: () => {
        setLobbyNotice('O outro jogador desligou-se da sala.');
      },
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setSettings((prev) => ({ ...prev, muted: !prev.muted }));
  }, []);

  const handleExitToMenu = useCallback(() => {
    if (mode === 'lan') {
      lanClient.disconnect();
      setLobby(null);
      setLanMatchState(null);
    }
    setScreen('menu');
  }, [mode]);

  const handleCreateLanRoom = (playerName: string) => {
    audioManager.playUiClick();
    setLanError(null);
    wireLanCallbacks();
    lanClient.connectAndCreateRoom(playerName, stage);
  };

  const handleJoinLanRoom = (roomId: string, playerName: string, ip: string, port: number) => {
    audioManager.playUiClick();
    setLanError(null);
    wireLanCallbacks();
    lanClient.connectAndJoinRoom(roomId, playerName, ip, port);
  };

  const handleLeaveLobby = () => {
    audioManager.playUiClick();
    lanClient.disconnect();
    setLobby(null);
    setLanMatchState(null);
    setScreen('lan_menu');
  };

  const renderScreen = () => {
    if (screen === 'title') {
      return (
        <TitleScreen
          onStart={() => {
            audioManager.unlock();
            audioManager.playUiClick();
            requestLandscapeLock();
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            setScreen('menu');
          }}
        />
      );
    }

  if (screen === 'menu') {
    return (
      <MainMenu
        onPlay={() => {
          audioManager.playUiClick();
          setScreen('mode_select');
        }}
        onLan={() => {
          audioManager.playUiClick();
          setMode('lan');
          setScreen('lan_menu');
        }}
        onTraining={() => {
          audioManager.playUiClick();
          setMode('training');
          setScreen('char_select');
        }}
        onSettings={() => {
          audioManager.playUiClick();
          setScreen('settings');
        }}
        onAbout={() => {
          audioManager.playUiClick();
          setScreen('about');
        }}
        onBackTitle={() => {
          audioManager.playUiClick();
          setScreen('title');
        }}
      />
    );
  }

  if (screen === 'mode_select') {
    return (
      <ModeSelect
        onSelectMode={(selected) => {
          audioManager.playUiClick();
          setMode(selected);
          if (selected === 'lan') {
            setScreen('lan_menu');
          } else {
            setScreen('char_select');
          }
        }}
        onBack={() => {
          audioManager.playUiClick();
          setScreen('menu');
        }}
      />
    );
  }

  if (screen === 'lan_menu') {
    return (
      <LanMenu
        status={lanStatus}
        errorMsg={lanError}
        onCreateRoom={handleCreateLanRoom}
        onJoinRoom={handleJoinLanRoom}
        onBack={() => {
          audioManager.playUiClick();
          lanClient.disconnect();
          setScreen('menu');
        }}
      />
    );
  }

  if (screen === 'lobby' && lobby) {
    return (
      <LobbyScreen
        lobby={lobby}
        localSlot={lanClient.getSlot() || 1}
        pingMs={pingMs}
        statusMessage={lobbyNotice}
        onToggleReady={(ready) => {
          audioManager.playUiClick();
          lanClient.setReady(ready);
        }}
        onSelectFighter={(fighter) => {
          audioManager.playUiClick();
          lanClient.selectFighter(fighter);
        }}
        onSelectStage={(nextStage) => {
          audioManager.playUiClick();
          setStage(nextStage);
          lanClient.selectStage(nextStage);
        }}
        onStartMatch={() => {
          audioManager.playUiClick();
          lanClient.startMatch();
        }}
        onLeave={handleLeaveLobby}
      />
    );
  }

  if (screen === 'char_select') {
    return (
      <CharacterSelect
        p1Fighter={p1Fighter}
        p2Fighter={p2Fighter}
        isLan={mode === 'lan'}
        localSlot={lanClient.getSlot() || 1}
        onSelectP1={(id) => {
          audioManager.playUiClick();
          setP1Fighter(id);
        }}
        onSelectP2={(id) => {
          audioManager.playUiClick();
          setP2Fighter(id);
        }}
        onContinue={() => {
          audioManager.playUiClick();
          setScreen('stage_select');
        }}
        onBack={() => {
          audioManager.playUiClick();
          setScreen('mode_select');
        }}
      />
    );
  }

    if (screen === 'stage_select') {
      return (
        <StageSelect
          selectedStage={stage}
          onSelectStage={(s) => {
            audioManager.playUiClick();
            setStage(s);
          }}
          onStartCombat={() => {
            audioManager.unlock();
            audioManager.playUiClick();
            requestLandscapeLock();
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            setScreen('combat');
          }}
          onBack={() => {
            audioManager.playUiClick();
            setScreen('char_select');
          }}
        />
      );
    }

    if (screen === 'settings') {
      return (
        <SettingsScreen
          settings={settings}
          onUpdate={setSettings}
          onBack={() => {
            audioManager.playUiClick();
            setScreen('menu');
          }}
        />
      );
    }

    if (screen === 'about') {
      return (
        <AboutScreen
          onBack={() => {
            audioManager.playUiClick();
            setScreen('menu');
          }}
        />
      );
    }

    return (
      <CombatScreen
        mode={mode}
        stage={stage}
        p1Fighter={p1Fighter}
        p2Fighter={p2Fighter}
        lanInitialState={lanMatchState}
        lanSlot={lanClient.getSlot() || 1}
        pingMs={pingMs}
        settings={settings}
        onToggleMute={handleToggleMute}
        onChangeCharacters={() => {
          audioManager.playUiClick();
          setScreen('char_select');
        }}
        onExitToMenu={handleExitToMenu}
      />
    );
  };

  return (
    <div
      data-orientation={isPortrait ? 'portrait-rotated' : 'landscape'}
      className={isPortrait ? 'bg-[#07090D] overflow-hidden' : 'relative w-full h-full bg-[#07090D] overflow-hidden'}
      style={
        isPortrait
          ? {
              position: 'fixed',
              top: 0,
              left: '100vw',
              width: '100vh',
              height: '100vw',
              transform: 'rotate(90deg)',
              transformOrigin: 'top left',
            }
          : undefined
      }
    >
      {renderScreen()}
    </div>
  );
}
