package com.neonclash.arenalan.network

import com.neonclash.arenalan.state.InputPacket
import com.neonclash.arenalan.state.MatchSnapshot
import kotlinx.coroutines.*
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.*

class LanHost(
    private val tcpPort: Int = 5150,
    private val udpPort: Int = 5151,
    private val onClientConnected: (String) -> Unit,
    private val onRemoteInput: (InputPacket) -> Unit,
    private val onDisconnected: () -> Unit
) {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var tcpServer: ServerSocket? = null
    private var clientSocket: Socket? = null
    private var clientWriter: PrintWriter? = null
    private var udpSocket: DatagramSocket? = null
    private var clientAddress: InetAddress? = null
    private var clientUdpPort: Int = udpPort
    private var seq = 0

    fun start(hostIp: String) {
        scope.launch {
            try {
                tcpServer = ServerSocket(tcpPort)
                udpSocket = DatagramSocket(udpPort)
                launchDiscoveryResponder(hostIp)
                launchUdpReceiver()

                val socket = tcpServer!!.accept()
                clientSocket = socket
                clientAddress = socket.inetAddress
                clientWriter = PrintWriter(socket.getOutputStream(), true)
                onClientConnected(socket.inetAddress.hostAddress ?: "Cliente")

                val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
                while (isActive) {
                    val line = reader.readLine() ?: break
                    if (line.startsWith("PING:")) {
                        clientWriter?.println("PONG:${line.removePrefix("PING:")}")
                    }
                }
            } catch (_: Exception) {
                onDisconnected()
            }
        }
    }

    private fun CoroutineScope.launchDiscoveryResponder(hostIp: String) = launch {
        try {
            val discSocket = DatagramSocket(5152)
            val buf = ByteArray(256)
            while (isActive) {
                val pkt = DatagramPacket(buf, buf.size)
                discSocket.receive(pkt)
                val msg = String(pkt.data, 0, pkt.length)
                if (msg == "NEON_CLASH_DISCOVER") {
                    val reply = "NEON_CLASH_ROOM:$hostIp:$tcpPort".toByteArray()
                    discSocket.send(DatagramPacket(reply, reply.size, pkt.address, pkt.port))
                }
            }
        } catch (_: Exception) { }
    }

    private fun CoroutineScope.launchUdpReceiver() = launch {
        val buf = ByteArray(512)
        while (isActive) {
            try {
                val pkt = DatagramPacket(buf, buf.size)
                udpSocket?.receive(pkt)
                clientAddress = pkt.address
                clientUdpPort = pkt.port
                val payload = String(pkt.data, 0, pkt.length)
                val parts = payload.split("|")
                if (parts.size >= 9) {
                    onRemoteInput(
                        InputPacket(
                            left = parts[1] == "1",
                            right = parts[2] == "1",
                            up = parts[3] == "1",
                            down = parts[4] == "1",
                            light = parts[5] == "1",
                            heavy = parts[6] == "1",
                            special = parts[7] == "1",
                            block = parts[8] == "1"
                        )
                    )
                }
            } catch (_: Exception) { break }
        }
    }

    fun sendTcpEvent(event: String) {
        scope.launch { clientWriter?.println(event) }
    }

    fun broadcastStateUdp(state: MatchSnapshot) {
        val addr = clientAddress ?: return
        seq++
        val msg = "$seq|${state.tick}|${state.timerSeconds}|${state.p1.x}|${state.p1.y}|${state.p1.hp}|${state.p2.x}|${state.p2.y}|${state.p2.hp}"
        val bytes = msg.toByteArray()
        scope.launch {
            try {
                udpSocket?.send(DatagramPacket(bytes, bytes.size, addr, clientUdpPort))
            } catch (_: Exception) { }
        }
    }

    fun stop() {
        scope.cancel()
        try { tcpServer?.close() } catch (_: Exception) {}
        try { clientSocket?.close() } catch (_: Exception) {}
        try { udpSocket?.close() } catch (_: Exception) {}
    }
}
