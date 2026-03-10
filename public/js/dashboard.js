import { getAuthState } from "/js/auth.js";

const decodeJWT = (jwt) => {
  const parts = jwt.split(".");
  const payload = JSON.parse(atob(parts[1]));
  const name = payload.name || payload.email || "User";
  const email = payload.email ?? "";
  return { name, email };
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
  }
};
