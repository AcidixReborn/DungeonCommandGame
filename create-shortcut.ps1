$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut("$Desktop\Dungeon Command.lnk")
$Shortcut.TargetPath = "C:\Users\dougl\Desktop\GitRepository\DungeonCommandGame\start-game.bat"
$Shortcut.WorkingDirectory = "C:\Users\dougl\Desktop\GitRepository\DungeonCommandGame"
$Shortcut.Save()
Write-Host "Shortcut created on Desktop!"
