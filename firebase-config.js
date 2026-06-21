window.PolicyPulseFirebaseConfig = {
  enabled: true,
  adminEmails: [],
  firebase: {
    apiKey: "AIzaSyA6ZmZnNMylKj2Uy9tS_d933fYHHFWkmS8",
    authDomain: "policy-pulse-tw.firebaseapp.com",
    projectId: "policy-pulse-tw",
    storageBucket: "policy-pulse-tw.firebasestorage.app",
    messagingSenderId: "152875028857",
    appId: "1:152875028857:web:2cd7cdb88734c358705fa8",
    measurementId: "G-8LLLXL1TY1",
  },
};

(function installGoogleProfileSync() {
  const FIRESTORE_SDK = "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
  let firestoreToolsPromise = null;

  function firestoreTools() {
    if (!firestoreToolsPromise) {
      firestoreToolsPromise = import(FIRESTORE_SDK);
    }
    return firestoreToolsPromise;
  }

  function providerIdsFor(user) {
    return [...new Set(
      (user?.providerData || [])
        .map((provider) => provider?.providerId)
        .filter(Boolean),
    )];
  }

  async function syncUserProfile(api, user, reason = "auth") {
    if (!api?.enabled || !api.db || !user?.uid) return null;

    const {
      doc,
      getDoc,
      serverTimestamp,
      setDoc,
    } = await firestoreTools();
    const userRef = doc(api.db, "users", user.uid);
    let isNewUser = false;

    try {
      const snapshot = await getDoc(userRef);
      isNewUser = !snapshot.exists();
    } catch {
      isNewUser = false;
    }

    const providers = providerIdsFor(user);
    const primaryProvider = providers.includes("google.com")
      ? "google.com"
      : providers[0] || "unknown";
    const payload = {
      uid: user.uid,
      email: user.email || "",
      emailLower: String(user.email || "").toLowerCase(),
      emailVerified: Boolean(user.emailVerified),
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      provider: primaryProvider,
      providers,
      lastAuthReason: reason,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (isNewUser) {
      payload.createdAt = serverTimestamp();
      payload.role = "user";
      payload.watchlist = [];
      payload.signupProvider = primaryProvider;
    }

    await setDoc(userRef, payload, { merge: true });
    return payload;
  }

  function install(api) {
    if (!api?.enabled || api.__googleProfileSyncInstalled) return;
    api.__googleProfileSyncInstalled = true;
    api.ensureUserProfile = (user = api.getCurrentUser?.(), reason = "manual") =>
      syncUserProfile(api, user, reason);

    if (typeof api.signInWithGoogle === "function") {
      const originalSignInWithGoogle = api.signInWithGoogle.bind(api);
      api.signInWithGoogle = async (...args) => {
        const credential = await originalSignInWithGoogle(...args);
        await syncUserProfile(api, credential?.user || api.getCurrentUser?.(), "google_popup").catch(() => {});
        return credential;
      };
    }

    if (typeof api.finishRedirectSignIn === "function") {
      const originalFinishRedirectSignIn = api.finishRedirectSignIn.bind(api);
      api.finishRedirectSignIn = async (...args) => {
        const result = await originalFinishRedirectSignIn(...args);
        await syncUserProfile(api, result?.user || api.getCurrentUser?.(), "google_redirect").catch(() => {});
        return result;
      };
    }

    if (typeof api.onAuthChange === "function") {
      const originalOnAuthChange = api.onAuthChange.bind(api);
      api.onAuthChange = (callback) => originalOnAuthChange(async (user) => {
        if (user) await syncUserProfile(api, user, "auth_state").catch(() => {});
        callback(user);
      });
    }

    syncUserProfile(api, api.getCurrentUser?.(), "ready").catch(() => {});
  }

  document.addEventListener("policy-firebase-ready", () => {
    install(window.PolicyPulseFirebase);
  });
})();

(function loadAdminDailyBackfill() {
  const path = window.location.pathname.replace(/\/$/, "/index.html");
  const isAdminPage = path.endsWith("/admin.html") || path.endsWith("/admin");
  if (!isAdminPage) return;

  window.addEventListener("load", () => {
    const script = document.createElement("script");
    script.src = "admin-daily-backfill.js?v=20260526-2";
    document.body.appendChild(script);
  });
})();

(function refineAuthDomainMessage() {
  window.addEventListener("load", () => {
    window.explainGoogleAuthError = function explainGoogleAuthError(error) {
      if (error?.code === "auth/unauthorized-domain") {
        const host = window.location.hostname || "目前網域";
        const domainHint = host === "localhost" || host === "127.0.0.1"
          ? "localhost 和 127.0.0.1"
          : host;
        return `Firebase 尚未授權目前網域。請在 Firebase Authentication 的 Authorized domains 加入 ${domainHint}。`;
      }
      return `Google 登入失敗：${error?.message || "未知錯誤"}`;
    };
  });
})();
