$desktops = @(
  [System.Environment]::GetFolderPath('Desktop'),
  'C:\Users\Admin\Desktop',
  'C:\Users\Admin\OneDrive\Desktop',
  'D:\Desktop'
) | Where-Object { Test-Path $_ } | Select-Object -Unique

$icoPath = "D:\code_tino_19_4\Code_Tool_Python\Tool_Dance\assets\icons\app-icon.ico"
$vbsLauncher = "D:\code_tino_19_4\Code_Tool_Python\Tool_Dance\scripts\launch_silent.vbs"
$WshShell = New-Object -ComObject WScript.Shell

foreach ($d in $desktops) {
  $scPath = Join-Path $d "AI Dance Chibi Studio.lnk"
  $sc = $WshShell.CreateShortcut($scPath)
  $sc.TargetPath = "wscript.exe"
  $sc.Arguments = "`"$vbsLauncher`""
  $sc.WorkingDirectory = "D:\code_tino_19_4\Code_Tool_Python\Tool_Dance"
  $sc.Description = "AI Dance Motion Tracker & 3D Chibi Audition Studio"
  $sc.IconLocation = "$icoPath,0"
  $sc.Save()
  Write-Host "✅ Created shortcut at: $scPath"
}
