Add-Type -AssemblyName System.Drawing

$pngPath = "D:\code_tino_19_4\Code_Tool_Python\Tool_Dance\assets\icons\app-icon.png"
$icoPath = "D:\code_tino_19_4\Code_Tool_Python\Tool_Dance\assets\icons\app-icon.ico"

$bmp = [System.Drawing.Bitmap]::FromFile($pngPath)
$thumb = New-Object System.Drawing.Bitmap($bmp, 256, 256)
$hIcon = $thumb.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$bmp.Dispose()
$thumb.Dispose()

Write-Host "✅ ICO converted successfully: $icoPath"

# Update Shortcut
$desktop = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "AI Dance Chibi Studio.lnk"
$vbsLauncher = "D:\code_tino_19_4\Code_Tool_Python\Tool_Dance\scripts\launch_silent.vbs"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$vbsLauncher`""
$Shortcut.WorkingDirectory = "D:\code_tino_19_4\Code_Tool_Python\Tool_Dance"
$Shortcut.Description = "AI Dance Motion Tracker & 3D Chibi Audition Studio"
$Shortcut.IconLocation = "$icoPath,0"
$Shortcut.Save()

Write-Host "✅ Shortcut updated with AI icon: $shortcutPath"
