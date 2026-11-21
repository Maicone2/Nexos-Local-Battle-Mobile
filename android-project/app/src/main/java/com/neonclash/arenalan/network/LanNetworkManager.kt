package com.neonclash.arenalan.network

import android.content.Context
import com.neonclash.arenalan.state.*
import kotlinx.coroutines.*
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.Inet4Address
import java.net.InetAddress
import java.net.NetworkInterface

class LanNetworkManager(
    @Suppress("UNUSED_PARAMETER") private val context: Context,
    private val stateManager: GameStateManager
) {
    var isHost: Boolean = false
        private set

    private var host: LanHost? = null
    private var client: LanClient? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun getLocalIpv4Address(): String {
        return try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val nif = interfaces.nextElement()
                val addrs = nif.inetAddresses
                while (addrs.hasMoreElements()) {
                    val addr = addrs.nextElement()
                    if (!addr.isLoopbackAddress && addr is Inet4Address) {
                        return addr.hostAddress ?: "192.168.1.1"
                    }
                }
            }
            "127.0.0.1"
        } catch (_: Exception) {
            "127.0.0.1"
        }
    }

    fun startHost(port: Int = 5150, onRemoteInput: (InputPacket) -> Unit = {}) {
        shutdown()
        isHost = true
        val ip = getLocalIpv4Address()
        stateManager.updateLanStatus("A aguardar jogador...", ip)
        host = LanHost(
            tcpPort = port,
            onClientConnected = { clientIp ->
                stateManager.updateLanStatus("Ligado a $clientIp", ip)
                stateManager.navigate(ScreenRoute.LOBBY)
            },
            onRemoteInput = onRemoteInput,
            onDisconnected = { stateManager.updateLanStatus("Desconectado", ip) }
        ).also { it.start(ip) }
    }

    fun joinHost(ip: String, port: Int = 5150) {
        shutdown()
        isHost = false
        stateManager.updateLanStatus("A ligar a $ip:$port...", ip)
        client = LanClient(
            onConnected = {
                stateManager.updateLanStatus("Ligado ao anfitrião", ip)
                stateManager.navigate(ScreenRoute.LOBBY)
            },
            onStateReceived = { snap ->
                stateManager.match.tick = snap.tick
                stateManager.match.timerSeconds = snap.timerSeconds
                stateManager.match.p1.x = snap.p1.x
                stateManager.match.p1.hp = snap.p1.hp
                stateManager.match.p2.x = snap.p2.x
                stateManager.match.p2.hp = snap.p2.hp
            },
            onLatencyMeasured = { ms -> stateManager.updateLatency(ms) },
            onError = { err -> stateManager.updateLanStatus("Erro: $err", ip) }
        ).also { it.connect(ip, port) }
    }

    fun discoverLanRooms(onFound: (String) -> Unit) {
        scope.launch {
            try {
                val sock = DatagramSocket().apply { broadcast = true; soTimeout = 1200 }
                val req = "NEON_CLASH_DISCOVER".toByteArray()
                sock.send(DatagramPacket(req, req.size, InetAddress.getByName("255.255.255.255"), 5152))
                val buf = ByteArray(256)
                val pkt = DatagramPacket(buf, buf.size)
                sock.receive(pkt)
                onFound(String(pkt.data, 0, pkt.length))
                sock.close()
            } catch (_: Exception) { }
        }
    }

    fun sendInput(input: InputPacket) {
        if (!isHost) client?.sendInputUdp(input)
    }

    fun broadcastMatchState(state: MatchSnapshot) {
        if (isHost) host?.broadcastStateUdp(state)
    }

    fun shutdown() {
        host?.stop()
        host = null
        client?.disconnect()
        client = null
    }
}
