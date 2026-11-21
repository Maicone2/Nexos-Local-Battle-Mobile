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

    private fun tickSimulation() {
        val mode = stateManager.mode.value
        val state = stateManager.match
        val p1In = localInput.get()
        val p2In = if (mode == GameMode.TRAINING) {
            InputPacket() // Simple training dummy / CPU
        } else {
            remoteInput.get()
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
            settingsManager.graphicsTier
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
