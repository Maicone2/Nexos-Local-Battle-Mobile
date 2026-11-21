package com.neonclash.arenalan.engine

import android.graphics.*
import android.view.SurfaceHolder
import com.neonclash.arenalan.state.GraphicsTier
import com.neonclash.arenalan.state.MatchSnapshot
import com.neonclash.arenalan.state.StageId
import kotlin.math.max

class GameRenderer {
    private val animationSystem = AnimationSystem()
    private val bgPaint = Paint()
    private val floorPaint = Paint()
    private val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(46, 0, 168, 255)
        strokeWidth = 1.5f
    }
    private val projPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 68f
        textAlign = Paint.Align.CENTER
        typeface = Typeface.DEFAULT_BOLD
    }

    fun renderFrame(holder: SurfaceHolder, state: MatchSnapshot, stage: StageId, tier: GraphicsTier) {
        val canvas: Canvas = try {
            holder.lockCanvas() ?: return
        } catch (_: Exception) {
            return
        }

        try {
            val w = canvas.width.toFloat()
            val h = canvas.height.toFloat()
            val scale = max(w / 1280f, h / 720f)
            val ox = (w - 1280f * scale) / 2f
            val oy = (h - 720f * scale) / 2f

            canvas.drawColor(Color.parseColor("#07090D"))
            canvas.save()
            canvas.translate(ox, oy)
            canvas.scale(scale, scale)

            // Sky & Backdrop
            bgPaint.color = if (stage == StageId.ORBITAL_ARENA) Color.parseColor("#0B111E") else Color.parseColor("#110E1E")
            canvas.drawRect(0f, 0f, 1280f, 566f, bgPaint)

            // 2.5D Perspective Floor
            floorPaint.color = Color.parseColor("#090D16")
            canvas.drawRect(0f, 566f, 1280f, 720f, floorPaint)
            gridPaint.color = if (stage == StageId.ORBITAL_ARENA) Color.parseColor("#00A8FF") else Color.parseColor("#A855F7")
            canvas.drawLine(0f, 566f, 1280f, 566f, gridPaint)

            if (tier != GraphicsTier.LOW) {
                gridPaint.alpha = 55
                for (i in -6..6) {
                    canvas.drawLine(640f + i * 95f, 566f, 640f + i * 210f, 720f, gridPaint)
                }
                gridPaint.alpha = 255
            }

            val timeSec = state.tick / 60f
            animationSystem.drawFighter(canvas, state.p1, timeSec, tier == GraphicsTier.HIGH)
            animationSystem.drawFighter(canvas, state.p2, timeSec, tier == GraphicsTier.HIGH)

            // Projectiles (Pulso Solar)
            for (proj in state.projectiles) {
                projPaint.color = Color.parseColor("#00E5FF")
                canvas.drawCircle(proj.x, proj.y, proj.radius, projPaint)
                projPaint.color = Color.parseColor("#F5B700")
                canvas.drawCircle(proj.x, proj.y, proj.radius * 0.55f, projPaint)
            }

            if (state.phase == "INTRO") {
                val label = if (state.phaseTimer > 20) "RONDA ${state.roundNumber}" else "LUTEM!"
                canvas.drawText(label, 640f, 320f, textPaint)
            } else if (state.phase == "KO") {
                canvas.drawText("K.O.!", 640f, 320f, textPaint)
            }

            canvas.restore()
        } finally {
            holder.unlockCanvasAndPost(canvas)
        }
    }
}
