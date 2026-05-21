const AUTH_KEYS = {
  users: "policyPulseUsers",
  session: "policyPulseSession",
  theme: "policyPulseTheme",
  stats: "policyPulseStats",
};

const AUTH_CONFIG = {
  adminEmails: [],
};

const demoUser = {
  email: "demo@policy.local",
  password: "demo1234",
};

function firebaseApi() {
  return window.PolicyPulseFirebase;
}

function firebaseEnabled() {
  return Boolean(firebaseApi()?.enabled);
}

function isAdminPage() {
  return location.pathname.split("/").pop() === "admin.html";
}

function isLoopbackIpHost() {
  return location.hostname === "127.0.0.1";
}

function redirectToLocalhostForGoogle(message) {
  const next = new URL(location.href);
  next.hostname = "localhost";
  next.searchParams.set("login", "google");
  message.textContent = "Firebase 不接受 127.0.0.1 的 Google 登入，正在切到 localhost 後重試。";
  setTimeout(() => {
    location.assign(next.toString());
  }, 500);
}

function explainGoogleAuthError(error) {
  if (error?.code === "auth/unauthorized-domain") {
    return "Firebase 尚未授權目前網域。請在 Firebase Authentication 的 Authorized domains 加入 localhost 和 127.0.0.1。";
  }
  return `Google 登入失敗：${error?.message || "未知錯誤"}`;
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function recordEvent(type, payload = {}) {
  const stats = readJson(AUTH_KEYS.stats, []);
  const event = {
    type,
    payload,
    path: location.pathname.split("/").pop() || "index.html",
    at: new Date().toISOString(),
  };
  stats.push(event);
  localStorage.setItem(AUTH_KEYS.stats, JSON.stringify(stats.slice(-1000)));
  firebaseApi()?.recordEvent?.(type, payload).catch(() => {});
  firebaseApi()?.logEvent?.(type, payload);
}

window.PolicyPulseStats = {
  record: recordEvent,
  read: () => readJson(AUTH_KEYS.stats, []),
  readRemote: async () => {
    const api = await window.PolicyPulseFirebaseReady;
    return api?.enabled && api?.isAdmin?.() ? api.readEvents() : readJson(AUTH_KEYS.stats, []);
  },
  clear: () => localStorage.removeItem(AUTH_KEYS.stats),
};

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function digestPassword(password) {
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return btoa(unescape(encodeURIComponent(password)));
}

async function ensureDemoUser() {
  const users = readJson(AUTH_KEYS.users, {});
  if (!users[demoUser.email]) {
    users[demoUser.email] = {
      email: demoUser.email,
      passwordHash: await digestPassword(demoUser.password),
      createdAt: new Date().toISOString(),
    };
    writeJson(AUTH_KEYS.users, users);
  }
}

function getSession() {
  const user = firebaseApi()?.getCurrentUser?.();
  if (user) {
    const providerIds = (user.providerData || []).map((provider) => provider.providerId);
    const provider = providerIds.includes("google.com") ? "google" : "firebase-email";
    return {
      email: user.email,
      uid: user.uid,
      displayName: user.displayName || "",
      emailVerified: Boolean(user.emailVerified),
      signedInAt: user.metadata?.lastSignInTime || new Date().toISOString(),
      provider,
    };
  }
  return readJson(AUTH_KEYS.session, null);
}

function setSession(email, extra = {}) {
  writeJson(AUTH_KEYS.session, {
    email,
    provider: "local",
    signedInAt: new Date().toISOString(),
    ...extra,
  });
}

function clearSession() {
  localStorage.removeItem(AUTH_KEYS.session);
  if (firebaseEnabled()) {
    firebaseApi()?.signOut?.().catch(() => {});
  }
}

function isAdmin(email = getSession()?.email) {
  const admins = [
    ...AUTH_CONFIG.adminEmails,
    ...(firebaseApi()?.adminEmails || []),
    ...(window.PolicyPulseFirebaseConfig?.adminEmails || []),
  ].map(normalizeEmail);
  return admins.includes(normalizeEmail(email));
}

window.PolicyPulseAuth = {
  getSession,
  isAdmin,
  adminEmails: [
    ...AUTH_CONFIG.adminEmails,
    ...(window.PolicyPulseFirebaseConfig?.adminEmails || []),
  ],
  logout: () => {
    clearSession();
    updateAccountUi();
    updateAdminVisibility();
    document.dispatchEvent(new CustomEvent("policy-auth-change"));
  },
  showLogin: () => showAuthOverlay(),
  normalizeEmail,
  digestPassword,
  readUsers: () => readJson(AUTH_KEYS.users, {}),
  writeUsers: (users) => writeJson(AUTH_KEYS.users, users),
  setSession,
  clearSession,
  updateAccountUi,
  updateAdminVisibility,
};

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(AUTH_KEYS.theme, theme);
  const label = document.querySelector("#themeLabel");
  if (label) label.textContent = theme === "dark" ? "亮色" : "暗色";
  document.querySelectorAll("[data-theme-label]").forEach((node) => {
    node.textContent = theme === "dark" ? "切換亮色" : "切換暗色";
  });
}

function initTheme() {
  const saved = localStorage.getItem(AUTH_KEYS.theme);
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
  applyTheme(saved || (prefersLight ? "light" : "dark"));
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || "dark";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  recordEvent("theme_change", { theme: next });
}

function initials(email) {
  const name = normalizeEmail(email).split("@")[0] || "user";
  return name.slice(0, 10);
}

function displayNameFor(session) {
  if (session?.displayName) return session.displayName;
  if (normalizeEmail(session?.email) === "lutinghui941025@gmail.com") return "盧欸嘿";
  return normalizeEmail(session?.email).split("@")[0] || "使用者";
}

function menuIcon(name) {
  const icons = {
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M7 20v-7h10v7M9 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" /></svg>',
    admin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v5H4zM4 14h7v5H4zM15 14h5v5h-5z" /></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 12h2m12 0h2M12 4v2m0 12v2" /></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5H5v14h4M14 8l4 4-4 4M18 12H9" /></svg>',
  };
  return icons[name] || "";
}

function updateAccountUi() {
  const accountButton = document.querySelector("#accountButton");
  if (!accountButton) return;

  const session = getSession();
  if (!session) {
    accountButton.hidden = false;
    accountButton.textContent = "登入";
    document.querySelector("#accountMenu")?.remove();
    accountButton.onclick = showAuthOverlay;
    updateAdminVisibility();
    return;
  }

  accountButton.hidden = false;
  accountButton.textContent = displayNameFor(session);
  accountButton.title = displayNameFor(session);
  updateAdminVisibility();

  let menu = document.querySelector("#accountMenu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "accountMenu";
    menu.className = "account-menu";
    menu.hidden = true;
    accountButton.after(menu);
  }

  const isAdminAccount = isAdmin(session.email);
  const adminAction = isAdminAccount
    ? `<a class="account-menu-row" href="admin.html">${menuIcon("admin")}<span>後台統計</span></a>`
    : "";
  const themeLabel = (document.documentElement.dataset.theme || "dark") === "dark" ? "切換亮色" : "切換暗色";
  const passwordSetting = session.provider === "google"
    ? `<span class="account-setting-note">Google 登入的密碼請到 Google 帳號管理。</span>`
    : `<a class="account-setting-link" href="account.html">更改密碼</a>`;

  menu.innerHTML = `
    <div class="account-menu-profile">
      <div class="account-avatar" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" /></svg>
      </div>
      <div class="account-identity">
        <strong>${displayNameFor(session)}</strong>
        <span>${session.email}</span>
      </div>
    </div>
    <a class="account-primary-action" href="account.html">帳號資料</a>
    <div class="account-menu-list">
      ${adminAction}
      <button class="account-menu-row" data-account-action="settings" type="button">${menuIcon("settings")}<span>設定</span></button>
      <button id="logoutButton" class="account-menu-row" type="button">${menuIcon("logout")}<span>登出</span></button>
    </div>
    <div class="account-settings-panel" data-account-settings hidden>
      <div>
        <strong>顯示模式</strong>
        <span>讓後台與網站一起切換暗色或亮色。</span>
      </div>
      <button class="account-setting-button" data-account-action="account-theme" type="button">
        <span data-theme-label>${themeLabel}</span>
      </button>
      <div>
        <strong>登入安全</strong>
        <span>管理你的信箱帳號與密碼。</span>
      </div>
      ${passwordSetting}
    </div>
    <p class="account-menu-notice" data-account-notice></p>
  `;

  accountButton.onclick = () => {
    menu.hidden = !menu.hidden;
  };

  menu.querySelector("#logoutButton").onclick = () => {
    recordEvent("logout", { email: session.email });
    clearSession();
    location.reload();
  };

  const setAccountNotice = (text) => {
    const notice = menu.querySelector("[data-account-notice]");
    if (notice) notice.textContent = text;
  };

  menu.querySelector('[data-account-action="settings"]')?.addEventListener("click", () => {
    recordEvent("account_settings_open", { email: session.email });
    const settingsPanel = menu.querySelector("[data-account-settings]");
    if (settingsPanel) settingsPanel.hidden = !settingsPanel.hidden;
    setAccountNotice("設定已展開。");
  });

  menu.querySelector('[data-account-action="account-theme"]')?.addEventListener("click", () => {
    toggleTheme();
    setAccountNotice("顯示模式已更新。");
  });
}

function removeAuthOverlay() {
  document.body.classList.remove("auth-locked");
  document.querySelector("#authLock")?.remove();
  updateAccountUi();
  updateAdminVisibility();
  document.dispatchEvent(new CustomEvent("policy-auth-change"));
}

function updateAdminVisibility() {
  document.querySelectorAll("[data-admin-only]").forEach((node) => {
    node.hidden = !isAdmin();
  });
}

function showAuthOverlay() {
  if (document.querySelector("#authLock")) return;
  document.body.classList.add("auth-locked");
  const firebaseReady = firebaseEnabled();

  const overlay = document.createElement("section");
  overlay.id = "authLock";
  overlay.className = "auth-lock";
  overlay.setAttribute("aria-label", "登入");
  overlay.innerHTML = `
    <article class="auth-card auth-card-game">
      <div class="auth-site-title" aria-label="政策脈絡">
        <span class="auth-site-mark">政</span>
        <strong>政策脈絡</strong>
      </div>
      <form id="authForm" class="auth-form">
        <label class="auth-field auth-field-plain">
          <span class="sr-only">信箱</span>
          <input id="authEmail" type="email" autocomplete="email" placeholder="輸入電子郵件信箱/使用者名稱" value="${demoUser.email}" required />
        </label>
        <label class="auth-field auth-field-plain">
          <span class="sr-only">密碼</span>
          <input id="authPassword" type="password" autocomplete="current-password" placeholder="輸入密碼" value="${demoUser.password}" required />
        </label>
        <div class="auth-helper-row">
          <a class="auth-link-button" href="register.html">立即註冊</a>
          <a class="auth-link-button" href="forgot-password.html">忘記密碼</a>
        </div>
        <button class="auth-submit auth-submit-wide" data-auth-action="login" type="submit">登入</button>
        <div class="social-login-row" aria-label="社群登入">
          <button class="social-login-button google-button" data-auth-action="google" type="button" aria-label="使用 Google 帳號登入">
            <span class="google-mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" focusable="false">
                <path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.6 34 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 3.2l6-6C34.5 4.9 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20.1-7.6 20.1-21 0-1.4-.1-2.7-.4-4z" />
                <path fill="#34A853" d="M6.1 14.3l7 5.1C15 14.4 19.2 11 24 11c3.1 0 5.9 1.1 8.1 3.2l6-6C34.5 4.9 29.5 3 24 3 16 3 9.1 7.5 5.6 14.1z" />
                <path fill="#FBBC05" d="M24 45c5.7 0 10.5-1.9 14-5.2l-6.5-5.3C29.6 36.1 27 37 24 37c-5.8 0-10.7-3.9-12.4-9.2l-7 5.4C8 40.2 15.4 45 24 45z" />
                <path fill="#EA4335" d="M11.6 27.8c-.5-1.5-.7-2.8-.7-3.8s.2-2.3.6-3.7l-7-5.4C3.5 17.7 3 20.8 3 24s.6 6.2 1.7 9.1z" />
              </svg>
            </span>
          </button>
          <button class="social-login-button facebook-button" data-auth-action="facebook" type="button" aria-label="Facebook 登入預留">
            <span>f</span>
          </button>
          <button class="social-login-button apple-button" data-auth-action="apple" type="button" aria-label="Apple 登入預留">
            <span>Apple</span>
          </button>
        </div>
        <div class="auth-bottom-row">
          <button class="auth-ghost" data-auth-action="demo" type="button">使用示範帳號</button>
          <button class="auth-ghost" data-auth-action="theme" type="button">切換明暗色</button>
          <button class="auth-ghost" data-auth-action="close" type="button">稍後再說</button>
        </div>
        <p id="authMessage" class="auth-message" role="status"></p>
      </form>
    </article>
  `;

  document.body.append(overlay);

  const form = overlay.querySelector("#authForm");
  const emailInput = overlay.querySelector("#authEmail");
  const passwordInput = overlay.querySelector("#authPassword");
  const message = overlay.querySelector("#authMessage");

  const readForm = () => ({
    email: normalizeEmail(emailInput.value),
    password: passwordInput.value,
  });

  if (isAdminPage()) {
    message.textContent = "後台請使用 Google 管理員帳號登入；示範帳號只用於前台留言測試。";
  }

  const login = async ({ email, password }) => {
    if (isAdminPage()) {
      message.textContent = "後台不使用本機示範帳密，請按下方 Google 圖示並選擇管理員帳號。";
      return;
    }
    const users = readJson(AUTH_KEYS.users, {});
    const user = users[email];
    if (user) {
      if (user.passwordHash !== (await digestPassword(password))) {
        message.textContent = "密碼不正確。";
        return;
      }
      setSession(email, { displayName: user.displayName || "", provider: "local" });
      recordEvent("login", { method: "email", email });
      removeAuthOverlay();
      return;
    }

    const api = await window.PolicyPulseFirebaseReady;
    if (api?.enabled && api.signInWithEmail) {
      try {
        await api.signInWithEmail(email, password);
        recordEvent("login", { method: "firebase_email", email });
        removeAuthOverlay();
        return;
      } catch (error) {
        message.textContent = error?.code === "auth/invalid-credential"
          ? "信箱或密碼不正確。"
          : `登入失敗：${error?.message || "請稍後再試。"}`;
        return;
      }
    }

    message.textContent = "找不到這個帳號，可以先建立帳號。";
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await login(readForm());
  });

  overlay.querySelector('[data-auth-action="demo"]').addEventListener("click", async () => {
    await login(demoUser);
  });

  overlay.querySelector('[data-auth-action="google"]').addEventListener("click", async () => {
    const api = await window.PolicyPulseFirebaseReady;
    if (!api?.enabled) {
      message.textContent =
        "Google 登入需要先填好 firebase-config.js，並在 Firebase Authentication 啟用 Google 登入。";
      recordEvent("google_login_placeholder");
      return;
    }

    if (isLoopbackIpHost()) {
      redirectToLocalhostForGoogle(message);
      return;
    }

    try {
      message.textContent = "正在開啟 Google 登入...";
      await api.signInWithGoogle();
      recordEvent("login", { method: "google", email: api.getCurrentUser()?.email });
      removeAuthOverlay();
    } catch (error) {
      if (error?.code === "auth/unauthorized-domain" && isLoopbackIpHost()) {
        redirectToLocalhostForGoogle(message);
        return;
      }
      message.textContent = explainGoogleAuthError(error);
    }
  });

  ["facebook", "apple"].forEach((provider) => {
    overlay.querySelector(`[data-auth-action="${provider}"]`).addEventListener("click", () => {
      message.textContent = "這個登入方式已先預留版面，正式上線前再接第三方登入。";
    });
  });

  overlay.querySelector('[data-auth-action="theme"]').addEventListener("click", toggleTheme);
  overlay.querySelector('[data-auth-action="close"]').addEventListener("click", () => {
    document.body.classList.remove("auth-locked");
    overlay.remove();
  });
}

async function maybeStartGoogleLogin(api) {
  const url = new URL(location.href);
  if (url.searchParams.get("login") !== "google") return false;

  url.searchParams.delete("login");
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  showAuthOverlay();
  const message = document.querySelector("#authMessage");

  if (!api?.enabled) {
    if (message) message.textContent = "Google 登入尚未啟用 Firebase 設定。";
    return true;
  }

  try {
    if (message) message.textContent = "正在用 Google 管理員帳號登入...";
    await api.signInWithGoogle();
    recordEvent("login", { method: "google", email: api.getCurrentUser()?.email });
    removeAuthOverlay();
  } catch (error) {
    if (message) message.textContent = explainGoogleAuthError(error);
  }
  return true;
}

async function initAuthTheme() {
  initTheme();
  await ensureDemoUser();
  recordEvent("page_view", { title: document.title });

  document.querySelector("#themeToggle")?.addEventListener("click", toggleTheme);

  const api = await window.PolicyPulseFirebaseReady;
  if (api?.enabled) {
    await api.finishRedirectSignIn?.();
    api.onAuthChange(() => {
      if (api.getCurrentUser()) {
        localStorage.removeItem(AUTH_KEYS.session);
        removeAuthOverlay();
      } else if (getSession()) {
        removeAuthOverlay();
      } else {
        updateAdminVisibility();
        updateAccountUi();
        document.dispatchEvent(new CustomEvent("policy-auth-change"));
      }
    });
  }

  if (await maybeStartGoogleLogin(api)) return;

  if (getSession()) {
    removeAuthOverlay();
  } else {
    updateAdminVisibility();
    updateAccountUi();
    const redirectError = window.PolicyPulseFirebaseRedirectError;
    if (redirectError) {
      const message = document.querySelector("#authMessage");
      if (message) message.textContent = `Google redirect error: ${redirectError.code || redirectError.message}`;
    }
  }
}

initAuthTheme();
