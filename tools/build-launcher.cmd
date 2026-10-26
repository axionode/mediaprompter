@echo off
rem Builds Mediaprompter.exe (a tiny launcher for runtime\electron\electron.exe)
rem with the C# compiler that ships with .NET Framework 4.x on every Windows 10/11.
cd /d "%~dp0.."
set CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC%" set CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe
"%CSC%" /nologo /target:winexe /optimize+ /out:Mediaprompter.exe /reference:System.Windows.Forms.dll tools\Launcher.cs
