<#
.SYNOPSIS
  交我导 · 上海交通大学导航（桌面版）安装脚本
.DESCRIPTION
  支持三种版本：
    - 正常版（单文件 exe，免 Python）：Jiaowodao.exe
    - 免安装版（Edge 应用模式）：launcher-edge.vbs
    - Python 版（pywebview）：launcher.py
  功能：
    - 可选择安装位置（图形选择器 / 控制台输入 / -InstallDir 参数）
    - 自动检测本机运行环境（WebView2 / Edge / Python）并推荐模式
    - 创建桌面快捷方式与开始菜单快捷方式（含卸载入口）
    - 安装后自检（文件完整性 / 快捷方式校验）
    - 支持卸载（删除快捷方式与安装目录）
  用法：
    powershell -ExecutionPolicy Bypass -File .\install-jiaowodao.ps1
  参数：
    -InstallDir <路径>        指定安装位置（默认 %LOCALAPPDATA%\Programs\Jiaowodao）
    -Mode auto|exe|edge|python  安装模式（默认 auto 自动检测）
    -Source <路径>            源目录（默认脚本同级目录下的 sjtu-link 文件夹）
    -ShortcutRoot <路径>      快捷方式根目录（测试用；默认桌面与开始菜单）
    -Silent                   静默安装（不询问，全部使用默认/参数值）
    -Launch                   安装完成后立即启动应用
    -NoDesktopShortcut        不创建桌面快捷方式
    -NoStartMenuShortcut      不创建开始菜单快捷方式
    -Uninstall                卸载模式（配合 -InstallDir 指定安装目录）
.NOTES
  要求：Windows PowerShell 3.0+（Win7 SP1 / 8 / 8.1 / 10 / 11 自带 5.1）
  注意：本文件需以 UTF-8 带 BOM 保存，中文在 Windows PowerShell 5.1 下才能正确显示。
#>
[CmdletBinding()]
param(
    [string]$InstallDir = '',
    [ValidateSet('auto', 'exe', 'edge', 'python')]
    [string]$Mode = 'auto',
    [string]$Source = '',
    [string]$ShortcutRoot = '',
    [switch]$Silent,
    [switch]$Launch,
    [switch]$NoDesktopShortcut,
    [switch]$NoStartMenuShortcut,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

# ---------- 输出辅助 ----------
function Write-Step { param([string]$Msg) Write-Host "==> $Msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Msg) Write-Host "    [OK] $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "    [警告] $Msg" -ForegroundColor Yellow }
function Write-Err  { param([string]$Msg) Write-Host "    [错误] $Msg" -ForegroundColor Red }

$AppName = '交我导'
$ScriptDir = $PSScriptRoot
if (-not $Source) { $Source = Join-Path $ScriptDir 'sjtu-link' }

# ---------- 环境检测 ----------
function Test-WebView2 {
    $regPaths = @(
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
        'HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
    )
    foreach ($p in $regPaths) {
        if (Test-Path $p) { return $true }
    }
    if (Test-Path 'C:\Program Files (x86)\Microsoft\EdgeWebView\Application') { return $true }
    if (Test-Path 'C:\Program Files\Microsoft\EdgeWebView\Application') { return $true }
    return $false
}

function Test-Edge {
    return (Test-Path 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') -or
           (Test-Path 'C:\Program Files\Microsoft\Edge\Application\msedge.exe')
}

function Test-Python {
    if (Get-Command python -ErrorAction SilentlyContinue) { return $true }
    if (Get-Command py -ErrorAction SilentlyContinue) { return $true }
    return $false
}

function Find-Pythonw {
    # 1) python 同目录的 pythonw.exe
    $g = Get-Command python -ErrorAction SilentlyContinue
    if ($g -and $g.Source) {
        $cand = Join-Path (Split-Path $g.Source -Parent) 'pythonw.exe'
        if (Test-Path $cand) { return $cand }
    }
    # 2) Windows Python 启动器 pyw.exe
    if (Test-Path "$env:WINDIR\pyw.exe") { return "$env:WINDIR\pyw.exe" }
    return ''
}

# ---------- 卸载模式 ----------
if ($Uninstall) {
    Write-Step '卸载「交我导」'
    if (-not $InstallDir) {
        Write-Err '卸载模式需要指定安装目录：-InstallDir <路径>'
        exit 1
    }

    $DesktopDir = [Environment]::GetFolderPath('Desktop')
    $StartMenuDir = [Environment]::GetFolderPath('Programs')
    if ($ShortcutRoot) {
        $DesktopDir = Join-Path $ShortcutRoot 'Desktop'
        $StartMenuDir = Join-Path $ShortcutRoot 'Programs'
    }

    $removed = 0
    foreach ($name in @('交我导.lnk', '交我导（免安装）.lnk')) {
        foreach ($dir in @($DesktopDir, $StartMenuDir, (Join-Path $StartMenuDir $AppName))) {
            $lnk = Join-Path $dir $name
            if (Test-Path $lnk) { Remove-Item $lnk -Force; Write-Ok "已删除快捷方式: $lnk"; $removed++ }
        }
    }
    if (Test-Path (Join-Path $StartMenuDir $AppName)) {
        $left = Get-ChildItem (Join-Path $StartMenuDir $AppName) -Force -ErrorAction SilentlyContinue
        if (-not $left) { Remove-Item (Join-Path $StartMenuDir $AppName) -Force; Write-Ok '已删除开始菜单目录' }
    }

    if (Test-Path $InstallDir) {
        # 先关闭运行中的应用实例，避免 exe 被占用导致删除失败
        $running = Get-Process -Name 'Jiaowodao' -ErrorAction SilentlyContinue
        if ($running) {
            if ($Silent) {
                Write-Warn '检测到应用正在运行，将自动关闭后继续卸载。'
                Stop-Process -Name 'Jiaowodao' -Force -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 800
            } else {
                $ans = Read-Host '检测到应用正在运行，是否自动关闭？(Y/N，默认 Y)'
                if ($ans -eq '' -or $ans -match '^[Yy]') {
                    Stop-Process -Name 'Jiaowodao' -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Milliseconds 800
                } else {
                    Write-Warn '跳过自动关闭；若文件被占用，目录删除可能失败。'
                }
            }
        }
        if ($Silent) {
            try {
                Remove-Item $InstallDir -Recurse -Force -ErrorAction Stop
                Write-Ok "已删除安装目录: $InstallDir"
            } catch {
                Write-Err "删除安装目录失败：$($_.Exception.Message)"
                Write-Warn '请关闭所有应用实例后重试，或手动删除该目录。'
            }
        } else {
            $ans = Read-Host "是否同时删除安装目录 $InstallDir ？(Y/N，默认 N)"
            if ($ans -match '^[Yy]') {
                try {
                    Remove-Item $InstallDir -Recurse -Force -ErrorAction Stop
                    Write-Ok "已删除安装目录: $InstallDir"
                } catch {
                    Write-Err "删除安装目录失败：$($_.Exception.Message)"
                    Write-Warn '请关闭所有应用实例后重试，或手动删除该目录。'
                }
            } else {
                Write-Warn '已保留安装目录，可手动删除。'
            }
        }
    } else {
        Write-Ok '安装目录不存在或已删除。'
    }
    Write-Ok "卸载完成（共移除 $removed 个快捷方式）。"
    exit 0
}

# ---------- 源目录检查 ----------
Write-Step '检查源目录'
if (-not (Test-Path $Source)) {
    Write-Err "找不到应用源目录: $Source"
    Write-Err '请确认本脚本与 sjtu-link 文件夹位于同一目录。'
    exit 1
}
$ExeFile = Join-Path $Source 'Jiaowodao.exe'
$EdgeVbs = Join-Path $Source 'launcher-edge.vbs'
$PyLauncher = Join-Path $Source 'launcher.py'
if (-not ((Test-Path $ExeFile) -or (Test-Path $EdgeVbs) -or (Test-Path $PyLauncher))) {
    Write-Err "源目录中未找到任何可安装的版本文件（Jiaowodao.exe / launcher-edge.vbs / launcher.py）。"
    exit 1
}

# ---------- 环境报告 ----------
Write-Step '检测本机运行环境'
$hasWv2 = Test-WebView2
$hasEdge = Test-Edge
$hasPy = Test-Python
Write-Ok ("WebView2 运行时: " + $(if ($hasWv2) { '已安装' } else { '未检测到' }))
Write-Ok ("Microsoft Edge: " + $(if ($hasEdge) { '已安装' } else { '未检测到' }))
Write-Ok ("Python: " + $(if ($hasPy) { '已安装' } else { '未检测到' }))

# ---------- 模式选择 ----------
function Resolve-Mode {
    param([string]$Requested)
    if ($Requested -ne 'auto') {
        switch ($Requested) {
            'exe'    { if (-not (Test-Path $ExeFile)) { throw '正常版需要 Jiaowodao.exe，但源目录中不存在。' } }
            'edge'   { if (-not (Test-Path $EdgeVbs)) { throw '免安装版需要 launcher-edge.vbs，但源目录中不存在。' } }
            'python' { if (-not (Test-Path $PyLauncher)) { throw 'Python 版需要 launcher.py，但源目录中不存在。' } }
        }
        if ($Requested -eq 'exe' -and -not $hasWv2 -and -not $hasEdge) {
            Write-Warn '未检测到 WebView2 与 Edge，正常版可能无法运行，建议改用免安装版。'
        }
        if ($Requested -eq 'edge' -and -not $hasEdge) {
            Write-Warn '未检测到 Microsoft Edge，免安装版无法运行，建议改用正常版或 Python 版。'
        }
        if ($Requested -eq 'python' -and -not $hasPy) {
            Write-Warn '未检测到 Python，Python 版无法运行，建议先安装 Python 3.10+。'
        }
        return $Requested
    }
    # 自动：exe（有 WebView2 或 Edge 兜底）> edge > python
    if ((Test-Path $ExeFile) -and ($hasWv2 -or $hasEdge)) { return 'exe' }
    if ((Test-Path $EdgeVbs) -and $hasEdge) { return 'edge' }
    if ((Test-Path $PyLauncher) -and $hasPy) { return 'python' }
    throw '未找到可用的运行方式。请安装 Microsoft Edge（Windows 10/11 自带）或 Python 3.10+，再重新运行本脚本。'
}

try {
    $Mode = Resolve-Mode -Requested $Mode
} catch {
    Write-Err $_.Exception.Message
    exit 1
}
Write-Ok "安装模式：$Mode"
$ModeName = @{ exe = '正常版（单文件 exe，免 Python）'; edge = '免安装版（Edge 应用模式）'; python = 'Python 版（pywebview）' }[$Mode]

# ---------- 安装位置 ----------
Write-Step '确定安装位置'
$DefaultDir = Join-Path $env:LOCALAPPDATA 'Programs\Jiaowodao'
if (-not $InstallDir) {
    if ($Silent) {
        $InstallDir = $DefaultDir
    } else {
        $InstallDir = ''
        try {
            Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
            $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
            $dlg.Description = '请选择「交我导」安装位置（推荐使用默认值）'
            $dlg.SelectedPath = $DefaultDir
            if ([Environment]::UserInteractive) {
                if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
                    $InstallDir = $dlg.SelectedPath
                }
            }
        } catch {
            $InstallDir = ''
        }
        if (-not $InstallDir) {
            Write-Host "安装位置（直接回车使用默认值）："
            Write-Host "默认: $DefaultDir"
            $input = Read-Host '路径'
            $InstallDir = $(if ($input.Trim()) { $input.Trim() } else { $DefaultDir })
        }
    }
}
$InstallDir = [System.IO.Path]::GetFullPath($InstallDir)

# 创建并检查可写
try {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
} catch {
    Write-Err "无法创建安装目录: $InstallDir"
    exit 1
}
$writeTest = Join-Path $InstallDir ('.wtest_' + [guid]::NewGuid().ToString('N'))
try {
    Set-Content -Path $writeTest -Value 'ok' -Encoding ASCII
    Remove-Item $writeTest -Force
} catch {
    Write-Err "安装目录不可写: $InstallDir"
    exit 1
}
Write-Ok "安装位置：$InstallDir"

# 目标目录已存在 -> 覆盖确认
$existing = Get-ChildItem $InstallDir -Force -ErrorAction SilentlyContinue
if ($existing) {
    if ($Silent) {
        Write-Warn "目标目录已存在，将覆盖安装: $InstallDir"
    } else {
        $ans = Read-Host '目标目录已存在，是否覆盖安装？(Y/N，默认 N)'
        if ($ans -notmatch '^[Yy]') { Write-Err '已取消安装。'; exit 1 }
    }
}

# 运行中实例检查（exe 被占用时复制会失败）
$running = Get-Process -Name 'Jiaowodao' -ErrorAction SilentlyContinue
if ($running) {
    if ($Silent) {
        Write-Warn '检测到应用正在运行，请先关闭应用，否则复制 exe 可能失败。'
    } else {
        $ans = Read-Host '检测到「交我导」正在运行。请先关闭应用，然后按 Y 继续，或按 N 取消。'
        if ($ans -notmatch '^[Yy]') { Write-Err '已取消安装。'; exit 1 }
    }
}

# ---------- 复制文件 ----------
Write-Step '复制应用文件'
try {
    Copy-Item -Path (Join-Path $Source '*') -Destination $InstallDir -Recurse -Force -ErrorAction Stop
} catch {
    Write-Err "复制文件失败：$($_.Exception.Message)"
    Write-Warn '如果提示文件被占用，请先关闭正在运行的「交我导」再重试。'
    exit 1
}

# ---------- 安装后自检 ----------
Write-Step '校验安装结果'
$verifyFiles = @('app.html', 'icon.ico', 'data\jiaowodao-data.js', 'data\jiaowodao-clubs.js', 'data\pinyin-map.js')
switch ($Mode) {
    'exe'    { $verifyFiles += 'Jiaowodao.exe' }
    'edge'   { $verifyFiles += 'launcher-edge.vbs' }
    'python' { $verifyFiles += 'launcher.py' }
}
$failed = $false
foreach ($f in $verifyFiles) {
    if (Test-Path (Join-Path $InstallDir $f)) {
        Write-Ok "已复制 $f"
    } else {
        Write-Err "缺少文件: $f"
        $failed = $true
    }
}
if ($failed) { Write-Err '安装校验失败，请重新运行本脚本。'; exit 1 }

# ---------- 快捷方式 ----------
function New-Shortcut {
    param([string]$LnkPath, [string]$Target, [string]$ArgsText, [string]$WorkDir, [string]$Icon, [string]$Desc)
    $ws = New-Object -ComObject WScript.Shell
    $sc = $ws.CreateShortcut($LnkPath)
    $sc.TargetPath = $Target
    if ($ArgsText) { $sc.Arguments = $ArgsText }
    $sc.WorkingDirectory = $WorkDir
    if ($Icon -and (Test-Path $Icon)) { $sc.IconLocation = "$Icon,0" }
    $sc.Description = $Desc
    $sc.Save()
}

$DesktopDir = [Environment]::GetFolderPath('Desktop')
$StartMenuDir = [Environment]::GetFolderPath('Programs')
if ($ShortcutRoot) {
    $DesktopDir = Join-Path $ShortcutRoot 'Desktop'
    $StartMenuDir = Join-Path $ShortcutRoot 'Programs'
    New-Item -ItemType Directory -Force -Path $DesktopDir, $StartMenuDir | Out-Null
}

$LnkName = $(if ($Mode -eq 'edge') { '交我导（免安装）.lnk' } else { '交我导.lnk' })
$IconFile = Join-Path $InstallDir 'icon.ico'

switch ($Mode) {
    'exe' {
        $Target = Join-Path $InstallDir 'Jiaowodao.exe'
        $ArgsText = ''
    }
    'edge' {
        $Target = "$env:WINDIR\System32\wscript.exe"
        $ArgsText = '"' + (Join-Path $InstallDir 'launcher-edge.vbs') + '"'
    }
    'python' {
        $Pythonw = Find-Pythonw
        if (-not $Pythonw) {
            Write-Err '未找到 pythonw.exe / pyw.exe，无法创建 Python 版快捷方式。'
            Write-Warn '安装已完成，请安装 Python 3.10+ 后重新运行本脚本生成快捷方式。'
            exit 1
        }
        $Target = $Pythonw
        $ArgsText = '"' + (Join-Path $InstallDir 'launcher.py') + '"'
    }
}

$created = 0
if (-not $NoDesktopShortcut) {
    $desktopLnk = Join-Path $DesktopDir $LnkName
    New-Shortcut -LnkPath $desktopLnk -Target $Target -ArgsText $ArgsText `
        -WorkDir $InstallDir -Icon $IconFile -Desc '交我导 · 上海交通大学导航（桌面版）'
    Write-Ok "桌面快捷方式: $desktopLnk"
    $created++
}
if (-not $NoStartMenuShortcut) {
    $smDir = Join-Path $StartMenuDir $AppName
    New-Item -ItemType Directory -Force -Path $smDir | Out-Null
    New-Shortcut -LnkPath (Join-Path $smDir $LnkName) -Target $Target -ArgsText $ArgsText `
        -WorkDir $InstallDir -Icon $IconFile -Desc '交我导 · 上海交通大学导航（桌面版）'
    # 开始菜单卸载入口
    $unLnk = Join-Path $smDir '卸载交我导.lnk'
    New-Shortcut -LnkPath $unLnk `
        -Target "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" `
        -ArgsText ('-NoProfile -ExecutionPolicy Bypass -File "' + $ScriptDir + '\install-jiaowodao.ps1" -Uninstall -InstallDir "' + $InstallDir + '"') `
        -WorkDir $ScriptDir -Icon $IconFile -Desc '卸载交我导（保留安装目录）'
    Write-Ok "开始菜单: $smDir"
    $created++
}

# 校验快捷方式
foreach ($lnk in @((Join-Path $DesktopDir $LnkName), (Join-Path $smDir $LnkName))) {
    if (Test-Path $lnk) {
        $ws = New-Object -ComObject WScript.Shell
        $sc = $ws.CreateShortcut($lnk)
        if ($sc.TargetPath -and (Test-Path $sc.TargetPath)) {
            Write-Ok "快捷方式校验通过: $lnk -> $($sc.TargetPath)"
        } else {
            Write-Warn "快捷方式目标不存在: $lnk -> $($sc.TargetPath) $($sc.Arguments)"
        }
    }
}

# ---------- 安装信息 ----------
$info = @{
    app         = 'jiaowodao'
    version     = '2.5.1'
    mode        = $Mode
    installDir  = $InstallDir
    source      = $Source
    installedAt = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
} | ConvertTo-Json
Set-Content -Path (Join-Path $InstallDir 'install-info.json') -Value $info -Encoding UTF8

# ---------- 汇总 ----------
Write-Step '安装完成'
Write-Ok "版本：$ModeName"
Write-Ok "位置：$InstallDir"
Write-Ok "桌面快捷方式：$((Join-Path $DesktopDir $LnkName))"
if (-not $NoStartMenuShortcut) {
    Write-Ok "开始菜单：$(Join-Path $smDir $LnkName)（含卸载入口）"
}
Write-Ok "共创建 $created 个快捷方式"

if ($Launch) {
    Write-Step '启动应用'
    switch ($Mode) {
        'exe'    { Start-Process -FilePath (Join-Path $InstallDir 'Jiaowodao.exe') -WorkingDirectory $InstallDir }
        'edge'   { Start-Process -FilePath "$env:WINDIR\System32\wscript.exe" -ArgumentList ('"' + (Join-Path $InstallDir 'launcher-edge.vbs') + '"') }
        'python' { Start-Process -FilePath $Target -ArgumentList ('"' + (Join-Path $InstallDir 'launcher.py') + '"') -WorkingDirectory $InstallDir }
    }
} elseif (-not $Silent) {
    $ans = Read-Host '是否立即启动应用？(Y/N，默认 Y)'
    if ($ans -eq '' -or $ans -match '^[Yy]') {
        switch ($Mode) {
            'exe'    { Start-Process -FilePath (Join-Path $InstallDir 'Jiaowodao.exe') -WorkingDirectory $InstallDir }
            'edge'   { Start-Process -FilePath "$env:WINDIR\System32\wscript.exe" -ArgumentList ('"' + (Join-Path $InstallDir 'launcher-edge.vbs') + '"') }
            'python' { Start-Process -FilePath $Target -ArgumentList ('"' + (Join-Path $InstallDir 'launcher.py') + '"') -WorkingDirectory $InstallDir }
        }
    }
}

Write-Host ''
Write-Host '提示：如安装后应用被杀毒软件拦截，请将其加入信任列表（PyInstaller 打包的程序可能被误报）。' -ForegroundColor DarkYellow
