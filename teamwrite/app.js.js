// ── Firebase imports ─────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── YOUR FIREBASE CONFIG ──────────────────────────────────────────────────────
// Replace this block with your own config from Firebase Console
// (Project Settings → Your apps → SDK setup and configuration)
const firebaseConfig = {
  apiKey:            "AIzaSyBcneFrwEwTXIpWimbM3lfGFHjSE4l-b6I",
  authDomain:        "ai-content-a3b91.firebaseapp.com",
  projectId:         "ai-content-a3b91",
  storageBucket:     "ai-content-a3b91.firebasestorage.app",
  messagingSenderId: "588750392950",
  appId:             "1:588750392950:web:6464a7998c0f600871d957"
};

// ── YOUR ANTHROPIC API KEY ────────────────────────────────────────────────────
// For production: move this to a backend/serverless function
// For quick team use: paste it here (keep the repo private)
const ANTHROPIC_API_KEY = "REPLACE_WITH_YOUR_ANTHROPIC_API_KEY";

// ── Init ──────────────────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const docsRef = collection(db, "documents");

// ── State ─────────────────────────────────────────────────────────────────────
let allDocs = [];
let currentOutput = "";
let currentType   = "Email";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const usernameInput = document.getElementById("username-input");
const curAvatar     = document.getElementById("cur-avatar");
const genBtn        = document.getElementById("gen-btn");
const outputArea    = document.getElementById("output-area");
const outputText    = document.getElementById("output-text");
const docList       = document.getElementById("doc-list");
const docCountBadge = document.getElementById("doc-count");
const filterCount   = document.getElementById("filter-count");
const filterType    = document.getElementById("filter-type");
const filterAuthor  = document.getElementById("filter-author");

// ── Username ──────────────────────────────────────────────────────────────────
const savedName = localStorage.getItem("teamwrite_username") || "";
usernameInput.value = savedName;
updateAvatar(savedName);

usernameInput.addEventListener("input", () => {
  const v = usernameInput.value.trim();
  localStorage.setItem("teamwrite_username", v);
  updateAvatar(v);
});

function updateAvatar(name) {
  curAvatar.textContent = name ? name.slice(0, 2).toUpperCase() : "?";
}

function getUsername() {
  return usernameInput.value.trim() || "Anonymous";
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
    tab.classList.add("active");
    document.getElementById(`panel-${tab.dataset.tab}`).classList.remove("hidden");
    if (tab.dataset.tab === "workspace") renderDocs();
  });
});

// ── Generate ──────────────────────────────────────────────────────────────────
genBtn.addEventListener("click", generate);

async function generate() {
  const brief = document.getElementById("brief").value.trim();
  if (!brief) { showToast("Add a brief first"); return; }

  currentType = document.getElementById("type").value;
  const tone  = document.getElementById("tone").value;

  genBtn.disabled = true;
  genBtn.innerHTML = '<span class="spinner"></span>Generating…';
  outputArea.classList.add("hidden");

  const prompt = `Write a ${tone.toLowerCase()} ${currentType.toLowerCase()} for a team. Brief: ${brief}. Output only the content itself — no commentary, no subject line label, no preamble.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    currentOutput = data.content.map(b => b.text || "").join("");
    outputText.textContent = currentOutput;
    outputArea.classList.remove("hidden");

  } catch (err) {
    showToast("Generation failed — check your API key");
    console.error(err);
  }

  genBtn.disabled = false;
  genBtn.textContent = "Generate";
}

// ── Output actions ────────────────────────────────────────────────────────────
document.getElementById("copy-btn").addEventListener("click", () => {
  if (!currentOutput) return;
  navigator.clipboard.writeText(currentOutput).then(() => showToast("Copied"));
});

document.getElementById("export-btn").addEventListener("click", () => {
  if (!currentOutput) return;
  const blob = new Blob([currentOutput], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = currentType.replace(/ /g, "_") + "_export.txt";
  a.click();
  showToast("Exported");
});

document.getElementById("save-btn").addEventListener("click", saveDoc);

async function saveDoc() {
  if (!currentOutput) return;
  const brief = document.getElementById("brief").value.trim();
  const title = brief.length > 60 ? brief.slice(0, 60) + "…" : brief;

  try {
    await addDoc(docsRef, {
      title,
      type:    currentType,
      author:  getUsername(),
      content: currentOutput,
      createdAt: serverTimestamp()
    });
    showToast("Saved to workspace");
    outputArea.classList.add("hidden");
    currentOutput = "";
  } catch (err) {
    showToast("Save failed — check Firebase config");
    console.error(err);
  }
}

// ── Real-time listener ────────────────────────────────────────────────────────
const q = query(docsRef, orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  allDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  docCountBadge.textContent = allDocs.length;
  updateAuthorFilter();
  renderDocs();
});

function updateAuthorFilter() {
  const authors = [...new Set(allDocs.map(d => d.author).filter(Boolean))];
  const current = filterAuthor.value;
  filterAuthor.innerHTML = `<option value="">All authors</option>` +
    authors.map(a => `<option value="${a}"${a === current ? " selected" : ""}>${a}</option>`).join("");
}

// ── Render docs ───────────────────────────────────────────────────────────────
filterType.addEventListener("change", renderDocs);
filterAuthor.addEventListener("change", renderDocs);

function renderDocs() {
  const ft = filterType.value;
  const fa = filterAuthor.value;
  const filtered = allDocs.filter(d =>
    (!ft || d.type === ft) && (!fa || d.author === fa)
  );

  filterCount.textContent = `${filtered.length} doc${filtered.length !== 1 ? "s" : ""}`;

  if (!filtered.length) {
    docList.innerHTML = `<div class="empty-state">
      <span class="live-dot"></span>Watching for new documents…<br>
      Generate content and save it to the workspace.
    </div>`;
    return;
  }

  docList.innerHTML = filtered.map(d => {
    const initials = (d.author || "?").slice(0, 2).toUpperCase();
    const badgeClass = "badge-" + (d.type || "Email").replace(/ /g, "-");
    const preview = (d.content || "").slice(0, 140) + ((d.content || "").length > 140 ? "…" : "");
    const time = d.createdAt?.toDate
      ? d.createdAt.toDate().toLocaleString([], { dateStyle: "short", timeStyle: "short" })
      : "just now";

    return `<div class="doc-card">
      <div class="doc-card-top">
        <div style="flex:1;min-width:0;">
          <div class="doc-title">${escHtml(d.title)}</div>
          <div class="doc-meta">
            <div class="doc-author">
              <div class="mini-avatar">${initials}</div>
              ${escHtml(d.author || "Anonymous")}
            </div>
            <span class="badge ${badgeClass}">${escHtml(d.type)}</span>
            <span class="doc-time">${time}</span>
          </div>
        </div>
        <div class="doc-actions">
          <button class="icon-btn" title="Copy" onclick="copyDoc('${d.id}')">⎘</button>
          <button class="icon-btn" title="Export" onclick="exportDoc('${d.id}')">↓</button>
          <button class="icon-btn" title="Delete" onclick="deleteDocument('${d.id}')">×</button>
        </div>
      </div>
      <div class="doc-preview">${escHtml(preview)}</div>
    </div>`;
  }).join("");
}

// ── Doc actions (global for inline onclick) ───────────────────────────────────
window.copyDoc = (id) => {
  const d = allDocs.find(x => x.id === id);
  if (!d) return;
  navigator.clipboard.writeText(d.content).then(() => showToast("Copied"));
};

window.exportDoc = (id) => {
  const d = allDocs.find(x => x.id === id);
  if (!d) return;
  const blob = new Blob([d.content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (d.type || "doc").replace(/ /g, "_") + "_export.txt";
  a.click();
  showToast("Exported");
};

window.deleteDocument = async (id) => {
  try {
    await deleteDoc(doc(db, "documents", id));
    showToast("Deleted");
  } catch (err) {
    showToast("Delete failed");
    console.error(err);
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.classList.add("hidden"), 250);
  }, 2200);
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
