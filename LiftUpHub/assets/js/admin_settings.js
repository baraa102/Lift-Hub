import { role } from "./auth.js";

export const SETTINGS_KEY = "luh_site_settings_v2";

function load() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); }
  catch { return {}; }
}
function save(v) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(v)); }

function normalizeHex(hex, fallback) {
  const h = (hex || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(h) ? h : fallback;
}

export function getSettings() {
  const s = load();
  return {
    siteName: s.siteName || "Lift Up Hub",
    tagline: s.tagline || "Be kind. Be confident. Lift others up.",
    primary: normalizeHex(s.primary, "#7c3aed"),
    secondary: normalizeHex(s.secondary, "#22c55e"),
    enableChat: (s.enableChat ?? true),
    enableGuides: (s.enableGuides ?? true),
    enableParticles: (s.enableParticles ?? true),
  };
}

export function mountAdminSettings() {
  const msg = document.getElementById("setMsg");
  if (role() !== "admin") {
    msg.textContent = "Access denied.";
    return;
  }

  const s = getSettings();

  const site = document.getElementById("setSiteName");
  const tag = document.getElementById("setTagline");
  const p = document.getElementById("setPrimary");
  const se = document.getElementById("setSecondary");
  const chat = document.getElementById("toggleChat");
  const guides = document.getElementById("toggleGuides");
  const particles = document.getElementById("toggleParticles");

  site.value = s.siteName;
  tag.value = s.tagline;
  p.value = s.primary;
  se.value = s.secondary;
  chat.checked = s.enableChat;
  guides.checked = s.enableGuides;
  particles.checked = s.enableParticles;

  document.getElementById("saveSiteSettings").onclick = () => {
    const next = {
      siteName: (site.value || "").trim() || "Lift Up Hub",
      tagline: (tag.value || "").trim() || "Be kind. Be confident. Lift others up.",
      primary: normalizeHex(p.value, "#7c3aed"),
      secondary: normalizeHex(se.value, "#22c55e"),
      enableChat: !!chat.checked,
      enableGuides: !!guides.checked,
      enableParticles: !!particles.checked,
    };

    save(next);
    msg.textContent = "Saved ✅ Applying now…";
    window.dispatchEvent(new CustomEvent("luh:settingsChanged", { detail: next }));
    setTimeout(() => (msg.textContent = "Saved ✅"), 600);
  };
}