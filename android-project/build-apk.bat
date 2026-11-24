@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
set "BUILD_TYPE=%~1"
if "%BUILD_TYPE%"=="" set "BUILD_TYPE=debug"

if /I "%BUILD_TYPE%"=="debug" (
    set "GRADLE_TASK=:app:assembleDebug"
    set "APK_SOURCE=app\build\outputs\apk\debug\app-debug.apk"
    set "APK_DEST=output\neon-clash-arena-lan-debug.apk"
) else if /I "%BUILD_TYPE%"=="release" (
    set "GRADLE_TASK=:app:assembleRelease"
    set "APK_SOURCE=app\build\outputs\apk\release\app-release-unsigned.apk"
    set "APK_DEST=output\neon-clash-arena-lan-release.apk"
) else (
    echo Uso: build-apk.bat [debug^|release]
    exit /b 1
)

echo === NEON CLASH: ARENA LAN - Automacao de Build APK (%BUILD_TYPE%) ===

where java >nul 2>nul
if errorlevel 1 (
    echo Erro: JDK 17+ nao encontrado no PATH.
    exit /b 1
)

if not exist "local.properties" (
    set "SDK_ROOT=%ANDROID_HOME%"
    if "!SDK_ROOT!"=="" set "SDK_ROOT=%ANDROID_SDK_ROOT%"
    if "!SDK_ROOT!"=="" if exist "%LOCALAPPDATA%\Android\Sdk" set "SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
    if "!SDK_ROOT!"=="" (
        echo Erro: Define ANDROID_HOME ou cria local.properties com sdk.dir=C:\\Users\\...\\Android\\Sdk
        exit /b 1
    )
    set "ESCAPED_SDK=!SDK_ROOT:\=\\!"
    >local.properties echo sdk.dir=!ESCAPED_SDK!
)

if exist "gradlew.bat" (
    call gradlew.bat %GRADLE_TASK% --no-daemon --stacktrace
) else (
    where gradle >nul 2>nul
    if errorlevel 1 (
        echo Erro: Nem gradlew.bat nem gradle global encontrados. Executa: gradle wrapper --gradle-version 8.7
        exit /b 1
    )
    call gradle %GRADLE_TASK% --no-daemon --stacktrace
)

if errorlevel 1 exit /b 1

if not exist "output" mkdir output
if exist "%APK_SOURCE%" (
    copy /Y "%APK_SOURCE%" "%APK_DEST%" >nul
) else if exist "app\build\outputs\apk\release\app-release.apk" (
    copy /Y "app\build\outputs\apk\release\app-release.apk" "%APK_DEST%" >nul
) else (
    echo Erro: APK nao encontrado em %APK_SOURCE%
    exit /b 1
)

echo.
echo APK gerado com sucesso em: %~dp0%APK_DEST%
echo Para instalar via ADB: adb install -r "%~dp0%APK_DEST%"
endlocal
