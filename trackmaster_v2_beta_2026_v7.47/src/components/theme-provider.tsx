import { createContext, useContext, useEffect, useState, MouseEvent } from "react"
import { baseCssVars, defaultThemeCssVars } from "@/data/themes"

type Theme = "light" | "dark" | "system"
type MenuPosition = "sidebar" | "header"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultMenuPosition?: MenuPosition
  storageKey?: string
  menuPositionStorageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme, event?: MouseEvent<HTMLElement>) => void
  menuPosition: MenuPosition
  setMenuPosition: (position: MenuPosition) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  menuPosition: "sidebar",
  setMenuPosition: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultMenuPosition = "sidebar",
  storageKey = "vite-ui-theme",
  menuPositionStorageKey = "vite-ui-menu-position",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const storedTheme = localStorage.getItem(storageKey)
      if (storedTheme && ["light", "dark", "system"].includes(storedTheme)) {
        return storedTheme as Theme
      }
    } catch (e) {
      console.error("Failed to read theme from localStorage", e)
    }
    return defaultTheme
  })

  const [menuPosition, setMenuPosition] = useState<MenuPosition>(() => {
    try {
      const storedMenuPosition = localStorage.getItem(menuPositionStorageKey)
      if (storedMenuPosition && ["sidebar", "header"].includes(storedMenuPosition)) {
        return storedMenuPosition as MenuPosition
      }
    } catch (e) {
      console.error("Failed to read menu position from localStorage", e)
    }
    return defaultMenuPosition
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")

    const effectiveTheme = theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : theme
    
    root.classList.add(effectiveTheme)

    // Apply base variables
    const baseVars = baseCssVars[effectiveTheme as keyof typeof baseCssVars]
    if (baseVars) {
      Object.entries(baseVars).forEach(([key, value]) => {
        root.style.setProperty(key, value as string)
      })
    }

    // Apply default theme variables
    const themeVars = defaultThemeCssVars[effectiveTheme as keyof typeof defaultThemeCssVars]
    if (themeVars) {
      Object.entries(themeVars).forEach(([key, value]) => {
        root.style.setProperty(key, value as string)
      })
    }
  }, [theme])

  const setTheme = (theme: Theme, event?: MouseEvent<HTMLElement>) => {
    const isAppearanceTransition = 'startViewTransition' in document &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isAppearanceTransition || !event) {
      localStorage.setItem(storageKey, theme);
      setThemeState(theme);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = (document as any).startViewTransition(() => {
      localStorage.setItem(storageKey, theme);
      setThemeState(theme);
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];
      document.documentElement.animate(
        {
          clipPath: clipPath,
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  const value = {
    theme,
    setTheme,
    menuPosition,
    setMenuPosition: (position: MenuPosition) => {
      localStorage.setItem(menuPositionStorageKey, position)
      setMenuPosition(position)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}