' 交我导 · 上海交通大学导航（桌面版）—— 免 Python 启动器（Edge 应用模式）
' 无需安装 Python：任意 Windows 10/11（自带 Microsoft Edge）双击即可运行。
' 用法：wscript.exe launcher-edge.vbs，或通过 install-edge.ps1 生成的桌面快捷方式启动。
' 注意：本文件以 ANSI(GBK) 编码保存，中文系统下 VBScript 才能正确解析。

Option Explicit

Dim fso, sh, appDir, htmlPath, url, edge, shellArgs
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

' 本脚本所在目录即应用目录（app.html 与脚本同目录，移动整个文件夹后依然可用）
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
htmlPath = appDir & "\app.html"

If Not fso.FileExists(htmlPath) Then
    MsgBox "找不到 app.html，请确认它与本启动器在同一文件夹。", 48, "交我导"
    WScript.Quit 1
End If

' file:// URL
Dim fso2, ver
Set fso2 = CreateObject("Scripting.FileSystemObject")
ver = 0
' 版本参数 = 目录内全部 html/js/css 文件的最大修改时间（任一文件更新即换 URL）
Dim fItem, fVer
If fso2.FolderExists(appDir) Then
    For Each fItem In fso2.GetFolder(appDir).Files
        Dim ext
        ext = LCase(fso2.GetExtensionName(fItem.Name))
        If ext = "html" Or ext = "js" Or ext = "css" Then
            fVer = Int(fItem.DateLastModified * 86400)
            If fVer > ver Then ver = fVer
        End If
    Next
End If
url = "file:///" & Replace(htmlPath, "\", "/") & "?v=" & ver

' 定位 Edge
edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(edge) Then
    edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
End If
If Not fso.FileExists(edge) Then
    MsgBox "未找到 Microsoft Edge，请安装 Edge 后重试。", 48, "交我导"
    WScript.Quit 1
End If

shellArgs = """" & edge & """ --app=" & url & " --window-size=1280,900 --no-first-run"
sh.Run shellArgs, 0, False
