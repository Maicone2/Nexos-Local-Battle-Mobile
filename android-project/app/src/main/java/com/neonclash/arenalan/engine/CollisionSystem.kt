package com.neonclash.arenalan.engine

import android.graphics.RectF
import com.neonclash.arenalan.state.ActionState
import com.neonclash.arenalan.state.FighterEntity
import com.neonclash.arenalan.state.FighterId
import com.neonclash.arenalan.state.MoveId
import com.neonclash.arenalan.state.ProjectileEntity
import kotlin.math.abs

data class HitboxSpec(
    val start: Int,
    val active: Int,
    val w: Float,
    val h: Float,
    val ox: Float,
    val oy: Float
)

object CollisionSystem {
    const val STAGE_LEFT = 86f
    const val STAGE_RIGHT = 1194f

    fun isAttackAction(action: ActionState): Boolean =
        action in listOf(ActionState.LIGHT, ActionState.MEDIUM, ActionState.HEAVY, ActionState.SPECIAL, ActionState.ULTIMATE)

    fun getHurtbox(f: FighterEntity, out: RectF) {
        val width = if (f.id == FighterId.KAEL) 74f else 68f
        val height = when {
            f.action == ActionState.KNOCKDOWN -> 52f
            f.crouching -> 110f
            else -> 172f
        }
        out.set(f.x - width / 2f, f.y - height, f.x + width / 2f, f.y)
    }

    fun getActiveHitbox(f: FighterEntity, out: RectF): Boolean {
        val spec = when (f.currentMove) {
            MoveId.STAND_LIGHT -> HitboxSpec(4, 4, 86f, 38f, 30f, -128f)
            MoveId.STAND_MEDIUM -> HitboxSpec(7, 5, 104f, 44f, 36f, -126f)
            MoveId.STAND_HEAVY -> HitboxSpec(10, 6, 112f, 56f, 40f, -136f)
            MoveId.CROUCH_SWEEP -> HitboxSpec(7, 6, 118f, 36f, 28f, -36f)
            MoveId.CROUCH_UPPERCUT -> HitboxSpec(7, 6, 92f, 118f, 28f, -168f)
            MoveId.AIR_LIGHT -> HitboxSpec(4, 7, 88f, 54f, 26f, -96f)
            MoveId.AIR_MEDIUM -> HitboxSpec(6, 7, 96f, 58f, 28f, -92f)
            MoveId.AIR_HEAVY -> HitboxSpec(8, 8, 108f, 60f, 30f, -88f)
            MoveId.SPECIAL_PRIMARY -> HitboxSpec(10, 12, 122f, 92f, 26f, -142f)
            MoveId.ULTIMATE_BURST -> HitboxSpec(13, 16, 240f, 150f, 20f, -165f)
            null -> when (f.action) {
                ActionState.LIGHT -> HitboxSpec(4, 4, 86f, 38f, 30f, -128f)
                ActionState.MEDIUM -> HitboxSpec(7, 5, 104f, 44f, 36f, -126f)
                ActionState.HEAVY -> HitboxSpec(10, 6, 112f, 56f, 40f, -136f)
                ActionState.SPECIAL -> HitboxSpec(10, 12, 122f, 92f, 26f, -142f)
                ActionState.ULTIMATE -> HitboxSpec(13, 16, 240f, 150f, 20f, -165f)
                else -> return false
            }
        }
        if (f.actionFrame < spec.start || f.actionFrame >= spec.start + spec.active) return false

        val left = if (f.facing == 1) f.x + spec.ox else f.x - spec.ox - spec.w
        out.set(left, f.y + spec.oy, left + spec.w, f.y + spec.oy + spec.h)
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
