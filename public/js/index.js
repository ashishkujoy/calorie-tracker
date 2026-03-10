import {
  extractErrorFromSearch,
  getAuthState,
  getErrorMessage,
} from "/js/auth.js";

const showErrorOnOAuthFailure = (errorBanner) => {
  const errorCode = extractErrorFromSearch();
  if (errorCode) {
    const msg = getErrorMessage(errorCode);
    if (msg) {
      errorBanner.textContent = msg;
      errorBanner.hidden = false;
    }
  }
};

const setupErrorCleanUpOnSignInClick = (errorBanner, googleBtn) => {
  googleBtn.addEventListener("click", () => {
    errorBanner.hidden = true;
    googleBtn.setAttribute("data-loading", "");
    googleBtn.setAttribute("aria-disabled", "true");
  });
};

const redirectLoggedInUserToDashboard = async () => {
  const state = await getAuthState();
  if (state.status === "authenticated") {
    window.location.replace("/dashboard.html");
  }
};

window.onload = async () => {
  const errorBanner = document.getElementById("error-banner");
  const googleBtn = document.getElementById("google-btn");
  showErrorOnOAuthFailure(errorBanner);
  setupErrorCleanUpOnSignInClick(errorBanner, googleBtn);
  await redirectLoggedInUserToDashboard();
};
