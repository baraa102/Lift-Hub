// assets/js/auth.js
import { CONFIG } from "./config.js";

const USERS_KEY = "luh_users_fix_v1";
const SESSION_KEY = "luh_session_fix_v1";

function loadUsers(){ try{return JSON.parse(localStorage.getItem(USERS_KEY)||"[]")}catch{return[]} }
function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

export function getSession(){ try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null")}catch{return null} }
export function isLoggedIn(){ return !!getSession(); }
export function role(){ return getSession()?.role || "guest"; }
export function logout(){ sessionStorage.removeItem(SESSION_KEY); }
export function can(action){ return (CONFIG.permissions[action]||[]).includes(role()); }

function validateEmail(email){
  email=(email||"").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : "Invalid email format.";
}
export function validateUsername(username){
  username=(username||"").trim();
  const p=CONFIG.usernamePolicy;
  if(username.length<p.minLen || username.length>p.maxLen) return `Username must be ${p.minLen}-${p.maxLen} chars.`;
  if(!p.allowed.test(username)) return "Username: letters/numbers/_ only.";
  return null;
}
export function validatePassword(password){
  const p=CONFIG.passwordPolicy;
  if(!password || password.length<p.minLen) return `Password must be at least ${p.minLen} characters.`;
  if(p.forbidSpaces && /\s/.test(password)) return "Password cannot contain spaces.";
  if(p.requireUpper && !/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if(p.requireLower && !/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if(p.requireNumber && !/[0-9]/.test(password)) return "Password must include a number.";
  if(p.requireSymbol && !/[^A-Za-z0-9]/.test(password)) return "Password must include a symbol.";
  return null;
}
function validateDisplayName(d){
  d=(d||"").trim();
  if(d.length<2) return "Display Name must be at least 2 characters.";
  if(d.length>24) return "Display Name must be 24 characters max.";
  return null;
}

// --- hashing helpers (robust) ---
function b64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function enc(s){ return new TextEncoder().encode(s); }

async function sha256(text){
  if(!crypto?.subtle?.digest) return btoa(text); // last fallback
  const dig = await crypto.subtle.digest("SHA-256", enc(text));
  return b64(dig);
}

async function pbkdf2(password, saltB64, iterations=120000){
  if(!crypto?.subtle?.importKey) return null;
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", enc(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name:"PBKDF2", hash:"SHA-256", salt, iterations }, key, 256);
  return b64(bits);
}

function randSaltB64(){
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b));
}

async function makePasswordRecord(password){
  // try pbkdf2 first; otherwise sha256
  const saltB64 = randSaltB64();
  try{
    const hash = await pbkdf2(password, saltB64);
    if(hash) return { algo:"pbkdf2", saltB64, hash };
  }catch{}
  const hash = await sha256(password + "|" + saltB64);
  return { algo:"sha256", saltB64, hash };
}

async function verifyPassword(password, rec){
  if(!rec?.algo) return false;
  if(rec.algo === "pbkdf2"){
    try{
      const h = await pbkdf2(password, rec.saltB64);
      return !!h && h === rec.hash;
    }catch{
      return false;
    }
  }
  // sha256 fallback
  const h = await sha256(password + "|" + rec.saltB64);
  return h === rec.hash;
}

// --- seed admin ---
async function ensureAdmin(){
  const users = loadUsers();
  if(users.some(u=>u.role==="admin")) return;

  const rec = await makePasswordRecord("Admin@12345!");
  users.push({
    id: crypto.randomUUID(),
    username: "admin",
    email: "admin@liftuphub.local",
    name: "System Admin",
    displayName: "Admin",
    role: "admin",
    pass: rec,
    createdAt: Date.now(),
  });
  saveUsers(users);
}
ensureAdmin().catch(()=>{});

export async function register({ name, displayName, username, email, password }){
  await ensureAdmin();
  name=(name||"").trim();
  displayName=(displayName||"").trim();
  username=(username||"").trim();
  email=(email||"").trim().toLowerCase();

  if(!name) throw new Error("Full name is required.");
  const dErr = validateDisplayName(displayName); if(dErr) throw new Error(dErr);
  const uErr = validateUsername(username); if(uErr) throw new Error(uErr);
  const eErr = validateEmail(email); if(eErr) throw new Error(eErr);
  const pErr = validatePassword(password); if(pErr) throw new Error(pErr);

  const users = loadUsers();
  if(users.some(u=>u.username.toLowerCase()===username.toLowerCase())) throw new Error("Username already exists.");
  if(users.some(u=>u.email===email)) throw new Error("Email already exists.");

  const rec = await makePasswordRecord(password);
  users.push({
    id: crypto.randomUUID(),
    name, displayName, username, email,
    role: "student",
    pass: rec,
    createdAt: Date.now(),
  });
  saveUsers(users);
  return true;
}

export async function login({ userOrEmail, password }){
  await ensureAdmin();
  const key=(userOrEmail||"").trim().toLowerCase();
  const users = loadUsers();
  const u = users.find(x => x.email===key || (x.username||"").toLowerCase()===key);
  if(!u) throw new Error("Invalid credentials.");

  const ok = await verifyPassword(password, u.pass);
  if(!ok) throw new Error("Invalid credentials.");

  const session = {
    uid: u.id,
    username: u.username,
    email: u.email,
    name: u.name,
    displayName: u.displayName || u.username,
    role: u.role,
    loginAt: Date.now(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function updateMyProfile({ name, displayName, email }){
  const s=getSession();
  if(!s) throw new Error("Not logged in.");

  name=(name||"").trim();
  displayName=(displayName||"").trim();
  email=(email||"").trim().toLowerCase();

  if(!name) throw new Error("Full name is required.");
  const dErr = validateDisplayName(displayName); if(dErr) throw new Error(dErr);
  const eErr = validateEmail(email); if(eErr) throw new Error(eErr);

  const users=loadUsers();
  const me=users.find(u=>u.id===s.uid);
  if(!me) throw new Error("User not found.");
  if(users.some(u=>u.id!==s.uid && u.email===email)) throw new Error("Email already exists.");

  me.name=name; me.displayName=displayName; me.email=email; me.updatedAt=Date.now();
  saveUsers(users);

  s.name=name; s.displayName=displayName; s.email=email;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return true;
}

export async function changeMyPassword({ currentPassword, newPassword }){
  const s=getSession();
  if(!s) throw new Error("Not logged in.");
  const pErr = validatePassword(newPassword); if(pErr) throw new Error(pErr);

  const users=loadUsers();
  const me=users.find(u=>u.id===s.uid);
  if(!me) throw new Error("User not found.");

  const ok = await verifyPassword(currentPassword, me.pass);
  if(!ok) throw new Error("Current password is incorrect.");

  me.pass = await makePasswordRecord(newPassword);
  me.updatedAt=Date.now();
  saveUsers(users);
  return true;
}