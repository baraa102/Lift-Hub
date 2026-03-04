import { getSession, updateMyProfile, changeMyPassword } from "./auth.js";

export function mountProfile(){
  const s = getSession();
  document.getElementById("pName").value = s?.name || "";
  document.getElementById("pDisplayName").value = s?.displayName || "";
  document.getElementById("pEmail").value = s?.email || "";
  document.getElementById("pUsername").value = s?.username || "";

  const msg = document.getElementById("pMsg");
  document.getElementById("saveProfile").onclick = ()=>{
    msg.textContent="";
    try{
      updateMyProfile({
        name: document.getElementById("pName").value,
        displayName: document.getElementById("pDisplayName").value,
        email: document.getElementById("pEmail").value
      });
      msg.textContent="Saved ✅ Refreshing header…";
      setTimeout(()=>location.hash="#/home", 500);
    }catch(e){ msg.textContent=e.message; }
  };

  const pmsg = document.getElementById("pPassMsg");
  document.getElementById("changePass").onclick = async ()=>{
    pmsg.textContent="";
    try{
      await changeMyPassword({
        currentPassword: document.getElementById("pCurPass").value,
        newPassword: document.getElementById("pNewPass").value
      });
      pmsg.textContent="Password updated ✅";
      document.getElementById("pCurPass").value="";
      document.getElementById("pNewPass").value="";
    }catch(e){ pmsg.textContent=e.message; }
  };
}