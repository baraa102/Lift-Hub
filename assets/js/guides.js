// assets/js/guides.js
import { can } from "./auth.js";

const KEY = "luh_guides_fix_v1";

const SUBJECTS = [
  "math","english","science","biology","chemistry","physics","history","geography",
  "arabic","french","ict","business","economics","art","design","pe"
];

const SEED = [
  g("Algebra Quick Review","math","Y8–Y10","15 min","PDF","Easy",["equations"],"#"),
  g("Fractions & Decimals","math","Y6–Y8","18 min","PDF","Easy",["fractions"],"#"),
  g("Essay Writing Structure","english","Y7–Y10","25 min","Video","Medium",["writing"],"#"),
  g("Cells & Organelles","biology","Y7–Y9","20 min","Link","Medium",["cells"],"#"),
  g("Atoms & Periodic Table","chemistry","Y8–Y10","22 min","Link","Medium",["atoms"],"#"),
  g("Forces & Motion","physics","Y8–Y10","20 min","Video","Medium",["forces"],"#"),
];

function g(title,subject,grade,duration,type,diff,tags,link){
  return { id: crypto.randomUUID(), title, subject, grade, duration, type, diff, tags, link, createdAt: Date.now()-Math.floor(Math.random()*2000000) };
}

function load(){
  try{
    const x = JSON.parse(localStorage.getItem(KEY)||"null");
    if(Array.isArray(x) && x.length) return x;
  }catch{}
  localStorage.setItem(KEY, JSON.stringify(SEED));
  return SEED;
}
function save(v){ localStorage.setItem(KEY, JSON.stringify(v.slice(-1000))); }

function esc(s){return String(s).replace(/[&<>"']/g,ch=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]))}
function cap(s){ return (s||"").slice(0,1).toUpperCase()+ (s||"").slice(1); }
function isUrlMaybe(s){ try{ new URL(s); return true; }catch{ return false; } }

export function mountGuides(){
  const mount = document.getElementById("guidesMount");
  if(!mount) return;

  try{
    const manage = can("guide_manage");

    mount.innerHTML = `
      <div style="display:flex;justify-content:flex-end">
        <button class="miniHide" data-hide="drawerGuides">hide</button>
      </div>

      <div class="card soft">
        <h3 style="margin:0 0 6px">Study Guides</h3>
        <p class="muted" style="margin:0 0 12px">Search, filter, sort and open.</p>

        <div class="row">
          <input class="input" id="q" placeholder="Search…" />
          <select class="input" id="s">
            <option value="all">All subjects</option>
            ${SUBJECTS.map(x=>`<option value="${x}">${cap(x)}</option>`).join("")}
          </select>
        </div>

        <div class="row" style="margin-top:10px">
          <select class="input" id="d">
            <option value="all">All difficulty</option>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
          <select class="input" id="sort">
            <option value="new">Newest</option>
            <option value="title">Title</option>
            <option value="subj">Subject</option>
          </select>
        </div>

        ${manage ? `
          <div class="card soft" style="margin-top:12px">
            <h3 style="margin:0 0 8px">Add Guide</h3>
            <div class="row">
              <input class="input" id="aTitle" placeholder="Title" />
              <select class="input" id="aSubj">${SUBJECTS.map(x=>`<option value="${x}">${cap(x)}</option>`).join("")}</select>
            </div>
            <div class="row" style="margin-top:10px">
              <input class="input" id="aGrade" placeholder="Grade (Y8–Y10)" />
              <input class="input" id="aLink" placeholder="URL" />
            </div>
            <div class="row" style="margin-top:10px">
              <input class="input" id="aTags" placeholder="Tags (comma separated)" />
              <select class="input" id="aDiff"><option>Easy</option><option selected>Medium</option><option>Hard</option></select>
            </div>
            <button class="btn primary" id="aBtn" style="margin-top:10px">Add</button>
            <p class="muted" id="aMsg" style="margin:8px 0 0"></p>
          </div>
        ` : ""}

        <div id="list" style="margin-top:12px"></div>
      </div>
    `;

    const $ = (sel)=>mount.querySelector(sel);

    function render(){
      const q = ($("#q").value||"").trim().toLowerCase();
      const s = $("#s").value;
      const d = $("#d").value;
      const sort = $("#sort").value;

      let items = load().filter(x=>{
        const text = (x.title + " " + (x.tags||[]).join(" ")).toLowerCase();
        const okQ = !q || text.includes(q);
        const okS = (s==="all") ? true : x.subject===s;
        const okD = (d==="all") ? true : x.diff===d;
        return okQ && okS && okD;
      });

      if(sort==="new") items.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
      if(sort==="title") items.sort((a,b)=>(a.title||"").localeCompare(b.title||""));
      if(sort==="subj") items.sort((a,b)=>(a.subject||"").localeCompare(b.subject||""));

      $("#list").innerHTML = items.map(x=>`
        <div class="card soft" style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <div>
              <div style="font-weight:900">${esc(x.title)}</div>
              <div class="muted" style="font-size:12px">${esc(x.grade)} • ${esc(cap(x.subject))} • ${esc(x.diff)} • ${esc(x.type||"")}</div>
              <div class="muted" style="font-size:12px">${esc((x.tags||[]).join(", "))}</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <a class="btn primary" href="${x.link}" target="_blank" rel="noopener">Open</a>
              ${manage ? `<button class="btn danger" data-del="${x.id}">Delete</button>` : ""}
            </div>
          </div>
        </div>
      `).join("") || `<p class="muted">No guides found.</p>`;

      $("#list").querySelectorAll("[data-del]").forEach(b=>{
        b.onclick=()=>{
          const id=b.getAttribute("data-del");
          save(load().filter(i=>i.id!==id));
          render();
        };
      });
    }

    ["#q","#s","#d","#sort"].forEach(sel=>{
      $(sel).addEventListener("input", render);
      $(sel).addEventListener("change", render);
    });

    if(manage){
      $("#aBtn").onclick=()=>{
        $("#aMsg").textContent="";
        const title=$("#aTitle").value.trim();
        const subj=$("#aSubj").value;
        const grade=$("#aGrade").value.trim();
        const link=$("#aLink").value.trim();
        const tags=$("#aTags").value.split(",").map(t=>t.trim()).filter(Boolean);
        const diff=$("#aDiff").value;

        if(!title||!grade||!link){ $("#aMsg").textContent="Fill title, grade, URL."; return; }
        if(link!=="#" && !isUrlMaybe(link)){ $("#aMsg").textContent="URL not valid."; return; }

        const all=load();
        all.unshift({ id:crypto.randomUUID(), title, subject:subj, grade, duration:"—", type:"Link", diff, tags, link, createdAt:Date.now() });
        save(all);
        ["#aTitle","#aGrade","#aLink","#aTags"].forEach(s=>$(s).value="");
        $("#aMsg").textContent="Added ✅";
        render();
      };
    }

    render();
  }catch(e){
    console.error(e);
    mount.innerHTML = `<div class="card"><h3 style="margin:0 0 8px">Guides crashed</h3><p class="muted">${esc(e.message||e)}</p></div>`;
  }
}