package com.neonclash.arenalan.engine

class GameLoop(
    private val onTick: () -> Unit,
    private val onRender: () -> Unit
) : Runnable {

    @Volatile
    private var running = false
    private var thread: Thread? = null

    fun start() {
        if (running) return
        running = true
        thread = Thread(this, "NeonClash-60HzLoop").apply { start() }
    }

    fun stop() {
        running = false
        thread?.join(500)
        thread = null
    }

    override fun run() {
        val targetNs = 1_000_000_000L / 60L
        var lastTime = System.nanoTime()
        var accumulator = 0L

        while (running) {
            val now = System.nanoTime()
            val delta = (now - lastTime).coerceAtMost(50_000_000L)
            lastTime = now
            accumulator += delta

            while (accumulator >= targetNs) {
                onTick()
                accumulator -= targetNs
            }

            onRender()

            val frameTime = System.nanoTime() - now
            val sleepMs = (targetNs - frameTime) / 1_000_000L
            if (sleepMs > 1L) {
                try {
                    Thread.sleep(sleepMs)
                } catch (_: InterruptedException) {
                    break
                }
            }
        }
    }
}
