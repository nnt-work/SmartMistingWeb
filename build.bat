@echo off
setlocal
cd /d "%~dp0"
if defined JAVA_HOME (set "JAVAC_CMD=%JAVA_HOME%\bin\javac.exe") else (set "JAVAC_CMD=javac")
if defined JAVA_HOME (set "JAR_CMD=%JAVA_HOME%\bin\jar.exe") else (set "JAR_CMD=jar")
if not exist build\web mkdir build\web
xcopy /E /I /Y web build\web >nul
if not exist build\web\WEB-INF\classes mkdir build\web\WEB-INF\classes
(dir /S /B src\java\*.java)>build\sources.txt
"%JAVAC_CMD%" -encoding UTF-8 -source 8 -target 8 -cp "lib\tomcat-server\lib\servlet-api.jar" -d build\web\WEB-INF\classes @build\sources.txt
if errorlevel 1 goto fail
copy /Y prj_sm_config.properties build\web\WEB-INF\classes\prj_sm_config.properties >nul
if not exist dist mkdir dist
"%JAR_CMD%" cf dist\SmartMistingPRJ.war -C build\web .
if errorlevel 1 goto fail
echo Built dist\SmartMistingPRJ.war. Deploy to Tomcat 9.
exit /b 0
:fail
echo BUILD FAILED. Check JDK 8 and JAVA_HOME.
exit /b 1
