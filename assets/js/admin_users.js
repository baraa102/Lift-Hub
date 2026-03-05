import { listUsers, adminSetRole, adminResetPassword, role } from "./auth.js";
import { CONFIG } from "./config.js";

function esc(s){return String(s).replace(/[&<>"']/g,ch=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]))}

export function mountAdminUsers(){
  const auTable = document.getElementById("auTable");
  const auSearch = document.getElementById("auSearch");
  const auRoleFilter = document.getElementById("auRoleFilter");
  const auMsg = document.getElementById("auMsg");

  if(role() !== "admin"){
    auTable.innerHTML = `<p class="muted">Access denied.</p>`;
    return;
  }

  function render(){
    const q = (auSearch.value||"").trim().toLowerCase();
    const rf = auRoleFilter.value;

    let users = listUsers();
    if(rf !== "all") users = users.filter(u => u.role === rf);
    if(q){
      users = users.filter(u =>
        (u.username||"").toLowerCase().includes(q) ||
        (u.email||"").toLowerCase().includes(q) ||
        (u.displayName||"").toLowerCase().includes(q)
      );
    }

    auTable.innerHTML = users.map(u => `
      <div class="card soft" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">
          <div>
            <div style="font-weight:900">${esc(u.displayName || u.username)} <span class="muted">(@${esc(u.username)})</span></div>
            <div class="muted">${esc(u.email)} • role: <b>${esc(u.role)}</b> ${u.mustResetPassword ? "• <b>(reset required)</b>" : ""}</div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <select class="input" data-role="${esc(u.id)}" style="width:150px">
              ${CONFIG.roles.map(r => `<option value="${r}" ${r===u.role?"selected":""}>${r}</option>`).join("")}
            </select>
            <button class="btn primary" data-save="${esc(u.id)}">Save role</button>
          </div>
        </div>

        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap; align-items:center">
          <input class="input" data-temp="${esc(u.id)}" placeholder="Temp password (e.g., Temp@12345!)" style="max-width:280px" />
          <button class="btn danger" data-resetpass="${esc(u.id)}">Reset password</button>
        </div>
      </div>
    `).join("") || `<p class="muted">No users found.</p>`;

    auTable.querySelectorAll("[data-save]").forEach(btn=>{
      btn.onclick = ()=>{
        auMsg.textContent = "";
        const id = btn.getAttribute("data-save");
        const sel = auTable.querySelector(`[data-role="${CSS.escape(id)}"]`);
        try{
          adminSetRole({ userId:id, newRole: sel.value });
          auMsg.textContent = "Role updated ✅";
          render();
        }catch(e){ auMsg.textContent = e.message; }
      };
    });

    auTable.querySelectorAll("[data-resetpass]").forEach(btn=>{
      btn.onclick = async ()=>{
        auMsg.textContent = "";
        const id = btn.getAttribute("data-resetpass");
        const input = auTable.querySelector(`[data-temp="${CSS.escape(id)}"]`);
        const tempPassword = (input?.value || "").trim();
        try{
          await adminResetPassword({ userId:id, tempPassword });
          auMsg.textContent = "Password reset ✅ User must change it on next login.";
          render();
        }catch(e){ auMsg.textContent = e.message; }
      };
    });
  }

  auSearch.oninput = render;
  auRoleFilter.onchange = render;
  render();
}