package com.neonclash.arenalan.network

import com.neonclash.arenalan.state.InputPacket
import com.neonclash.arenalan.state.MatchSnapshot
import kotlinx.coroutines.*
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.*

class LanClient(
    private val onConnected: () -> Unit,
    private val onStateReceived: (MatchSnapshot) -> Unit,
    private val onLatencyMeasured: (Int) -> Unit,
    private val onError: (String) -> Unit
) {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var tcpSocket: Socket? = null
    private var writer: PrintWriter? = null
    private var udpSocket: DatagramSocket? = null
    private var hostAddr: InetAddress? = null
    private var hostUdpPort = 5151
    private var seq = 0

    fun connect(ip: String, tcpPort: Int = 5150) {
        scope.launch {
            try {
                val addr = InetAddress.getByName(ip)
                hostAddr = addr
                val socket = Socket()
                socket.connect(InetSocketAddress(addr, tcpPort), 4000)
                tcpSocket = socket
                writer = PrintWriter(socket.getOutputStream(), true)
                udpSocket = DatagramSocket()
                onConnected()

                launchUdpStateListener()
                launchPingLoop()

                val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
                while (isActive) {
                    val line = reader.readLine() ?: break
                    if (line.startsWith("PONG:")) {
                        val sent = line.removePrefix("PONG:").toLongOrNull() ?: continue
                        val rtt = (System.currentTimeMillis() - sent).toInt().coerceAtLeast(1)
                        onLatencyMeasured(rtt)
                    }
                }
            } catch (e: Exception) {
                onError(e.message ?: "Falha na ligação TCP")
            }
        }
    }

    private fun CoroutineScope.launchPingLoop() = launch {
        while (isActive) {
            writer?.println("PING:${System.currentTimeMillis()}")
            delay(1500)
        }
    }

    private fun CoroutineScope.launchUdpStateListener() = launch {
        val buf = ByteArray(1024)
        var lastSeq = -1
        while (isActive) {
            try {
                val pkt = DatagramPacket(buf, buf.size)
                udpSocket?.receive(pkt)
                val parts = String(pkt.data, 0, pkt.length).split("|")
                val pktSeq = parts.getOrNull(0)?.toIntOrNull() ?: continue
                if (pktSeq <= lastSeq) continue
                lastSeq = pktSeq
                if (parts.size >= 9) {
                    val snap = MatchSnapshot(
                        tick = parts[1].toInt(),
                        timerSeconds = parts[2].toInt()
                    )
                    snap.p1.x = parts[3].toFloat()
                    snap.p1.y = parts[4].toFloat()
                    snap.p1.hp = parts[5].toInt()
                    snap.p2.x = parts[6].toFloat()
                    snap.p2.y = parts[7].toFloat()
                    snap.p2.hp = parts[8].toInt()
                    onStateReceived(snap)
                }
            } catch (_: Exception) { break }
        }
    }

    fun sendInputUdp(input: InputPacket) {
        val addr = hostAddr ?: return
        seq++
        val payload = "$seq|${b(input.left)}|${b(input.right)}|${b(input.up)}|${b(input.down)}|${b(input.light)}|${b(input.heavy)}|${b(input.special)}|${b(input.block)}"
        val bytes = payload.toByteArray()
        scope.launch {
            try {
                udpSocket?.send(DatagramPacket(bytes, bytes.size, addr, hostUdpPort))
            } catch (_: Exception) { }
        }
    }

    private fun b(v: Boolean) = if (v) "1" else "0"

    fun disconnect() {
        scope.cancel()
        try { tcpSocket?.close() } catch (_: Exception) {}
        try { udpSocket?.close() } catch (_: Exception) {}
    }
}
