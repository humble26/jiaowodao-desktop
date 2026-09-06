#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
交我导 · 上海交通大学导航（桌面版）启动器

优先使用 pywebview（WebView2 内核）打开原生桌面窗口；
若依赖缺失或启动失败，自动回退到 Edge 应用模式（无浏览器边框的应用窗口）。
"""
import os
import shutil
import subprocess
import sys
import time
import urllib.parse
import webbrowser

# 应用目录：exe 打包后以 exe 所在目录为准（__file__ 在 PyInstaller 下指向临时解压目录）
if getattr(sys, 'frozen', False):
    APP_DIR = os.path.dirname(os.path.abspath(sys.executable))
else:
    APP_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_HTML = os.path.join(APP_DIR, 'app.html')
ICON_PATH = os.path.join(APP_DIR, 'icon.ico')

# pywebview(WebView2) 的用户数据目录（HTTP 缓存与 localStorage 都在这下面）
WEBVIEW_DATA_DIR = os.path.join(
    os.environ.get('APPDATA', os.path.expanduser('~')), 'pywebview')
WEBVIEW_CACHE_DIRS = [
    os.path.join(WEBVIEW_DATA_DIR, 'EBWebView', 'Default', 'Cache'),
    os.path.join(WEBVIEW_DATA_DIR, 'EBWebView', 'Default', 'Code Cache'),
]
CACHE_MARKER = os.path.join(APP_DIR, '.app_cache_ver')
_CLEAR_RETRIES = 3
_CLEAR_RETRY_DELAY = 0.4  # 秒


def _frontend_files():
    """应用目录内决定前端内容的关键文件（html/js/css，含 data/ 数据文件）。"""
    files = [INDEX_HTML]
    try:
        for name in os.listdir(APP_DIR):
            p = os.path.join(APP_DIR, name)
            if os.path.isfile(p) and name.endswith(('.js', '.css')):
                files.append(p)
        data_dir = os.path.join(APP_DIR, 'data')
        if os.path.isdir(data_dir):
            for name in os.listdir(data_dir):
                if name.endswith(('.js', '.css')):
                    files.append(os.path.join(data_dir, name))
    except Exception:
        pass
    return files


def _frontend_mtime():
    """所有前端文件的最新修改时间（任一文件更新都应触发缓存失效）。"""
    m = 0
    for f in _frontend_files():
        try:
            m = max(m, int(os.path.getmtime(f)))
        except Exception:
            pass
    return m


def _clear_webview_cache():
    """清空 WebView2 HTTP 缓存目录；带重试（上一实例的 WebView2 子进程
    退出前会短暂占用文件）。返回是否全部清理成功。"""
    for attempt in range(_CLEAR_RETRIES):
        ok = True
        for d in WEBVIEW_CACHE_DIRS:
            try:
                if os.path.isdir(d):
                    shutil.rmtree(d)
            except Exception:
                ok = False
        if ok:
            return True
        if attempt < _CLEAR_RETRIES - 1:
            time.sleep(_CLEAR_RETRY_DELAY)
    return False


def invalidate_stale_cache():
    """页面文件更新时清除 WebView2 的 HTTP 缓存（保留 localStorage），
    避免旧页面/旧脚本被缓存导致界面不更新。

    关键点：
    - 监控全部 html/js/css 文件（不只 app.html）
    - 仅当缓存删除成功后才记录版本标记；删除失败（文件被占用）不写标记，
      下次启动会重试，确保旧缓存最终一定被清除
    """
    mtime = _frontend_mtime()
    if mtime <= 0:
        return
    try:
        with open(CACHE_MARKER, 'r') as f:
            old = int(f.read().strip() or '-1')
    except Exception:
        old = -1
    if old == mtime:
        return
    if _clear_webview_cache():
        try:
            with open(CACHE_MARKER, 'w') as f:
                f.write(str(mtime))
        except Exception:
            pass
    # 删除失败：不写标记，下次启动重试


def find_edge():
    candidates = [
        r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
        r'C:\Program Files (x86)\Microsoft\EdgeCore\Application\msedge.exe',
        r'C:\Program Files\Microsoft\EdgeCore\Application\msedge.exe',
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return None


def _file_url(path, bust=False):
    """构造 file:// URL；bust=True 时附加前端文件版本参数（Edge 原生支持）。"""
    url = 'file:///' + urllib.parse.quote(path.replace('\\', '/'))
    if bust:
        try:
            url += '?v=' + str(_frontend_mtime())
        except Exception:
            pass
    return url


def launch_edge_app_mode():
    """回退方案：Edge 应用模式窗口。"""
    edge = find_edge()
    if not edge:
        # 最后兜底：交给系统默认浏览器
        webbrowser.open(_file_url(INDEX_HTML, bust=True))
        return
    subprocess.Popen([
        edge,
        '--app=' + _file_url(INDEX_HTML, bust=True),
        '--window-size=1280,900',
        '--no-first-run',
    ])


class Api:
    """暴露给前端 JS 的桥接接口（站外链接交给系统默认浏览器）。"""

    def open_url(self, url):
        try:
            webbrowser.open(url)
            return True
        except Exception:
            return False

    def quit_app(self):
        """免责声明「退出应用」：关闭全部窗口，结束程序。"""
        try:
            import webview as _wv
            for w in list(_wv.windows):
                w.destroy()
            return True
        except Exception:
            return False

    def save_qr_png(self, b64data, filename='jiaowodao-qr.png'):
        """二维码「保存图片」：弹出系统另存为对话框，由用户选择保存位置。"""
        try:
            path = _save_png_bytes(b64data, _safe_filename(filename))
            if path is None:
                return {'ok': False, 'cancelled': True}
            return {'ok': True, 'path': path}
        except Exception as e:
            return {'ok': False, 'error': str(e)}


def _safe_filename(name, fallback='jiaowodao-qr.png'):
    """文件名消毒（纵深防御）：过滤 Windows 非法字符、首尾点空格、
    保留名回退、限长、补 .png 后缀。支持中文文件名。"""
    import re
    name = (name or '').strip()
    name = re.sub(r'[\\/:*?"<>|\x00-\x1f]+', '_', name)
    name = re.sub(r'[. ]+$', '', name).strip()
    if not name or re.match(r'^(con|prn|aux|nul|com[1-9]|lpt[1-9])$', name, re.IGNORECASE):
        name = fallback
    if len(name) > 200:
        name = name[:200]
    if not name.lower().endswith('.png'):
        name += '.png'
    return name


def _save_png_bytes(b64data, filename='jiaowodao-qr.png'):
    """解码 base64 PNG 并弹系统保存对话框写入。返回保存路径；取消返回 None。"""
    import base64
    import webview as _wv
    raw = base64.b64decode(b64data)
    if not _wv.windows:
        raise RuntimeError('no-window')
    result = _wv.windows[0].create_file_dialog(
        _wv.SAVE_DIALOG,
        save_filename=_safe_filename(filename),
        file_types=('PNG 图片 (*.png)', 'All files (*.*)'),
    )
    if not result:
        return None
    path = result[0] if isinstance(result, (list, tuple)) else result
    with open(path, 'wb') as f:
        f.write(raw)
    return path


def main():
    try:
        import webview  # pywebview
    except Exception:
        launch_edge_app_mode()
        return

    invalidate_stale_cache()  # 页面文件更新时清 WebView2 缓存，保证加载最新界面

    api = Api()
    try:
        webview.create_window(
            '交我导 · 上海交通大学导航',
            INDEX_HTML,
            js_api=api,
            width=1280,
            height=900,
            min_size=(940, 620),
        )
        webview.start(
            private_mode=False,  # 持久化 localStorage（搜索历史/主题/更新缓存/免责声明勾选）
            icon=ICON_PATH if os.path.isfile(ICON_PATH) else None,
        )
    except Exception:
        # pywebview 启动失败（如缺少 WebView2）时回退
        launch_edge_app_mode()


if __name__ == '__main__':
    main()
