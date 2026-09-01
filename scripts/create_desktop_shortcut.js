const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const desktopPath = path.join(process.env.USERPROFILE || 'C:\\Users\\Admin', 'Desktop');
const publicDesktop = 'C:\\Users\\Public\\Desktop';
const pngIconPath = path.join(projectRoot, 'assets', 'icons', 'app-icon.png');
const icoPath = path.join(projectRoot, 'assets', 'icons', 'app-icon.ico');
const vbsLauncher = path.join(projectRoot, 'scripts', 'launch_silent.vbs');

// 1. Tạo file launch_silent.vbs
const vbsLauncherContent = `Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "${projectRoot.replace(/\\/g, '\\\\')}"
WshShell.Run "cmd /c npx electron .", 0, False
Set WshShell = Nothing
`;
fs.writeFileSync(vbsLauncher, vbsLauncherContent, 'utf8');

// 2. Chuyển đổi PNG sang ICO chuẩn Windows bằng PowerShell System.Drawing
const psConvert = `
Add-Type -AssemblyName System.Drawing
$png = [System.Drawing.Bitmap]::FromFile("${pngIconPath.replace(/\\/g, '\\\\')}")
$thumb = New-Object System.Drawing.Bitmap $png, 256, 256
$hIcon = $thumb.GetHicon()
$ico = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream "${icoPath.replace(/\\/g, '\\\\')}", ([System.IO.FileMode]::Create)
$ico.Save($fs)
$fs.Close()
$png.Dispose()
$thumb.Dispose()
Write-Host "Created ICO: ${icoPath.replace(/\\/g, '\\\\')}"
`;
try {
  execSync(`powershell -Command "${psConvert.replace(/\n/g, ' ')}"`, { encoding: 'utf8' });
} catch (e) {
  console.log('PowerShell icon convert note:', e.message);
}

// 3. Tạo Shortcut ra cả Desktop người dùng & Public Desktop
const targetShortcuts = [
  path.join(desktopPath, 'AI Dance Chibi Studio.lnk'),
  path.join(publicDesktop, 'AI Dance Chibi Studio.lnk')
];

for (const scPath of targetShortcuts) {
  try {
    const makeShortcutVbs = path.join(projectRoot, 'scripts', '_tmp_sc.vbs');
    const vbs = `Set WshShell = CreateObject("WScript.Shell")
Set oLink = WshShell.CreateShortcut("${scPath.replace(/\\/g, '\\\\')}")
oLink.TargetPath = "wscript.exe"
oLink.Arguments = """${vbsLauncher.replace(/\\/g, '\\\\')}"""
oLink.WorkingDirectory = "${projectRoot.replace(/\\/g, '\\\\')}"
oLink.Description = "AI Dance Motion Tracker & 3D Chibi Audition Studio"
if CreateObject("Scripting.FileSystemObject").FileExists("${icoPath.replace(/\\/g, '\\\\')}") Then
  oLink.IconLocation = "${icoPath.replace(/\\/g, '\\\\')},0"
Else
  oLink.IconLocation = "${pngIconPath.replace(/\\/g, '\\\\')},0"
End If
oLink.Save
`;
    fs.writeFileSync(makeShortcutVbs, vbs, 'utf8');
    execSync(`cscript //nologo "${makeShortcutVbs}"`, { encoding: 'utf8' });
    if (fs.existsSync(makeShortcutVbs)) fs.unlinkSync(makeShortcutVbs);
    console.log(`✅ Đã tạo icon shortcut tại: ${scPath}`);
  } catch (err) {
    // continue
  }
}
