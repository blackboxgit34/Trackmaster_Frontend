let initialized = false;

export const initApp = () => {
  if (initialized) return; // avoid double execution

  initialized = true;

  const firstLoad = sessionStorage.getItem("firstLoad");

  if (!firstLoad) {
    // 🔥 clear ALL local storage
    localStorage.clear();

    sessionStorage.setItem("firstLoad", "done");

    console.log("✅ First time app load: cleared ALL localStorage");
  }
};