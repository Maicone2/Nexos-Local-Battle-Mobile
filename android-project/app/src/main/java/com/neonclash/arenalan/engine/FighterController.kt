package com.neonclash.arenalan.engine

import com.neonclash.arenalan.state.ActionState
import com.neonclash.arenalan.state.FighterEntity
import com.neonclash.arenalan.state.FighterId
import com.neonclash.arenalan.state.InputPacket

class FighterController {
    private var prevP1 = InputPacket()
    private var prevP2 = InputPacket()

    fun updateFighter(
        fighter: FighterEntity,
        opponent: FighterEntity,
        input: InputPacket,
        infiniteEnergy: Boolean
    ) {
        val prev = if (fighter.slot == 1) prevP1 else prevP2
        val justLight = input.light && !prev.light
        val justHeavy = input.heavy && !prev.heavy
        val justSpecial = input.special && !prev.special
        val justJump = input.up && !prev.up

        if (fighter.slot == 1) prevP1 = input else prevP2 = input

        if (fighter.grounded && fighter.action in listOf(ActionState.IDLE, ActionState.WALK_FWD, ActionState.WALK_BACK, ActionState.CROUCH, ActionState.BLOCK)) {
            fighter.facing = if (opponent.x >= fighter.x) 1 else -1
        }

        if (fighter.action in listOf(ActionState.HITSTUN, ActionState.STUNNED, ActionState.VICTORY, ActionState.DEFEAT)) {
            fighter.crouching = false
            return
        }

        if (fighter.action in listOf(ActionState.LIGHT, ActionState.HEAVY, ActionState.SPECIAL)) {
            val totalFrames = when (fighter.action) {
                ActionState.LIGHT -> 18
                ActionState.HEAVY -> 34
                ActionState.SPECIAL -> 42
                else -> 18
            }
            if (fighter.hasHitCurrentAttack) {
                if (fighter.action == ActionState.LIGHT && justHeavy) {
                    startAttack(fighter, ActionState.HEAVY, infiniteEnergy)
                    return
                }
                if ((fighter.action == ActionState.LIGHT || fighter.action == ActionState.HEAVY) && justSpecial) {
                    if (infiniteEnergy || fighter.energy >= 50) {
                        startAttack(fighter, ActionState.SPECIAL, infiniteEnergy)
                        return
                    }
                }
            }
            if (fighter.action == ActionState.SPECIAL && fighter.id == FighterId.VEXA && fighter.actionFrame in 10..24) {
                fighter.vx = fighter.facing * 12.2f
            } else if (fighter.grounded) {
                fighter.vx *= 0.76f
            }
            if (fighter.actionFrame >= totalFrames) {
                fighter.action = if (fighter.grounded) ActionState.IDLE else ActionState.JUMP
                fighter.actionFrame = 0
                fighter.hasHitCurrentAttack = false
            }
            return
        }

        val holdingBack = (fighter.facing == 1 && input.left) || (fighter.facing == -1 && input.right)
        val oppAttacking = opponent.action in listOf(ActionState.LIGHT, ActionState.HEAVY, ActionState.SPECIAL)
        if (fighter.grounded && (input.block || (holdingBack && oppAttacking))) {
            fighter.action = ActionState.BLOCK
            fighter.vx = 0f
            fighter.crouching = input.down
            return
        }

        when {
            justSpecial && (infiniteEnergy || fighter.energy >= 50) -> {
                if (fighter.grounded && kotlin.math.abs(opponent.x - fighter.x) > 4f) {
                    fighter.facing = if (opponent.x >= fighter.x) 1 else -1
                }
                startAttack(fighter, ActionState.SPECIAL, infiniteEnergy)
            }
            justHeavy -> {
                if (fighter.grounded && kotlin.math.abs(opponent.x - fighter.x) > 4f) {
                    fighter.facing = if (opponent.x >= fighter.x) 1 else -1
                }
                startAttack(fighter, ActionState.HEAVY, infiniteEnergy)
            }
            justLight -> {
                if (fighter.grounded && kotlin.math.abs(opponent.x - fighter.x) > 4f) {
                    fighter.facing = if (opponent.x >= fighter.x) 1 else -1
                }
                startAttack(fighter, ActionState.LIGHT, infiniteEnergy)
            }
            justJump && fighter.grounded -> {
                fighter.vy = if (fighter.id == FighterId.VEXA) -19.6f else -18.8f
                fighter.grounded = false
                fighter.crouching = false
                fighter.action = ActionState.JUMP
                fighter.actionFrame = 0
            }
            fighter.grounded && input.down -> {
                fighter.crouching = true
                fighter.action = ActionState.CROUCH
                fighter.vx = 0f
            }
            fighter.grounded -> {
                fighter.crouching = false
                val dir = (if (input.right) 1 else 0) - (if (input.left) 1 else 0)
                val speed = if (fighter.id == FighterId.VEXA) 6.4f else 5.4f
                if (dir != 0) {
                    fighter.vx = dir * speed
                    fighter.action = if (dir == fighter.facing) ActionState.WALK_FWD else ActionState.WALK_BACK
                } else {
                    fighter.vx = 0f
                    fighter.action = ActionState.IDLE
                }
            }
        }
    }

    private fun startAttack(fighter: FighterEntity, action: ActionState, infiniteEnergy: Boolean) {
        if (action == ActionState.SPECIAL && !infiniteEnergy) {
            fighter.energy = (fighter.energy - 50).coerceAtLeast(0)
        }
        fighter.action = action
        fighter.actionFrame = 0
        fighter.hasHitCurrentAttack = false
        fighter.crouching = false
    }

    fun integratePhysics(fighter: FighterEntity) {
        fighter.x += fighter.vx
        fighter.y += fighter.vy
        if (!fighter.grounded) {
            fighter.vy += 0.92f
            if (fighter.y >= 590f) {
                fighter.y = 590f
                fighter.vy = 0f
                fighter.grounded = true
                if (fighter.action == ActionState.JUMP) {
                    fighter.action = ActionState.IDLE
                    fighter.actionFrame = 0
                }
            }
        } else if (fighter.action == ActionState.HITSTUN || fighter.action == ActionState.STUNNED) {
            fighter.vx *= 0.84f
        }
    }
}
