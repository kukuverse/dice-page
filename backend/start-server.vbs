Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\.."
shell.Run """C:\Program Files\nodejs\node.exe"" backend\server.js", 0, False
