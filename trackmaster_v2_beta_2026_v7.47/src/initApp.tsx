let initialized = false;

export const initApp = () => {
  if (initialized) return;
  initialized = true;

  // ✅ FIXED: Clear localStorage ONLY on true first app launch
  // Use a persistent marker to track if app has been initialized before
  const hasRunBefore = localStorage.getItem("app-has-run-before");

  if (!hasRunBefore) {
    // 🔥 First time ever - clear ALL data
    localStorage.clear();
    
    // Mark that app has run before
    localStorage.setItem("app-has-run-before", "true");
  }
  // On subsequent loads (including new tabs), don't clear anything
  // Let UserContext read existing auth data from localStorage
};