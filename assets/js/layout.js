import { CONFIG } from "./config.js";
import { role, can, isLoggedIn, getSession } from "./auth.js";
import { getSettings } from "./admin_settings.js";

async function fetchText(paths) {
  let last = null;
  for (const p of paths) {
    try {
      const res = await fetch(p, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${p}`);
      return await res.text();
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error("Layout not found");
}

export async function loadLayout() {
  const html = await fetchText([
    "./partials/layout.html",
    "./Particles/layout.html",
    "./layout.html",
  ]);

  document.getElementById("app").innerHTML = html;

  const s = getSettings();
  const title = document.getElementById("appTitle");
  if (title) title.textContent = s.siteName || CONFIG.appName;

  updateTopUI();
}

export function updateTopUI() {
  const s = getSession();
  const logged = isLoggedIn();

  const roleTag = document.getElementById("roleTag");
  const welcomeTag = document.getElementById("welcomeTag");
  const loginPill = document.getElementById("loginPill");
  const logoutPill = document.getElementById("logoutPill");
  const profilePill = document.getElementById("profilePill");
  const navAdmin = document.getElementById("navAdmin");

  if (roleTag) roleTag.textContent = `Role: ${role()}`;

  if (welcomeTag) {
    if (logged && s?.displayName) {
      welcomeTag.textContent = `Welcome, ${s.displayName}`;
      welcomeTag.classList.remove("hide");
    } else {
      welcomeTag.classList.add("hide");
    }
  }

  if (loginPill) loginPill.classList.toggle("hide", logged);
  if (logoutPill) logoutPill.classList.toggle("hide", !logged);
  if (profilePill) profilePill.classList.toggle("hide", !logged);

  if (navAdmin) navAdmin.classList.toggle("hide", !can("admin_panel"));
}