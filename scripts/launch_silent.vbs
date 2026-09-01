Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\\code_tino_19_4\\Code_Tool_Python\\Tool_Dance"
WshShell.Run "cmd /c npx electron .", 0, False
Set WshShell = Nothing
