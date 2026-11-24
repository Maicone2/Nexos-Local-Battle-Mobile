package com.neonclash.arenalan.state

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

enum class ScreenRoute {
    TITLE, MENU, MODE_SELECT, LAN_MENU, LOBBY, CHAR_SELECT, STAGE_SELECT, COMBAT, RESULT, SETTINGS, ABOUT
}

enum class FighterId { KAEL, VEXA }
enum class StageId { ORBITAL_ARENA, ENERGY_DOCK }
enum class GameMode { VS_CPU, TRAINING, LAN }
enum class ActionState {
    IDLE, WALK_FWD, WALK_BACK, DASH_FWD, DASH_BACK,
    JUMP, DOUBLE_JUMP, CROUCH, CROUCH_WALK, LANDING,
    LIGHT, MEDIUM, HEAVY, SPECIAL, ULTIMATE,
    BLOCK, GUARD_BREAK, HITSTUN, KNOCKDOWN, STUNNED, VICTORY, DEFEAT
}

enum class MoveId {
    STAND_LIGHT, STAND_MEDIUM, STAND_HEAVY,
    CROUCH_SWEEP, CROUCH_UPPERCUT,
    AIR_LIGHT, AIR_MEDIUM, AIR_HEAVY,
    SPECIAL_PRIMARY, ULTIMATE_BURST
}

data class InputPacket(
    val left: Boolean = false,
    val right: Boolean = false,
    val up: Boolean = false,
    val down: Boolean = false,
    val light: Boolean = false,
    val medium: Boolean = false,
    val heavy: Boolean = false,
    val special: Boolean = false,
    val block: Boolean = false
)

data class FighterEntity(
    val slot: Int,
    val id: FighterId,
    var x: Float,
    var y: Float = 590f,
    var vx: Float = 0f,
    var vy: Float = 0f,
    var facing: Int = 1,
    var grounded: Boolean = true,
    var crouching: Boolean = false,
    var hp: Int = 1000,
    var maxHp: Int = 1000,
    var energy: Int = 25,
    var maxEnergy: Int = 100,
    var stun: Float = 0f,
    var guardMeter: Float = 100f,
    var action: ActionState = ActionState.IDLE,
    var currentMove: MoveId? = null,
    var actionFrame: Int = 0,
    var blockFrames: Int = 0,
    var stunTimer: Int = 0,
    var knockdownTimer: Int = 0,
    var airJumpsLeft: Int = if (id == FighterId.VEXA) 1 else 0,
    var hitFlashFrames: Int = 0,
    var hasHitCurrentAttack: Boolean = false,
    var comboCount: Int = 0,
    var comboTimer: Int = 0,
    var roundsWon: Int = 0
)

data class ProjectileEntity(
    val id: Int,
    val ownerSlot: Int,
    var x: Float,
    var y: Float,
    val vx: Float,
    val radius: Float = 34f,
    val damage: Int = 175
)

data class MatchSnapshot(
    var tick: Int = 0,
    var roundNumber: Int = 1,
    var timerSeconds: Int = 99,
    var hitstopFrames: Int = 0,
    var cameraShake: Float = 0f,
    var phase: String = "INTRO",
    var phaseTimer: Int = 60,
    var winnerSlot: Int? = null,
    val p1: FighterEntity = FighterEntity(1, FighterId.KAEL, 390f, facing = 1),
    val p2: FighterEntity = FighterEntity(2, FighterId.VEXA, 890f, facing = -1),
    val projectiles: MutableList<ProjectileEntity> = mutableListOf()
)

class GameStateManager {
    private val _route = MutableStateFlow(ScreenRoute.TITLE)
    val route: StateFlow<ScreenRoute> = _route

    private val _mode = MutableStateFlow(GameMode.TRAINING)
    val mode: StateFlow<GameMode> = _mode

    private val _selectedP1 = MutableStateFlow(FighterId.KAEL)
    val selectedP1: StateFlow<FighterId> = _selectedP1

    private val _selectedP2 = MutableStateFlow(FighterId.VEXA)
    val selectedP2: StateFlow<FighterId> = _selectedP2

    private val _selectedStage = MutableStateFlow(StageId.ORBITAL_ARENA)
    val selectedStage: StateFlow<StageId> = _selectedStage

    private val _lanStatus = MutableStateFlow("Desconectado")
    val lanStatus: StateFlow<String> = _lanStatus

    private val _hostIp = MutableStateFlow("0.0.0.0")
    val hostIp: StateFlow<String> = _hostIp

    private val _latencyMs = MutableStateFlow(0)
    val latencyMs: StateFlow<Int> = _latencyMs

    val match = MatchSnapshot()

    fun navigate(to: ScreenRoute) { _route.value = to }
    fun setMode(m: GameMode) { _mode.value = m }
    fun setFighters(p1: FighterId, p2: FighterId) { _selectedP1.value = p1; _selectedP2.value = p2 }
    fun setStage(stage: StageId) { _selectedStage.value = stage }
    fun updateLanStatus(status: String, ip: String? = null) {
        _lanStatus.value = status
        if (ip != null) _hostIp.value = ip
    }
    fun updateLatency(ms: Int) { _latencyMs.value = ms }
}
