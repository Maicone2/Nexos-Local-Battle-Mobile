package com.neonclash.arenalan.engine

import android.graphics.*
import com.neonclash.arenalan.state.ActionState
import com.neonclash.arenalan.state.FighterEntity
import com.neonclash.arenalan.state.FighterId
import kotlin.math.cos
import kotlin.math.sin

class AnimationSystem {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG)

    fun drawFighter(canvas: Canvas, f: FighterEntity, timeSec: Float, highFx: Boolean) {
        val isKael = f.id == FighterId.KAEL
        val primary = if (isKael) Color.parseColor("#00E5FF") else Color.parseColor("#A855F7")
        val secondary = if (isKael) Color.parseColor("#F5B700") else Color.parseColor("#38BDF8")

        // Ground elliptical shadow
        val height = (590f - f.y).coerceAtLeast(0f)
        val scale = (1f - height / 340f).coerceAtLeast(0.45f)
        shadowPaint.color = Color.argb(145, 0, 0, 0)
        canvas.drawOval(
            f.x - 55f * scale,
            584f,
            f.x + 55f * scale,
            604f,
            shadowPaint
        )

        canvas.save()
        canvas.translate(f.x, f.y)
        canvas.scale(f.facing.toFloat(), 1f)

        val breath = sin(timeSec * 4.2f + f.slot) * 3f
        val crouchDrop = if (f.action == ActionState.CROUCH) 52f else if (f.action == ActionState.DEFEAT) 110f else 0f
        val lean = when (f.action) {
            ActionState.LIGHT, ActionState.HEAVY, ActionState.SPECIAL -> 0.25f
            ActionState.HITSTUN -> -0.35f
            else -> 0.06f
        }

        // Torso
        paint.style = Paint.Style.FILL
        paint.color = if (f.hitFlashFrames > 0) Color.WHITE else Color.parseColor("#141B29")
        val hipY = -74f + crouchDrop + breath
        canvas.save()
        canvas.translate(0f, hipY)
        canvas.rotate(Math.toDegrees(lean.toDouble()).toFloat())
        canvas.drawRoundRect(-20f, -54f, 20f, 4f, 8f, 8f, paint)

        // Chest emblem
        paint.color = primary
        canvas.drawCircle(4f, -34f, 6f, paint)

        // Head
        paint.color = Color.parseColor("#E6B89C")
        canvas.drawCircle(2f, -74f, 14f, paint)
        paint.color = Color.parseColor("#0B0E17")
        canvas.drawArc(-14f, -90f, 18f, -66f, 180f, 180f, true, paint)
        paint.color = primary
        canvas.drawRect(4f, -78f, 14f, -74f, paint)
        canvas.restore()

        // Back & Front Arms + Attack Strike
        val activeStrike = f.action in listOf(ActionState.LIGHT, ActionState.HEAVY, ActionState.SPECIAL) && f.actionFrame in 5..20
        val punchExtend = when {
            activeStrike && f.action == ActionState.SPECIAL -> 62f
            activeStrike -> 54f
            else -> 22f
        }
        paint.color = secondary
        paint.strokeWidth = 11f
        paint.strokeCap = Paint.Cap.ROUND
        if (f.action == ActionState.HEAVY && !isKael && activeStrike) {
            // Vexa agile forward high kick (+X)
            canvas.drawLine(8f, hipY - 40f, 30f, hipY - 24f, paint)
            paint.color = Color.parseColor("#1D2538")
            paint.strokeWidth = 14f
            canvas.drawLine(-10f, hipY, -16f, 0f, paint)
            paint.color = primary
            canvas.drawLine(8f, hipY, 72f, hipY - 38f, paint)
            canvas.drawCircle(74f, hipY - 38f, 9f, paint)
        } else {
            canvas.drawLine(8f, hipY - 40f, 12f + punchExtend, hipY - 38f, paint)
            canvas.drawCircle(14f + punchExtend, hipY - 38f, 9f, paint)
            if (activeStrike && f.action == ActionState.SPECIAL && isKael) {
                canvas.drawLine(4f, hipY - 32f, 10f + punchExtend, hipY - 30f, paint)
                canvas.drawCircle(12f + punchExtend, hipY - 30f, 8f, paint)
            }

            // Legs
            val stride = if (f.action == ActionState.WALK_FWD || f.action == ActionState.WALK_BACK) sin(f.x * 0.06f) * 22f else 0f
            paint.color = Color.parseColor("#1D2538")
            paint.strokeWidth = 14f
            canvas.drawLine(-10f, hipY, -16f - stride, 0f, paint)
            canvas.drawLine(10f, hipY, 16f + stride, 0f, paint)
        }

        if (highFx && f.action == ActionState.BLOCK) {
            paint.style = Paint.Style.STROKE
            paint.color = Color.parseColor("#00A8FF")
            paint.strokeWidth = 4f
            canvas.drawArc(-10f, -150f, 68f, -20f, -70f, 140f, false, paint)
        }

        canvas.restore()
    }
}
