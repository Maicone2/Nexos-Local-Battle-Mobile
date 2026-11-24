import { useCallback, useEffect, useState } from 'react';
import { AboutScreen } from './components/AboutScreen';
import { CharacterCustomizerModal } from './components/CharacterCustomizerModal';
import { CharacterSelect } from './components/CharacterSelect';
import { CombatScreen } from './components/CombatScreen';
import { LanMenu } from './components/LanMenu';
import { LobbyScreen } from './components/LobbyScreen';
import { MainMenu } from './components/MainMenu';
import { ModeSelect } from './components/ModeSelect';
import { MoveListModal } from './components/MoveListModal';
import { ReplayModal } from './components/ReplayModal';
import { SettingsScreen } from './components/SettingsScreen';
import { StageSelect } from './components/StageSelect';
import { TitleScreen } from './components/TitleScreen';
import { audioManager } from './game/AudioManager';
import {
  DEFAULT_FIGHTER_APPEARANCE,
  DEFAULT_SETTINGS,
  DEFAULT_TOUCH_CONTROLS,
} from './game/constants';
import { lanClient, LanConnectionStatus } from './game/LanClient';
import { loadReplays, MatchReplay } from './game/replayStorage';
import {
  loadLocalSessionStats,
  LocalSessionRecord,
  recordLocalMatchResult,
  resetLocalSessionStats,
  saveLocalSessionStats,
} from './game/sessionStats';
import {
  FighterId,
  GameMode,
  LobbyState,
  MatchState,
  ScreenState,
  SettingsConfig,
  StageId,
  TouchControlId,
} from './game/types';

const SETTINGS_STORAGE_KEY = 'neon_clash_settings_v1';

function loadSettings(): SettingsConfig {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const parsedControls = parsed?.touchLayout?.controls || {};
    const mergedControls = { ...DEFAULT_TOUCH_CONTROLS };
    (Object.keys(DEFAULT_TOUCH_CONTROLS) as TouchControlId[]).forEach((id) => {
      mergedControls[id] = {
        ...DEFAULT_TOUCH_CONTROLS[id],
        ...(parsedControls[id] || {}),
      };
    });
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      touchLayout: {
        ...DEFAULT_SETTINGS.touchLayout,
        ...(parsed.touchLayout || {}),
        controls: mergedControls,
      },
      hudConfig: {
        ...DEFAULT_SETTINGS.hudConfig,
        ...(parsed.hudConfig || {}),
      },
      fighterCustomizations: {
        p1: {
          ...DEFAULT_FIGHTER_APPEARANCE,
          ...(parsed?.fighterCustomizations?.p1 || {}),
        },
        p2: {
          ...DEFAULT_FIGHTER_APPEARANCE,
          ...(parsed?.fighterCustomizations?.p2 || {}),
        },
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
  const [activeReplay, setActiveReplay] = useState<MatchReplay | null>(null);
  const [showReplaysModal, setShowReplaysModal] = useState(false);
  const [showMoveListModal, setShowMoveListModal] = useState(false);
  const [customizerSlot, setCustomizerSlot] = useState<1 | 2 | null>(null);
  const [replayCount, setReplayCount] = useState(() => loadReplays().length);
  const [localSessionStats, setLocalSessionStats] = useState<LocalSessionRecord>(() =>
    loadLocalSessionStats()
  );

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
    if (screen === 'menu') {
      setReplayCount(loadReplays().length);
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
        setActiveReplay(null);
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

  const handleLocalMatchEnd = useCallback((winnerSlot: 1 | 2) => {
    setLocalSessionStats((prev) => {
      const next = recordLocalMatchResult(prev, winnerSlot);
      saveLocalSessionStats(next);
      return next;
    });
  }, []);

  const handleResetLocalSession = useCallback(() => {
    audioManager.playUiClick();
    setLocalSessionStats(resetLocalSessionStats());
  }, []);

  const handleExitToMenu = useCallback(() => {
    if (mode === 'lan') {
      lanClient.disconnect();
      setLobby(null);
      setLanMatchState(null);
    }
    setActiveReplay(null);
    setReplayCount(loadReplays().length);
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
      <>
        <MainMenu
          onPlay={() => {
            audioManager.playUiClick();
            setActiveReplay(null);
            setScreen('mode_select');
          }}
          onLan={() => {
            audioManager.playUiClick();
            setActiveReplay(null);
            setMode('lan');
            setScreen('lan_menu');
          }}
          onTraining={() => {
            audioManager.playUiClick();
            setActiveReplay(null);
            setMode('training');
            setScreen('char_select');
          }}
          onComboTrials={() => {
            audioManager.playUiClick();
            setActiveReplay(null);
            setMode('combo_trials');
            setScreen('char_select');
          }}
          onCustomize={() => {
            audioManager.playUiClick();
            setCustomizerSlot(1);
          }}
          onReplays={() => {
            audioManager.playUiClick();
            setShowReplaysModal(true);
          }}
          onMoveList={() => {
            audioManager.playUiClick();
            setShowMoveListModal(true);
          }}
          replayCount={replayCount}
          localSessionStats={localSessionStats}
          onResetLocalSession={handleResetLocalSession}
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
        {showReplaysModal && (
          <ReplayModal
            onWatchReplay={(replay) => {
              audioManager.unlock();
              audioManager.playUiClick();
              setShowReplaysModal(false);
              setActiveReplay(replay);
              setMode(replay.mode);
              setP1Fighter(replay.p1Id);
              setP2Fighter(replay.p2Id);
              setStage(replay.stage);
              setScreen('combat');
            }}
            onClose={() => {
              setShowReplaysModal(false);
              setReplayCount(loadReplays().length);
            }}
          />
        )}
        {showMoveListModal && (
          <MoveListModal onClose={() => setShowMoveListModal(false)} />
        )}
        {customizerSlot !== null && (
          <CharacterCustomizerModal
            p1Fighter={p1Fighter}
            p2Fighter={p2Fighter}
            initialSlot={customizerSlot}
            customizations={settings.fighterCustomizations}
            onChange={(nextCustom) =>
              setSettings((prev) => ({ ...prev, fighterCustomizations: nextCustom }))
            }
            onClose={() => setCustomizerSlot(null)}
          />
        )}
      </>
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
      <>
        <CharacterSelect
          p1Fighter={p1Fighter}
          p2Fighter={p2Fighter}
          isLan={mode === 'lan'}
          isTrialsMode={mode === 'combo_trials'}
          localSlot={lanClient.getSlot() || 1}
          customizations={settings.fighterCustomizations}
          onSelectP1={(id) => {
            audioManager.playUiClick();
            setP1Fighter(id);
          }}
          onSelectP2={(id) => {
            audioManager.playUiClick();
            setP2Fighter(id);
          }}
          onOpenCustomize={(slot) => {
            audioManager.playUiClick();
            setCustomizerSlot(slot);
          }}
          onContinue={() => {
            audioManager.playUiClick();
            setScreen('stage_select');
          }}
          onStartDirect={() => {
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
            setScreen('mode_select');
          }}
        />
        {customizerSlot !== null && (
          <CharacterCustomizerModal
            p1Fighter={p1Fighter}
            p2Fighter={p2Fighter}
            initialSlot={customizerSlot}
            customizations={settings.fighterCustomizations}
            onChange={(nextCustom) =>
              setSettings((prev) => ({ ...prev, fighterCustomizations: nextCustom }))
            }
            onClose={() => setCustomizerSlot(null)}
          />
        )}
      </>
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
        replayData={activeReplay}
        settings={settings}
        isPortrait={isPortrait}
        onUpdateSettings={setSettings}
        onToggleMute={handleToggleMute}
        onLocalMatchEnd={handleLocalMatchEnd}
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
