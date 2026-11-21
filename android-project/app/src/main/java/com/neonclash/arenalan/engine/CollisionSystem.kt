package com.neonclash.arenalan.engine

import android.graphics.RectF
import com.neonclash.arenalan.state.ActionState
import com.neonclash.arenalan.state.FighterEntity
import com.neonclash.arenalan.state.FighterId
import com.neonclash.arenalan.state.ProjectileEntity
import kotlin.math.abs

object CollisionSystem {
    const val STAGE_LEFT = 86f
    const val STAGE_RIGHT = 1194f

    fun getHurtbox(f: FighterEntity, out: RectF) {
        val width = if (f.id == FighterId.KAEL) 74f else 68f
        val height = if (f.crouching) 110f else 172f
        out.set(f.x - width / 2f, f.y - height, f.x + width / 2f, f.y)
    }

    fun getActiveHitbox(f: FighterEntity, out: RectF): Boolean {
        val (start, active, w, h, ox, oy) = when (f.action) {
            ActionState.LIGHT -> listOf(5, 4, 84, 38, 32, -126)
            ActionState.HEAVY -> listOf(10, 6, 108, 54, 38, -134)
            ActionState.SPECIAL -> listOf(11, 10, 118, 86, 30, -138)
            else -> return false
        }
        if (f.actionFrame < start || f.actionFrame >= start + active) return false

        val left = if (f.facing == 1) f.x + ox else f.x - ox - w
        out.set(left, f.y + oy, left + w, f.y + oy + h)
        return true
    }

    fun getProjectileBox(p: ProjectileEntity, out: RectF) {
        out.set(p.x - p.radius, p.y - p.radius, p.x + p.radius, p.y + p.radius)
    }

    fun resolvePushboxes(p1: FighterEntity, p2: FighterEntity) {
        val minDist = 64f
        if (abs(p1.y - p2.y) < 120f) {
            val dx = p2.x - p1.x
            val absDx = abs(dx)
            if (absDx < minDist) {
                val overlap = (minDist - absDx) * 0.5f
                val dir = if (dx >= 0f) 1f else -1f
                p1.x -= dir * overlap
                p2.x += dir * overlap
            }
        }
        p1.x = p1.x.coerceIn(STAGE_LEFT + 28f, STAGE_RIGHT - 28f)
        p2.x = p2.x.coerceIn(STAGE_LEFT + 28f, STAGE_RIGHT - 28f)
    }
}
