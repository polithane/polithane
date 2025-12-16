import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

const defaultTheme = {
  primaryColor: '#009FD6',
  secondaryColor: '#10b981',
  accentColor: '#f59e0b',
  dangerColor: '#ef4444',
  backgroundColor: '#f9fafb',
  textColor: '#111827',
  borderRadius: '0.75rem',
  fontFamily: 'Inter, system-ui, sans-serif',
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(defaultTheme);
  const [darkMode, setDarkMode] = useState(false);

  // Load theme from localStorage
  useEffect(() => {
    const read = () => {
      const savedTheme = localStorage.getItem('theme');
      const savedDarkMode = localStorage.getItem('darkMode');
      if (savedTheme) {
        try {
          setTheme(JSON.parse(savedTheme));
        } catch {
          // ignore
        }
      }
      if (savedDarkMode != null) {
        setDarkMode(savedDarkMode === 'true');
      }
    };

    read();

    // React to updates triggered elsewhere (e.g., settings saved after login)
    const onStorage = (e) => {
      if (e?.key === 'theme' || e?.key === 'darkMode') read();
    };
    const onThemeApply = () => read();
    window.addEventListener('storage', onStorage);
    window.addEventListener('theme:apply', onThemeApply);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('theme:apply', onThemeApply);
    };
  }, []);

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--secondary-color', theme.secondaryColor);
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--danger-color', theme.dangerColor);
    root.style.setProperty('--background-color', theme.backgroundColor);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--border-radius', theme.borderRadius);
    root.style.setProperty('--font-family', theme.fontFamily);
    
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, darkMode]);

  // Update theme
  const updateTheme = (newTheme) => {
    const updatedTheme = { ...theme, ...newTheme };
    setTheme(updatedTheme);
    localStorage.setItem('theme', JSON.stringify(updatedTheme));
    window.dispatchEvent(new Event('theme:apply'));
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    window.dispatchEvent(new Event('theme:apply'));
  };

  // Direct setters (used by settings pages)
  const setDarkModeValue = (value) => {
    const v = !!value;
    setDarkMode(v);
    localStorage.setItem('darkMode', v.toString());
    window.dispatchEvent(new Event('theme:apply'));
  };

  const setPrimaryColor = (value) => {
    const v = String(value || '').trim();
    if (!v) return;
    updateTheme({ primaryColor: v });
  };

  // Reset to default
  const resetTheme = () => {
    setTheme(defaultTheme);
    localStorage.removeItem('theme');
  };

  const value = {
    theme,
    darkMode,
    primaryColor: theme.primaryColor,
    updateTheme,
    toggleDarkMode,
    setDarkMode: setDarkModeValue,
    setPrimaryColor,
    resetTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
