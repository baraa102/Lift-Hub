;(function(){
  "use strict";

  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

  const KEYS = {
    users:"luh_users_v1",
    session:"luh_session_v1",
    quotes:"luh_quotes_v1",
    galleryDraft:"luh_gallery_draft_v1"
  };

  const esc = (v)=>String(v??"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  const loadJSON = (k, d)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(_){ return d; } };
  const saveJSON = (k, v)=>localStorage.setItem(k, JSON.stringify(v));
  const uid = ()=>Math.random().toString(16).slice(2)+Date.now().toString(16);

  function session(){ return loadJSON(KEYS.session, null); }
  function isLoggedIn(){ return !!session(); }
  function role(){ return session()?.role || "guest"; }
  function username(){ return session()?.username || ""; }

  // ---------------- Layout / Boot ----------------
  async function fetchText(url){
    const res = await fetch(url, {cache:"no-store"});
    if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  }

  async function boot(){
    // load layout into #app
    const app = $("#app");
    if(!app) throw new Error("#app missing");
    const layoutHtml = await fetchText("./Particles/layout.html");
    app.innerHTML = layoutHtml;

    wireTopbar();
    renderDrawers();
    startParticles();
    await route();
    window.addEventListener("hashchange", route);
  }

  function wireTopbar(){
    const logoutBtn = $("#logoutBtn");
    if(logoutBtn){
      logoutBtn.onclick = ()=>{
        localStorage.removeItem(KEYS.session);
        syncHeader();
        location.hash = "#/home";
      };
    }

    const navAuth = $("#navAuth");
    if(navAuth){
      navAuth.onclick = (e)=>{
        e.preventDefault();
        openAuthModal(true);
      };
    }

    // theme toggle (simple)
    const themeBtn = $("#themeToggle");
    if(themeBtn){
      themeBtn.onclick = ()=>{
        const cur = document.body.getAttribute("data-theme") || "dark";
        const next = cur === "dark" ? "light" : "dark";
        document.body.setAttribute("data-theme", next);
        themeBtn.textContent = next === "dark" ? "🌙 Dark" : "☀️ Light";
      };
    }

    // drawers open
    $$("[data-open]").forEach(btn=>{
      btn.onclick = ()=>{
        const id = btn.getAttribute("data-open");
        toggleDrawer(id, true);
      };
    });

    // drawer close on backdrop click (escape)
    document.addEventListener("keydown",(e)=>{
      if(e.key==="Escape"){
        toggleDrawer("drawerGuides", false);
        toggleDrawer("drawerChat", false);
        closeModal();
        closeLightbox();
      }
    });

    syncHeader();
  }

  function syncHeader(){
    const roleTag = $("#roleTag");
    const welcome = $("#welcomeTag");
    const profilePill = $("#profilePill");
    const loginPill = $("#loginPill");
    const logoutPill = $("#logoutPill");
    const navAdmin = $("#navAdmin");

    if(roleTag) roleTag.textContent = `Role: ${role()}`;
    if(welcome){
      if(isLoggedIn()){
        welcome.classList.remove("hide");
        welcome.textContent = `Welcome, ${username()}`;
      }else{
        welcome.classList.add("hide");
      }
    }
    if(profilePill) profilePill.classList.toggle("hide", !isLoggedIn());
    if(loginPill) loginPill.classList.toggle("hide", isLoggedIn());
    if(logoutPill) logoutPill.classList.toggle("hide", !isLoggedIn());
    if(navAdmin) navAdmin.parentElement?.classList.toggle("hide", role()!=="admin");
  }

  function renderDrawers(){
    const g=$("#guidesMount");
    if(g){
      g.innerHTML = `
        <div class="card soft">
          <h3 style="margin:0 0 8px">Guides</h3>
          <p class="muted" style="margin:0">Add your study guides here later.</p>
        </div>`;
    }
    const c=$("#chatMount");
    if(c){
      c.innerHTML = `
        <div class="card soft">
          <h3 style="margin:0 0 8px">Chat</h3>
          <p class="muted" style="margin:0">Local demo chat will be added.</p>
        </div>`;
    }
  }

  // ---------------- Routing ----------------
  function routeName(){
    const raw=(location.hash||"").trim();
    if(!raw || raw==="#" || raw==="#/") return "home";
    return raw.startsWith("#/") ? (raw.slice(2)||"home") : (raw.slice(1)||"home");
  }

  async function route(){
    const page = routeName();
    const mount = $("#pageMount");
    if(!mount) return;

    // auth: modal only, do not navigate
    if(page==="auth"){
      openAuthModal(true);
      location.hash = "#/home";
      return;
    }

    // auth guard
    if((page==="profile") && !isLoggedIn()){
      openAuthModal(true);
      location.hash="#/home";
      return;
    }
    if(page==="admin_settings" && role()!=="admin"){
      location.hash="#/home";
      return;
    }

    // try load page file
    try{
      mount.innerHTML = await fetchText(`./pages/${page}.html`);
    }catch(_){
      mount.innerHTML = templates[page] ? templates[page]() : templates.home();
    }

    // after load hooks
    if(page==="home") hookHome();
    if(page==="profile") hookProfile();
    if(page==="admin_settings") hookAdminSettings();

    // ensure gallery works
    hookGalleryLightbox();
  }

  // ---------------- Templates ----------------
  const templates = {
    home: ()=>`
      <section class="card heroCard">
        <div class="heroLeft">
          <h2>Be kind. Be confident. Lift others up.</h2>
          <p class="muted">Welcome to Lift Up Hub.</p>
          <div class="row" style="gap:10px;flex-wrap:wrap">
            <button class="btn primary" id="openGuidesBtn">📚 Open Study Guides</button>
            <button class="btn" id="openChatBtn">💬 Open Chat</button>
            <a class="btn" href="#/profile">👤 Profile</a>
          </div>
        </div>
        <div class="heroRight">
          <div class="card soft">
            <img class="heroImg" src="assets/images/hero.jpg" alt="Hero" />
          </div>
        </div>
      </section>

      <section class="card" style="margin-top:14px">
        <h3 style="margin:0 0 10px">Photo Gallery</h3>
        <div class="galleryGrid" id="homeGallery"></div>
      </section>
    `,
    profile: ()=>`
      <section class="card">
        <h2 style="margin:0 0 8px">Profile</h2>
        <p class="muted" style="margin:0 0 10px">Logged in as <b>${esc(username())}</b></p>
      </section>
    `,
    admin_settings: ()=>`
      <section class="card">
        <h2 style="margin:0 0 8px">Admin Control Center</h2>
        <p class="muted" style="margin:0 0 12px">Quotes • Gallery (Option 2 static)</p>

        <div class="card soft" style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" data-tab="quotes">💬 Quotes</button>
          <button class="btn" data-tab="gallery">🖼 Gallery</button>
        </div>

        <div id="adminTabMount" style="margin-top:12px"></div>
      </section>
    `
  };

  // ---------------- Home ----------------
  function getStaticGallery(){
    const list = (window.LUH_GALLERY && Array.isArray(window.LUH_GALLERY)) ? window.LUH_GALLERY : [];
    return list.length ? list : [
      {src:"assets/images/g1.jpg", alt:"g1"},
      {src:"assets/images/g2.jpg", alt:"g2"},
      {src:"assets/images/g3.jpg", alt:"g3"},
      {src:"assets/images/g4.jpg", alt:"g4"}
    ];
  }

  function hookHome(){
    $("#openGuidesBtn")?.addEventListener("click", ()=>toggleDrawer("drawerGuides", true));
    $("#openChatBtn")?.addEventListener("click", ()=>toggleDrawer("drawerChat", true));

    const grid = $("#homeGallery");
    if(!grid) return;

    const imgs = getStaticGallery();
    grid.innerHTML = imgs.map((it, idx)=>`
      <button class="galItem" data-gal-index="${idx}" aria-label="${esc(it.alt||"image")}">
        <img src="${esc(it.src)}" alt="${esc(it.alt||"")}" loading="lazy" />
      </button>
    `).join("");

    // click => lightbox
    $$("[data-gal-index]", grid).forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const i = parseInt(btn.getAttribute("data-gal-index")||"0",10);
        openLightbox(i);
      });
    });
  }

  // ---------------- Profile ----------------
  function hookProfile(){ /* minimal */ }

  // ---------------- Admin Settings ----------------
  function loadQuotes(){ return loadJSON(KEYS.quotes, []); }
  function saveQuotes(q){ saveJSON(KEYS.quotes, (q||[]).slice(-200)); }

  function hookAdminSettings(){
    const mount = $("#adminTabMount");
    if(!mount) return;

    const setTab = (tab)=>{
      if(tab==="gallery") renderGalleryTab();
      else renderQuotesTab();
      $$("[data-tab]").forEach(b=>b.classList.toggle("primary", b.getAttribute("data-tab")===tab));
    };

    function renderQuotesTab(){
      const list = loadQuotes();
      mount.innerHTML = `
        <div class="card soft">
          <h3 style="margin:0 0 10px">Quotes</h3>
          <div class="row">
            <input class="input" id="qText" placeholder="Quote text" />
            <input class="input" id="qAuthor" placeholder="Author (optional)" />
          </div>
          <button class="btn primary" id="qAdd" style="margin-top:10px">Add Quote</button>
          <div style="margin-top:12px" id="qList"></div>
        </div>
      `;
      const qList=$("#qList");
      qList.innerHTML = list.map(q=>`
        <div class="card soft" style="margin-bottom:8px">
          <div style="font-weight:800">${esc(q.text)}</div>
          <div class="muted">${esc(q.author||"")}</div>
          <button class="btn danger" data-qdel="${esc(q.id)}" style="margin-top:8px">Delete</button>
        </div>
      `).join("") || `<p class="muted">No quotes yet.</p>`;

      $("#qAdd").onclick = ()=>{
        const text = ($("#qText").value||"").trim();
        const author = ($("#qAuthor").value||"").trim();
        if(!text) return;
        const next = [{id:uid(), text, author, ts:Date.now()}, ...loadQuotes()];
        saveQuotes(next);
        setTab("quotes");
      };

      $$("[data-qdel]").forEach(btn=>{
        btn.onclick = ()=>{
          const id=btn.getAttribute("data-qdel");
          saveQuotes(loadQuotes().filter(x=>x.id!==id));
          setTab("quotes");
        };
      });
    }

    function renderGalleryTab(){
      const list = getStaticGallery();
      const example = `;window.LUH_GALLERY = [\n` + list.map(it=>`  { src: "${it.src}", alt: "${it.alt||""}" }`).join(",\n") + `\n];\n`;
      mount.innerHTML = `
        <div class="card soft">
          <h3 style="margin:0 0 10px">Gallery (Option 2 - Static)</h3>
          <p class="muted" style="margin:0 0 10px">
            ضع الصور داخل: <b>assets/images/gallery/</b><br>
            ثم حدّث الملف: <b>assets/js/gallery_static.js</b>
          </p>
          <textarea class="input" style="min-height:220px" readonly>${esc(example)}</textarea>
        </div>
      `;
    }

    // default
    setTab("quotes");
    $$("[data-tab]").forEach(btn=>{
      btn.onclick = ()=>setTab(btn.getAttribute("data-tab"));
    });
  }

  // ---------------- Auth Modal ----------------
  let modalEl=null;

  function openAuthModal(showLogin){
    closeModal();
    modalEl = document.createElement("div");
    modalEl.className="modalOverlay";
    modalEl.innerHTML = `
      <div class="modalCard authModal">
        <div class="modalHead">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="logoDot"></div>
            <div>
              <div style="font-weight:900">Login / Register</div>
              <div class="muted" style="font-size:12px"></div>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn ${showLogin?'primary':''}" id="tabLogin">Login</button>
            <button class="btn ${!showLogin?'primary':''}" id="tabReg">Register</button>
          </div>
        </div>
        <div class="modalBody" id="authBody"></div>
      </div>
    `;
    modalEl.addEventListener("click",(e)=>{ if(e.target===modalEl) closeModal(); });
    document.body.appendChild(modalEl);

    const setTab=(tab)=>{
      $("#tabLogin").classList.toggle("primary", tab==="login");
      $("#tabReg").classList.toggle("primary", tab==="reg");
      $("#authBody").innerHTML = tab==="login" ? loginForm() : regForm();
      hookAuthForms();
    };
    $("#tabLogin").onclick=()=>setTab("login");
    $("#tabReg").onclick=()=>setTab("reg");
    setTab(showLogin?"login":"reg");
  }

  function closeModal(){
    if(modalEl){ modalEl.remove(); modalEl=null; }
  }

  function ensureAdminSeed(){
    const users = loadJSON(KEYS.users, []);
    if(users.some(u=>u.username==="admin")) return;
    users.push({id:uid(), username:"admin", pass:"Admin@12345!", role:"admin"});
    saveJSON(KEYS.users, users);
  }

  function loginForm(){
    return `
      <div class="card soft">
        <h3 style="margin:0 0 10px">Login</h3>
        <input class="input" id="lUser" placeholder="Username" />
        <input class="input" id="lPass" placeholder="Password" type="password" style="margin-top:10px"/>
        <button class="btn primary" id="lBtn" style="margin-top:10px;width:100%">Login</button>
        <div class="muted" id="lMsg" style="margin-top:10px"></div>
      </div>
    `;
  }
  function regForm(){
    return `
      <div class="card soft">
        <h3 style="margin:0 0 10px">Register</h3>
        <input class="input" id="rUser" placeholder="Choose username" />
        <input class="input" id="rPass" placeholder="Choose password" type="password" style="margin-top:10px"/>
        <button class="btn primary" id="rBtn" style="margin-top:10px;width:100%">Create account</button>
        <div class="muted" id="rMsg" style="margin-top:10px"></div>
      </div>
    `;
  }

  function hookAuthForms(){
    ensureAdminSeed();

    const lBtn=$("#lBtn");
    if(lBtn){
      lBtn.onclick=()=>{
        const u=($("#lUser").value||"").trim();
        const p=($("#lPass").value||"").trim();
        const users=loadJSON(KEYS.users, []);
        const found=users.find(x=>x.username===u && x.pass===p);
        const msg=$("#lMsg");
        if(!found){ msg.textContent="Invalid login."; return; }
        saveJSON(KEYS.session, {uid:found.id, username:found.username, role:found.role});
        closeModal();
        syncHeader();
        route();
      };
    }

    const rBtn=$("#rBtn");
    if(rBtn){
      rBtn.onclick=()=>{
        const u=($("#rUser").value||"").trim();
        const p=($("#rPass").value||"").trim();
        const msg=$("#rMsg");
        if(u.length<3){ msg.textContent="Username too short."; return; }
        if(p.length<4){ msg.textContent="Password too short."; return; }
        const users=loadJSON(KEYS.users, []);
        if(users.some(x=>x.username===u)){ msg.textContent="Username already used."; return; }
        const rec={id:uid(), username:u, pass:p, role:"user"};
        users.push(rec); saveJSON(KEYS.users, users);
        saveJSON(KEYS.session, {uid:rec.id, username:rec.username, role:rec.role});
        closeModal();
        syncHeader();
        route();
      };
    }
  }

  // ---------------- Drawer helpers ----------------
  function toggleDrawer(id, open){
    const el = $("#"+id);
    if(!el) return;
    el.classList.toggle("open", !!open);
    el.setAttribute("aria-hidden", open ? "false" : "true");
  }

  // ---------------- Lightbox ----------------
  let lb=null, lbIndex=0;
  function ensureLightbox(){
    if(lb) return;
    lb=document.createElement("div");
    lb.className="lightbox";
    lb.innerHTML = `
      <div class="lightboxInner">
        <button class="iconBtn lbClose" aria-label="Close">✕</button>
        <button class="iconBtn lbPrev" aria-label="Previous">‹</button>
        <img class="lbImg" alt="" />
        <button class="iconBtn lbNext" aria-label="Next">›</button>
      </div>`;
    lb.addEventListener("click",(e)=>{ if(e.target===lb) closeLightbox(); });
    document.body.appendChild(lb);

    $(".lbClose",lb).onclick=closeLightbox;
    $(".lbPrev",lb).onclick=()=>openLightbox(lbIndex-1);
    $(".lbNext",lb).onclick=()=>openLightbox(lbIndex+1);
    document.addEventListener("keydown",(e)=>{
      if(!lb.classList.contains("open")) return;
      if(e.key==="ArrowLeft") openLightbox(lbIndex-1);
      if(e.key==="ArrowRight") openLightbox(lbIndex+1);
    });
  }

  function openLightbox(i){
    ensureLightbox();
    const list=getStaticGallery();
    if(!list.length) return;
    lbIndex=(i+list.length)%list.length;
    const it=list[lbIndex];
    const img=$(".lbImg",lb);
    img.src=it.src;
    img.alt=it.alt||"";
    lb.classList.add("open");
  }
  function closeLightbox(){ if(lb) lb.classList.remove("open"); }

  function hookGalleryLightbox(){
    // ensure any existing gallery items open
    // (home already wires click, this is for future pages)
  }

  // ---------------- Particles (simple) ----------------
  function startParticles(){
    const canvas=$("#particles");
    if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const dpr=Math.max(1, window.devicePixelRatio||1);
    let w=0,h=0,pts=[];
    function resize(){
      w=window.innerWidth; h=window.innerHeight;
      canvas.width=Math.floor(w*dpr); canvas.height=Math.floor(h*dpr);
      canvas.style.width=w+"px"; canvas.style.height=h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    function init(){
      pts = Array.from({length:80}).map(()=>({
        x:Math.random()*w, y:Math.random()*h,
        vx:(Math.random()-.5)*0.35, vy:(Math.random()-.5)*0.35,
        r:1+Math.random()*1.8
      }));
    }
    function tick(){
      ctx.clearRect(0,0,w,h);
      ctx.globalAlpha=0.9;
      for(const p of pts){
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>w) p.vx*=-1;
        if(p.y<0||p.y>h) p.vy*=-1;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle="rgba(180,210,255,.25)";
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    resize(); init(); tick();
    window.addEventListener("resize", ()=>{resize(); init();});
  }

  // ---------------- CSS helpers (inject small additions) ----------------
  function injectExtras(){
    const css = `
      .heroCard{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;padding:16px}
      @media(max-width:900px){.heroCard{grid-template-columns:1fr}}
      .heroImg{width:100%;height:280px;object-fit:cover;border-radius:14px;display:block}
      .galleryGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
      @media(max-width:900px){.galleryGrid{grid-template-columns:repeat(2,1fr)}}
      .galItem{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);border-radius:14px;padding:0;overflow:hidden;cursor:pointer}
      .galItem img{width:100%;height:120px;object-fit:cover;display:block}
      .modalOverlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:18px}
      .modalCard{width:min(560px,92vw);background:rgba(18,24,42,.96);border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.45)}
      .modalHead{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px;border-bottom:1px solid rgba(255,255,255,.10)}
      .modalBody{padding:14px}
      .lightbox{position:fixed;inset:0;background:rgba(0,0,0,.82);display:none;align-items:center;justify-content:center;z-index:99999;padding:20px}
      .lightbox.open{display:flex}
      .lightboxInner{position:relative;width:min(1000px,92vw)}
      .lbImg{width:100%;max-height:80vh;object-fit:contain;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04)}
      .lbClose{position:absolute;top:-10px;right:-10px}
      .lbPrev{position:absolute;top:50%;left:-10px;transform:translateY(-50%)}
      .lbNext{position:absolute;top:50%;right:-10px;transform:translateY(-50%)}
      .iconBtn{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:10px;cursor:pointer}
      .drawer.open{transform:translateX(0)!important}
    `;
    const st=document.createElement("style");
    st.textContent=css;
    document.head.appendChild(st);
  }

  injectExtras();
  boot().catch(err=>{
    (window.__BOOT_LOG__ = window.__BOOT_LOG__ || []).push(String(err?.message||err));
    console.error(err);
  });
})();