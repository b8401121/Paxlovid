import React, { useState, useEffect } from 'react';
import { FluentProvider, webLightTheme, webDarkTheme, Button, tokens } from '@fluentui/react-components';
import { PaxlovidChecker } from './components/PaxlovidChecker';
import wuLogo from './assets/wu_ent_logo.jpg';
import './App.css';

// Eye-friendly clinical slate-teal dark theme
const clinicalDarkTheme = {
  ...webDarkTheme,
  colorNeutralBackground1: "#0f172a", // Slate 900
  colorNeutralBackground2: "#1e293b", // Slate 800
  colorNeutralBackground3: "#0f172a", 
  colorNeutralBackground4: "#020617", // Slate 950
  colorNeutralBackground5: "#0f172a",
  colorNeutralBackground6: "#1e293b",
  
  colorBrandBackground: "#0d9488", // Teal 600
  colorBrandBackgroundHover: "#0f766e", // Teal 700
  colorBrandBackgroundPressed: "#115e59", // Teal 800
  colorBrandBackgroundSelected: "#0d9488",
  
  colorBrandForeground1: "#2dd4bf", // Teal 400
  colorBrandForeground2: "#5eead4", // Teal 300
  colorBrandForegroundLink: "#2dd4bf",
  colorBrandForegroundLinkHover: "#5eead4",
  colorBrandForegroundLinkPressed: "#2dd4bf",
  colorBrandForegroundLinkSelected: "#2dd4bf",

  colorBrandStroke1: "#0d9488",
  colorBrandStroke2: "#14b8a6", // Teal 500
};

// Eye-friendly clinical slate-teal light theme
const clinicalLightTheme = {
  ...webLightTheme,
  colorNeutralBackground1: "#f8fafc", // Slate 50
  colorNeutralBackground2: "#f1f5f9", // Slate 100
  colorNeutralBackground3: "#e2e8f0", // Slate 200
  colorNeutralBackground4: "#cbd5e1",
  
  colorBrandBackground: "#0f766e", 
  colorBrandBackgroundHover: "#115e59", 
  colorBrandBackgroundPressed: "#134e4a", 
  colorBrandBackgroundSelected: "#0f766e",
  
  colorBrandForeground1: "#0f766e",
  colorBrandForeground2: "#115e59",
  colorBrandForegroundLink: "#0f766e",
  colorBrandForegroundLinkHover: "#115e59",

  colorBrandStroke1: "#0f766e",
  colorBrandStroke2: "#14b8a6",
};

export const App: React.FC = () => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'eyecare'>('dark'); // Default to dark like BEER

  // Sync theme class to body for custom CSS styles
  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(`theme-${themeMode}`);
  }, [themeMode]);

  const getFluentTheme = () => {
    if (themeMode === 'dark') return clinicalDarkTheme;
    // For eyecare we use light theme controls but with customized warm backgrounds in CSS
    return clinicalLightTheme;
  };

  return (
    <FluentProvider theme={getFluentTheme()}>
      <div className={`app-container ${themeMode}`}>
        <header className="app-header">
          <div className="app-title-group" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img 
              src={wuLogo} 
              alt="吳鎮宇親子耳鼻喉科診所 Logo" 
              style={{ 
                width: '96px', 
                height: '96px', 
                borderRadius: '50%', 
                border: '4px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                backgroundColor: '#ffffff',
                flexShrink: 0
              }} 
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="app-badge">吳鎮宇親子耳鼻喉科診所</span>
              </div>
              <h1 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 600 }}>
                Paxlovid (Nirmatrelvir/Ritonavir) 用藥交互作用警示篩選系統
              </h1>
            </div>
          </div>
          <div className="app-header-controls">
            <div className="theme-toggle-group">
              <Button 
                appearance={themeMode === 'light' ? 'primary' : 'secondary'} 
                size="small"
                onClick={() => setThemeMode('light')}
              >
                ☀️ 臨床明亮
              </Button>
              <Button 
                appearance={themeMode === 'eyecare' ? 'primary' : 'secondary'} 
                size="small"
                onClick={() => setThemeMode('eyecare')}
              >
                🍵 護眼溫和
              </Button>
              <Button 
                appearance={themeMode === 'dark' ? 'primary' : 'secondary'} 
                size="small"
                onClick={() => setThemeMode('dark')}
              >
                🌙 臨床深色
              </Button>
            </div>
          </div>
        </header>
        <main className="app-main">
          <PaxlovidChecker />
        </main>
        <footer className="app-footer">
          Paxlovid Drug-Drug Interaction Checker | 吳鎮宇耳鼻喉科診所 專用獨立版
        </footer>
      </div>
    </FluentProvider>
  );
};

export default App;
