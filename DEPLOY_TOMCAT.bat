@echo off
setlocal
cd /d "%~dp0"
if not defined CATALINA_HOME (
 echo Set CATALINA_HOME to your Tomcat 9 folder first.
 echo Example: set "CATALINA_HOME=C:\apache-tomcat-9.0.113"
 exit /b 1
)
if not exist "%CATALINA_HOME%\webapps" exit /b 1
if not exist dist\SmartMistingPRJ.war call build.bat
if errorlevel 1 exit /b 1
copy /Y dist\SmartMistingPRJ.war "%CATALINA_HOME%\webapps\SmartMistingPRJ.war"
echo Open http://localhost:8080/SmartMistingPRJ/ after Tomcat starts.
