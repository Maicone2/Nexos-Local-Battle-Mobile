package com.neonclash.arenalan.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import com.neonclash.arenalan.state.SettingsManager
import kotlin.concurrent.thread
import kotlin.math.sin

class AudioManager(private val settings: SettingsManager) {
    private val sampleRate = 22050

    fun playHit(heavy: Boolean) = playSynth(if (heavy) 110.0 else 180.0, if (heavy) 150 else 85)
    fun playBlock() = playSynth(760.0, 75)
    fun playSpecial() = playSynth(420.0, 210)
    fun playKo() = playSynth(68.0, 340)

    private fun playSynth(freq: Double, durationMs: Int) {
        if (settings.muted) return
        thread(isDaemon = true) {
            try {
                val count = (sampleRate * durationMs) / 1000
                val samples = ShortArray(count)
                for (i in 0 until count) {
                    val env = 1.0 - (i.toDouble() / count)
                    val angle = 2.0 * Math.PI * i * freq / sampleRate
                    samples[i] = (sin(angle) * env * 12000).toInt().toShort()
                }
                val track = AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_GAME)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(sampleRate)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build()
                    )
                    .setBufferSizeInBytes(samples.size * 2)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()
                track.write(samples, 0, samples.size)
                track.play()
                Thread.sleep(durationMs.toLong() + 20)
                track.release()
            } catch (_: Exception) { }
        }
    }

    fun release() {}
}
