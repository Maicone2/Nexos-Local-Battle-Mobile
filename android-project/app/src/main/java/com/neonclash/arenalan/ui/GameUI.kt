package com.neonclash.arenalan.ui

import android.view.SurfaceView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.neonclash.arenalan.engine.GameEngine
import com.neonclash.arenalan.network.LanNetworkManager
import com.neonclash.arenalan.state.*

@Composable
fun GameUI(
    stateManager: GameStateManager,
    settingsManager: SettingsManager,
    lanNetworkManager: LanNetworkManager,
    gameEngine: GameEngine
) {
    val route by stateManager.route.collectAsState()
    val lanStatus by stateManager.lanStatus.collectAsState()
    val hostIp by stateManager.hostIp.collectAsState()
    val latency by stateManager.latencyMs.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF07090D))
    ) {
        when (route) {
            ScreenRoute.TITLE -> {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("NEON CLASH", color = Color(0xFFF4F7FB), fontSize = 52.sp, fontWeight = FontWeight.ExtraBold)
                    Text("ARENA LAN", color = Color(0xFF00A8FF), fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(24.dp))
                    Button(
                        onClick = { stateManager.navigate(ScreenRoute.MENU) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00A8FF))
                    ) {
                        Text("INICIAR", color = Color(0xFF07090D), fontWeight = FontWeight.Bold)
                    }
                }
            }

            ScreenRoute.MENU -> {
                Column(
                    modifier = Modifier.fillMaxSize().padding(32.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("MENU PRINCIPAL", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Button(onClick = { stateManager.setMode(GameMode.TRAINING); gameEngine.startMatch() }) { Text("TREINO") }
                        Button(onClick = { stateManager.setMode(GameMode.LAN); stateManager.navigate(ScreenRoute.LAN_MENU) }) { Text("MULTIPLAYER LAN") }
                        Button(onClick = { stateManager.navigate(ScreenRoute.SETTINGS) }) { Text("DEFINIÇÕES") }
                    }
                }
            }

            ScreenRoute.LAN_MENU -> {
                var ipInput by remember { mutableStateOf("192.168.1.") }
                Column(
                    modifier = Modifier.fillMaxSize().padding(32.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("MULTIPLAYER LAN ($lanStatus)", color = Color(0xFF00A8FF), fontSize = 22.sp)
                    Text("IP Local: $hostIp : 5150", color = Color.White)
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Button(onClick = { lanNetworkManager.startHost(5150) { gameEngine.updateRemoteInput(it) } }) {
                            Text("CRIAR SALA")
                        }
                        OutlinedTextField(value = ipInput, onValueChange = { ipInput = it }, label = { Text("IP do Anfitrião") })
                        Button(onClick = { lanNetworkManager.joinHost(ipInput, 5150) }) { Text("ENTRAR NA SALA") }
                    }
                }
            }

            ScreenRoute.COMBAT -> {
                AndroidView(
                    factory = { ctx ->
                        SurfaceView(ctx).apply { holder.addCallback(gameEngine) }
                    },
                    modifier = Modifier.fillMaxSize()
                )
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("KAEL · HP ${stateManager.match.p1.hp}", color = Color(0xFF00E5FF), fontWeight = FontWeight.Bold)
                    Text("${stateManager.match.timerSeconds}s · ${latency}ms", color = Color.White, fontWeight = FontWeight.Bold)
                    Text("VEXA · HP ${stateManager.match.p2.hp}", color = Color(0xFFA855F7), fontWeight = FontWeight.Bold)
                }
            }

            else -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Button(onClick = { stateManager.navigate(ScreenRoute.MENU) }) { Text("VOLTAR AO MENU") }
                }
            }
        }
    }
}
