// assets/js/router.js
async function fetchText(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path} (HTTP ${res.status})`);
  return await res.text();
}

function normalizeRoute() {
  const raw = (location.hash || "").trim();
  if (!raw || raw === "#" || raw === "#/" ) return "home";
  if (raw.startsWith("#/")) return raw.slice(2).trim() || "home";
  if (raw.startsWith("#")) return raw.slice(1).trim() || "home";
  return "home";
}

export async function loadPage(pageName) {
  const mount = document.getElementById("pageMount");
  if (!mount) throw new Error("#pageMount not found");
  const safe = pageName.replace(/[^a-zA-Z0-9_]/g,"") || "home";
  const html = await fetchText(`./pages/${safe}.html`);
  mount.innerHTML = html;
}

export async function route() {
  const page = normalizeRoute();
  try{
    await loadPage(page);
    return page;
  }catch(err){
    console.error(err);
    const mount = document.getElementById("pageMount");
    if(mount){
      mount.innerHTML = `
        <section class="card">
          <h2 style="margin:0 0 8px">Router Error</h2>
          <p class="muted" style="margin:0 0 10px">Tried: <b>${page}</b></p>
          <div class="card soft">
            <p class="muted" style="margin:0"><b>${String(err.message||err)}</b></p>
            <p class="muted" style="margin:10px 0 0">Check file: <code>pages/${page}.html</code></p>
          </div>
        </section>
      `;
    }
    return "error";
  }
}