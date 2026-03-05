import { listUsers, adminSetRole, role } from "./auth.js";
import { CONFIG } from "./config.js";

function esc(s){return String(s).replace(/[&<>"']/g,ch=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]))}

export function mountAdmin(){
  const usersTable = document.getElementById("usersTable");
  const userSearch = document.getElementById("userSearch");
  const roleFilter = document.getElementById("roleFilter");
  const adminMsg = document.getElementById("adminMsg");

  if(role() !== "admin"){
    usersTable.innerHTML = `<p class="muted">Access denied.</p>`;
    return;
  }

  function render(){
    const q = (userSearch.value||"").trim().toLowerCase();
    const rf = roleFilter.value;

    let users = listUsers();
    if(rf !== "all") users = users.filter(u => u.role === rf);
    if(q) users = users.filter(u => u.username.toLowerCase().includes(q) || u.email.includes(q));

    if(!users.length){
      usersTable.innerHTML = `<p class="muted">No users found.</p>`;
      return;
    }

    usersTable.innerHTML = `
      <div class="card soft">
        ${users.map(u => `
          <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--stroke)">
            <div>
              <div style="font-weight:900">${esc(u.username)} <span style="color:var(--muted);font-weight:800">(${esc(u.role)})</span></div>
              <div class="muted">${esc(u.email)} • ${esc(u.name)}</div>
            </div>

            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <select class="input" data-role="${esc(u.id)}" style="width:160px">
                ${CONFIG.roles.map(r => `<option value="${r}" ${r===u.role?"selected":""}>${r}</option>`).join("")}
              </select>
              <button class="btn primary" data-save="${esc(u.id)}">Save</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    usersTable.querySelectorAll("[data-save]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        adminMsg.textContent = "";
        const userId = btn.getAttribute("data-save");
        const sel = usersTable.querySelector(`[data-role="${CSS.escape(userId)}"]`);
        const newRole = sel.value;
        try{
          adminSetRole({ userId, newRole }); // ✅ promote to admin allowed
          adminMsg.textContent = "Role updated ✅";
          render();
        }catch(e){
          adminMsg.textContent = e.message;
        }
      });
    });
  }

  userSearch.addEventListener("input", render);
  roleFilter.addEventListener("change", render);
  render();
}