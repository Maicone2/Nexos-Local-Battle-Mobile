package com.neonclash.arenalan.state

import android.content.Context

enum class GraphicsTier { HIGH, MEDIUM, LOW }

class SettingsManager(context: Context) {
    private val prefs = context.getSharedPreferences("neon_clash_prefs", Context.MODE_PRIVATE)

    var graphicsTier: GraphicsTier
        get() = GraphicsTier.valueOf(prefs.getString("graphics", GraphicsTier.HIGH.name) ?: GraphicsTier.HIGH.name)
        set(value) = prefs.edit().putString("graphics", value.name).apply()

    var muted: Boolean
        get() = prefs.getBoolean("muted", false)
        set(value) = prefs.edit().putBoolean("muted", value).apply()

    var controlScale: Float
        get() = prefs.getFloat("control_scale", 1.0f)
        set(value) = prefs.edit().putFloat("control_scale", value.coerceIn(0.75f, 1.35f)).apply()

    var controlStyle: String
        get() = prefs.getString("control_style", "joystick") ?: "joystick"
        set(value) = prefs.edit().putString("control_style", value).apply()

    var hudScale: Float
        get() = prefs.getFloat("hud_scale", 1.0f)
        set(value) = prefs.edit().putFloat("hud_scale", value.coerceIn(0.75f, 1.25f)).apply()

    var hudOpacity: Float
        get() = prefs.getFloat("hud_opacity", 1.0f)
        set(value) = prefs.edit().putFloat("hud_opacity", value.coerceIn(0.45f, 1.0f)).apply()

    var showHitboxes: Boolean
        get() = prefs.getBoolean("show_hitboxes", false)
        set(value) = prefs.edit().putBoolean("show_hitboxes", value).apply()

    var trainingInfiniteEnergy: Boolean
        get() = prefs.getBoolean("training_inf_energy", true)
        set(value) = prefs.edit().putBoolean("training_inf_energy", value).apply()
}
