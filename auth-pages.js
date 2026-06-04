(function setupAuthPages() {
  const page = document.querySelector("[data-auth-page]");
  if (!page) return;

  const type = page.dataset.authPage;
  const form = page.querySelector("form");
  const status = page.querySelector("[data-auth-status]");
  const submit = form?.querySelector("button[type='submit']");

  const auth = () => window.PolicyPulseAuth;
  const stats = () => window.PolicyPulseStats;
  const firebaseReady = () => window.PolicyPulseFirebaseReady || Promise.resolve(window.PolicyPulseFirebase);

  function setStatus(message, kind = "") {
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function formValue(name) {
    return String(new FormData(form).get(name) || "").trim();
  }

  function setLoading(value) {
    if (submit) submit.disabled = value;
  }

  function strongPassword(password) {
    return password.length >= 6;
  }

  function randomPassword() {
    if (!window.crypto?.getRandomValues) {
      return `PP-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    }
    const bytes = new Uint32Array(2);
    crypto.getRandomValues(bytes);
    return `PP-${bytes[0].toString(36).slice(0, 4).toUpperCase()}-${bytes[1].toString(36).slice(0, 4).toUpperCase()}`;
  }

  function firebaseEmailUnavailable(error) {
    return [
      "auth/operation-not-allowed",
      "auth/admin-restricted-operation",
      "auth/unauthorized-domain",
    ].includes(error?.code);
  }

  async function createLocalUser({ email, password, displayName }) {
    const api = auth();
    const users = api.readUsers();
    if (users[email]) throw new Error("這個信箱已經註冊，請直接登入。");

    users[email] = {
      email,
      displayName,
      passwordHash: await api.digestPassword(password),
      emailVerified: false,
      createdAt: new Date().toISOString(),
    };
    api.writeUsers(users);
    api.setSession(email, { displayName, provider: "local" });
  }

  async function resetLocalPassword(email) {
    const api = auth();
    const users = api.readUsers();
    if (!users[email]) throw new Error("找不到這個本機帳號。");

    const password = randomPassword();
    users[email] = {
      ...users[email],
      passwordHash: await api.digestPassword(password),
      passwordResetAt: new Date().toISOString(),
    };
    api.writeUsers(users);
    return password;
  }

  async function changeLocalPassword(session, currentPassword, newPassword) {
    const api = auth();
    const users = api.readUsers();
    const email = api.normalizeEmail(session.email);
    const user = users[email];
    if (!user) throw new Error("找不到這個本機帳號。");
    if (user.passwordHash !== (await api.digestPassword(currentPassword))) {
      throw new Error("目前密碼不正確。");
    }
    users[email] = {
      ...user,
      passwordHash: await api.digestPassword(newPassword),
      passwordChangedAt: new Date().toISOString(),
    };
    api.writeUsers(users);
  }

  async function handleRegister(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("正在建立帳號...");

    try {
      const email = auth().normalizeEmail(formValue("email"));
      const displayName = formValue("displayName");
      const password = formValue("password");
      const confirmPassword = formValue("confirmPassword");
      const agreed = form.querySelector("[name='agree']")?.checked;

      if (!email.includes("@")) throw new Error("請輸入有效的電子信箱。");
      if (!strongPassword(password)) throw new Error("密碼至少需要 6 個字。");
      if (password !== confirmPassword) throw new Error("兩次輸入的密碼不一致。");
      if (!agreed) throw new Error("請先確認使用此信箱註冊。");

      const api = await firebaseReady();
      if (api?.enabled && api.createEmailUser) {
        try {
          await api.createEmailUser(email, password, displayName);
          stats()?.record("signup", { method: "firebase_email", email });
          setStatus("帳號已建立，已寄出信箱驗證信。你可以回首頁開始使用。", "success");
        } catch (firebaseError) {
          if (!firebaseEmailUnavailable(firebaseError)) throw firebaseError;
          await createLocalUser({ email, password, displayName });
          stats()?.record("signup", { method: "local_email_fallback", email, reason: firebaseError.code });
          setStatus("會員資料已建立，正在回首頁。", "success");
          setTimeout(() => location.assign("index.html"), 900);
        }
      } else {
        await createLocalUser({ email, password, displayName });
        stats()?.record("signup", { method: "local_email", email });
        setStatus("會員資料已建立，正在回首頁。", "success");
        setTimeout(() => location.assign("index.html"), 900);
      }
    } catch (error) {
      setStatus(error.message || "註冊失敗，請稍後再試。", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("正在處理密碼重設...");

    try {
      const email = auth().normalizeEmail(formValue("email"));
      if (!email.includes("@")) throw new Error("請輸入有效的電子信箱。");

      const api = await firebaseReady();
      if (api?.enabled && api.sendPasswordReset) {
        try {
          await api.sendPasswordReset(email);
          stats()?.record("password_reset_request", { method: "firebase_email", email });
          setStatus("密碼重設信已寄出。請到信箱點連結設定新密碼。", "success");
        } catch (firebaseError) {
          if (!firebaseEmailUnavailable(firebaseError)) throw firebaseError;
          const password = await resetLocalPassword(email);
          stats()?.record("password_reset_request", { method: "local_email_fallback", email, reason: firebaseError.code });
          setStatus(`已建立新的臨時密碼：${password}。`, "success");
        }
      } else {
        const password = await resetLocalPassword(email);
        stats()?.record("password_reset_request", { method: "local_email", email });
        setStatus(`新的臨時密碼是：${password}。登入後請到帳號設定改成自己的密碼。`, "success");
      }
    } catch (error) {
      setStatus(error.message || "密碼重設失敗，請稍後再試。", "error");
    } finally {
      setLoading(false);
    }
  }

  function renderAccountState() {
    const session = auth()?.getSession?.();
    const accountEmail = page.querySelector("[data-account-email]");
    const accountProvider = page.querySelector("[data-account-provider]");
    const passwordPanel = page.querySelector("[data-password-panel]");
    const googleNote = page.querySelector("[data-google-password-note]");

    if (!session) {
      setStatus("請先登入後再管理帳號。", "error");
      if (passwordPanel) passwordPanel.hidden = true;
      return;
    }

    if (accountEmail) accountEmail.textContent = session.email || "未提供信箱";
    if (accountProvider) accountProvider.textContent = session.provider === "google" ? "Google 帳號" : "信箱帳號";
    const isGoogle = session.provider === "google";
    if (passwordPanel) passwordPanel.hidden = isGoogle;
    if (googleNote) googleNote.hidden = !isGoogle;
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("正在更新密碼...");

    try {
      const session = auth().getSession();
      if (!session) throw new Error("請先登入。");

      const currentPassword = formValue("currentPassword");
      const newPassword = formValue("newPassword");
      const confirmPassword = formValue("confirmPassword");
      if (!strongPassword(newPassword)) throw new Error("新密碼至少需要 6 個字。");
      if (newPassword !== confirmPassword) throw new Error("兩次輸入的新密碼不一致。");

      const api = await firebaseReady();
      if (api?.enabled && session.provider !== "local" && api.updateCurrentPassword) {
        await api.updateCurrentPassword(currentPassword, newPassword);
        stats()?.record("password_change", { method: "firebase_email", email: session.email });
      } else {
        await changeLocalPassword(session, currentPassword, newPassword);
        stats()?.record("password_change", { method: "local_email", email: session.email });
      }
      setStatus("密碼已更新。下次登入請使用新密碼。", "success");
      form.reset();
    } catch (error) {
      setStatus(error.message || "密碼更新失敗，請重新登入後再試。", "error");
    } finally {
      setLoading(false);
    }
  }

  if (type === "register") form?.addEventListener("submit", handleRegister);
  if (type === "forgot") form?.addEventListener("submit", handleForgot);
  if (type === "account") {
    renderAccountState();
    form?.addEventListener("submit", handleChangePassword);
    document.addEventListener("policy-auth-change", renderAccountState);
  }
})();
