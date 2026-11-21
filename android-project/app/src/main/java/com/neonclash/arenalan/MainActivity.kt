package com.neonclash.arenalan

import android.os.Bundle
import android.view.WindowInsets
import android.view.WindowInsetsController
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import com.neonclash.arenalan.audio.AudioManager
import com.neonclash.arenalan.engine.GameEngine
import com.neonclash.arenalan.network.LanNetworkManager
import com.neonclash.arenalan.state.GameStateManager
import com.neonclash.arenalan.state.SettingsManager
import com.neonclash.arenalan.ui.GameUI

class MainActivity : ComponentActivity() {
    private lateinit var settingsManager: SettingsManager
    private lateinit var stateManager: GameStateManager
    private lateinit var audioManager: AudioManager
    private lateinit var lanNetworkManager: LanNetworkManager
    private lateinit var gameEngine: GameEngine

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        hideSystemBars()

        settingsManager = SettingsManager(this)
        stateManager = GameStateManager()
        audioManager = AudioManager(settingsManager)
        lanNetworkManager = LanNetworkManager(this, stateManager)
        gameEngine = GameEngine(stateManager, settingsManager, audioManager, lanNetworkManager)

        setContent {
            GameUI(
                stateManager = stateManager,
                settingsManager = settingsManager,
                lanNetworkManager = lanNetworkManager,
                gameEngine = gameEngine
            )
        }
    }

    override fun onPause() {
        super.onPause()
        gameEngine.pause()
    }

    override fun onDestroy() {
        super.onDestroy()
        gameEngine.release()
        lanNetworkManager.shutdown()
        audioManager.release()
    }

    private fun hideSystemBars() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        }
    }
}
