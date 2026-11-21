package com.neonclash.arenalan.engine

import android.graphics.RectF
import com.neonclash.arenalan.audio.AudioManager
import com.neonclash.arenalan.state.*

class CombatSystem(private val audio: AudioManager) {
    private val controller = FighterController()
    private val hitbox = RectF()
    private val hurtbox = RectF()
    private val projBox = RectF()
    private var subTicks = 0
    private var nextProjId = 1

    fun step(state: MatchSnapshot, p1In: InputPacket, p2In: InputPacket, mode: GameMode, infiniteEnergy: Boolean) {
        state.tick++
        state.cameraShake = (state.cameraShake * 0.85f - 0.1f).coerceAtLeast(0f)
        if (state.p1.hitFlashFrames > 0) state.p1.hitFlashFrames--
        if (state.p2.hitFlashFrames > 0) state.p2.hitFlashFrames--

        if (state.hitstopFrames > 0) {
            state.hitstopFrames--
            return
        }

        if (state.phase == "INTRO") {
            state.phaseTimer--
            if (state.phaseTimer <= 0) state.phase = "FIGHTING"
            return
        }

        if (state.phase == "KO") {
            state.phaseTimer--
            controller.integratePhysics(state.p1)
            controller.integratePhysics(state.p2)
            if (state.phaseTimer <= 0) {
                if (state.p1.roundsWon >= 2 || state.p2.roundsWon >= 2) {
                    state.phase = "MATCH_OVER"
                    state.winnerSlot = if (state.p1.roundsWon >= 2) 1 else 2
                } else {
                    state.roundNumber++
                    resetRound(state)
                }
            }
            return
        }

        if (state.phase == "MATCH_OVER") return

        if (mode != GameMode.TRAINING) {
            subTicks++
            if (subTicks >= 60) {
                subTicks = 0
                if (state.timerSeconds > 0) state.timerSeconds--
                if (state.timerSeconds == 0) {
                    if (state.p1.hp >= state.p2.hp) state.p1.roundsWon++ else state.p2.roundsWon++
                    state.phase = "KO"
                    state.phaseTimer = 95
                    return
                }
            }
        } else if (infiniteEnergy) {
            state.p1.energy = 100
            state.p2.energy = 100
        }

        tickStatus(state.p1)
        tickStatus(state.p2)

        controller.updateFighter(state.p1, state.p2, p1In, infiniteEnergy)
        controller.updateFighter(state.p2, state.p1, p2In, infiniteEnergy)

        state.p1.actionFrame++
        state.p2.actionFrame++

        maybeSpawnProjectile(state, state.p1)
        maybeSpawnProjectile(state, state.p2)

        controller.integratePhysics(state.p1)
        controller.integratePhysics(state.p2)
        CollisionSystem.resolvePushboxes(state.p1, state.p2)

        checkMeleeHit(state, state.p1, state.p2)
        checkMeleeHit(state, state.p2, state.p1)
        updateProjectiles(state)

        if (state.p1.hp <= 0 || state.p2.hp <= 0) {
            if (mode == GameMode.TRAINING) {
                state.p1.hp = state.p1.maxHp
                state.p2.hp = state.p2.maxHp
            } else {
                if (state.p2.hp <= 0) {
                    state.p1.roundsWon++
                    state.p1.action = ActionState.VICTORY
                    state.p2.action = ActionState.DEFEAT
                } else {
                    state.p2.roundsWon++
                    state.p2.action = ActionState.VICTORY
                    state.p1.action = ActionState.DEFEAT
                }
                state.phase = "KO"
                state.phaseTimer = 100
                audio.playKo()
            }
        }
    }

    private fun tickStatus(f: FighterEntity) {
        if (f.comboTimer > 0) {
            f.comboTimer--
            if (f.comboTimer == 0) f.comboCount = 0
        }
        if (f.stunTimer > 0) {
            f.stunTimer--
            if (f.stunTimer == 0) {
                f.action = if (f.grounded) ActionState.IDLE else ActionState.JUMP
                f.stun = 0f
            }
        }
    }

    private fun maybeSpawnProjectile(state: MatchSnapshot, f: FighterEntity) {
        if (f.id == FighterId.KAEL && f.action == ActionState.SPECIAL && f.actionFrame == 13) {
            state.projectiles.add(
                ProjectileEntity(
                    id = nextProjId++,
                    ownerSlot = f.slot,
                    x = f.x + f.facing * 64f,
                    y = f.y - 102f,
                    vx = f.facing * 13.5f
                )
            )
            audio.playSpecial()
        }
    }

    private fun checkMeleeHit(state: MatchSnapshot, attacker: FighterEntity, defender: FighterEntity) {
        if (attacker.hasHitCurrentAttack) return
        if (!CollisionSystem.getActiveHitbox(attacker, hitbox)) return
        CollisionSystem.getHurtbox(defender, hurtbox)
        if (!RectF.intersects(hitbox, hurtbox)) return

        attacker.hasHitCurrentAttack = true
        val dmg = when (attacker.action) {
            ActionState.LIGHT -> 55
            ActionState.HEAVY -> 112
            ActionState.SPECIAL -> 168
            else -> 0
        }
        applyImpact(state, attacker, defender, dmg, attacker.action != ActionState.LIGHT)
    }

    private fun updateProjectiles(state: MatchSnapshot) {
        val iter = state.projectiles.iterator()
        while (iter.hasNext()) {
            val proj = iter.next()
            proj.x += proj.vx
            if (proj.x < 0f || proj.x > 1280f) {
                iter.remove()
                continue
            }
            val attacker = if (proj.ownerSlot == 1) state.p1 else state.p2
            val defender = if (proj.ownerSlot == 1) state.p2 else state.p1
            CollisionSystem.getProjectileBox(proj, projBox)
            CollisionSystem.getHurtbox(defender, hurtbox)
            if (RectF.intersects(projBox, hurtbox)) {
                applyImpact(state, attacker, defender, proj.damage, true)
                iter.remove()
            }
        }
    }

    private fun applyImpact(state: MatchSnapshot, attacker: FighterEntity, defender: FighterEntity, rawDamage: Int, heavy: Boolean) {
        if (defender.action == ActionState.BLOCK && defender.grounded) {
            defender.hp = (defender.hp - 16).coerceAtLeast(1)
            defender.vx = attacker.facing * 6f
            defender.stunTimer = 12
            state.hitstopFrames = 3
            audio.playBlock()
            return
        }
        defender.comboCount++
        defender.comboTimer = 55
        defender.hp = (defender.hp - rawDamage).coerceAtLeast(0)
        attacker.energy = (attacker.energy + 14).coerceAtMost(100)
        defender.vx = attacker.facing * (if (heavy) 11f else 5f)
        defender.hitFlashFrames = 4
        defender.stun += if (heavy) 24f else 10f
        if (defender.stun >= 100f && defender.hp > 0) {
            defender.action = ActionState.STUNNED
            defender.stunTimer = 90
            defender.stun = 0f
        } else {
            defender.action = ActionState.HITSTUN
            defender.stunTimer = if (heavy) 22 else 14
        }
        state.hitstopFrames = if (heavy) 7 else 3
        state.cameraShake = if (heavy) 11f else 4f
        audio.playHit(heavy)
    }

    fun resetRound(state: MatchSnapshot) {
        state.p1.x = 390f; state.p1.y = 590f; state.p1.hp = state.p1.maxHp; state.p1.action = ActionState.IDLE
        state.p2.x = 890f; state.p2.y = 590f; state.p2.hp = state.p2.maxHp; state.p2.action = ActionState.IDLE
        state.projectiles.clear()
        state.timerSeconds = 99
        state.phase = "INTRO"
        state.phaseTimer = 60
    }
}
