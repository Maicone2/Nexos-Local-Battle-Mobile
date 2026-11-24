package com.neonclash.arenalan.engine

import android.view.SurfaceHolder
import com.neonclash.arenalan.audio.AudioManager
import com.neonclash.arenalan.network.LanNetworkManager
import com.neonclash.arenalan.state.*
import java.util.concurrent.atomic.AtomicReference

class GameEngine(
    private val stateManager: GameStateManager,
    private val settingsManager: SettingsManager,
    private val audioManager: AudioManager,
    private val lanManager: LanNetworkManager
) : SurfaceHolder.Callback {

    private val combatSystem = CombatSystem(audioManager)
    private val renderer = GameRenderer()
    private var surfaceHolder: SurfaceHolder? = null
    private val localInput = AtomicReference(InputPacket())
    private val remoteInput = AtomicReference(InputPacket())

    private val gameLoop = GameLoop(
        onTick = { tickSimulation() },
        onRender = { renderScene() }
    )

    fun updateLocalInput(input: InputPacket) {
        localInput.set(input)
        if (stateManager.mode.value == GameMode.LAN) {
            lanManager.sendInput(input)
        }
    }

    fun updateRemoteInput(input: InputPacket) {
        remoteInput.set(input)
    }

    fun startMatch() {
        val m = stateManager.match
        m.roundNumber = 1
        m.p1.roundsWon = 0
        m.p2.roundsWon = 0
        m.winnerSlot = null
        combatSystem.resetRound(m)
        m.p1.hp = m.p1.maxHp
        m.p2.hp = m.p2.maxHp
        stateManager.navigate(ScreenRoute.COMBAT)
    }

    fun pause() {
        gameLoop.stop()
    }

    fun release() {
        gameLoop.stop()
    }

    private fun computeBotInput(state: MatchSnapshot): InputPacket {
        if (state.phase != "FIGHTING") return InputPacket()
        val p1 = state.p1
        val p2 = state.p2
        val dx = p1.x - p2.x
        val dist = kotlin.math.abs(dx)
        val moveLeft = dx < -115f
        val moveRight = dx > 115f
        val shouldBlock = p1.action in listOf(ActionState.LIGHT, ActionState.MEDIUM, ActionState.HEAVY, ActionState.SPECIAL) &&
            dist < 155f && (state.tick % 5 != 0)
        val shouldAttack = dist < 128f && !shouldBlock && (state.tick % 24 == 0)
        val useHeavy = shouldAttack && (state.tick % 48 == 0)
        val useSpecial = dist in 135f..420f && p2.energy >= 50 && (state.tick % 90 == 0)
        return InputPacket(
            left = moveLeft,
            right = moveRight,
            light = shouldAttack && !useHeavy,
            heavy = useHeavy,
            special = useSpecial,
            block = shouldBlock
        )
    }

    private fun tickSimulation() {
        val mode = stateManager.mode.value
        val state = stateManager.match
        val p1In = localInput.get()
        val p2In = when (mode) {
            GameMode.TRAINING -> InputPacket()
            GameMode.VS_CPU -> computeBotInput(state)
            GameMode.LAN -> remoteInput.get()
        }

        if (mode == GameMode.LAN && !lanManager.isHost) {
            // Client applies authoritative snapshots received from LanClient
            return
        }

        combatSystem.step(state, p1In, p2In, mode, settingsManager.trainingInfiniteEnergy)
        if (mode == GameMode.LAN && lanManager.isHost) {
            lanManager.broadcastMatchState(state)
        }
        if (state.phase == "MATCH_OVER") {
            stateManager.navigate(ScreenRoute.RESULT)
        }
    }

    private fun renderScene() {
        val holder = surfaceHolder ?: return
        if (!holder.surface.isValid) return
        renderer.renderFrame(
            holder,
            stateManager.match,
            stateManager.selectedStage.value,
            settingsManager.graphicsTier,
            settingsManager.showHitboxes
        )
    }

    override fun surfaceCreated(holder: SurfaceHolder) {
        surfaceHolder = holder
        gameLoop.start()
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        surfaceHolder = holder
    }

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        gameLoop.stop()
        surfaceHolder = null
    }
}
