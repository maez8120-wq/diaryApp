// app.js
import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ----------------------- DOM refs ----------------------- */
const authScreen    = document.getElementById("auth-screen");
const diaryApp      = document.getElementById("diary-app");
const emailInput    = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn      = document.getElementById("loginBtn");
const signupBtn     = document.getElementById("signupBtn");
const logoutBtn     = document.getElementById("logoutBtn");
const authMsg       = document.getElementById("authMsg");

const entryTitleInput   = document.getElementById("entryTitle");
const entryContentInput = document.getElementById("entryContent");
const saveBtn           = document.getElementById("saveBtn");
const clearFormBtn      = document.getElementById("clearFormBtn");
const clearAllBtn       = document.getElementById("clearAllBtn");
const entriesList       = document.getElementById("entriesList");
const emptyState        = document.getElementById("emptyState");
const entryCountSpan    = document.getElementById("entryCount");
const currentDateSpan   = document.getElementById("currentDate");

/* ----------------------- State ----------------------- */
let currentUser = null;
let entries = [];
let unsubscribeSnapshot = null;

/* ----------------------- Helpers ----------------------- */
function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "unknown date";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function setCurrentDate() {
  const now = new Date();
  currentDateSpan.textContent = now.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });
}

function showAuthMessage(msg) {
  authMsg.textContent = msg;
}

/* ----------------------- Auth ----------------------- */
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || password.length < 6) {
    return showAuthMessage("Enter an email and a password of at least 6 characters.");
  }
  try {
    showAuthMessage("Creating account...");
    await createUserWithEmailAndPassword(auth, email, password);
    showAuthMessage("");
  } catch (err) {
    showAuthMessage(err.message);
  }
});

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) return showAuthMessage("Enter email and password.");
  try {
    showAuthMessage("Logging in...");
    await signInWithEmailAndPassword(auth, email, password);
    showAuthMessage("");
  } catch (err) {
    showAuthMessage(err.message);
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

// React to auth changes
onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (user) {
    authScreen.classList.add("hidden");
    diaryApp.classList.remove("hidden");
    setCurrentDate();
    listenToEntries();
  } else {
    authScreen.classList.remove("hidden");
    diaryApp.classList.add("hidden");
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }
    entries = [];
  }
});

/* ----------------------- Firestore sync ----------------------- */
function listenToEntries() {
  if (!currentUser) return;

  const q = query(
    collection(db, "entries"),
    where("userId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
    entries = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || "untitled",
        content: data.content || "",
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString()
      };
    });
    renderEntries();
  }, (err) => {
    console.error("Snapshot error:", err);
  });
}

/* ----------------------- CRUD ----------------------- */
async function addEntry() {
  if (!currentUser) return;

  const title = entryTitleInput.value.trim();
  const content = entryContentInput.value.trim();

  if (!title && !content) {
    alert("Please write something before saving ✨");
    return;
  }

  try {
    await addDoc(collection(db, "entries"), {
      userId: currentUser.uid,
      title: title || "untitled",
      content: content || "(no content)",
      createdAt: serverTimestamp()
    });

    entryTitleInput.value = "";
    entryContentInput.value = "";
    entryTitleInput.focus();
  } catch (err) {
    console.error("Save failed:", err);
    alert("Could not save entry: " + err.message);
  }
}

async function deleteEntry(id) {
  if (!currentUser) return;
  try {
    await deleteDoc(doc(db, "entries", id));
  } catch (err) {
    console.error("Delete failed:", err);
    alert("Could not delete entry: " + err.message);
  }
}

async function clearAllEntries() {
  if (!entries.length) return;
  if (!confirm("Delete all diary entries? This cannot be undone.")) return;

  try {
    await Promise.all(entries.map((e) => deleteDoc(doc(db, "entries", e.id))));
  } catch (err) {
    console.error("Clear all failed:", err);
    alert("Could not clear entries: " + err.message);
  }
}

/* ----------------------- Render ----------------------- */
function renderEntries() {
  // Remove existing cards but keep empty state
  entriesList.querySelectorAll(".entry-card").forEach((c) => c.remove());

  if (entries.length === 0) {
    emptyState.style.display = "flex";
    if (!entriesList.contains(emptyState)) entriesList.appendChild(emptyState);
    entryCountSpan.textContent = "0 entries";
    return;
  }

  emptyState.style.display = "none";

  const sorted = [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  sorted.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "entry-card";
    card.dataset.id = entry.id;

    // Title row
    const titleRow = document.createElement("div");
    titleRow.className = "entry-title";

    const titleText = document.createElement("span");
    titleText.textContent = entry.title || "untitled";

    const right = document.createElement("span");
    right.className = "entry-title-right";

    const dateSpan = document.createElement("span");
    dateSpan.className = "entry-date";
    dateSpan.textContent = formatDate(entry.createdAt);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-entry";
    delBtn.innerHTML = "✕";
    delBtn.setAttribute("aria-label", "delete entry");
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteEntry(entry.id);
    });

    right.appendChild(dateSpan);
    right.appendChild(delBtn);

    titleRow.appendChild(titleText);
    titleRow.appendChild(right);

    // Content
    const contentDiv = document.createElement("div");
    contentDiv.className = "entry-content";
    contentDiv.textContent = entry.content;

    card.appendChild(titleRow);
    card.appendChild(contentDiv);
    entriesList.appendChild(card);
  });

  entryCountSpan.textContent =
    entries.length === 1 ? "1 entry" : `${entries.length} entries`;
}

/* ----------------------- Wire UI events ----------------------- */
saveBtn.addEventListener("click", addEntry);

clearFormBtn.addEventListener("click", () => {
  entryTitleInput.value = "";
  entryContentInput.value = "";
  entryTitleInput.focus();
});

clearAllBtn.addEventListener("click", clearAllEntries);

// Ctrl/Cmd + Enter to save from textarea
entryContentInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    addEntry();
  }
});

// Enter on title jumps to content
entryTitleInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    entryContentInput.focus();
  }
});