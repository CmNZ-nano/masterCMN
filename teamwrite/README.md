# TeamWrite — Setup Guide

A shared AI writing tool for your team. Deploy in ~10 minutes, no coding required.

---

## What you need (all free)

- A **Firebase** account → stores docs + real-time sync
- An **Anthropic API key** → powers the AI writing
- A **Vercel** account → hosts the app as a public URL

---

## Step 1 — Get your Anthropic API key

1. Go to https://console.anthropic.com
2. Sign up / log in
3. Go to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

---

## Step 2 — Set up Firebase

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it (e.g. "teamwrite") → Continue
3. Disable Google Analytics if you want → **Create project**
4. Click **Firestore Database** in the left sidebar → **Create database**
   - Choose **Start in test mode** (allows read/write for 30 days — fine for team use)
   - Pick any location → **Enable**
5. Click the ⚙️ gear → **Project settings**
6. Scroll to **Your apps** → click the **</>** (Web) icon
7. Register app (any nickname) → copy the `firebaseConfig` object

---

## Step 3 — Add your keys to the code

Open `app.js` and replace:

```js
const firebaseConfig = {
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
  authDomain:        "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket:     "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId:             "REPLACE_WITH_YOUR_APP_ID"
};
```

with your actual Firebase config values, and:

```js
const ANTHROPIC_API_KEY = "REPLACE_WITH_YOUR_ANTHROPIC_API_KEY";
```

with your actual Anthropic key.

---

## Step 4 — Deploy to Vercel

1. Go to https://github.com → create a **new repository** (private recommended)
2. Upload these 3 files: `index.html`, `style.css`, `app.js`
3. Go to https://vercel.com → **Add New Project**
4. Import your GitHub repo → click **Deploy**
5. Vercel gives you a URL like `https://teamwrite-abc123.vercel.app`

**Share that URL with your team. Done.**

---

## Firestore security (after 30 days)

Test mode expires after 30 days. To extend access, go to **Firestore → Rules** and replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /documents/{docId} {
      allow read, write: if true;
    }
  }
}
```

This keeps it open for your whole team. For tighter security later, you can add Firebase Authentication.

---

## Files

| File | What it does |
|------|-------------|
| `index.html` | App structure |
| `style.css` | All styling |
| `app.js` | AI generation + Firebase sync logic |

---

## How real-time sync works

When anyone on the team saves a document, Firebase notifies all open browser tabs instantly via `onSnapshot`. No refresh needed — new docs appear automatically for everyone.
