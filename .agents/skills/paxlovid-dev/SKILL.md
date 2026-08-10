---
name: paxlovid-dev
description: >-
  Use this skill when you need to compile, build, package, or test the Paxlovid 
  Interaction Checker (Paxlovid.exe) or modify its parser rules and color themes.
---

# Paxlovid Checker Developer Skill

This skill outlines the procedures for building, compiling, packaging, and deploying the Paxlovid Interaction Warning System.

## Project Structure

- `src/`: React + TypeScript frontend codebase (Vite-based)
  - [App.tsx](file:///f:/Paxlovid/src/App.tsx): Main layout, theme definitions (明亮, 暗色, 護眼), Logo dimensions.
  - [PaxlovidChecker.tsx](file:///f:/Paxlovid/src/components/PaxlovidChecker.tsx): Core UI cards, print dialog rendering, print deduplication.
  - [paxlovidParser.ts](file:///f:/Paxlovid/src/utils/paxlovidParser.ts): 4-line pre-scan source matching (院所名稱 & 就醫類別), date parsing, and duplicate drug grouping.
  - [paxlovidHtaData.ts](file:///f:/Paxlovid/src/utils/paxlovidHtaData.ts): HTA official database keywords (`proh`, `dont`, `pote`, `safe`).
- `src-tauri/`: Tauri Rust core and icons configuration.
- `launcher/`: Standalone Rust launcher wrapping WebView2 configuration.
- `scripts/convert_icons.py`: Script to automatically resize assets to Tauri standard dimensions.
- `Paxlovid.exe`: The final compiled launcher at the root directory.

## Development Workflows

### 1. Build Frontend
Before compiling Rust binaries, always build the React assets:
```powershell
$env:PATH="F:\mingw64\mingw64\bin;F:\node-v24.16.0-win-x64;" + $env:PATH
npm run build
```

### 2. Compile Tauri Core (Release)
```powershell
$env:PATH="F:\mingw64\mingw64\bin;F:\node-v24.16.0-win-x64;" + $env:PATH
cargo build --manifest-path src-tauri/Cargo.toml --release
```

### 3. Compile Standalone Launcher
```powershell
$env:PATH="F:\mingw64\mingw64\bin;F:\node-v24.16.0-win-x64;" + $env:PATH
cargo build --manifest-path launcher/Cargo.toml --release
```

### 4. Overwrite Root Executable
Ensure the running application is stopped first:
```powershell
Stop-Process -Name "Paxlovid" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "launcher/target/release/Paxlovid.exe" -Destination "Paxlovid.exe" -Force
```

### 5. Git Branch Management
Always commit and push to `v2-release` and then sync to `master`:
```powershell
git add .
git commit -m "Commit message"
git push origin v2-release
git checkout master
git merge v2-release
git push origin master
git checkout v2-release
```
