/* assets/js/app.js — single-file stable build (no imports)
   Added:
   - Auth modal
   - Pin fix
   - Pages: Feedback, Kindness Quest, Appreciation Wall
   - Feedback export JSON/CSV
   - Admin Control Center: Branding, Audit Log, Export/Import, Moderation
*/

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  const KEYS = {
    users: "luh_users_mono_v1",
    session: "luh_session_mono_v1",
    guides: "luh_guides_mono_v1",
    fav: "luh_guides_fav_mono_v1",
    chat: "luh_chat_mono_v1",
    chatName: "luh_chat_name_mono_v1",
    chatChannel: "luh_chat_channel_mono_v1",
    settings: "luh_settings_mono_v1",
    theme: "luh_theme",
    pins: "luh_pins_mono_v1",
    drawerW: "luh_drawer_widths_mono_v1",

    // Features
    feedback: "luh_feedback_v1",
    quotes: "luh_quotes_v1",
    kindness: "luh_kindness_v1",
    wall: "luh_appreciation_wall_v1",

    // Admin extras
    audit: "luh_audit_v1",
    reports: "luh_reports_v1",
    brandLogoText: "luh_brand_logoText",
    brandFooterText: "luh_brand_footerText",
  };

  const CONFIG = {
    appName: "Lift Up Hub",
    passMin: 10,
    usernameMin: 3,
    usernameMax: 16,
    usernameRx: /^[A-Za-z0-9_]+$/,
  };

  // -----------------------------
  // Storage helpers
  // -----------------------------
  function loadJSON(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  }
  function saveJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // -----------------------------
  // Session / Roles
  // -----------------------------
  function getSession() {
    try {
      const v = sessionStorage.getItem(KEYS.session);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  }
  function setSession(s) {
    sessionStorage.setItem(KEYS.session, JSON.stringify(s));
  }
  function clearSession() {
    sessionStorage.removeItem(KEYS.session);
  }
  function isLoggedIn() {
    return !!getSession();
  }
  function role() {
    return getSession()?.role || "guest";
  }
  function can(action) {
    const r = role();
    const map = {
      admin_panel: ["admin"],
      guide_manage: ["admin", "teacher"],
      chat_send: ["admin", "teacher", "student"],
      chat_delete: ["admin"],

      wall_delete: ["admin"],
      feedback_manage: ["admin"],

      moderation_manage: ["admin"],
      audit_manage: ["admin"],
      backup_manage: ["admin"],
      quote_manage: ["admin"],
    };
    return (map[action] || []).includes(r);
  }

  // -----------------------------
  // Audit log
  // -----------------------------
  function audit(action, detail = {}) {
    const s = getSession();
    const entry = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      action,
      actor: s ? (s.displayName || s.username) : "guest",
      role: role(),
      detail,
    };
    const log = loadJSON(KEYS.audit, []);
    log.push(entry);
    saveJSON(KEYS.audit, log.slice(-1500));
  }
  function getAudit() {
    return loadJSON(KEYS.audit, []);
  }

  // -----------------------------
  // Export / Import pack (whole app)
  // -----------------------------
  function exportPack() {
    return {
      exportedAt: new Date().toISOString(),
      version: "1.1",
      settings: loadJSON(KEYS.settings, {}),
      brandLogoText: localStorage.getItem(KEYS.brandLogoText) || "",
      brandFooterText: localStorage.getItem(KEYS.brandFooterText) || "",
      users: loadJSON(KEYS.users, []),
      guides: loadJSON(KEYS.guides, []),
      fav: loadJSON(KEYS.fav, {}),
      chat: loadJSON(KEYS.chat, []),
      feedback: loadJSON(KEYS.feedback, []),
      kindness: loadJSON(KEYS.kindness, {}),
      wall: loadJSON(KEYS.wall, []),
      reports: loadJSON(KEYS.reports, []),
      audit: loadJSON(KEYS.audit, []),
    };
  }
  function importPack(pack) {
    if (!pack || typeof pack !== "object") throw new Error("Invalid backup file.");
    if (pack.settings !== undefined) saveJSON(KEYS.settings, pack.settings);
    if (pack.users !== undefined) saveJSON(KEYS.users, pack.users);
    if (pack.guides !== undefined) saveJSON(KEYS.guides, pack.guides);
    if (pack.fav !== undefined) saveJSON(KEYS.fav, pack.fav);
    if (pack.chat !== undefined) saveJSON(KEYS.chat, pack.chat);
    if (pack.feedback !== undefined) saveJSON(KEYS.feedback, pack.feedback);
    if (pack.kindness !== undefined) saveJSON(KEYS.kindness, pack.kindness);
    if (pack.wall !== undefined) saveJSON(KEYS.wall, pack.wall);
    if (pack.reports !== undefined) saveJSON(KEYS.reports, pack.reports);
    if (pack.audit !== undefined) saveJSON(KEYS.audit, pack.audit);
    if (pack.brandLogoText !== undefined) localStorage.setItem(KEYS.brandLogoText, pack.brandLogoText || "");
    if (pack.brandFooterText !== undefined) localStorage.setItem(KEYS.brandFooterText, pack.brandFooterText || "");
  }

  // -----------------------------
  // Settings
  // -----------------------------
  function getSettings() {
    const s = loadJSON(KEYS.settings, {});
    return {
      siteName: s.siteName || CONFIG.appName,
      tagline: s.tagline || "Be kind. Be confident. Lift others up.",
      primary: /^#[0-9a-fA-F]{6}$/.test(s.primary || "") ? s.primary : "#7c3aed",
      secondary: /^#[0-9a-fA-F]{6}$/.test(s.secondary || "") ? s.secondary : "#22c55e",
      enableGuides: s.enableGuides ?? true,
      enableChat: s.enableChat ?? true,
      enableParticles: s.enableParticles ?? true,
    };
  }

  function applySettings() {
    const s = getSettings();
    document.title = s.siteName;
    document.documentElement.style.setProperty("--brand", s.primary);
    document.documentElement.style.setProperty("--brand2", s.secondary);

    const titleEl = $("#appTitle");
    const logoText = localStorage.getItem(KEYS.brandLogoText);
    if (titleEl) titleEl.textContent = (logoText && logoText.trim()) ? logoText.trim() : s.siteName;

    const taglineEl = $("#homeTagline");
    if (taglineEl) taglineEl.textContent = s.tagline;

    const canvas = $("#particles");
    if (canvas) canvas.style.display = s.enableParticles ? "block" : "none";

    const guidesPill = $("[data-open='drawerGuides']")?.closest(".pill");
    const chatPill = $("[data-open='drawerChat']")?.closest(".pill");
    const dg = $("#drawerGuides");
    const dc = $("#drawerChat");

    if (guidesPill) guidesPill.classList.toggle("hide", !s.enableGuides);
    if (chatPill) chatPill.classList.toggle("hide", !s.enableChat);
    if (dg) dg.classList.toggle("hide", !s.enableGuides);
    if (dc) dc.classList.toggle("hide", !s.enableChat);

    // Optional footer text if exists
    const footer = $("#footerText");
    if (footer) footer.textContent = localStorage.getItem(KEYS.brandFooterText) || "";
  }

  // -----------------------------
  // PIN (real)
  // -----------------------------
  function loadPins() {
    return loadJSON(KEYS.pins, { drawerGuides: false, drawerChat: false });
  }
  function savePins(p) {
    saveJSON(KEYS.pins, p);
  }
  function isPinned(id) {
    return !!loadPins()[id];
  }
  function syncPinButtons() {
    const p = loadPins();
    $$("[data-pin]").forEach((btn) => {
      const id = btn.getAttribute("data-pin");
      const pinned = !!p[id];
      btn.classList.toggle("pinned", pinned);
      btn.textContent = pinned ? "📍" : "📌";
      btn.title = pinned ? "Pinned" : "Pin";
    });
  }
  function setPinned(id, val) {
    const p = loadPins();
    p[id] = !!val;
    savePins(p);
    syncPinButtons();
    if (val) openDrawer(id, { keepOthers: true });
    autoFitPinned();
  }
  function autoFitPinned() {
    const left = $("#drawerGuides");
    const right = $("#drawerChat");
    let leftOffset = 0;
    let rightOffset = 0;

    if (left && left.classList.contains("open") && isPinned("drawerGuides") && !left.classList.contains("hide")) {
      leftOffset = Math.ceil(left.getBoundingClientRect().width + 28);
    }
    if (right && right.classList.contains("open") && isPinned("drawerChat") && !right.classList.contains("hide")) {
      rightOffset = Math.ceil(right.getBoundingClientRect().width + 28);
    }

    document.documentElement.style.setProperty("--leftOffset", leftOffset + "px");
    document.documentElement.style.setProperty("--rightOffset", rightOffset + "px");

    const available = window.innerWidth - leftOffset - rightOffset;
    document.body.classList.toggle("narrow", available < 980);
  }
  window.addEventListener("resize", autoFitPinned);

  function openDrawer(id, opts = {}) {
    const drawer = $("#" + id);
    if (!drawer) return;

    if (!opts.keepOthers) {
      ["drawerGuides", "drawerChat"].forEach((other) => {
        if (other !== id && !isPinned(other)) $("#" + other)?.classList.remove("open");
      });
    }
    drawer.classList.add("open");
    autoFitPinned();
  }
  function hideDrawer(id) {
    if (isPinned(id)) setPinned(id, false);
    $("#" + id)?.classList.remove("open");
    autoFitPinned();
  }

  // -----------------------------
  // Auth (hash demo)
  // -----------------------------
  async function sha256(text) {
    try {
      if (crypto?.subtle?.digest) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        return btoa(String.fromCharCode(...new Uint8Array(buf)));
      }
    } catch {}
    return btoa(text);
  }

  function validateUsername(u) {
    u = (u || "").trim();
    if (u.length < CONFIG.usernameMin || u.length > CONFIG.usernameMax) return `Username must be ${CONFIG.usernameMin}-${CONFIG.usernameMax} characters.`;
    if (!CONFIG.usernameRx.test(u)) return "Username can contain letters/numbers/_ only.";
    return null;
  }
  function validateEmail(e) {
    e = (e || "").trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? null : "Invalid email.";
  }
  function validatePassword(p) {
    p = p || "";
    if (p.length < CONFIG.passMin) return `Password must be at least ${CONFIG.passMin} characters.`;
    if (/\s/.test(p)) return "No spaces allowed.";
    if (!/[A-Z]/.test(p)) return "Add an uppercase letter.";
    if (!/[a-z]/.test(p)) return "Add a lowercase letter.";
    if (!/[0-9]/.test(p)) return "Add a number.";
    if (!/[^A-Za-z0-9]/.test(p)) return "Add a symbol.";
    return null;
  }
  function validateDisplayName(d) {
    d = (d || "").trim();
    if (d.length < 2) return "Display Name must be at least 2 characters.";
    if (d.length > 24) return "Display Name max 24 chars.";
    return null;
  }

  async function ensureAdmin() {
    const users = loadJSON(KEYS.users, []);
    if (users.some((u) => u.role === "admin")) return;

    const salt = crypto.randomUUID();
    const hash = await sha256("Admin@12345!" + "|" + salt);
    users.push({
      id: crypto.randomUUID(),
      username: "admin",
      email: "admin@liftuphub.local",
      name: "System Admin",
      displayName: "Admin",
      role: "admin",
      salt,
      hash,
      createdAt: Date.now(),
    });
    saveJSON(KEYS.users, users);
  }

  async function registerUser({ name, displayName, username, email, password }) {
    await ensureAdmin();

    name = (name || "").trim();
    displayName = (displayName || "").trim();
    username = (username || "").trim();
    email = (email || "").trim().toLowerCase();

    if (!name) throw new Error("Full name is required.");
    const dErr = validateDisplayName(displayName);
    if (dErr) throw new Error(dErr);
    const uErr = validateUsername(username);
    if (uErr) throw new Error(uErr);
    const eErr = validateEmail(email);
    if (eErr) throw new Error(eErr);
    const pErr = validatePassword(password);
    if (pErr) throw new Error(pErr);

    const users = loadJSON(KEYS.users, []);
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) throw new Error("Username already exists.");
    if (users.some((u) => u.email === email)) throw new Error("Email already exists.");

    const salt = crypto.randomUUID();
    const hash = await sha256(password + "|" + salt);

    users.push({
      id: crypto.randomUUID(),
      name,
      displayName,
      username,
      email,
      role: "student",
      salt,
      hash,
      createdAt: Date.now(),
    });
    saveJSON(KEYS.users, users);
    audit("auth.register", { username, email });
    return true;
  }

  async function loginUser({ userOrEmail, password }) {
    await ensureAdmin();
    const key = (userOrEmail || "").trim().toLowerCase();
    const users = loadJSON(KEYS.users, []);
    const u = users.find((x) => x.email === key || (x.username || "").toLowerCase() === key);
    if (!u) throw new Error("Invalid credentials.");

    const check = await sha256(password + "|" + u.salt);
    if (check !== u.hash) throw new Error("Invalid credentials.");

    const s = {
      uid: u.id,
      username: u.username,
      email: u.email,
      name: u.name,
      displayName: u.displayName || u.username,
      role: u.role,
      loginAt: Date.now(),
    };
    setSession(s);
    audit("auth.login", { username: s.username, role: s.role });
    return s;
  }

  async function changePassword(currentPass, newPass) {
    const s = getSession();
    if (!s) throw new Error("Not logged in.");
    const pErr = validatePassword(newPass);
    if (pErr) throw new Error(pErr);

    const users = loadJSON(KEYS.users, []);
    const me = users.find((u) => u.id === s.uid);
    if (!me) throw new Error("User not found.");

    const check = await sha256(currentPass + "|" + me.salt);
    if (check !== me.hash) throw new Error("Current password is incorrect.");

    me.salt = crypto.randomUUID();
    me.hash = await sha256(newPass + "|" + me.salt);
    me.updatedAt = Date.now();
    saveJSON(KEYS.users, users);
    audit("profile.change_password", { username: s.username });
    return true;
  }

  function updateProfile({ name, displayName, email }) {
    const s = getSession();
    if (!s) throw new Error("Not logged in.");

    name = (name || "").trim();
    displayName = (displayName || "").trim();
    email = (email || "").trim().toLowerCase();

    if (!name) throw new Error("Full name is required.");
    const dErr = validateDisplayName(displayName);
    if (dErr) throw new Error(dErr);
    const eErr = validateEmail(email);
    if (eErr) throw new Error(eErr);

    const users = loadJSON(KEYS.users, []);
    const me = users.find((u) => u.id === s.uid);
    if (!me) throw new Error("User not found.");
    if (users.some((u) => u.id !== s.uid && u.email === email)) throw new Error("Email already exists.");

    me.name = name;
    me.displayName = displayName;
    me.email = email;
    me.updatedAt = Date.now();
    saveJSON(KEYS.users, users);

    s.name = name;
    s.displayName = displayName;
    s.email = email;
    setSession(s);

    audit("profile.update", { username: s.username });
    return true;
  }

  // -----------------------------
  // Layout load
  // -----------------------------
  async function fetchText(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Cannot load ${path} (HTTP ${res.status})`);
    return await res.text();
  }

  async function loadLayout() {
    const app = $("#app");
    if (!app) throw new Error("#app missing in index.html");

    const tries = ["./Particles/layout.html", "./partials/layout.html", "./layout.html"];
    let html = null;
    let lastErr = null;

    for (const p of tries) {
      try {
        html = await fetchText(p);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!html) throw lastErr || new Error("Layout not found.");
    app.innerHTML = html;
  }

  // -----------------------------
  // Topbar links injection
  // -----------------------------
  function ensureTopLinks() {
    const actions = document.querySelector(".actions");
    if (!actions) return;

    if ($("#navFeedback") || $("#navKindness") || $("#navWall")) return;

    const makePill = (id, label, hash) => {
      const wrap = document.createElement("div");
      wrap.className = "pill";
      wrap.innerHTML = `<a class="toggle" id="${id}" href="${hash}">${label}</a>`;
      return wrap;
    };

    const homePill = $("#navHome")?.closest(".pill") || null;
    const insertAfter = homePill?.nextSibling || null;

    actions.insertBefore(makePill("navFeedback", "📝 Feedback", "#/feedback"), insertAfter);
    actions.insertBefore(makePill("navKindness", "🌟 Kindness", "#/kindness"), insertAfter);
    actions.insertBefore(makePill("navWall", "💜 Wall", "#/wall"), insertAfter);
  }

  // -----------------------------
  // Image fallback loader (GitHub Pages + direct /pages open)
  // -----------------------------
  function bindImageFallbacks() {
    const imgs = Array.from(document.querySelectorAll("img.luhImg, img.galleryImg"));
    if (!imgs.length) return;

    const buildCandidates = (src) => {
      const s = (src || "").trim();
      if (!s) return [];
      const base = s.replace(/^\.\//, "");
      const list = [s];
      // common variants
      if (!s.startsWith("./")) list.push("./" + base);
      if (!s.startsWith("../")) list.push("../" + base);
      // switch between assets/images and images
      list.push(s.replace("./assets/images/", "./images/"));
      list.push(s.replace("assets/images/", "images/"));
      list.push(s.replace("./images/", "./assets/images/"));
      list.push(s.replace("images/", "assets/images/"));

      // de-dup
      return Array.from(new Set(list.filter(Boolean)));
    };

    imgs.forEach((img) => {
      if (img.dataset.fallbackBound === "1") return;
      img.dataset.fallbackBound = "1";

      const candidates = buildCandidates(img.getAttribute("src"));
      img.dataset.fallbacks = JSON.stringify(candidates);
      img.dataset.fallbackIndex = "0";

      img.addEventListener("error", () => {
        try {
          const arr = JSON.parse(img.dataset.fallbacks || "[]");
          let i = parseInt(img.dataset.fallbackIndex || "0", 10);
          i += 1;
          if (i >= arr.length) return;
          img.dataset.fallbackIndex = String(i);
          img.src = arr[i];
        } catch {
          // ignore
        }
      });
    });
  }

  // -----------------------------
  // Update topbar status
  // -----------------------------
  function updateTopBar() {
    const r = $("#roleTag");
    if (r) r.textContent = `Role: ${role()}`;

    const w = $("#welcomeTag");
    const s = getSession();
    if (w) {
      if (s?.displayName) {
        w.textContent = `Welcome, ${s.displayName}`;
        w.classList.remove("hide");
      } else {
        w.classList.add("hide");
      }
    }

    const loginPill = $("#loginPill");
    const logoutPill = $("#logoutPill");
    const profilePill = $("#profilePill");

    if (loginPill) loginPill.classList.toggle("hide", isLoggedIn());
    if (logoutPill) logoutPill.classList.toggle("hide", !isLoggedIn());
    if (profilePill) profilePill.classList.toggle("hide", !isLoggedIn());

    const navAdminPill = $("#navAdmin")?.closest(".pill");
    if (navAdminPill) navAdminPill.classList.toggle("hide", role() !== "admin");
  }

  // -----------------------------
  // Pages templates
  // -----------------------------
  function tplHome() {
    return `
      <section class="hero">
        <div class="heroGrid">
          <div>
            <h2>Be kind. Be confident. Lift others up.</h2>
            <p class="muted" id="homeTagline">${esc(getSettings().tagline)}</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
              <button class="btn primary" data-open="drawerGuides">Open Study Guides</button>
              <button class="btn" data-open="drawerChat">Open Chat</button>
              <a class="btn" href="#/wall">💜 Appreciation Wall</a>
            </div>
          </div>
          <div class="heroMedia">
            <img class="luhImg" src="./assets/images/hero.jpg" alt="Hero" />
          </div>
        </div>
      </section>
    `;
  }

  function tplProfile() {
    return `
      <section class="card">
        <h2 style="margin:0 0 8px">My Profile</h2>
        <p class="muted" style="margin:0 0 12px">Update your info (username/role are locked).</p>

        <div class="card soft">
          <h3 style="margin:0 0 8px">Account info</h3>
          <div class="row">
            <input class="input" id="pName" placeholder="Full name" />
            <input class="input" id="pDisplayName" placeholder="Display name" />
          </div>
          <div class="row" style="margin-top:10px">
            <input class="input" id="pEmail" placeholder="Email" />
            <input class="input" id="pUsername" placeholder="Username (locked)" disabled />
          </div>
          <button class="btn primary" id="saveProfile" style="margin-top:10px">Save profile</button>
          <p class="muted" id="pMsg" style="margin:10px 0 0"></p>
        </div>

        <div class="card soft" style="margin-top:12px">
          <h3 style="margin:0 0 8px">Change password</h3>
          <div class="row">
            <input class="input" id="pCurPass" placeholder="Current password" type="password" />
            <input class="input" id="pNewPass" placeholder="New password" type="password" />
          </div>
          <button class="btn" id="changePass" style="margin-top:10px">Update password</button>
          <p class="muted" id="pPassMsg" style="margin:10px 0 0"></p>
        </div>
      </section>
    `;
  }

  function tplAdmin() {
    return `
      <section class="card">
        <h2 style="margin:0 0 8px">Admin Dashboard</h2>
        <p class="muted" style="margin:0 0 12px">Admin area (separate from My Profile).</p>

        <div class="row">
          <div class="card soft">
            <h3 style="margin:0 0 8px">Control Panel</h3>
            <p class="muted" style="margin:0">
              • Site Settings<br>
              • Feedback review<br>
              • Wall moderation
            </p>
            <a class="btn primary" href="#/admin_settings" style="margin-top:10px;display:inline-block">Open Settings</a>
          </div>

          <div class="card soft">
            <h3 style="margin:0 0 8px">Quick Stats</h3>
            <p class="muted" id="adminStats" style="margin:0">Loading…</p>
          </div>
        </div>
      </section>
    `;
  }

  // ✅ Upgraded Admin Settings (Branding + Backup + Moderation + Audit)
  function tplAdminSettings() {
    return `
      <section class="card">
        <h2 style="margin:0 0 8px">Admin Control Center</h2>
        <p class="muted" style="margin:0 0 12px">Branding • Features • Export/Import • Moderation • Audit Log</p>

        <div class="card soft" style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" data-tab="branding">🎨 Branding</button>
          <button class="btn" data-tab="features">⚙️ Features</button>
          <button class="btn" data-tab="backup">📦 Export/Import</button>
          <button class="btn" data-tab="quotes">💬 Quotes</button>
          <button class="btn" data-tab="gallery">🖼 Gallery</button>
          <button class="btn" data-tab="moderation">🛡 Moderation</button>
          <button class="btn" data-tab="audit">🧾 Audit Log</button>
        </div>

        <div id="adminTabMount" style="margin-top:12px"></div>
      </section>
    `;
  }

  function tplFeedback() {
    return `
      <section class="card">
        <h2 style="margin:0 0 8px">Feedback</h2>
        <p class="muted" style="margin:0 0 12px">Share ideas, bugs, and suggestions. Admin can export feedback file.</p>

        <div class="row">
          <div class="card soft">
            <h3 style="margin:0 0 8px">Send feedback</h3>

            <div class="row">
              <select class="input" id="fbType">
                <option value="Idea">Idea</option>
                <option value="Bug">Bug</option>
                <option value="Content">Content</option>
                <option value="Other">Other</option>
              </select>
              <select class="input" id="fbRating">
                <option value="5">⭐ 5</option><option value="4">⭐ 4</option><option value="3">⭐ 3</option><option value="2">⭐ 2</option><option value="1">⭐ 1</option>
              </select>
            </div>

            <input class="input" id="fbTitle" style="margin-top:10px" placeholder="Title (short)" />
            <textarea class="input" id="fbMsg" style="margin-top:10px;min-height:120px" placeholder="Write your feedback…"></textarea>

            <button class="btn primary" id="fbSend" style="margin-top:10px">Submit</button>
            <p class="muted" id="fbSendMsg" style="margin:10px 0 0"></p>
          </div>

          <div class="card soft">
            <h3 style="margin:0 0 8px">Export feedback file</h3>
            <p class="muted" style="margin:0 0 10px">Download JSON or CSV. (Admin only)</p>

            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn" id="fbExportJson" ${can("feedback_manage") ? "" : "disabled"}>Export JSON</button>
              <button class="btn" id="fbExportCsv" ${can("feedback_manage") ? "" : "disabled"}>Export CSV</button>
              <button class="btn danger" id="fbClear" ${can("feedback_manage") ? "" : "disabled"}>Clear All</button>
            </div>

            <p class="muted" id="fbExportMsg" style="margin:10px 0 0"></p>
          </div>
        </div>

        <div class="card soft" style="margin-top:12px">
          <h3 style="margin:0 0 8px">Recent feedback</h3>
          <div id="fbList"></div>
        </div>
      </section>
    `;
  }

  function tplKindness() {
    return `
      <section class="card">
        <h2 style="margin:0 0 8px">Kindness Quest</h2>
        <p class="muted" style="margin:0 0 12px">A daily kindness task + quote. Build a streak.</p>

        <div class="row">
          <div class="card soft">
            <h3 style="margin:0 0 8px">Today’s Quote</h3>
            <div class="card soft" style="margin-top:10px">
              <div id="kQuote" style="font-weight:900"></div>
              <div class="muted" id="kQuoteAuthor" style="margin-top:6px"></div>
            </div>
          </div>

          <div class="card soft">
            <h3 style="margin:0 0 8px">Today’s Quest</h3>
            <div class="card soft" style="margin-top:10px">
              <div id="kTask" style="font-weight:900"></div>
              <p class="muted" style="margin:10px 0 0">Mark done to increase your streak.</p>

              <button class="btn primary" id="kDone">Mark Done ✅</button>
              <button class="btn" id="kReset" style="margin-left:8px">Reset Today</button>
              <p class="muted" id="kMsg" style="margin:10px 0 0"></p>
            </div>

            <div class="card soft" style="margin-top:12px">
              <div style="font-weight:900">Streak</div>
              <div class="muted" id="kStreak" style="margin-top:6px"></div>
            </div>
          </div>
        </div>

        <div class="card soft" style="margin-top:12px">
          <h3 style="margin:0 0 8px">History (last 7 days)</h3>
          <div id="kHistory"></div>
        </div>
      </section>
    `;
  }

  function tplWall() {
    return `
      <section class="card">
        <h2 style="margin:0 0 8px">Appreciation Wall</h2>
        <p class="muted" style="margin:0 0 12px">
          Post positive messages (like Padlet). You can like and comment. Admin can delete posts. You can report posts.
        </p>

        <div class="row">
          <div class="card soft">
            <h3 style="margin:0 0 8px">New Post</h3>
            <input class="input" id="wTitle" placeholder="Title (e.g., Thank you Coach!)" />
            <textarea class="input" id="wBody" style="margin-top:10px;min-height:120px" placeholder="Write something kind…"></textarea>
            <input class="input" id="wTags" style="margin-top:10px" placeholder="Tags (comma separated e.g. teacher, friend)" />
            <button class="btn primary" id="wPost" style="margin-top:10px">Post</button>
            <p class="muted" id="wMsg" style="margin:10px 0 0"></p>
          </div>

          <div class="card soft">
            <h3 style="margin:0 0 8px">Filter</h3>
            <input class="input" id="wSearch" placeholder="Search title/body/tags…" />
            <select class="input" id="wSort" style="margin-top:10px">
              <option value="new">Newest</option>
              <option value="top">Most liked</option>
            </select>

            <div class="card soft" style="margin-top:12px">
              <div class="muted">Tip: keep it respectful. No bullying.</div>
            </div>
          </div>
        </div>

        <div class="card soft" style="margin-top:12px">
          <h3 style="margin:0 0 8px">Posts</h3>
          <div id="wList"></div>
        </div>
      </section>
    `;
  }

  // -----------------------------
  // Routing
  // -----------------------------
  function routeName() {
    const raw = (location.hash || "").trim();
    if (!raw || raw === "#" || raw === "#/") return "home";
    if (raw.startsWith("#/")) return raw.slice(2) || "home";
    if (raw.startsWith("#")) return raw.slice(1) || "home";
    return "home";
  }

  async function loadPage(name) {
    const mount = $("#pageMount");
    if (!mount) throw new Error("#pageMount missing in layout.html");

    try {
      mount.innerHTML = await fetchText(`./pages/${name}.html`);
    } catch {
      if (name === "home") mount.innerHTML = tplHome();
      else if (name === "profile") mount.innerHTML = tplProfile();
      else if (name === "admin") mount.innerHTML = tplAdmin();
      else if (name === "admin_settings") mount.innerHTML = tplAdminSettings();
      else if (name === "feedback") mount.innerHTML = tplFeedback();
      else if (name === "kindness") mount.innerHTML = tplKindness();
      else if (name === "wall") mount.innerHTML = tplWall();
      else mount.innerHTML = tplHome();
    }
  }

  async function route() {
    const page = routeName();

    // page-scoped body class (auth centering)
    document.body.classList.toggle("page-auth", page === "auth");

    if (page === "profile" && !isLoggedIn()) {
      openAuthModal(true);
      await loadPage("home");
      return "home";
    }
    if ((page === "admin" || page === "admin_settings") && role() !== "admin") {
      await loadPage("home");
      return "home";
    }

    await loadPage(page);

    // Make images resilient (works even if user opens /pages/*.html directly)
    bindImageFallbacks();

    if (page === "home") hookHomeGallery();

    if (page === "auth") hookAuthPage();
    if (page === "profile") hookProfile();
    if (page === "admin") hookAdmin();
    if (page === "admin_settings") hookAdminSettings();
    if (page === "feedback") hookFeedback();
    if (page === "kindness") hookKindness();
    if (page === "wall") hookWall();
    // enable gallery popup if gallery images exist
    bindGalleryLightbox();


    return page;
  }

  
  
  // -----------------------------
  // Home Gallery: append admin-managed images
  // -----------------------------
  function getStaticGalleryList(){
  // Option 2: static files committed in repo (works for everyone on GitHub Pages)
  const list = (window.LUH_GALLERY && Array.isArray(window.LUH_GALLERY)) ? window.LUH_GALLERY : null;
  if(list && list.length) return list;

  // fallback defaults
  return [
    { src: "assets/images/g1.jpg", alt: "g1" },
    { src: "assets/images/g2.jpg", alt: "g2" },
    { src: "assets/images/g3.jpg", alt: "g3" },
    { src: "assets/images/g4.jpg", alt: "g4" }
  ];
}

function loadGalleryDraft(){
  try{
    const raw = localStorage.getItem("luh_gallery_draft_v1");
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch(_){ return []; }
}

function saveGalleryDraft(arr){
  localStorage.setItem("luh_gallery_draft_v1", JSON.stringify(Array.isArray(arr)?arr:[]));
}

function hookHomeGallery(){
  const gallery = document.getElementById("homeGallery");
  if(!gallery) return;

  // rebuild gallery from static list
  const base = getStaticGalleryList();
  gallery.innerHTML = "";
  base.forEach((it, idx) => {
    if(!it || !it.src) return;
    const img = document.createElement("img");
    img.className = "galleryImg";
    img.setAttribute("data-lightbox","gallery");
    img.src = it.src;
    img.alt = it.alt || it.name || ("img-"+idx);
    gallery.appendChild(img);
  });

  // draft items (admin preview only; not shared across devices)
  const draft = loadGalleryDraft();
  draft.forEach((it, idx) => {
    if(!it || !it.src) return;
    const img = document.createElement("img");
    img.className = "galleryImg";
    img.setAttribute("data-lightbox","gallery");
    img.setAttribute("data-custom","1");
    img.src = it.src;
    img.alt = it.alt || it.name || ("draft-"+idx);
    gallery.appendChild(img);
  });
}

// -----------------------------
  // Gallery Lightbox
  // -----------------------------
  let __lbList = [];
  let __lbIndex = 0;

  function ensureLightboxDOM(){
    if(document.getElementById("lbOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "lbOverlay";
    overlay.className = "lbOverlay";
    overlay.innerHTML = `
      <div class="lbCard" role="dialog" aria-modal="true" aria-label="Image viewer">
        <div class="lbTop">
          <div>
            <div style="font-weight:900">Photo Viewer</div>
            <div class="muted" id="lbMeta">—</div>
          </div>
          <button class="lbClose" id="lbCloseBtn" type="button">✕ Close</button>
        </div>
        <div class="lbBody">
          <img class="lbImg" id="lbImg" alt="preview">
          <div class="lbNav">
            <button class="lbBtn lbPrev" id="lbPrevBtn" type="button" aria-label="Previous">‹</button>
            <button class="lbBtn lbNext" id="lbNextBtn" type="button" aria-label="Next">›</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.classList.remove("show");
    $("#lbCloseBtn").addEventListener("click", close);
    overlay.addEventListener("click", (e)=>{ if(e.target === overlay) close(); });

    document.addEventListener("keydown", (e)=>{
      if(!overlay.classList.contains("show")) return;
      if(e.key === "Escape") close();
      if(e.key === "ArrowLeft") lbPrev();
      if(e.key === "ArrowRight") lbNext();
    });

    $("#lbPrevBtn").addEventListener("click", lbPrev);
    $("#lbNextBtn").addEventListener("click", lbNext);
  }

  function lbShow(list, index){
    ensureLightboxDOM();
    __lbList = list || [];
    __lbIndex = Math.max(0, Math.min(index || 0, __lbList.length-1));

    const item = __lbList[__lbIndex];
    const img = $("#lbImg");
    const meta = $("#lbMeta");
    img.src = item?.src || "";
    img.alt = item?.alt || "image";
    meta.textContent = `${__lbIndex+1} / ${__lbList.length}  •  ${item?.alt || ""}`.trim();

    $("#lbOverlay").classList.add("show");
  }
  function openLightbox(list, index){
    lbShow(list, index);
  }


  function lbPrev(){
    if(!__lbList.length) return;
    __lbIndex = (__lbIndex - 1 + __lbList.length) % __lbList.length;
    lbShow(__lbList, __lbIndex);
  }
  function lbNext(){
    if(!__lbList.length) return;
    __lbIndex = (__lbIndex + 1) % __lbList.length;
    lbShow(__lbList, __lbIndex);
  }

  function bindGalleryLightbox(){
    // bind only once per node
    const imgs = $$(".galleryImg[data-lightbox='gallery']");
    if(!imgs.length) return;

    const list = imgs.map(im => ({ src: im.getAttribute("src"), alt: im.getAttribute("alt") || "Photo" }));
    imgs.forEach((im, idx)=>{
      if(im.dataset.lbBound === "1") return;
      im.dataset.lbBound = "1";
      im.style.cursor = "zoom-in";
      im.addEventListener("click", ()=> lbShow(list, idx));
    });
  }

// -----------------------------
  // Auth modal
  // -----------------------------
  function injectModalCSS() {
    if ($("#luhModalStyles")) return;
    const style = document.createElement("style");
    style.id = "luhModalStyles";
    style.textContent = `
      .authOverlay{ position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.55); display:none; align-items:center; justify-content:center; padding:16px; }
      .authOverlay.show{ display:flex; }
      /* Smaller centered card */
      .authModal{ width:min(640px, 96vw); border:1px solid rgba(255,255,255,.14); background:color-mix(in srgb, var(--bg) 75%, transparent); backdrop-filter: blur(18px);
        border-radius:22px; box-shadow: 0 18px 70px rgba(0,0,0,.55); overflow:hidden; }
      .authModalHeader{ padding:14px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,.14); }
      .authTabs{ display:flex; gap:8px; }
      .authTab{ border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.06); color:rgba(255,255,255,.92); padding:8px 12px; border-radius:999px; cursor:pointer; font-weight:900; }
      .authTab.active{ background:linear-gradient(135deg,var(--brand),var(--brand2)); border:none; }
      .authClose{ width:38px; height:38px; border-radius:14px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.06); color:rgba(255,255,255,.92); cursor:pointer; font-weight:900; }
      .authClose.hideClose{ display:none; }
      .authModalBody{ padding:16px; }
      /* Always 1 column so the hidden panel doesn't leave empty space */
      .authGrid{ display:grid; grid-template-columns:1fr; gap:12px; }
    `;
    document.head.appendChild(style);
  }

  let authLocked = false;

  function setAuthTab(which) {
    $("#tabLogin").classList.toggle("active", which === "login");
    $("#tabRegister").classList.toggle("active", which === "register");
    $("#panelLogin").classList.toggle("hide", which !== "login");
    $("#panelRegister").classList.toggle("hide", which !== "register");
  }

  function ensureAuthModal() {
    injectModalCSS();
    if ($("#authOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "authOverlay";
    overlay.className = "authOverlay";
    overlay.innerHTML = `
      <div class="authModal" role="dialog" aria-modal="true">
        <div class="authModalHeader">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="logoDot" style="width:12px;height:12px"></div>
            <div>
              <div style="font-weight:900">Login / Register</div>
</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <div class="authTabs">
              <button class="authTab active" id="tabLogin">Login</button>
              <button class="authTab" id="tabRegister">Register</button>
            </div>
            <button class="authClose" id="authCloseBtn" title="Close">✕</button>
          </div>
        </div>

        <div class="authModalBody">
          <div class="authGrid">
            <div class="card soft" id="panelLogin">
              <h3 style="margin:0 0 10px">Login</h3>
              <div class="stack">
                <input class="input" id="loginUserOrEmail" placeholder="Username or Email" />
                <input class="input" id="loginPass" placeholder="Password" type="password" />
              </div>
              <button class="btn primary" id="loginBtn" style="margin-top:10px">Login</button>
              <p class="muted" id="loginMsg" style="margin:10px 0 0"></p>
            </div>

            <div class="card soft hide" id="panelRegister">
              <h3 style="margin:0 0 10px">Register</h3>
              <div class="stack">
                <input class="input" id="regUsername" placeholder="Username (3–16, letters/numbers/_)" />
                <input class="input" id="regEmail" placeholder="Email" />
                <input class="input" id="regName" placeholder="Full name" />
                <input class="input" id="regDisplayName" placeholder="Display name" />
                <input class="input" id="regPass" placeholder="Password (Min 10 + Upper/Lower/Number/Symbol)" type="password" />

                <div class="card soft" style="padding:10px;box-shadow:none">
                  <div class="muted" style="font-size:12px">Display name يظهر في Welcome + Chat</div>
                </div>
              </div>
              <button class="btn primary" id="registerBtn" style="margin-top:10px">Create account</button>
              <p class="muted" id="regMsg" style="margin:10px 0 0"></p>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeAuthModal();
    });

    $("#tabLogin").onclick = () => setAuthTab("login");
    $("#tabRegister").onclick = () => setAuthTab("register");
    $("#authCloseBtn").onclick = () => closeAuthModal();

    $("#loginBtn").onclick = async () => {
      $("#loginMsg").textContent = "";
      try {
        await loginUser({
          userOrEmail: $("#loginUserOrEmail").value,
          password: $("#loginPass").value,
        });
        closeAuthModal(true);
        updateTopBar();
        mountChat();
        mountGuides();
        location.hash = "#/home";
      } catch (e) {
        $("#loginMsg").textContent = e.message;
      }
    };

    $("#registerBtn").onclick = async () => {
      $("#regMsg").textContent = "";
      try {
        await registerUser({
          username: $("#regUsername").value,
          email: $("#regEmail").value,
          name: $("#regName").value,
          displayName: $("#regDisplayName").value,
          password: $("#regPass").value,
        });
        $("#regMsg").textContent = "Account created ✅ Now login.";
        setAuthTab("login");
      } catch (e) {
        $("#regMsg").textContent = e.message;
      }
    };
  }

  function openAuthModal(lock = false) {
    ensureAuthModal();
    authLocked = !!lock;
    const overlay = $("#authOverlay");
    overlay.classList.add("show");

    const closeBtn = $("#authCloseBtn");
    closeBtn.classList.toggle("hideClose", authLocked);

    if ($("#loginMsg")) $("#loginMsg").textContent = "";
    if ($("#regMsg")) $("#regMsg").textContent = "";
    setAuthTab("login");
  }

  function closeAuthModal(force = false) {
    if (authLocked && !force) return;
    $("#authOverlay")?.classList.remove("show");
    authLocked = false;
  }

  // -----------------------------
  // Delegation (open drawers + pin + login modal)
  // -----------------------------
  function attachDelegation() {
    document.addEventListener("click", (e) => {
      const open = e.target.closest("[data-open]");
      if (open) {
        e.preventDefault();
        openDrawer(open.getAttribute("data-open"));
        return;
      }

      const hide = e.target.closest("[data-hide]");
      if (hide) {
        e.preventDefault();
        hideDrawer(hide.getAttribute("data-hide"));
        return;
      }

      const pin = e.target.closest("[data-pin]");
      if (pin) {
        e.preventDefault();
        const id = pin.getAttribute("data-pin");
        setPinned(id, !isPinned(id));
        return;
      }

      const loginLink = e.target.closest("#navAuth");
      if (loginLink) {
        e.preventDefault();
        openAuthModal(false);
        return;
      }
    });
  }

  // -----------------------------
  // Drawer content (Guides/Chat)
  // -----------------------------
  function mountGuides() {
    const mount = $("#guidesMount");
    if (!mount) return;

    const manage = can("guide_manage");
    const SUBJECTS = ["math", "english", "science", "biology", "chemistry", "physics", "history", "geography", "arabic", "french", "ict", "business"];

    const seed = loadJSON(KEYS.guides, null) || [
      { id: crypto.randomUUID(), title: "Algebra Quick Review", subject: "math", grade: "Y8–Y10", diff: "Easy", link: "#", createdAt: Date.now() },
      { id: crypto.randomUUID(), title: "Essay Structure", subject: "english", grade: "Y7–Y10", diff: "Medium", link: "#", createdAt: Date.now() - 20000 },
      { id: crypto.randomUUID(), title: "Cells & Organelles", subject: "biology", grade: "Y7–Y9", diff: "Medium", link: "#", createdAt: Date.now() - 40000 },
    ];
    saveJSON(KEYS.guides, seed);

    mount.innerHTML = `
      <div style="display:flex;justify-content:flex-end">
        <button class="miniHide" data-hide="drawerGuides">hide</button>
      </div>

      <div class="card soft">
        <h3 style="margin:0 0 6px">Study Guides</h3>
        <p class="muted" style="margin:0 0 12px">Search and open guides. ⭐ to favorite.</p>

        <div class="row">
          <input class="input" id="gQ" placeholder="Search..." />
          <select class="input" id="gS">
            <option value="all">All subjects</option>
            ${SUBJECTS.map((s) => `<option value="${s}">${s.toUpperCase()}</option>`).join("")}
          </select>
        </div>

        <div class="row" style="margin-top:10px">
          <select class="input" id="gD">
            <option value="all">All difficulty</option>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
          <select class="input" id="gSort">
            <option value="new">Newest</option>
            <option value="title">Title</option>
            <option value="fav">Favorites</option>
          </select>
        </div>

        ${manage ? `
          <div class="card soft" style="margin-top:12px">
            <h3 style="margin:0 0 8px">Add Guide</h3>
            <div class="row">
              <input class="input" id="aTitle" placeholder="Title" />
              <select class="input" id="aSubj">
                ${SUBJECTS.map((s) => `<option value="${s}">${s.toUpperCase()}</option>`).join("")}
              </select>
            </div>
            <div class="row" style="margin-top:10px">
              <input class="input" id="aGrade" placeholder="Grade (Y8–Y10)" />
              <input class="input" id="aLink" placeholder="URL" />
            </div>
            <div class="row" style="margin-top:10px">
              <select class="input" id="aDiff"><option>Easy</option><option selected>Medium</option><option>Hard</option></select>
              <button class="btn primary" id="aBtn">Add</button>
            </div>
            <p class="muted" id="aMsg" style="margin:8px 0 0"></p>
          </div>
        ` : ""}

        <div id="gList" style="margin-top:12px"></div>
      </div>
    `;

    const q = $("#gQ", mount);
    const s = $("#gS", mount);
    const d = $("#gD", mount);
    const sort = $("#gSort", mount);
    const list = $("#gList", mount);

    function render() {
      const all = loadJSON(KEYS.guides, []);
      const fv = loadJSON(KEYS.fav, {});
      const qq = (q.value || "").trim().toLowerCase();
      const ss = s.value;
      const dd = d.value;
      const so = sort.value;

      let items = all.filter((x) => {
        const text = (x.title + " " + (x.subject || "")).toLowerCase();
        const okQ = !qq || text.includes(qq);
        const okS = ss === "all" ? true : x.subject === ss;
        const okD = dd === "all" ? true : x.diff === dd;
        return okQ && okS && okD;
      });

      if (so === "new") items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (so === "title") items.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      if (so === "fav") items.sort((a, b) => (fv[b.id] ? 1 : 0) - (fv[a.id] ? 1 : 0));

      list.innerHTML =
        items
          .map(
            (x) => `
        <div class="card soft" style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <div>
              <div style="font-weight:900">${esc(x.title)} ${fv[x.id] ? "⭐" : ""}</div>
              <div class="muted" style="font-size:12px">${esc(x.grade || "")} • ${esc(x.subject || "")} • ${esc(x.diff || "")}</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" data-fav="${x.id}">${fv[x.id] ? "Unfav" : "Fav"}</button>
              <a class="btn primary" href="${x.link}" target="_blank" rel="noopener">Open</a>
              ${manage ? `<button class="btn danger" data-del="${x.id}">Delete</button>` : ""}
            </div>
          </div>
        </div>
      `
          )
          .join("") || `<p class="muted">No guides found.</p>`;

      $$("[data-fav]", list).forEach((b) => {
        b.onclick = () => {
          const id = b.getAttribute("data-fav");
          const fv2 = loadJSON(KEYS.fav, {});
          fv2[id] = !fv2[id];
          saveJSON(KEYS.fav, fv2);
          render();
        };
      });

      $$("[data-del]", list).forEach((b) => {
        b.onclick = () => {
          const id = b.getAttribute("data-del");
          saveJSON(KEYS.guides, loadJSON(KEYS.guides, []).filter((i) => i.id !== id));
          audit("guides.delete", { guideId: id });
          render();
        };
      });
    }

    [q, s, d, sort].forEach((el) => {
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });

    if (manage) {
      $("#aBtn", mount).onclick = () => {
        const title = $("#aTitle", mount).value.trim();
        const subj = $("#aSubj", mount).value;
        const grade = $("#aGrade", mount).value.trim();
        const link = $("#aLink", mount).value.trim();
        const diff = $("#aDiff", mount).value;
        const msg = $("#aMsg", mount);

        msg.textContent = "";
        if (!title || !grade || !link) {
          msg.textContent = "Fill Title, Grade and URL.";
          return;
        }

        const all = loadJSON(KEYS.guides, []);
        const item = { id: crypto.randomUUID(), title, subject: subj, grade, diff, link, createdAt: Date.now() };
        all.unshift(item);
        saveJSON(KEYS.guides, all);

        audit("guides.add", { title, subject: subj });

        $("#aTitle", mount).value = "";
        $("#aGrade", mount).value = "";
        $("#aLink", mount).value = "";
        msg.textContent = "Added ✅";
        render();
      };
    }

    render();
  }

  function mountChat() {
    const mount = $("#chatMount");
    if (!mount) return;

    const channels = ["General", "Homework", "Exams", "Random"];
    const cur = localStorage.getItem(KEYS.chatChannel) || "General";

    mount.innerHTML = `
      <div style="display:flex;justify-content:flex-end">
        <button class="miniHide" data-hide="drawerChat">hide</button>
      </div>

      <div class="card soft">
        <h3 style="margin:0 0 6px">Student Chat</h3>
        <p class="muted" style="margin:0 0 12px">Local chat. Login to send.</p>

        <div class="row">
          <select class="input" id="chSel">
            ${channels.map((c) => `<option ${c === cur ? "selected" : ""}>${c}</option>`).join("")}
          </select>
          <button class="btn" id="saveName">Save name</button>
        </div>

        <input class="input" id="chatName" style="margin-top:10px" placeholder="Display name"
               value="${esc(localStorage.getItem(KEYS.chatName) || "")}" />

        <div class="card soft" id="chatList" style="margin-top:10px;max-height:320px;overflow:auto"></div>

        <div class="row" style="margin-top:10px">
          <input class="input" id="chatText" placeholder="${isLoggedIn() ? "Write message…" : "Login to chat…"}" ${isLoggedIn() ? "" : "disabled"} />
          <button class="btn primary" id="send" ${isLoggedIn() ? "" : "disabled"}>Send</button>
        </div>

        <p class="muted" id="chatMsg" style="margin:10px 0 0"></p>
      </div>
    `;

    const list = $("#chatList", mount);

    function render() {
      const ch = $("#chSel", mount).value;
      const all = loadJSON(KEYS.chat, []);
      const msgs = all.filter((m) => m.ch === ch);

      list.innerHTML =
        msgs
          .map(
            (m) => `
        <div class="card soft" style="margin-bottom:8px">
          <div class="muted" style="font-size:12px"><b>${esc(m.name)}</b> • ${new Date(m.ts).toLocaleString()}</div>
          <div style="font-weight:800;margin-top:4px">${esc(m.text)}</div>
          ${role() === "admin" ? `<button class="btn danger" data-del="${m.id}" style="margin-top:6px">Delete</button>` : ""}
        </div>
      `
          )
          .join("") || `<p class="muted">No messages yet.</p>`;

      $$("[data-del]", list).forEach((b) => {
        b.onclick = () => {
          const id = b.getAttribute("data-del");
          saveJSON(KEYS.chat, loadJSON(KEYS.chat, []).filter((x) => x.id !== id));
          audit("chat.delete_message", { messageId: id });
          render();
        };
      });
    }

    $("#chSel", mount).onchange = () => {
      localStorage.setItem(KEYS.chatChannel, $("#chSel", mount).value);
      render();
    };

    $("#saveName", mount).onclick = () => {
      localStorage.setItem(KEYS.chatName, $("#chatName", mount).value.trim());
      $("#chatMsg").textContent = "Saved ✅";
      setTimeout(() => ($("#chatMsg").textContent = ""), 700);
    };

    $("#send", mount).onclick = () => {
      if (!isLoggedIn()) {
        openAuthModal(true);
        return;
      }
      const name = (localStorage.getItem(KEYS.chatName) || "").trim() || "User";
      const text = $("#chatText", mount).value.trim();
      if (!text) return;

      const all = loadJSON(KEYS.chat, []);
      all.push({ id: crypto.randomUUID(), ch: $("#chSel", mount).value, name, text, ts: Date.now() });
      saveJSON(KEYS.chat, all);
      audit("chat.send", { channel: $("#chSel", mount).value });
      $("#chatText", mount).value = "";
      render();
    };

    render();
  }

  // -----------------------------
  // Feedback logic + export file
  // -----------------------------
  function feedbackList() {
    return loadJSON(KEYS.feedback, []);
  }
  function saveFeedback(arr) {
    saveJSON(KEYS.feedback, arr.slice(-1000));
  }
  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function readFileAsDataURL(file){
    return new Promise((resolve,reject)=>{
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function toCSV(rows) {
    const headers = ["id", "ts", "user", "role", "type", "rating", "title", "message"];
    const escapeCSV = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        [r.id, new Date(r.ts).toISOString(), r.user, r.role, r.type, r.rating, r.title, r.message].map(escapeCSV).join(",")
      );
    }
    return lines.join("\n");
  }

  function hookFeedback() {
    const render = () => {
      const listEl = $("#fbList");
      const items = feedbackList().slice().sort((a, b) => b.ts - a.ts);

      listEl.innerHTML =
        items
          .map(
            (f) => `
        <div class="card soft" style="margin-bottom:10px">
          <div class="muted" style="font-size:12px">
            ${new Date(f.ts).toLocaleString()} • <b>${esc(f.type)}</b> • ⭐${esc(f.rating)} • by <b>${esc(f.user)}</b> (${esc(f.role)})
          </div>
          <div style="font-weight:900;margin-top:6px">${esc(f.title || "(no title)")}</div>
          <div class="muted" style="margin-top:6px">${esc(f.message)}</div>
          ${can("feedback_manage") ? `<button class="btn danger" data-fbdel="${f.id}" style="margin-top:8px">Delete</button>` : ""}
        </div>
      `
          )
          .join("") || `<p class="muted">No feedback yet.</p>`;

      $$("[data-fbdel]").forEach((btn) => {
        btn.onclick = () => {
          const id = btn.getAttribute("data-fbdel");
          saveFeedback(feedbackList().filter((x) => x.id !== id));
          audit("feedback.delete", { feedbackId: id });
          render();
        };
      });
    };

    $("#fbSend").onclick = () => {
      if (!isLoggedIn()) {
        openAuthModal(true);
        return;
      }

      const type = $("#fbType").value;
      const rating = $("#fbRating").value;
      const title = ($("#fbTitle").value || "").trim();
      const message = ($("#fbMsg").value || "").trim();

      if (!message) {
        $("#fbSendMsg").textContent = "Please write a message.";
        return;
      }

      const s = getSession();
      const arr = feedbackList();
      const item = {
        id: crypto.randomUUID(),
        ts: Date.now(),
        user: s?.displayName || s?.username || "User",
        role: role(),
        type,
        rating,
        title,
        message,
      };
      arr.push(item);
      saveFeedback(arr);

      audit("feedback.submit", { type, rating });

      $("#fbTitle").value = "";
      $("#fbMsg").value = "";
      $("#fbSendMsg").textContent = "Submitted ✅ Thank you!";
      setTimeout(() => ($("#fbSendMsg").textContent = ""), 900);
      render();
    };

    $("#fbExportJson").onclick = () => {
      if (!can("feedback_manage")) return;
      const data = feedbackList();
      downloadFile(`liftuphub_feedback_${Date.now()}.json`, JSON.stringify(data, null, 2), "application/json");
      audit("feedback.export_json", { count: data.length });
      $("#fbExportMsg").textContent = "Exported JSON ✅";
      setTimeout(() => ($("#fbExportMsg").textContent = ""), 900);
    };

    $("#fbExportCsv").onclick = () => {
      if (!can("feedback_manage")) return;
      const csv = toCSV(feedbackList());
      downloadFile(`liftuphub_feedback_${Date.now()}.csv`, csv, "text/csv");
      audit("feedback.export_csv", { count: feedbackList().length });
      $("#fbExportMsg").textContent = "Exported CSV ✅";
      setTimeout(() => ($("#fbExportMsg").textContent = ""), 900);
    };

    $("#fbClear").onclick = () => {
      if (!can("feedback_manage")) return;
      if (!confirm("Clear all feedback?")) return;
      saveFeedback([]);
      audit("feedback.clear_all", {});
      render();
      $("#fbExportMsg").textContent = "Cleared ✅";
      setTimeout(() => ($("#fbExportMsg").textContent = ""), 900);
    };

    render();
  }

  // -----------------------------
  // Kindness Quest
  // -----------------------------
  
  // -----------------------------
  // Quotes (Base + Custom)
  // -----------------------------
  function getQuotesCustom() {
    try { return JSON.parse(localStorage.getItem(KEYS.quotes) || "[]"); }
    catch { return []; }
  }
  function setQuotesCustom(arr) {
    localStorage.setItem(KEYS.quotes, JSON.stringify(arr || []));
  }
  function normalizeQuoteObj(o){
    const q = (o && o.q ? String(o.q).trim() : "");
    const a = (o && o.a ? String(o.a).trim() : "Unknown") || "Unknown";
    const id = (o && o.id ? String(o.id) : ("q_" + Math.random().toString(36).slice(2,10)));
    const ts = (o && o.ts ? String(o.ts) : nowISO());
    return q ? { id, q, a, ts, custom: true } : null;
  }
  function addCustomQuote(o){
    const cur = getQuotesCustom();
    const n = normalizeQuoteObj(o);
    if (!n) return false;
    const exists = cur.some((x)=> (String(x.q||"").trim().toLowerCase() === n.q.toLowerCase()) && (String(x.a||"").trim().toLowerCase() === n.a.toLowerCase()));
    if (exists) return false;
    cur.unshift({ id:n.id, q:n.q, a:n.a, ts:n.ts });
    setQuotesCustom(cur);
    audit("quote_add", { id:n.id, q:n.q, a:n.a });
    return true;
  }
  function deleteCustomQuote(id){
    const cur = getQuotesCustom();
    const next = cur.filter((x)=> String(x.id) !== String(id));
    setQuotesCustom(next);
    audit("quote_delete", { id:String(id) });
  }
  function getQuotesAll(){
    const base = QUOTES.map((x)=> ({...x, custom:false}));
    const custom = getQuotesCustom().map((x)=> ({ id:x.id, q:x.q, a:x.a, ts:x.ts, custom:true }));
    return custom.concat(base);
  }

const QUOTES = [
    { q: "No act of kindness, no matter how small, is ever wasted.", a: "Aesop" },
    { q: "Kindness is a language the deaf can hear and the blind can see.", a: "Mark Twain" },
    { q: "Be the reason someone smiles today.", a: "Unknown" },
    { q: "In a world where you can be anything, be kind.", a: "Unknown" },
    { q: "What we do for ourselves dies with us. What we do for others lives forever.", a: "Albert Pike" },
    { q: "Kind words can be short and easy to speak, but their echoes are truly endless.", a: "Mother Teresa" },
  ];

  const TASKS = [
    "Send a thank-you message to a teacher/coach.",
    "Compliment someone sincerely (in person or message).",
    "Help a classmate with one small thing today.",
    "Pick up litter or tidy a shared space for 2 minutes.",
    "Write one appreciation note on the Wall.",
    "Check in on a friend and ask how they are doing.",
  ];

  function dayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }
  function dayIndex(d = new Date()) {
    const base = new Date(2025, 0, 1);
    const diff = Math.floor((d - base) / 86400000);
    return Math.abs(diff);
  }

  function kindnessState() {
    return loadJSON(KEYS.kindness, { doneByDay: {}, streak: 0, lastDoneDay: null });
  }
  function saveKindness(s) {
    saveJSON(KEYS.kindness, s);
  }

  function hookKindness() {
    const idx = dayIndex(new Date());
    const allQ = getQuotesAll();
    const quote = allQ[idx % allQ.length];
    const task = TASKS[idx % TASKS.length];

    $("#kQuote").textContent = `“${quote.q}”`;
    $("#kQuoteAuthor").textContent = `— ${quote.a}`;
    $("#kTask").textContent = task;

    const today = dayKey();
    const st = kindnessState();

    $("#kMsg").textContent = st.doneByDay[today] ? "Done for today ✅" : "Not done yet.";

    function computeStreak() {
      const done = st.doneByDay;
      let d = new Date();
      if (!done[dayKey(d)]) d.setDate(d.getDate() - 1);

      let streak = 0;
      while (true) {
        const k = dayKey(d);
        if (done[k]) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else break;
      }
      st.streak = streak;
      saveKindness(st);
      $("#kStreak").innerHTML = `Current streak: <b>${streak}</b> day(s)`;
    }

    function renderHistory() {
      const wrap = $("#kHistory");
      const rows = [];
      const d = new Date();
      for (let i = 0; i < 7; i++) {
        const dd = new Date(d);
        dd.setDate(d.getDate() - i);
        const k = dayKey(dd);
        rows.push({ k, done: !!st.doneByDay[k] });
      }
      wrap.innerHTML = rows
        .map(
          (r) => `
        <div class="card soft" style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
          <div class="muted">${r.k}</div>
          <div style="font-weight:900">${r.done ? "✅ Done" : "—"}</div>
        </div>
      `
        )
        .join("");
    }

    $("#kDone").onclick = () => {
      if (!isLoggedIn()) {
        openAuthModal(true);
        return;
      }
      st.doneByDay[today] = true;
      st.lastDoneDay = today;
      saveKindness(st);
      audit("kindness.done", { day: today });
      $("#kMsg").textContent = "Done for today ✅";
      computeStreak();
      renderHistory();
    };

    $("#kReset").onclick = () => {
      delete st.doneByDay[today];
      if (st.lastDoneDay === today) st.lastDoneDay = null;
      saveKindness(st);
      audit("kindness.reset", { day: today });
      $("#kMsg").textContent = "Reset today.";
      computeStreak();
      renderHistory();
    };

    computeStreak();
    renderHistory();
  }

  // -----------------------------
  // Appreciation Wall (posts + likes + comments + report + admin delete)
  // -----------------------------
  function wallList() {
    return loadJSON(KEYS.wall, []);
  }
  function saveWall(arr) {
    saveJSON(KEYS.wall, arr.slice(-1500));
  }

  function hookWall() {
    const render = () => {
      const q = ($("#wSearch").value || "").trim().toLowerCase();
      const sort = $("#wSort").value;

      let items = wallList();

      if (q) {
        items = items.filter((p) => {
          const text = (p.title + " " + p.body + " " + (p.tags || []).join(" ")).toLowerCase();
          return text.includes(q);
        });
      }

      if (sort === "new") items = items.slice().sort((a, b) => b.ts - a.ts);
      if (sort === "top") items = items.slice().sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));

      $("#wList").innerHTML =
        items
          .map((p) => {
            const liked = isLoggedIn() && (p.likes || []).includes(getSession().uid);
            const likeCount = (p.likes || []).length;
            const comments = (p.comments || []).slice(-3);

            return `
          <div class="card soft" style="margin-bottom:12px">
            <div class="muted" style="font-size:12px">
              ${new Date(p.ts).toLocaleString()} • by <b>${esc(p.author)}</b>
              ${p.tags?.length ? " • " + p.tags.map((t) => `#${esc(t)}`).join(" ") : ""}
            </div>

            <div style="font-weight:900;margin-top:6px">${esc(p.title)}</div>
            <div class="muted" style="margin-top:6px">${esc(p.body)}</div>

            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;align-items:center">
              <button class="btn" data-like="${p.id}">${liked ? "💜 Liked" : "🤍 Like"} (${likeCount})</button>
              <button class="btn" data-opencomment="${p.id}">💬 Comment</button>
              <button class="btn" data-reportpost="${p.id}">🚩 Report</button>
              ${can("wall_delete") ? `<button class="btn danger" data-delpost="${p.id}">Delete</button>` : ""}
            </div>

            <div class="card soft hide" id="cBox_${p.id}" style="margin-top:10px">
              <textarea class="input" id="cText_${p.id}" style="min-height:80px" placeholder="Write a kind comment…"></textarea>
              <button class="btn primary" data-sendcomment="${p.id}" style="margin-top:8px">Send</button>
            </div>

            ${
              comments.length
                ? `
              <div style="margin-top:10px">
                <div class="muted" style="font-weight:900;margin-bottom:6px">Recent comments</div>
                ${comments
                  .map(
                    (c) => `
                  <div class="card soft" style="margin-bottom:6px">
                    <div class="muted" style="font-size:12px">${new Date(c.ts).toLocaleString()} • <b>${esc(c.author)}</b></div>
                    <div class="muted" style="margin-top:4px">${esc(c.text)}</div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            `
                : `<div class="muted" style="margin-top:10px">No comments yet.</div>`
            }
          </div>
        `;
          })
          .join("") || `<p class="muted">No posts yet. Write the first appreciation!</p>`;

      // like
      $$("[data-like]").forEach((btn) => {
        btn.onclick = () => {
          if (!isLoggedIn()) {
            openAuthModal(true);
            return;
          }
          const id = btn.getAttribute("data-like");
          const arr = wallList();
          const p = arr.find((x) => x.id === id);
          if (!p) return;
          p.likes = p.likes || [];
          const uid = getSession().uid;
          const idx = p.likes.indexOf(uid);
          if (idx >= 0) p.likes.splice(idx, 1);
          else p.likes.push(uid);
          saveWall(arr);
          audit("wall.like_toggle", { postId: id });
          render();
        };
      });

      // open comment box
      $$("[data-opencomment]").forEach((btn) => {
        btn.onclick = () => {
          if (!isLoggedIn()) {
            openAuthModal(true);
            return;
          }
          const id = btn.getAttribute("data-opencomment");
          const box = document.getElementById(`cBox_${id}`);
          if (box) box.classList.toggle("hide");
        };
      });

      // send comment
      $$("[data-sendcomment]").forEach((btn) => {
        btn.onclick = () => {
          if (!isLoggedIn()) {
            openAuthModal(true);
            return;
          }
          const id = btn.getAttribute("data-sendcomment");
          const text = (document.getElementById(`cText_${id}`)?.value || "").trim();
          if (!text) return;

          const arr = wallList();
          const p = arr.find((x) => x.id === id);
          if (!p) return;

          const s = getSession();
          p.comments = p.comments || [];
          p.comments.push({ id: crypto.randomUUID(), ts: Date.now(), author: s.displayName || s.username, text });
          saveWall(arr);
          audit("wall.comment_add", { postId: id });
          render();
        };
      });

      // report post (adds to moderation queue)
      $$("[data-reportpost]").forEach((btn) => {
        btn.onclick = () => {
          if (!isLoggedIn()) {
            openAuthModal(true);
            return;
          }
          const id = btn.getAttribute("data-reportpost");
          const s = getSession();
          const reports = loadJSON(KEYS.reports, []);
          reports.push({
            id: crypto.randomUUID(),
            ts: Date.now(),
            type: "post",
            targetId: id,
            reason: "Reported by user",
            reporter: s.displayName || s.username,
            status: "open",
          });
          saveJSON(KEYS.reports, reports.slice(-1500));
          audit("moderation.report_post", { targetId: id });
          alert("Reported ✅ Admin will review.");
        };
      });

      // delete post (admin)
      $$("[data-delpost]").forEach((btn) => {
        btn.onclick = () => {
          if (!can("wall_delete")) return;
          const id = btn.getAttribute("data-delpost");
          saveWall(wallList().filter((x) => x.id !== id));
          audit("wall.delete_post", { postId: id });
          render();
        };
      });
    };

    $("#wPost").onclick = () => {
      if (!isLoggedIn()) {
        openAuthModal(true);
        return;
      }
      const title = ($("#wTitle").value || "").trim();
      const body = ($("#wBody").value || "").trim();
      const tags = ($("#wTags").value || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8);
      if (!title || !body) {
        $("#wMsg").textContent = "Please write title + message.";
        return;
      }
      const s = getSession();
      const arr = wallList();
      arr.push({
        id: crypto.randomUUID(),
        ts: Date.now(),
        author: s.displayName || s.username,
        title,
        body,
        tags,
        likes: [],
        comments: [],
      });
      saveWall(arr);
      audit("wall.post_add", { title });
      $("#wTitle").value = "";
      $("#wBody").value = "";
      $("#wTags").value = "";
      $("#wMsg").textContent = "Posted ✅";
      setTimeout(() => ($("#wMsg").textContent = ""), 900);
      render();
    };

    $("#wSearch").oninput = render;
    $("#wSort").onchange = render;

    render();
  }

  // -----------------------------

  // -----------------------------
  // Auth page (full page)
  // -----------------------------
  function hookAuthPage(){
    const tabLogin = $("#authTabLogin");
    const tabRegister = $("#authTabRegister");
    const panelLogin = $("#panelLogin");
    const panelRegister = $("#panelRegister");

    if(!tabLogin || !tabRegister || !panelLogin || !panelRegister) return;

    const setTab = (which) => {
      const isLogin = which === "login";
      panelLogin.classList.toggle("hide", !isLogin);
      panelRegister.classList.toggle("hide", isLogin);
      tabLogin.classList.toggle("active", isLogin);
      tabRegister.classList.toggle("active", !isLogin);
    };

    tabLogin.onclick = () => setTab("login");
    tabRegister.onclick = () => setTab("register");
    setTab("login");

    const loginBtn = $("#loginBtn");
    const registerBtn = $("#registerBtn");

    if(loginBtn){
      loginBtn.onclick = async () => {
        $("#loginMsg").textContent = "";
        try {
          await loginUser({
            userOrEmail: $("#loginUserOrEmail").value,
            password: $("#loginPass").value,
          });
          toast("Logged in ✅");
          updateTopBar();
          mountChat();
          mountGuides();
          location.hash = "#/home";
        } catch (e) {
          $("#loginMsg").textContent = e.message || "Login failed.";
        }
      };
    }

    if(registerBtn){
      registerBtn.onclick = async () => {
        $("#regMsg").textContent = "";
        try {
          await registerUser({
            username: $("#regUsername").value,
            email: $("#regEmail").value,
            name: $("#regName").value,
            displayName: $("#regDisplayName").value,
            password: $("#regPass").value,
          });
          toast("Account created ✅");
          setTab("login");
        } catch (e) {
          $("#regMsg").textContent = e.message || "Registration failed.";
        }
      };
    }
  }

  // Admin hooks
  // -----------------------------
  function hookProfile() {
    const s = getSession();
    if (!s) return;

    $("#pName").value = s.name || "";
    $("#pDisplayName").value = s.displayName || "";
    $("#pEmail").value = s.email || "";
    $("#pUsername").value = s.username || "";

    $("#saveProfile").onclick = () => {
      $("#pMsg").textContent = "";
      try {
        updateProfile({ name: $("#pName").value, displayName: $("#pDisplayName").value, email: $("#pEmail").value });
        $("#pMsg").textContent = "Saved ✅";
        updateTopBar();
      } catch (e) {
        $("#pMsg").textContent = e.message;
      }
    };

    $("#changePass").onclick = async () => {
      $("#pPassMsg").textContent = "";
      try {
        await changePassword($("#pCurPass").value, $("#pNewPass").value);
        $("#pPassMsg").textContent = "Password updated ✅";
        $("#pCurPass").value = "";
        $("#pNewPass").value = "";
      } catch (e) {
        $("#pPassMsg").textContent = e.message;
      }
    };
  }

  function hookAdmin() {
    const users = loadJSON(KEYS.users, []);
    const guides = loadJSON(KEYS.guides, []);
    const chats = loadJSON(KEYS.chat, []);
    const fb = loadJSON(KEYS.feedback, []);
    const wall = loadJSON(KEYS.wall, []);
    const reports = loadJSON(KEYS.reports, []);
    const el = $("#adminStats");
    if (el) {
      el.innerHTML = `
        Users: <b>${users.length}</b><br>
        Guides: <b>${guides.length}</b><br>
        Chat messages: <b>${chats.length}</b><br>
        Feedback: <b>${fb.length}</b><br>
        Wall posts: <b>${wall.length}</b><br>
        Reports: <b>${reports.filter(r=>r.status==="open").length}</b>
      `;
    }
  }

  function hookAdminSettings() {
    const mount = $("#adminTabMount");
    if (!mount) return;

    const renderBranding = () => {
      const s = getSettings();
      const logoText = localStorage.getItem(KEYS.brandLogoText) || "";
      const footerText = localStorage.getItem(KEYS.brandFooterText) || "";
      mount.innerHTML = `
        <div class="card soft">
          <h3 style="margin:0 0 10px">Branding</h3>

          <div class="row">
            <input class="input" id="setSiteName" placeholder="Site name" value="${esc(s.siteName)}" />
            <input class="input" id="setTagline" placeholder="Tagline" value="${esc(s.tagline)}" />
          </div>

          <div class="row" style="margin-top:10px">
            <input class="input" id="setPrimary" placeholder="Primary hex (#RRGGBB)" value="${esc(s.primary)}" />
            <input class="input" id="setSecondary" placeholder="Secondary hex (#RRGGBB)" value="${esc(s.secondary)}" />
          </div>

          <div class="row" style="margin-top:10px">
            <input class="input" id="setLogoText" placeholder="Logo text (optional)" value="${esc(logoText)}" />
            <input class="input" id="setFooterText" placeholder="Footer text (optional)" value="${esc(footerText)}" />
          </div>

          <button class="btn primary" id="saveBranding" style="margin-top:10px">Save Branding</button>
          <p class="muted" id="brandMsg" style="margin:10px 0 0"></p>
        </div>
      `;

      $("#saveBranding").onclick = () => {
        const next = loadJSON(KEYS.settings, {});
        next.siteName = ($("#setSiteName").value || "").trim() || CONFIG.appName;
        next.tagline = ($("#setTagline").value || "").trim() || "Be kind. Be confident. Lift others up.";
        next.primary = ($("#setPrimary").value || "").trim();
        next.secondary = ($("#setSecondary").value || "").trim();

        saveJSON(KEYS.settings, next);

        localStorage.setItem(KEYS.brandLogoText, ($("#setLogoText").value || "").trim());
        localStorage.setItem(KEYS.brandFooterText, ($("#setFooterText").value || "").trim());

        $("#brandMsg").textContent = "Saved ✅";
        audit("admin.branding_save", { siteName: next.siteName });

        applySettings();
        updateTopBar();
        setTimeout(() => ($("#brandMsg").textContent = ""), 900);
      };
    };

    const renderFeatures = () => {
      const current = getSettings();
      mount.innerHTML = `
        <div class="card soft">
          <h3 style="margin:0 0 10px">Feature Toggles</h3>

          <div class="card soft">
            <label class="muted"><input type="checkbox" id="toggleGuides" ${current.enableGuides ? "checked" : ""}> Enable Guides</label><br>
            <label class="muted"><input type="checkbox" id="toggleChat" ${current.enableChat ? "checked" : ""}> Enable Chat</label><br>
            <label class="muted"><input type="checkbox" id="toggleParticles" ${current.enableParticles ? "checked" : ""}> Enable Particles</label>
          </div>

          <button class="btn primary" id="saveFeatures" style="margin-top:10px">Save Settings</button>
          <p class="muted" id="featMsg" style="margin:10px 0 0"></p>
        </div>
      `;

      $("#saveFeatures").onclick = () => {
        const next = loadJSON(KEYS.settings, {});
        next.enableGuides = !!$("#toggleGuides").checked;
        next.enableChat = !!$("#toggleChat").checked;
        next.enableParticles = !!$("#toggleParticles").checked;

        saveJSON(KEYS.settings, next);
        audit("admin.features_save", next);

        $("#featMsg").textContent = "Saved ✅";
        applySettings();
        autoFitPinned();
        setTimeout(() => ($("#featMsg").textContent = ""), 900);
      };
    };

    const renderBackup = () => {
      mount.innerHTML = `
        <div class="card soft">
          <h3 style="margin:0 0 10px">Export / Import</h3>
          <p class="muted" style="margin:0 0 10px">Export downloads a backup JSON. Import restores everything (local demo).</p>

          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn primary" id="exportAll">Export Backup JSON</button>
            <button class="btn" id="exportAudit">Export Audit JSON</button>
          </div>

          <div class="card soft" style="margin-top:12px">
            <h3 style="margin:0 0 8px">Import</h3>
            <input class="input" id="importFile" type="file" accept="application/json" />
            <button class="btn danger" id="importBtn" style="margin-top:10px">Import & Replace Data</button>
            <p class="muted" id="backupMsg" style="margin:10px 0 0"></p>
          </div>
        </div>
      `;

      const download = (filename, data) => {
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      };

      $("#exportAll").onclick = () => {
        const pack = exportPack();
        download(`liftuphub_backup_${Date.now()}.json`, JSON.stringify(pack, null, 2));
        audit("admin.export_backup", { size: JSON.stringify(pack).length });
        $("#backupMsg").textContent = "Exported ✅";
        setTimeout(() => ($("#backupMsg").textContent = ""), 900);
      };

      $("#exportAudit").onclick = () => {
        const log = getAudit();
        download(`liftuphub_audit_${Date.now()}.json`, JSON.stringify(log, null, 2));
        audit("admin.export_audit", { count: log.length });
        $("#backupMsg").textContent = "Audit exported ✅";
        setTimeout(() => ($("#backupMsg").textContent = ""), 900);
      };

      $("#importBtn").onclick = async () => {
        const input = $("#importFile");
        const file = input.files?.[0];
        if (!file) {
          $("#backupMsg").textContent = "Choose a JSON file first.";
          return;
        }
        if (!confirm("Import will replace existing local data. Continue?")) return;

        const txt = await file.text();
        const pack = JSON.parse(txt);
        importPack(pack);
        audit("admin.import_backup", { importedAt: pack.exportedAt || null });

        $("#backupMsg").textContent = "Imported ✅ Reloading...";
        setTimeout(() => location.reload(), 700);
      };
    };

    const renderModeration = () => {
      const reports = loadJSON(KEYS.reports, []).slice().sort((a, b) => b.ts - a.ts);
      const wall = loadJSON(KEYS.wall, []);

      const findPost = (id) => wall.find((p) => p.id === id);

      mount.innerHTML = `
        <div class="card soft">
          <h3 style="margin:0 0 10px">Moderation Queue</h3>
          <p class="muted" style="margin:0 0 12px">Reports submitted by users. You can resolve or delete content.</p>
          <div id="modList"></div>
        </div>
      `;

      const modList = $("#modList");
      modList.innerHTML =
        reports
          .map((r) => {
            const post = r.type === "post" ? findPost(r.targetId) : null;
            return `
          <div class="card soft" style="margin-bottom:10px">
            <div class="muted" style="font-size:12px">
              ${new Date(r.ts).toLocaleString()} • <b>${esc(r.type)}</b> • status: <b>${esc(r.status)}</b>
            </div>
            <div style="margin-top:6px">
              Reporter: <b>${esc(r.reporter)}</b> • Reason: ${esc(r.reason)}
            </div>
            ${
              post
                ? `
              <div class="card soft" style="margin-top:10px">
                <div style="font-weight:900">${esc(post.title)}</div>
                <div class="muted" style="margin-top:6px">${esc(post.body)}</div>
              </div>
            `
                : `<div class="muted" style="margin-top:10px">Target content not found (maybe deleted).</div>`
            }

            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
              <button class="btn" data-resolve="${r.id}">Resolve</button>
              ${post ? `<button class="btn danger" data-deletepost="${post.id}">Delete Post</button>` : ""}
            </div>
          </div>
        `;
          })
          .join("") || `<p class="muted">No reports 🎉</p>`;

      $$("[data-resolve]").forEach((btn) => {
        btn.onclick = () => {
          const id = btn.getAttribute("data-resolve");
          const all = loadJSON(KEYS.reports, []);
          const item = all.find((x) => x.id === id);
          if (item) item.status = "resolved";
          saveJSON(KEYS.reports, all);
          audit("moderation.resolve", { reportId: id });
          renderModeration();
        };
      });

      $$("[data-deletepost]").forEach((btn) => {
        btn.onclick = () => {
          const id = btn.getAttribute("data-deletepost");
          if (!confirm("Delete this post?")) return;
          saveJSON(KEYS.wall, loadJSON(KEYS.wall, []).filter((p) => p.id !== id));
          audit("moderation.delete_post", { postId: id });
          renderModeration();
        };
      });
    };

    const renderAudit = () => {
      const log = getAudit().slice().sort((a, b) => b.ts - a.ts).slice(0, 200);
      mount.innerHTML = `
        <div class="card soft">
          <h3 style="margin:0 0 10px">Audit Log (latest 200)</h3>
          <p class="muted" style="margin:0 0 10px">Tracks admin actions and key events.</p>

          <div class="card soft" style="max-height:420px;overflow:auto">
            ${
              log.length
                ? log
                    .map(
                      (x) => `
                <div class="card soft" style="margin-bottom:8px">
                  <div class="muted" style="font-size:12px">
                    ${new Date(x.ts).toLocaleString()} • <b>${esc(x.action)}</b> • by <b>${esc(x.actor)}</b> (${esc(x.role)})
                  </div>
                  <div class="muted" style="margin-top:6px">${esc(JSON.stringify(x.detail || {}))}</div>
                </div>
              `
                    )
                    .join("")
                : `<p class="muted">No audit entries yet.</p>`
            }
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
            <button class="btn danger" id="clearAudit">Clear audit</button>
          </div>

          <p class="muted" id="auditMsg" style="margin:10px 0 0"></p>
        </div>
      `;

      $("#clearAudit").onclick = () => {
        if (!confirm("Clear audit log?")) return;
        saveJSON(KEYS.audit, []);
        audit("admin.audit_cleared", {});
        $("#auditMsg").textContent = "Cleared ✅";
        setTimeout(() => ($("#auditMsg").textContent = ""), 900);
        renderAudit();
      };
    };


    function renderQuotes() {
      if (!can("quote_manage")) {
        $("#adminTabMount").innerHTML = `
          <div class="card soft">
            <h3 style="margin:0 0 8px">Quotes</h3>
            <p class="muted" style="margin:0">Access denied.</p>
          </div>`;
        return;
      }

      const mount = $("#adminTabMount");
      const list = getQuotesAll();
      mount.innerHTML = `
        <div class="card soft">
          <h3 style="margin:0 0 8px">Quotes Manager</h3>
          <p class="muted" style="margin:0 0 12px">Add a quote that appears in the Kindness Quest “Today’s Quote”.</p>

          <div class="row">
            <input class="input" id="qText" placeholder="Quote text (required)" />
            <input class="input" id="qAuthor" placeholder="Author (optional)" />
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
            <button class="btn primary" id="qAdd">Add Quote</button>
            <button class="btn" id="qExport">Export JSON</button>
            <label class="btn" style="cursor:pointer">
              Import JSON <input id="qImport" type="file" accept="application/json" style="display:none">
            </label>
            <button class="btn danger" id="qClear">Clear Custom Quotes</button>
          </div>
          <p class="muted" id="qMsg" style="margin:10px 0 0"></p>
        </div>

        <div class="card soft" style="margin-top:12px">
          <h3 style="margin:0 0 10px">Current Quotes</h3>
          <div class="muted" style="margin:0 0 10px">Custom: <b>${getQuotesCustom().length}</b> • Total used: <b>${list.length}</b></div>
          <div class="list" id="qList"></div>
        </div>
      `;

      const qList = $("#qList");
      qList.innerHTML = getQuotesAll().map((q) => {
        const isCustom = !!q.custom;
        return `
          <div class="item">
            <div class="itemHead">
              <div>
                <div style="font-weight:900">${esc("“" + q.q + "”")}</div>
                <div class="itemMeta">${esc(q.a ? "— " + q.a : "— Unknown")} ${isCustom ? ' <span class="badge" style="margin-left:8px">Custom</span>' : ''}</div>
              </div>
              ${isCustom ? `<button class="btn danger" data-delq="${esc(q.id)}">Delete</button>` : ""}
            </div>
          </div>
        `;
      }).join("");

      // add
      $("#qAdd").onclick = () => {
        const text = ($("#qText").value || "").trim();
        const author = ($("#qAuthor").value || "").trim();
        const msg = $("#qMsg");
        if (!text) { msg.textContent = "Quote text is required."; return; }
        const ok = addCustomQuote({ q: text, a: author || "Unknown" });
        msg.textContent = ok ? "Added ✅" : "This quote already exists.";
        $("#qText").value = "";
        $("#qAuthor").value = "";
        setTimeout(() => (msg.textContent = ""), 900);
        renderQuotes();
      };

      // delete
      $$("[data-delq]").forEach((b) => {
        b.onclick = () => {
          const id = b.getAttribute("data-delq");
          deleteCustomQuote(id);
          $("#qMsg").textContent = "Deleted ✅";
          setTimeout(() => ($("#qMsg").textContent = ""), 900);
          renderQuotes();
        };
      });

      // export
      $("#qExport").onclick = () => {
        const payload = { exportedAt: nowISO(), quotes: getQuotesCustom().map(({id,q,a,ts})=>({id,q,a,ts})) };
        download("liftuphub_quotes.json", JSON.stringify(payload, null, 2), "application/json");
      };

      // import
      $("#qImport").onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try{
          const text = await file.text();
          const data = JSON.parse(text);
          const arr = Array.isArray(data) ? data : (data.quotes || []);
          let added = 0;
          arr.forEach((it) => {
            if (it && it.q) {
              if (addCustomQuote({ q: String(it.q), a: String(it.a || "Unknown"), id: it.id, ts: it.ts })) added++;
            }
          });
          $("#qMsg").textContent = `Imported ✅ Added ${added}`;
          setTimeout(() => ($("#qMsg").textContent = ""), 1200);
          renderQuotes();
        }catch(err){
          $("#qMsg").textContent = "Invalid JSON file.";
        }
        e.target.value = "";
      };

      // clear custom
      $("#qClear").onclick = () => {
        if (!confirm("Clear all custom quotes?")) return;
        setQuotesCustom([]);
        $("#qMsg").textContent = "Cleared ✅";
        setTimeout(() => ($("#qMsg").textContent = ""), 900);
        renderQuotes();
      };
    }


    
const renderGallery = () => {
  const base = getStaticGalleryList();
  const draft = loadGalleryDraft();

  const draftRows = (draft || []).map((it, i) => `
    <div class="item">
      <div class="itemHead">
        <div>
          <div style="font-weight:900">${esc(it.name || it.alt || "Image")}</div>
          <div class="itemMeta">${esc(it.src || "")}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn" data-open-img="${esc(String(i))}">Preview</button>
          <button class="btn danger" data-del-draft="${esc(String(i))}">Remove</button>
        </div>
      </div>
    </div>
  `).join("");

  const staticPreview = (base || []).slice(0,12).map(it => `
    <div class="badge" style="justify-content:space-between;width:100%">
      <span>${esc(it.alt || it.name || "Image")}</span>
      <span style="opacity:.7">${esc(it.src || "")}</span>
    </div>
  `).join("");

  const fileText = `// assets/js/gallery_static.js\n// Edit this file and commit to GitHub to update the gallery for everyone.\n\nwindow.LUH_GALLERY = [\n${
    (base || []).map(it => `  { src: "${(it.src||"").replace(/"/g,'\\\"')}", alt: "${(it.alt||it.name||"").replace(/"/g,'\\\"')}" }`).join(",\n")
  }\n];\n`;

  mount.innerHTML = `
    <div class="card soft">
      <h3 style="margin:0 0 10px">Gallery (Option 2 — Static images for GitHub)</h3>

      <div class="muted" style="margin:0 0 12px;line-height:1.6">
        <b>Best for GitHub Pages:</b> put your images inside <code>assets/images/gallery/</code> and update
        <code>assets/js/gallery_static.js</code>. This makes the gallery visible to everyone.
      </div>

      <div class="card soft" style="box-shadow:none;padding:12px;margin-bottom:12px">
        <div style="font-weight:900;margin-bottom:6px">1) Add image files to project</div>
        <div class="muted" style="font-size:12px">
          Place files here: <code>assets/images/gallery/</code> (example: <code>assets/images/gallery/my1.jpg</code>)
        </div>
      </div>

      <div class="card soft" style="box-shadow:none;padding:12px;margin-bottom:12px">
        <div style="font-weight:900;margin-bottom:8px">2) Add to gallery list (draft)</div>
        <div class="row">
          <input class="input" id="galFile" placeholder="File name (e.g. my1.jpg)" />
          <input class="input" id="galAlt" placeholder="Caption/Alt (e.g. Science Fair)" />
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
          <button class="btn primary" id="galAddFile">Add to Draft</button>
          <button class="btn" id="galClearDraft">Clear Draft</button>
        </div>
        <div class="muted" style="font-size:12px;margin-top:8px">
          Draft is for preview on this device only. To publish for everyone, update <code>gallery_static.js</code> and commit to GitHub.
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
        <div class="card soft" style="box-shadow:none;padding:12px">
          <div style="font-weight:900;margin-bottom:8px">Current Static List (preview)</div>
          <div class="list">${staticPreview || '<div class="muted">No items.</div>'}</div>
        </div>

        <div class="card soft" style="box-shadow:none;padding:12px">
          <div style="font-weight:900;margin-bottom:8px">Draft Items</div>
          <div class="list">${draftRows || '<div class="muted">No draft items.</div>'}</div>
        </div>
      </div>

      <div class="card soft" style="box-shadow:none;padding:12px;margin-top:12px">
        <div style="font-weight:900;margin-bottom:8px">3) Update gallery_static.js</div>
        <textarea class="input" id="galFileText" style="min-height:170px;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${esc(fileText)}</textarea>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
          <button class="btn primary" id="galDownloadJS">Download gallery_static.js</button>
          <button class="btn" id="galCopyJS">Copy</button>
        </div>
        <div class="muted" style="font-size:12px;margin-top:8px">
          Replace <code>assets/js/gallery_static.js</code> with this content, then push to GitHub.
        </div>
      </div>
    </div>
  `;

  // actions
  $("#galAddFile").onclick = () => {
    const f = ($("#galFile").value || "").trim();
    const alt = ($("#galAlt").value || "").trim();
    if(!f){
      toast("Enter a file name مثل my1.jpg");
      return;
    }
    const src = "assets/images/gallery/" + f.replace(/^\/+/, "");
    const next = [...draft, { src, alt: alt || f, name: alt || f }];
    saveGalleryDraft(next);
    hookHomeGallery();
    renderGallery();
    toast("Added to draft ✅");
  };

  $("#galClearDraft").onclick = () => {
    saveGalleryDraft([]);
    hookHomeGallery();
    renderGallery();
    toast("Draft cleared ✅");
  };

  $$("#adminTabMount [data-del-draft]").forEach(btn=>{
    btn.onclick = () => {
      const i = parseInt(btn.getAttribute("data-del-draft"),10);
      const next = draft.filter((_,idx)=>idx!==i);
      saveGalleryDraft(next);
      hookHomeGallery();
      renderGallery();
      toast("Removed ✅");
    };
  });

  $$("#adminTabMount [data-open-img]").forEach(btn=>{
    btn.onclick = () => {
      const i = parseInt(btn.getAttribute("data-open-img"),10);
      const it = draft[i];
      if(it && it.src) openLightbox(it.src, it.alt || "Image");
    };
  });

  $("#galCopyJS").onclick = async () => {
    try{
      await navigator.clipboard.writeText($("#galFileText").value);
      toast("Copied ✅");
    }catch(_){
      toast("Copy failed. Select text and copy manually.");
    }
  };

  $("#galDownloadJS").onclick = () => {
    const content = $("#galFileText").value || "";
    const blob = new Blob([content], {type:"text/javascript"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gallery_static.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 500);
  };
};

      // add file
      $("#galAddFile").onclick = async () => {
        const f = $("#galFile").files && $("#galFile").files[0];
        if(!f) return msg("Choose an image file first.");
        if(f.size > 900 * 1024) return msg("File too large. Please use an image under ~900KB.");
        const dataUrl = await readFileAsDataURL(f);
        const id = "img_" + Math.random().toString(16).slice(2);
        const next = (items || []).concat([{ id, name: f.name, src: dataUrl, ts: Date.now() }]).slice(-60);
        saveGalleryCustom(next);
        msg("Added ✅");
        setTimeout(()=>msg(""),900);
        $("#galFile").value = "";
        renderGallery();
        if(routeName() === "home") hookHomeGallery();
      };

      // delete
      $$("[data-del-img]").forEach(btn=>{
        btn.onclick = () => {
          const id = btn.getAttribute("data-del-img");
          if(!confirm("Delete this image?")) return;
          const next = (loadGalleryCustom() || []).filter(x=>x.id !== id);
          saveGalleryCustom(next);
          renderGallery();
          if(routeName() === "home") hookHomeGallery();
        };
      });

      // preview
      $$("[data-open-img]").forEach(btn=>{
        btn.onclick = () => {
          const id = btn.getAttribute("data-open-img");
          const it = (loadGalleryCustom() || []).find(x=>x.id === id);
          if(!it) return;
          openLightbox([{src: it.src, alt: it.name || "image"}], 0);
        };
      });

      // export/import/clear
      $("#galExport").onclick = () => {
        const payload = JSON.stringify(loadGalleryCustom() || [], null, 2);
        downloadFile("gallery.json", payload, "application/json");
      };

      $("#galImport").onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if(!file) return;
        try{
          const txt = await file.text();
          const data = JSON.parse(txt);
          if(!Array.isArray(data)) throw new Error("not array");
          const cleaned = data.filter(x=>x && x.src).slice(-60).map(x=>({
            id: x.id || ("img_" + Math.random().toString(16).slice(2)),
            name: x.name || "",
            src: x.src,
            ts: x.ts || Date.now()
          }));
          saveGalleryCustom(cleaned);
          msg("Imported ✅");
          setTimeout(()=>msg(""),900);
          renderGallery();
          if(routeName() === "home") hookHomeGallery();
        }catch(err){
          msg("Invalid JSON file.");
        }
        e.target.value="";
      };

      $("#galClear").onclick = () => {
        if(!confirm("Clear all custom gallery images?")) return;
        saveGalleryCustom([]);
        msg("Cleared ✅");
        setTimeout(()=>msg(""),900);
        renderGallery();
        if(routeName() === "home") hookHomeGallery();
      };
    };

    const setTab = (tab) => {
      if (tab === "branding") renderBranding();
      else if (tab === "features") renderFeatures();
      else if (tab === "backup") renderBackup();
      else if (tab === "quotes") renderQuotes();
      else if (tab === "gallery") renderGallery();
      else if (tab === "moderation") renderModeration();
      else if (tab === "audit") renderAudit();
      else renderBranding();
    };

    // default tab
    setTab("branding");

    // attach tab click
    $$("[data-tab]").forEach((btn) => {
      btn.onclick = () => setTab(btn.getAttribute("data-tab"));
    });
  }

  // -----------------------------
  // Particles
  // -----------------------------
  function startParticles() {
    const canvas = $("#particles");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    function resize() {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const dots = Array.from({ length: 70 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2 + 0.6,
    }));

    function tick() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const p of dots) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
        if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fill();
      }

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i],
            b = dots[j];
          const dx = a.x - b.x,
            dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const alpha = 1 - dist / 140;
            ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.18})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(tick);
    }
    tick();
  }

  // -----------------------------
  // Boot
  // -----------------------------
  async function boot() {
    await ensureAdmin();
    await loadLayout();

    ensureTopLinks();

    // Admin button routes to #/admin
    const navAdmin = $("#navAdmin");
    if (navAdmin) navAdmin.setAttribute("href", "#/admin");

    // theme
    const savedTheme = localStorage.getItem(KEYS.theme);
    if (savedTheme) document.body.setAttribute("data-theme", savedTheme);
    const themeBtn = $("#themeToggle");
    if (themeBtn) themeBtn.textContent = document.body.getAttribute("data-theme") === "dark" ? "🌙 Dark" : "☀️ Light";
    if (themeBtn) {
      themeBtn.onclick = () => {
        const cur = document.body.getAttribute("data-theme") || "dark";
        const next = cur === "dark" ? "light" : "dark";
        document.body.setAttribute("data-theme", next);
        localStorage.setItem(KEYS.theme, next);
        themeBtn.textContent = next === "dark" ? "🌙 Dark" : "☀️ Light";
      };
    }

    // logout
    const logoutBtn = $("#logoutBtn");
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        audit("auth.logout", {});
        clearSession();
        updateTopBar();
        openAuthModal(true);
        location.hash = "#/home";
      };
    }

    attachDelegation();

    // drawers + pins
    mountGuides();
    mountChat();
    syncPinButtons();

    applySettings();
    updateTopBar();

    if (getSettings().enableParticles) startParticles();

    // initial route
    if (!location.hash || location.hash === "#" || location.hash === "#/") location.hash = "#/home";
    await route();

    // guest => auth modal
    if (!isLoggedIn()) openAuthModal(true);

    // restore pinned drawers open state
    const pins = loadPins();
    Object.keys(pins).forEach((id) => {
      if (pins[id]) openDrawer(id, { keepOthers: true });
    });
    autoFitPinned();

    window.addEventListener("hashchange", async () => {
      ensureTopLinks();
      await route();
      applySettings();
      updateTopBar();
      mountGuides();
      mountChat();
      syncPinButtons();
      autoFitPinned();
      if (!isLoggedIn()) openAuthModal(true);
    });
  }

  function showBootError(e) {
    document.body.innerHTML = `
      <div style="padding:18px;font-family:system-ui;color:#fff;background:#0b1020;min-height:100vh">
        <h2>Boot failed</h2>
        <pre style="white-space:pre-wrap;color:#ddd;background:#111827;padding:12px;border-radius:12px">${esc(
          e?.stack || e?.message || String(e)
        )}</pre>
      </div>
    `;
  }

  boot().catch(showBootError);
})();