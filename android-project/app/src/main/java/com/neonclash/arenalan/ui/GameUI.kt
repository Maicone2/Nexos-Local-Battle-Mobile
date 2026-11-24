package com.neonclash.arenalan.ui

import android.view.SurfaceView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.neonclash.arenalan.engine.GameEngine
import com.neonclash.arenalan.network.LanNetworkManager
import com.neonclash.arenalan.state.*
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

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

    var currentInput by remember { mutableStateOf(InputPacket()) }
    var showCustomHud by remember { mutableStateOf(false) }
    var hudScale by remember { mutableStateOf(settingsManager.hudScale) }
    var hudOpacity by remember { mutableStateOf(settingsManager.hudOpacity) }
    var controlScale by remember { mutableStateOf(settingsManager.controlScale) }
    var showHitboxes by remember { mutableStateOf(settingsManager.showHitboxes) }

    fun pushInput(next: InputPacket) {
        currentInput = next
        gameEngine.updateLocalInput(next)
    }

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
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("MENU PRINCIPAL", color = Color.White, fontSize = 26.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(14.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = { stateManager.setMode(GameMode.VS_CPU); gameEngine.startMatch() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00A8FF))
                        ) {
                            Text("1V1 VS CPU · ENTRAR", color = Color(0xFF07090D), fontWeight = FontWeight.Bold)
                        }
                        Button(onClick = { stateManager.setMode(GameMode.TRAINING); gameEngine.startMatch() }) { Text("TREINO · ENTRAR") }
                        Button(onClick = { stateManager.setMode(GameMode.LAN); stateManager.navigate(ScreenRoute.LAN_MENU) }) { Text("MULTIPLAYER LAN") }
                        Button(onClick = { stateManager.navigate(ScreenRoute.SETTINGS) }) { Text("DEFINIÇÕES") }
                    }
                }
            }

            ScreenRoute.LAN_MENU -> {
                var ipInput by remember { mutableStateOf("192.168.1.") }
                Column(
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("MULTIPLAYER LAN ($lanStatus)", color = Color(0xFF00A8FF), fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Text("IP Local: $hostIp : 5150", color = Color.White, fontSize = 13.sp)
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                        Button(onClick = { lanNetworkManager.startHost(5150) { gameEngine.updateRemoteInput(it) } }) {
                            Text("CRIAR SALA")
                        }
                        OutlinedTextField(value = ipInput, onValueChange = { ipInput = it }, label = { Text("IP do Anfitrião") })
                        Button(onClick = { lanNetworkManager.joinHost(ipInput, 5150) }) { Text("ENTRAR NA SALA") }
                        Button(onClick = { stateManager.navigate(ScreenRoute.MENU) }) { Text("VOLTAR") }
                    }
                }
            }

            ScreenRoute.LOBBY -> {
                Column(
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("SALA LAN PRONTA", color = Color(0xFF00E5FF), fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    Text("Estado: $lanStatus · IP: $hostIp", color = Color.White, fontSize = 13.sp)
                    Spacer(Modifier.height(14.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (lanNetworkManager.isHost) {
                            Button(
                                onClick = { gameEngine.startMatch() },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00A8FF))
                            ) {
                                Text("ENTRAR NA PARTIDA", color = Color(0xFF07090D), fontWeight = FontWeight.Bold)
                            }
                        } else {
                            Text("A aguardar anfitrião iniciar a partida...", color = Color(0xFFF5B700))
                        }
                        Button(onClick = {
                            lanNetworkManager.shutdown()
                            stateManager.navigate(ScreenRoute.MENU)
                        }) {
                            Text("SAIR")
                        }
                    }
                }
            }

            ScreenRoute.SETTINGS -> {
                Column(
                    modifier = Modifier.fillMaxSize().padding(28.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("CUSTOM HUD & DEFINIÇÕES", color = Color(0xFF00E5FF), fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(16.dp))
                    Text("Escala HUD: ${(hudScale * 100).toInt()}%", color = Color.White)
                    Slider(value = hudScale, onValueChange = { hudScale = it; settingsManager.hudScale = it }, valueRange = 0.75f..1.25f)
                    Text("Escala Controlos: ${(controlScale * 100).toInt()}%", color = Color.White)
                    Slider(value = controlScale, onValueChange = { controlScale = it; settingsManager.controlScale = it }, valueRange = 0.75f..1.35f)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Checkbox(checked = showHitboxes, onCheckedChange = { showHitboxes = it; settingsManager.showHitboxes = it })
                        Text("Mostrar Hitboxes/Hurtboxes", color = Color.White)
                    }
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { stateManager.navigate(ScreenRoute.MENU) }) { Text("VOLTAR") }
                }
            }

            ScreenRoute.COMBAT -> {
                AndroidView(
                    factory = { ctx -> SurfaceView(ctx).apply { holder.addCallback(gameEngine) } },
                    modifier = Modifier.fillMaxSize()
                )

                // Top HUD
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp)
                        .scale(hudScale)
                        .alpha(hudOpacity),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("KAEL · HP ${stateManager.match.p1.hp}", color = Color(0xFF00E5FF), fontWeight = FontWeight.Bold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("${stateManager.match.timerSeconds}s · ${latency}ms", color = Color.White, fontWeight = FontWeight.Bold)
                        Button(
                            onClick = { showCustomHud = !showCustomHud },
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10151F))
                        ) {
                            Text("HUD", color = Color(0xFF00E5FF), fontSize = 11.sp)
                        }
                    }
                    Text("VEXA · HP ${stateManager.match.p2.hp}", color = Color(0xFFA855F7), fontWeight = FontWeight.Bold)
                }

                // Bottom Left Diagonal Touch Joystick
                DiagonalTouchJoystick(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 22.dp, bottom = 18.dp)
                        .scale(controlScale),
                    onDirections = { l, r, u, d ->
                        pushInput(currentInput.copy(left = l, right = r, up = u, down = d))
                    }
                )

                // Bottom Right 5 Action Buttons (L / M / P / DEF / ESP)
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(end = 22.dp, bottom = 18.dp)
                        .scale(controlScale),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.Bottom
                ) {
                    ActionTouchButton("DEF", Color(0xFF94A3B8)) { down -> pushInput(currentInput.copy(block = down)) }
                    ActionTouchButton("LIG", Color(0xFF00E5FF)) { down -> pushInput(currentInput.copy(light = down)) }
                    ActionTouchButton("MED", Color(0xFF38BDF8)) { down -> pushInput(currentInput.copy(medium = down)) }
                    ActionTouchButton("PES", Color(0xFFF5B700)) { down -> pushInput(currentInput.copy(heavy = down)) }
                    ActionTouchButton("ESP", Color(0xFFA855F7)) { down -> pushInput(currentInput.copy(special = down)) }
                }

                if (showCustomHud) {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .width(340.dp)
                            .background(Color(0xEE0B101B))
                            .border(1.dp, Color(0xFF00A8FF))
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("CUSTOM HUD", color = Color(0xFF00E5FF), fontWeight = FontWeight.Bold)
                        Text("Escala HUD: ${(hudScale * 100).toInt()}%", color = Color.White, fontSize = 12.sp)
                        Slider(value = hudScale, onValueChange = { hudScale = it; settingsManager.hudScale = it }, valueRange = 0.75f..1.25f)
                        Text("Opacidade HUD: ${(hudOpacity * 100).toInt()}%", color = Color.White, fontSize = 12.sp)
                        Slider(value = hudOpacity, onValueChange = { hudOpacity = it; settingsManager.hudOpacity = it }, valueRange = 0.45f..1.0f)
                        Text("Escala Controlos: ${(controlScale * 100).toInt()}%", color = Color.White, fontSize = 12.sp)
                        Slider(value = controlScale, onValueChange = { controlScale = it; settingsManager.controlScale = it }, valueRange = 0.75f..1.35f)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = showHitboxes, onCheckedChange = { showHitboxes = it; settingsManager.showHitboxes = it })
                            Text("Hitboxes", color = Color.White, fontSize = 12.sp)
                        }
                        Button(onClick = { showCustomHud = false }, modifier = Modifier.fillMaxWidth()) { Text("FECHAR") }
                    }
                }
            }

            ScreenRoute.RESULT -> {
                val p1Won = stateManager.match.winnerSlot == 1
                Column(
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        if (p1Won) "VITÓRIA!" else "DERROTA",
                        color = if (p1Won) Color(0xFFF5B700) else Color(0xFFEF4444),
                        fontSize = 36.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Text(
                        "Placar: ${stateManager.match.p1.roundsWon} - ${stateManager.match.p2.roundsWon}",
                        color = Color.White,
                        fontSize = 16.sp
                    )
                    Spacer(Modifier.height(14.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Button(
                            onClick = { gameEngine.startMatch() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00A8FF))
                        ) {
                            Text("JOGAR NOVAMENTE", color = Color(0xFF07090D), fontWeight = FontWeight.Bold)
                        }
                        Button(onClick = { stateManager.navigate(ScreenRoute.MENU) }) {
                            Text("MENU PRINCIPAL")
                        }
                    }
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

@Composable
private fun DiagonalTouchJoystick(
    modifier: Modifier = Modifier,
    onDirections: (left: Boolean, right: Boolean, up: Boolean, down: Boolean) -> Unit
) {
    var knobOffset by remember { mutableStateOf(Offset.Zero) }
    val maxRadius = 46f

    Box(
        modifier = modifier
            .size(126.dp)
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragEnd = {
                        knobOffset = Offset.Zero
                        onDirections(false, false, false, false)
                    },
                    onDragCancel = {
                        knobOffset = Offset.Zero
                        onDirections(false, false, false, false)
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        val raw = knobOffset + dragAmount
                        val dist = hypot(raw.x, raw.y)
                        val clamped = if (dist > maxRadius) {
                            Offset(raw.x / dist * maxRadius, raw.y / dist * maxRadius)
                        } else raw
                        knobOffset = clamped
                        if (dist < 14f) {
                            onDirections(false, false, false, false)
                        } else {
                            val angle = atan2(clamped.y.toDouble(), clamped.x.toDouble())
                            val cosA = cos(angle)
                            val sinA = sin(angle)
                            onDirections(
                                cosA < -0.38,
                                cosA > 0.38,
                                sinA < -0.38,
                                sinA > 0.38
                            )
                        }
                    }
                )
            }
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val c = Offset(size.width / 2f, size.height / 2f)
            drawCircle(color = Color(0x880D1420), radius = size.minDimension / 2f, center = c)
            drawCircle(color = Color(0x6600A8FF), radius = size.minDimension / 2f, center = c, style = Stroke(2.5f))
            drawCircle(color = Color(0xCC00E5FF), radius = 22.dp.toPx(), center = c + knobOffset)
        }
    }
}

@Composable
private fun ActionTouchButton(
    label: String,
    accent: Color,
    onPressChanged: (Boolean) -> Unit
) {
    var pressed by remember { mutableStateOf(false) }
    Box(
        modifier = Modifier
            .size(54.dp)
            .background(if (pressed) accent.copy(alpha = 0.38f) else Color(0xBB101622), CircleShape)
            .border(1.5.dp, accent, CircleShape)
            .pointerInput(Unit) {
                detectTapGestures(
                    onPress = {
                        pressed = true
                        onPressChanged(true)
                        tryAwaitRelease()
                        pressed = false
                        onPressChanged(false)
                    }
                )
            },
        contentAlignment = Alignment.Center
    ) {
        Text(label, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    }
}
