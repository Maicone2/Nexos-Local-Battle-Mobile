# ProGuard / R8 rules for NEON CLASH: ARENA LAN
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep Kotlin coroutines & Compose metadata
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# Keep game engine, LAN packet structures, and UI state classes
-keep class com.neonclash.arenalan.** { *; }
