package com.neonclash.arenalan.engine

import com.neonclash.arenalan.state.ActionState
import com.neonclash.arenalan.state.FighterEntity
import com.neonclash.arenalan.state.FighterId
import com.neonclash.arenalan.state.InputPacket
import com.neonclash.arenalan.state.MoveId
import kotlin.math.abs

class FighterController {
    private var prevP1 = InputPacket()
    private var prevP2 = InputPacket()
    private var lastTapLeftTickP1 = -100
    private var lastTapRightTickP1 = -100
    private var lastTapLeftTickP2 = -100
    private var lastTapRightTickP2 = -100
    private var tickCounter = 0

    private fun moveToward(cur: Float, target: Float, step: Float): Float {
        return when {
            cur < target -> minOf(cur + step, target)
            cur > target -> maxOf(cur - step, target)
            else -> target
        }
    }

    fun updateFighter(
        fighter: FighterEntity,
        opponent: FighterEntity,
        input: InputPacket,
        infiniteEnergy: Boolean
    ) {
        tickCounter++
        val prev = if (fighter.slot == 1) prevP1 else prevP2
        val justLight = input.light && !prev.light
        val justMedium = input.medium && !prev.medium
        val justHeavy = input.heavy && !prev.heavy
        val justSpecial = input.special && !prev.special
        val justJump = input.up && !prev.up
        val justLeft = input.left && !prev.left
        val justRight = input.right && !prev.right

        if (fighter.slot == 1) prevP1 = input else prevP2 = input

        if (fighter.grounded && fighter.action in listOf(
                ActionState.IDLE, ActionState.WALK_FWD, ActionState.WALK_BACK,
                ActionState.CROUCH, ActionState.CROUCH_WALK, ActionState.BLOCK
            )
        ) {
            fighter.facing = if (opponent.x >= fighter.x) 1 else -1
        }

        if (fighter.action in listOf(
                ActionState.HITSTUN, ActionState.STUNNED, ActionState.GUARD_BREAK,
                ActionState.KNOCKDOWN, ActionState.VICTORY, ActionState.DEFEAT
            )
        ) {
            fighter.crouching = false
            return
        }

        if (fighter.action == ActionState.LANDING) {
            fighter.vx = moveToward(fighter.vx, 0f, 1.4f)
            if (fighter.actionFrame >= 4) {
                fighter.action = ActionState.IDLE
                fighter.actionFrame = 0
            }
            return
        }

        if (fighter.action in listOf(ActionState.DASH_FWD, ActionState.DASH_BACK)) {
            if (fighter.actionFrame >= 12) {
                fighter.action = ActionState.IDLE
                fighter.actionFrame = 0
                fighter.vx = 0f
            }
            return
        }

        if (CollisionSystem.isAttackAction(fighter.action)) {
            val totalFrames = when (fighter.currentMove) {
                MoveId.STAND_LIGHT, MoveId.AIR_LIGHT -> 16
                MoveId.STAND_MEDIUM, MoveId.AIR_MEDIUM -> 23
                MoveId.CROUCH_SWEEP -> 29
                MoveId.CROUCH_UPPERCUT -> 31
                MoveId.STAND_HEAVY, MoveId.AIR_HEAVY -> 33
                MoveId.SPECIAL_PRIMARY -> 40
                MoveId.ULTIMATE_BURST -> 54
                null -> 22
            }

            if (fighter.hasHitCurrentAttack) {
                if (fighter.currentMove == MoveId.CROUCH_UPPERCUT && justJump && fighter.grounded) {
                    launchJump(fighter, input, isDouble = false)
                    return
                }
                if (fighter.action == ActionState.LIGHT && justMedium) {
                    startMove(fighter, opponent, if (!fighter.grounded) MoveId.AIR_MEDIUM else if (input.down) MoveId.CROUCH_SWEEP else MoveId.STAND_MEDIUM, infiniteEnergy)
                    return
                }
                if ((fighter.action == ActionState.LIGHT || fighter.action == ActionState.MEDIUM) && justHeavy) {
                    startMove(fighter, opponent, if (!fighter.grounded) MoveId.AIR_HEAVY else if (input.down) MoveId.CROUCH_UPPERCUT else MoveId.STAND_HEAVY, infiniteEnergy)
                    return
                }
                if (fighter.grounded && fighter.action in listOf(ActionState.LIGHT, ActionState.MEDIUM, ActionState.HEAVY) && justSpecial) {
                    if (infiniteEnergy || fighter.energy >= 50) {
                        val move = if (input.down && (infiniteEnergy || fighter.energy >= 100)) MoveId.ULTIMATE_BURST else MoveId.SPECIAL_PRIMARY
                        startMove(fighter, opponent, move, infiniteEnergy)
                        return
                    }
                }
            }

            if (fighter.currentMove == MoveId.SPECIAL_PRIMARY && fighter.id == FighterId.VEXA && fighter.actionFrame in 9..23) {
                fighter.vx = fighter.facing * 12.2f
            } else if (fighter.grounded) {
                fighter.vx *= 0.76f
            }

            if (fighter.actionFrame >= totalFrames) {
                fighter.action = if (fighter.grounded) ActionState.IDLE else ActionState.JUMP
                fighter.currentMove = null
                fighter.actionFrame = 0
                fighter.hasHitCurrentAttack = false
            }
            return
        }

        // Guard (Standing, Crouching, Air)
        val holdingBack = (fighter.facing == 1 && input.left) || (fighter.facing == -1 && input.right)
        val oppAttacking = CollisionSystem.isAttackAction(opponent.action)
        if (input.block || (fighter.grounded && holdingBack && oppAttacking)) {
            fighter.action = ActionState.BLOCK
            fighter.blockFrames++
            fighter.vx = if (fighter.grounded) moveToward(fighter.vx, 0f, 1.5f) else fighter.vx
            fighter.crouching = fighter.grounded && input.down
            return
        } else {
            fighter.blockFrames = 0
        }

        // Attacks (Ground + Air + Exact HP% Rasteira/Uppercut/Voadora)
        val holdingBackDiag = input.down && holdingBack
        when {
            justSpecial && fighter.grounded && (infiniteEnergy || fighter.energy >= 50) -> {
                val move = if (input.down && (infiniteEnergy || fighter.energy >= 100)) MoveId.ULTIMATE_BURST else MoveId.SPECIAL_PRIMARY
                startMove(fighter, opponent, move, infiniteEnergy)
                return
            }
            justHeavy -> {
                val move = when {
                    !fighter.grounded -> MoveId.AIR_HEAVY
                    holdingBackDiag -> MoveId.CROUCH_SWEEP
                    input.down -> MoveId.CROUCH_UPPERCUT
                    else -> MoveId.STAND_HEAVY
                }
                startMove(fighter, opponent, move, infiniteEnergy)
                return
            }
            justMedium -> {
                val move = when {
                    !fighter.grounded -> MoveId.AIR_MEDIUM
                    input.down -> MoveId.CROUCH_SWEEP
                    else -> MoveId.STAND_MEDIUM
                }
                startMove(fighter, opponent, move, infiniteEnergy)
                return
            }
            justLight -> {
                val move = when {
                    !fighter.grounded -> MoveId.AIR_LIGHT
                    input.down -> MoveId.CROUCH_UPPERCUT
                    else -> MoveId.STAND_LIGHT
                }
                startMove(fighter, opponent, move, infiniteEnergy)
                return
            }
        }

        // Jump & Double Jump (Vexa)
        if (justJump && fighter.grounded) {
            launchJump(fighter, input, isDouble = false)
            return
        }
        if (justJump && !fighter.grounded && fighter.id == FighterId.VEXA && fighter.airJumpsLeft > 0) {
            fighter.airJumpsLeft--
            launchJump(fighter, input, isDouble = true)
            return
        }

        // Double-tap Dash
        if (fighter.grounded && !input.down) {
            val tapWindow = 16
            if (justRight) {
                val last = if (fighter.slot == 1) lastTapRightTickP1 else lastTapRightTickP2
                if (tickCounter - last <= tapWindow) {
                    fighter.action = if (fighter.facing == 1) ActionState.DASH_FWD else ActionState.DASH_BACK
                    fighter.actionFrame = 0
                    fighter.vx = (if (fighter.facing == 1) 1 else -1) * (if (fighter.id == FighterId.VEXA) 15.2f else 13.4f)
                    return
                }
                if (fighter.slot == 1) lastTapRightTickP1 = tickCounter else lastTapRightTickP2 = tickCounter
            }
            if (justLeft) {
                val last = if (fighter.slot == 1) lastTapLeftTickP1 else lastTapLeftTickP2
                if (tickCounter - last <= tapWindow) {
                    fighter.action = if (fighter.facing == -1) ActionState.DASH_FWD else ActionState.DASH_BACK
                    fighter.actionFrame = 0
                    fighter.vx = (if (fighter.facing == -1) -1 else 1) * (if (fighter.id == FighterId.VEXA) 15.2f else 13.4f)
                    return
                }
                if (fighter.slot == 1) lastTapLeftTickP1 = tickCounter else lastTapLeftTickP2 = tickCounter
            }
        }

        // Crouch & Diagonal Crouch Walk
        val dir = (if (input.right) 1 else 0) - (if (input.left) 1 else 0)
        if (fighter.grounded && input.down) {
            fighter.crouching = true
            val crouchSpeed = if (fighter.id == FighterId.VEXA) 3.2f else 2.5f
            if (dir != 0) {
                fighter.vx = moveToward(fighter.vx, dir * crouchSpeed, 0.8f)
                fighter.action = ActionState.CROUCH_WALK
            } else {
                fighter.vx = moveToward(fighter.vx, 0f, 1.1f)
                fighter.action = ActionState.CROUCH
            }
            return
        }

        // Standing acceleration/deceleration or Air Control
        if (fighter.grounded) {
            fighter.crouching = false
            val maxSpeed = if (dir == fighter.facing) {
                if (fighter.id == FighterId.VEXA) 6.4f else 5.4f
            } else {
                if (fighter.id == FighterId.VEXA) 5.2f else 4.3f
            }
            if (dir != 0) {
                fighter.vx = moveToward(fighter.vx, dir * maxSpeed, 1.0f)
                fighter.action = if (dir == fighter.facing) ActionState.WALK_FWD else ActionState.WALK_BACK
            } else {
                fighter.vx = moveToward(fighter.vx, 0f, 1.2f)
                if (abs(fighter.vx) < 0.25f) {
                    fighter.vx = 0f
                    fighter.action = ActionState.IDLE
                }
            }
        } else if (dir != 0) {
            val airAccel = if (fighter.id == FighterId.VEXA) 0.56f else 0.42f
            val airMax = if (fighter.id == FighterId.VEXA) 7.2f else 6.0f
            fighter.vx = moveToward(fighter.vx, dir * airMax, airAccel)
        }
    }

    private fun launchJump(fighter: FighterEntity, input: InputPacket, isDouble: Boolean) {
        val dir = (if (input.right) 1 else 0) - (if (input.left) 1 else 0)
        fighter.vy = if (fighter.id == FighterId.VEXA) -19.4f else -18.8f
        if (isDouble) fighter.vy *= 0.86f
        fighter.vx = dir * (if (fighter.id == FighterId.VEXA) 6.4f else 5.4f)
        fighter.grounded = false
        fighter.crouching = false
        fighter.currentMove = null
        fighter.action = if (isDouble) ActionState.DOUBLE_JUMP else ActionState.JUMP
        fighter.actionFrame = 0
    }

    private fun startMove(fighter: FighterEntity, opponent: FighterEntity, move: MoveId, infiniteEnergy: Boolean) {
        if (fighter.grounded && abs(opponent.x - fighter.x) > 4f) {
            fighter.facing = if (opponent.x >= fighter.x) 1 else -1
        }
        val cost = when (move) {
            MoveId.ULTIMATE_BURST -> 100
            MoveId.SPECIAL_PRIMARY -> 50
            else -> 0
        }
        if (cost > 0 && !infiniteEnergy) {
            fighter.energy = (fighter.energy - cost).coerceAtLeast(0)
        }
        fighter.currentMove = move
        fighter.action = when (move) {
            MoveId.STAND_LIGHT, MoveId.AIR_LIGHT -> ActionState.LIGHT
            MoveId.STAND_MEDIUM, MoveId.CROUCH_SWEEP, MoveId.AIR_MEDIUM -> ActionState.MEDIUM
            MoveId.STAND_HEAVY, MoveId.CROUCH_UPPERCUT, MoveId.AIR_HEAVY -> ActionState.HEAVY
            MoveId.SPECIAL_PRIMARY -> ActionState.SPECIAL
            MoveId.ULTIMATE_BURST -> ActionState.ULTIMATE
        }
        fighter.actionFrame = 0
        fighter.hasHitCurrentAttack = false
        fighter.crouching = move == MoveId.CROUCH_SWEEP || move == MoveId.CROUCH_UPPERCUT
    }

    fun integratePhysics(fighter: FighterEntity) {
        fighter.x += fighter.vx
        fighter.y += fighter.vy
        if (!fighter.grounded) {
            fighter.vy += if (fighter.id == FighterId.VEXA) 0.94f else 0.92f
            if (fighter.y >= 590f) {
                fighter.y = 590f
                fighter.vy = 0f
                fighter.grounded = true
                fighter.airJumpsLeft = if (fighter.id == FighterId.VEXA) 1 else 0
                if (fighter.action in listOf(ActionState.JUMP, ActionState.DOUBLE_JUMP) || CollisionSystem.isAttackAction(fighter.action)) {
                    fighter.action = ActionState.LANDING
                    fighter.currentMove = null
                    fighter.actionFrame = 0
                    fighter.hasHitCurrentAttack = false
                }
            }
        } else if (fighter.action in listOf(ActionState.HITSTUN, ActionState.STUNNED, ActionState.KNOCKDOWN)) {
            fighter.vx *= 0.84f
        }
    }
}
