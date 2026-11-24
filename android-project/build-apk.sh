#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BUILD_TYPE="${1:-debug}"
OUTPUT_DIR="$SCRIPT_DIR/output"

case "$BUILD_TYPE" in
  debug|Debug)
    GRADLE_TASK=":app:assembleDebug"
    APK_SOURCE="app/build/outputs/apk/debug/app-debug.apk"
    APK_DEST="$OUTPUT_DIR/neon-clash-arena-lan-debug.apk"
    ;;
  release|Release)
    GRADLE_TASK=":app:assembleRelease"
    APK_SOURCE="app/build/outputs/apk/release/app-release-unsigned.apk"
    APK_DEST="$OUTPUT_DIR/neon-clash-arena-lan-release.apk"
    ;;
  *)
    echo "Uso: $0 [debug|release]"
    exit 1
    ;;
esac

echo "=== NEON CLASH: ARENA LAN — Automação de Build APK ($BUILD_TYPE) ==="

if ! command -v java >/dev/null 2>&1; then
  echo "Erro: JDK 17+ não encontrado no PATH. Instala Temurin/OpenJDK 17 e tenta novamente."
  exit 1
fi

SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK_ROOT" ] && [ ! -f "$SCRIPT_DIR/local.properties" ]; then
  for candidate in "$HOME/Android/Sdk" "$HOME/Library/Android/sdk" "/opt/android-sdk"; do
    if [ -d "$candidate" ]; then
      SDK_ROOT="$candidate"
      break
    fi
  done
  if [ -z "$SDK_ROOT" ]; then
    echo "Erro: ANDROID_HOME / ANDROID_SDK_ROOT não definido e local.properties ausente."
    echo "Define ANDROID_HOME ou cria local.properties com: sdk.dir=/caminho/para/Android/Sdk"
    exit 1
  fi
fi

if [ -n "$SDK_ROOT" ] && [ ! -f "$SCRIPT_DIR/local.properties" ]; then
  printf 'sdk.dir=%s\n' "$SDK_ROOT" > "$SCRIPT_DIR/local.properties"
  echo "Gerado local.properties com sdk.dir=$SDK_ROOT"
fi

if [ -x "$SCRIPT_DIR/gradlew" ]; then
  GRADLE_CMD=("$SCRIPT_DIR/gradlew")
elif command -v gradle >/dev/null 2>&1; then
  GRADLE_CMD=("gradle")
else
  echo "Erro: nem ./gradlew nem gradle global encontrados."
  echo "Instala Gradle 8.7+ ou gera o wrapper com: gradle wrapper --gradle-version 8.7"
  exit 1
fi

echo "A executar: ${GRADLE_CMD[*]} $GRADLE_TASK --no-daemon"
"${GRADLE_CMD[@]}" "$GRADLE_TASK" --no-daemon --stacktrace

mkdir -p "$OUTPUT_DIR"
if [ -f "$APK_SOURCE" ]; then
  cp "$APK_SOURCE" "$APK_DEST"
elif [ "$BUILD_TYPE" = "release" ] && [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
  cp "app/build/outputs/apk/release/app-release.apk" "$APK_DEST"
else
  echo "Aviso: APK compilado não encontrado no caminho esperado ($APK_SOURCE)."
  exit 1
fi

echo ""
echo "APK gerado com sucesso:"
echo "  $APK_DEST"
echo ""
echo "Para instalar via ADB no telemóvel Android:"
echo "  adb install -r \"$APK_DEST\""
