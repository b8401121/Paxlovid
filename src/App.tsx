import React, { useState, useEffect } from 'react';
import { FluentProvider, webLightTheme, webDarkTheme, Button, tokens } from '@fluentui/react-components';
import { PaxlovidChecker } from './components/PaxlovidChecker';
import wuLogo from './assets/wu_ent_logo.jpg';
import './App.css';

// Eye-friendly clinical forest-teal dark theme (Parent-Child Clinic Soft Night)
const clinicalDarkTheme = {
  ...webDarkTheme,
  colorNeutralBackground1: "#0d1f1b", // Deep forest slate-green
  colorNeutralBackground2: "#152e29", // Medium forest slate-green
  colorNeutralBackground3: "#0d1f1b", 
  colorNeutralBackground4: "#071311", // Deepest forest green
  colorNeutralBackground5: "#0d1f1b",
  colorNeutralBackground6: "#152e29",
  
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
  colorBrandStroke2: "#14b8a6",
};

// Eye-friendly clinical forest-teal light theme (Parent-Child Soft Mint)
const clinicalLightTheme = {
  ...webLightTheme,
  colorNeutralBackground1: "#f2f8f6", // Soft mint cream
  colorNeutralBackground2: "#e6f2ed", // Mint green light card background
  colorNeutralBackground3: "#dbece5", // Slightly darker mint separator
  colorNeutralBackground4: "#cce2d8",
  
  colorBrandBackground: "#0d9488", 
  colorBrandBackgroundHover: "#0f766e", 
  colorBrandBackgroundPressed: "#115e59", 
  colorBrandBackgroundSelected: "#0d9488",
  
  colorBrandForeground1: "#0d9488",
  colorBrandForeground2: "#0f766e",
  colorBrandForegroundLink: "#0d9488",
  colorBrandForegroundLinkHover: "#0f766e",

  colorBrandStroke1: "#0d9488",
  colorBrandStroke2: "#14b8a6",
};

// Eye-friendly clinical sepia/book-paper theme (🍵 Warm Sepia/Cream)
const clinicalEyecareTheme = {
  ...webLightTheme,
  colorNeutralBackground1: "#eadabe", // Antique book paper background (zero blue-light glare)
  colorNeutralBackground2: "#e4d4b2", // Slightly deeper card background
  colorNeutralBackground3: "#dccb9f", 
  colorNeutralBackground4: "#d2c193",
  
  colorNeutralForeground1: "#2e2518", // Soothing warm deep-charcoal-brown instead of harsh black
  colorNeutralForeground2: "#453825",
  colorNeutralForeground3: "#5e4e37",
  colorNeutralForeground4: "#7c6a51",
  
  colorBrandBackground: "#b25e1a", // Warm amber/orange
  colorBrandBackgroundHover: "#9a4f12", 
  colorBrandBackgroundPressed: "#84420c", 
  colorBrandBackgroundSelected: "#b25e1a",
  
  colorBrandForeground1: "#b25e1a",
  colorBrandForeground2: "#9a4f12",
  colorBrandForegroundLink: "#b25e1a",
  colorBrandForegroundLinkHover: "#9a4f12",

  colorBrandStroke1: "#b25e1a",
  colorBrandStroke2: "#c67530",
};

export const App: React.FC = () => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'eyecare'>('eyecare'); // Default to eyecare for warm child-friendly clinic environment

  // Sync theme class to body for custom CSS styles
  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(`theme-${themeMode}`);
  }, [themeMode]);

  const getFluentTheme = () => {
    if (themeMode === 'dark') return clinicalDarkTheme;
    if (themeMode === 'eyecare') return clinicalEyecareTheme;
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
