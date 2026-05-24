window.PolicyPulseFirebaseConfig = {
  enabled: true,
  adminEmails: ["lutinghui941025@gmail.com"],
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

(function loadAdminDailyBackfill() {
  const path = window.location.pathname.replace(/\/$/, "/index.html");
  const isAdminPage = path.endsWith("/admin.html") || path.endsWith("/admin");
  if (!isAdminPage) return;

  window.addEventListener("load", () => {
    const script = document.createElement("script");
    script.src = "admin-daily-backfill.js?v=20260524-1";
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
