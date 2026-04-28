import { ThemeProvider } from './components/theme-provider';
import { UserProvider } from './context/UserContext';
import { SettingsProvider } from './context/SettingsContext';
import { PoiProvider } from './context/PoiContext';
import AppRoutes from './routes';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <UserProvider>
        <SettingsProvider>
          <PoiProvider>
            <AppRoutes />
          </PoiProvider>
        </SettingsProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;