#![windows_subsystem = "windows"]

use std::env;
use std::fs;
use std::process::Command;
use std::path::PathBuf;

// 在編譯期將所有需要的檔案嵌入 EXE
const APP_EXE_BYTES: &[u8] = include_bytes!("../../src-tauri/target/release/paxlovid-tauri.exe");
const WEBVIEW2_DLL_BYTES: &[u8] = include_bytes!("../../src-tauri/target/release/WebView2Loader.dll");
const WEBVIEW2_SETUP_BYTES: &[u8] = include_bytes!("MicrosoftEdgeWebview2Setup.exe");

fn check_webview2_installed() -> bool {
    // 檢查機器層級安裝
    let paths = [
        r"HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
        r"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
        r"HKEY_CURRENT_USER\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
    ];
    for path in &paths {
        let ok = Command::new("reg")
            .args(["query", path, "/v", "pv"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
        if ok { return true; }
    }
    false
}

fn install_webview2(temp_dir: &PathBuf) -> bool {
    let setup_path = temp_dir.join("MicrosoftEdgeWebview2Setup.exe");
    if fs::write(&setup_path, WEBVIEW2_SETUP_BYTES).is_err() {
        return false;
    }
    Command::new(&setup_path)
        .args(["/silent", "/install"])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn main() {
    let temp_dir = env::temp_dir().join("Paxlovid_App");
    if fs::create_dir_all(&temp_dir).is_err() {
        return;
    }

    let target_exe = temp_dir.join("paxlovid-tauri.exe");
    let target_dll = temp_dir.join("WebView2Loader.dll");

    // 如果 EXE 不存在或版本不同就重新寫出
    let _ = fs::write(&target_exe, APP_EXE_BYTES);
    let _ = fs::write(&target_dll, WEBVIEW2_DLL_BYTES);

    // 確保 WebView2 Runtime 已安裝，若無則自動安裝
    if !check_webview2_installed() {
        install_webview2(&temp_dir);
    }

    // 啟動主程式
    let _ = Command::new(&target_exe)
        .current_dir(&temp_dir)
        .status();
}
