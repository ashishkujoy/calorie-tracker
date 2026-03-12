import { getAuthState, getStoredToken } from "/js/auth.js";
import { initMealScan } from "/js/meal-scan.js";
import { initMealHistory } from "/js/meal_history.js";

const decodeJWT = (jwt) => {
  const parts = jwt.split(".");
  const payload = JSON.parse(atob(parts[1]));
  const name = payload.name || payload.email || "User";
  const email = payload.email ?? "";
  return { name, email };
};

const setupTabs = () => {
  const tabs = document.querySelectorAll(".cs-tab");
  let historyInitialised = false;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("cs-tab--active"));
      tab.classList.add("cs-tab--active");
      document.querySelectorAll(".cs-tab-panel").forEach((panel) => {
        panel.hidden = panel.id !== `tab-${tab.dataset.tab}`;
      });

      if (tab.dataset.tab === "history" && !historyInitialised) {
        historyInitialised = true;
        initMealHistory(document.getElementById("tab-history"), getStoredToken);
      }
    });
  });
};

window.onload = async () => {
  const state = await getAuthState();
  if (state.status !== "authenticated") {
    window.location.replace("/");
  } else {
    try {
      const { name, email } = decodeJWT(state.token);
      document.getElementById("user-info").textContent = `${name} ${email}`;
    } catch {
      document.getElementById("user-info").textContent = "Welcome!";
    }
    setupTabs();
    initMealScan(document.getElementById("meal-scan"));
  }
};
