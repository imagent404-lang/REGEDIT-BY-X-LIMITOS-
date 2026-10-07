const C = window.XL_CONFIG || {};

const systems = [
  {id:"free-panel", name:"FREE PC PANEL", subtitle:"Premium PC panel resources", glyph:"▣"},
  {id:"free-bypass", name:"FREE BYPASS", subtitle:"Fast & reliable bypass resources", glyph:"◇"},
  {id:"emulator", name:"EMULATORS", subtitle:"Emulator tools and resources", glyph:"⬡"},
  {id:"free-fire-apk", name:"FREE FIRE APK", subtitle:"Latest app resources", glyph:"ϟ"},
  {id:"aimbot-pro", name:"AIMBOT PRO FREE", subtitle:"Premium resource hub", glyph:"♨"},
  {id:"error-fix", name:"ERROR FIX", subtitle:"Common issue solutions", glyph:"⚙"}
];

const localKey = "xlimitos_local_data_v3";
const fileDbName = "xlimitos_file_store_v1";
const fileStoreName = "uploads";

const defaultData = {
  systems: Object.fromEntries(
    systems.map(s => [s.id, {
      subtitle: s.subtitle,
      video: "",
      resource: "",
      note: "Access information will appear here."
    }])
  )
};

function mergeData(raw = {}) {
  return {
    systems: Object.fromEntries(
      systems.map(s => [s.id, {
        ...defaultData.systems[s.id],
        ...((raw.systems || {})[s.id] || {})
      }])
    )
  };
}

function localData() {
  try { return mergeData(JSON.parse(localStorage.getItem(localKey) || "{}")); }
  catch { return mergeData(); }
}

function saveLocal(data) {
  localStorage.setItem(localKey, JSON.stringify(mergeData(data)));
}

function toast(message) {
  const el = document.querySelector("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__xlToastTimer);
  window.__xlToastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

function openModal(id) { document.querySelector(id)?.classList.add("open"); }
function closeModals() { document.querySelectorAll(".modal").forEach(m => m.classList.remove("open")); }

document.addEventListener("click", e => {
  if (e.target.matches("[data-close]") || e.target.classList.contains("modal")) closeModals();
});

function isAdmin() {
  return sessionStorage.getItem("xl_admin") === "1";
}

function safeExternal(url) {
  return /^https?:\/\//i.test(url || "") ? url : "#";
}

function getYoutubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace(/^\//, "").split("/")[0];
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const match = u.pathname.match(/\/(?:embed|shorts|live)\/([^/?#]+)/);
    return match ? match[1] : "";
  } catch { return ""; }
}

function systemById(id) { return systems.find(s => s.id === id) || systems[0]; }

function requireAdmin() {
  if (isAdmin()) return true;
  openModal("#adminModal");
  return false;
}

function setAuthButton() {
  const btn = document.querySelector("#authButton");
  if (!btn) return;
  btn.textContent = isAdmin() ? "Admin Panel" : "Admin Login";
  btn.onclick = () => isAdmin() ? (location.href = "admin.html") : openModal("#adminModal");
}

function wireAdminLogin() {
  setAuthButton();
  document.querySelector("#adminSubmit")?.addEventListener("click", () => {
    const username = document.querySelector("#adminUser")?.value.trim() || "";
    const password = document.querySelector("#adminPass")?.value || "";
    if (username === C.ADMIN_USERNAME && password === C.ADMIN_PASSWORD) {
      sessionStorage.setItem("xl_admin", "1");
      closeModals();
      toast("Admin access granted");
      setTimeout(() => location.href = "admin.html", 220);
    } else {
      toast("Invalid admin username or password.");
    }
  });
  document.querySelector("#adminPass")?.addEventListener("keydown", e => {
    if (e.key === "Enter") document.querySelector("#adminSubmit")?.click();
  });
}

function bindLocalVideoFallback() {
  document.querySelectorAll(".video-bg video").forEach(video => {
    video.addEventListener("error", () => video.classList.add("video-failed"));
  });
}

function getData() { return localData(); }

function setData(data) {
  const merged = mergeData(data);
  saveLocal(merged);
  return merged;
}

function openFileDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(fileDbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(fileStoreName)) db.createObjectStore(fileStoreName, {keyPath: "systemId"});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveUploadedFile(systemId, file) {
  const db = await openFileDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(fileStoreName, "readwrite");
    tx.objectStore(fileStoreName).put({
      systemId,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      blob: file,
      updatedAt: Date.now()
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getUploadedFile(systemId) {
  const db = await openFileDb();
  const result = await new Promise((resolve, reject) => {
    const tx = db.transaction(fileStoreName, "readonly");
    const req = tx.objectStore(fileStoreName).get(systemId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

async function deleteUploadedFile(systemId) {
  const db = await openFileDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(fileStoreName, "readwrite");
    tx.objectStore(fileStoreName).delete(systemId);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

async function renderHome() {
  // Home is intentionally not admin-editable. Its structure and supplied video asset remain fixed.
  const join = document.querySelector("#joinPanel");
  if (join && !join.dataset.wired) {
    join.dataset.wired = "1";
    join.addEventListener("click", () => { location.href = "panel.html"; });
  }
}

async function renderSystems() {
  const grid = document.querySelector("#systemGrid");
  if (!grid) return;
  const data = getData();
  grid.innerHTML = systems.map((s, i) => {
    const cfg = data.systems[s.id] || {};
    return `
      <article class="system-card glass" data-id="${s.id}">
        <div class="card-top"><div class="glyph">${s.glyph}</div>${i === 0 ? '<span class="badge">FEATURED</span>' : '<span class="card-dot">LIVE</span>'}</div>
        <div class="system-index">0${i + 1}</div>
        <h2>${s.name}</h2>
        <p>${cfg.subtitle || s.subtitle}</p>
        <span class="explore">Explore <b>↗</b></span>
      </article>`;
  }).join("");

  grid.querySelectorAll(".system-card").forEach(card => {
    card.addEventListener("click", () => {
      location.href = `system.html?system=${encodeURIComponent(card.dataset.id)}`;
    });
  });
}

async function renderSystem() {
  const id = new URLSearchParams(location.search).get("system") || systems[0].id;
  const system = systemById(id);
  const data = getData();
  const cfg = data.systems[id] || {};

  document.title = `X LIMITOS — ${system.name}`;
  document.querySelector("#systemGlyph").textContent = system.glyph;
  document.querySelector("#systemTitle").textContent = system.name;
  document.querySelector("#systemSubtitle").textContent = cfg.subtitle || system.subtitle;
  document.querySelector("#systemNumber").textContent = `SYSTEM 0${systems.indexOf(system) + 1}`;
  document.querySelector("#accessText").textContent = cfg.note || "Access information will appear here.";

  const videoId = getYoutubeId(cfg.video);
  const wrap = document.querySelector("#videoWrap");
  const frame = document.querySelector("#youtubeFrame");
  if (videoId) {
    wrap.classList.remove("hidden");
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1`;
  } else {
    wrap.classList.add("hidden");
    frame.removeAttribute("src");
  }

  const resource = document.querySelector("#primaryResource");
  const resourceUrl = safeExternal(cfg.resource);
  resource.href = resourceUrl;
  resource.textContent = resourceUrl === "#" ? "Resource not available" : "Open resource ↗";
  resource.onclick = e => {
    if (resourceUrl === "#") { e.preventDefault(); toast("No resource link has been added yet."); }
  };

  const uploadBtn = document.querySelector("#uploadedFileResource");
  const uploaded = await getUploadedFile(id).catch(() => null);
  if (uploadBtn) {
    if (uploaded?.blob) {
      const objectUrl = URL.createObjectURL(uploaded.blob);
      uploadBtn.href = objectUrl;
      uploadBtn.textContent = `Download ${uploaded.name} · ${formatBytes(uploaded.size)}`;
      uploadBtn.classList.remove("hidden");
    } else {
      uploadBtn.classList.add("hidden");
    }
  }

  document.querySelector("#copyBtn")?.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); toast("System link copied"); }
    catch { toast("Copy is not available in this browser"); }
  });

  document.querySelector("#shareBtn")?.addEventListener("click", async () => {
    try {
      if (navigator.share) await navigator.share({title: system.name, text: `X LIMITOS — ${system.name}`, url: location.href});
      else { await navigator.clipboard.writeText(location.href); toast("Link copied"); }
    } catch {}
  });
}

async function renderAdmin() {
  if (!isAdmin()) {
    location.href = "index.html";
    return;
  }

  const d = getData();
  const select = document.querySelector("#systemSelect");
  select.innerHTML = systems.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

  const fileInput = document.querySelector("#fileInput");
  const currentFile = document.querySelector("#currentFile");

  async function fill() {
    const c = d.systems[select.value] || {};
    document.querySelector("#videoInput").value = c.video || "";
    document.querySelector("#resourceInput").value = c.resource || "";
    document.querySelector("#subtitleInput").value = c.subtitle || systemById(select.value).subtitle;
    document.querySelector("#noteInput").value = c.note || "";
    fileInput.value = "";
    const f = await getUploadedFile(select.value).catch(() => null);
    currentFile.textContent = f ? `Current upload: ${f.name} · ${formatBytes(f.size)}` : "No uploaded file for this page.";
  }

  select.addEventListener("change", fill);
  await fill();

  document.querySelector("#saveSystem")?.addEventListener("click", async () => {
    const id = select.value;
    d.systems[id] = {
      video: document.querySelector("#videoInput").value.trim(),
      resource: document.querySelector("#resourceInput").value.trim(),
      subtitle: document.querySelector("#subtitleInput").value.trim() || systemById(id).subtitle,
      note: document.querySelector("#noteInput").value.trim()
    };

    try {
      setData(d);
      if (fileInput.files?.[0]) await saveUploadedFile(id, fileInput.files[0]);
      renderAdminList(d);
      await fill();
      toast("Page saved successfully on this device");
    } catch (error) {
      console.error(error);
      toast("Could not save the page or upload");
    }
  });

  document.querySelector("#removeFile")?.addEventListener("click", async () => {
    try {
      await deleteUploadedFile(select.value);
      await fill();
      renderAdminList(d);
      toast("Uploaded file removed");
    } catch { toast("Could not remove the file"); }
  });

  renderAdminList(d);

  document.querySelector("#logoutBtn")?.addEventListener("click", () => {
    sessionStorage.removeItem("xl_admin");
    location.href = "index.html";
  });
}

function renderAdminList(data) {
  const box = document.querySelector("#adminSystemList");
  if (!box) return;
  box.innerHTML = systems.map(s => {
    const c = data.systems[s.id] || {};
    return `<div class="admin-item"><div><b>${s.name}</b><small>${c.video ? "YouTube ready" : "No video"} · ${c.resource ? "Link ready" : "No link"}</small></div><span class="status-dot ${c.video || c.resource ? "on" : "off"}></span></div>`;
  }).join("");
}

function pageInit() {
  const page = document.body.dataset.page;
  if (page === "home") renderHome();
  if (page === "panel") renderSystems();
  if (page === "system") renderSystem();
  if (page === "admin") renderAdmin();
}

wireAdminLogin();
bindLocalVideoFallback();
pageInit();
