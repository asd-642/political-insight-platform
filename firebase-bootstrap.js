(function bootstrapFirebase() {
  const config = window.PolicyPulseFirebaseConfig || {};
  const firebaseConfig = config.firebase || {};
  const adminEmails = (config.adminEmails || []).map((email) => String(email).toLowerCase());
  const disabledApi = {
    enabled: false,
    ready: false,
    adminEmails,
    isAdminEmail: (email) => adminEmails.includes(String(email || "").toLowerCase()),
    isAdmin: () => false,
    resolveAdminAccess: async () => false,
  };

  window.PolicyPulseFirebase = disabledApi;

  function normalizeArticle(doc) {
    const data = doc.data();
    return {
      id: data.id || doc.id,
      ...data,
      updated: data.updated || data.publishedAt?.slice?.(0, 10) || "",
      tags: data.tags || [],
      facts: data.facts || [],
      sources: data.sources || [],
    };
  }

  function normalizeDraft(doc) {
    const data = doc.data();
    return {
      file: doc.id,
      id: data.id || doc.id,
      topic: data.topic,
      topicName: data.topicName || data.topic,
      title: data.title || "未命名草稿",
      status: data.status || "待審",
      summary: data.summary || "",
      tags: data.tags || [],
      sources: data.sources || [],
      facts: data.facts || [],
      sections: data.sections || [],
      sourceLinks: data.sourceLinks || [],
      imagePrompt: data.imagePrompt || "",
      reviewChecklist: data.reviewChecklist || [],
      updatedAt: data.updatedAt || data.createdAt || "",
    };
  }

  function normalizeComment(doc) {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate?.()?.toISOString?.() || data.createdAtIso || "";
    return {
      id: doc.id,
      articleId: data.articleId || "",
      parentId: data.parentId || "",
      body: data.body || "",
      uid: data.uid || "",
      authorName: data.authorName || data.authorEmail || "會員",
      authorEmail: data.authorEmail || "",
      photoURL: data.photoURL || "",
      status: data.status || "visible",
      createdAt,
      createdAtIso: data.createdAtIso || createdAt,
      hiddenAt: data.hiddenAt || "",
      likeCount: data.likeCount || 0,
      dislikeCount: data.dislikeCount || 0,
      reportCount: data.reportCount || 0,
      viewerReported: data.viewerReported || false,
      viewerReaction: data.viewerReaction || "",
    };
  }

  function articleTimeline(article) {
    return {
      id: `timeline-${article.id}`,
      articleId: article.id,
      date: article.updated || new Date().toISOString().slice(0, 10),
      publishedAt: article.publishedAt || new Date().toISOString(),
      topic: article.topic,
      title: `${article.title} 追蹤建立`,
      description: article.summary,
    };
  }

  const topicNames = {
    budget: "財經",
    housing: "居住",
    energy: "能源",
    transport: "交通",
    labor: "勞工",
    education: "教育",
  };

  const topicImages = {
    budget: "assets/hero-market.png",
    housing: "assets/housing.png",
    energy: "assets/energy.png",
    transport: "assets/transport.png",
    labor: "assets/labor.png",
    education: "assets/education.png",
  };

  function splitKeywords(input) {
    if (Array.isArray(input)) return input.map((item) => String(item).trim()).filter(Boolean);
    return String(input || "")
      .split(/[\n,，、]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeBlockedKeywords(input) {
    return [...new Set(splitKeywords(input).filter(Boolean).slice(0, 200))];
  }

  function findBlockedKeywords(value, blockedKeywords = []) {
    const parts = [];
    const collectText = (item) => {
      if (item == null) return;
      if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
        parts.push(String(item));
        return;
      }
      if (Array.isArray(item)) {
        item.forEach(collectText);
        return;
      }
      if (typeof item === "object") Object.values(item).forEach(collectText);
    };
    collectText(value);
    const text = parts.join("\n").toLowerCase();
    return normalizeBlockedKeywords(blockedKeywords)
      .filter((keyword) => text.includes(keyword.toLowerCase()));
  }

  function safeDraftId(topic, keyword, date) {
    const cleanKeyword = String(keyword || "keyword")
      .replace(/[\\/#?[\]]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 42);
    return `${topic}-${cleanKeyword}-${date}`;
  }

  function taipeiDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
  }

  function keywordDraftSections(keyword, topicName) {
    return [
      {
        heading: "事件背景",
        paragraphs: [
          `這篇草稿聚焦「${keyword}」相關政策與公共議題，先把新聞脈絡整理成可審核的文章骨架。編輯審稿時，可以補上正式來源、地方回應、預算資料與時間線。`,
          `${topicName} 類議題通常不只是一則新聞，而是牽涉主管機關、地方執行、產業利害關係人與民眾使用情境。草稿會先保留中性寫法，避免直接替任一方下結論。`,
        ],
      },
      {
        heading: "目前可整理的重點",
        paragraphs: [
          `關鍵字「${keyword}」需要先確認三件事：第一，事件是否已有正式公告或會議紀錄；第二，政策主張是否包含預算、期程與責任單位；第三，是否已有反對或疑慮方的具體說法。`,
          "若來源只是一篇即時新聞，建議審稿時補齊原始文件或第二來源。這樣文章上線後會比較像整理稿，而不是單純改寫新聞。",
        ],
      },
      {
        heading: "支持方可能說法",
        paragraphs: [
          `支持方可能會主張，處理「${keyword}」能改善公共服務、降低風險或讓資源分配更有效率。這類說法需要搭配可驗證指標，例如執行進度、受益對象、成本或覆蓋範圍。`,
          "審稿時可以把支持理由拆成政策目的、預期效果與可檢查指標，避免只留下宣傳式語句。這會讓讀者更容易判斷政策是否真的有推進。",
        ],
      },
      {
        heading: "疑慮與待查證處",
        paragraphs: [
          `疑慮方可能關注「${keyword}」背後的程序、成本、公平性或地方執行能力。若涉及補助、採購、用地或環境影響，尤其需要補上正式資料與不同立場。`,
          "這一段不應直接放大未證實指控，而是標明目前缺少哪些資料，以及哪些問題需要主管機關回應。",
        ],
      },
      {
        heading: "後續追蹤方向",
        paragraphs: [
          "後續可以追蹤正式公告、議會質詢、主管機關新聞稿、預算書、裁罰紀錄、地方政府回應與相關數據更新。若有新來源，應優先補到文章來源與時間線。",
          `如果「${keyword}」在短期內持續有新聞更新，建議把它建立成長期追蹤條目，而不是每次都新增孤立文章。這樣網站內容會更有資料庫感。`,
        ],
      },
    ];
  }

  function buildKeywordDraft({ keyword, topic, sourceUrls, now, timestamp = null, date = taipeiDate(new Date(now)) }) {
    const topicName = topicNames[topic] || topic;
    const sourceList = sourceUrls.length ? sourceUrls : ["關鍵字初稿"];
    return {
      id: safeDraftId(topic, keyword, date),
      topic,
      topicName,
      title: `${keyword}議題整理，後續影響與資料待查核`,
      status: "待審核",
      summary: `根據關鍵字「${keyword}」建立待審草稿，先整理影響對象、主要爭點與後續需要補充的資料。`,
      image: "",
      imageMode: "generated",
      imagePrompt: `${topicName} policy newsroom cover about ${keyword}`,
      caption: `${topicName}議題示意圖。`,
      updated: date,
      tags: [keyword, topicName, "待查核"],
      sources: sourceList,
      sourceLinks: sourceUrls,
      reviewChecklist: [
        "確認至少 2 個可查來源",
        "補足事件背景、支持方、疑慮方與後續追蹤",
        "檢查是否有未查證指控或過度判斷",
        "確認圖片來源或使用自動生成示意圖",
      ],
      facts: [
        ["影響對象", "待依來源確認"],
        ["核心爭點", `${keyword}相關政策影響與各方主張`],
        ["觀察指標", "正式公告、預算、執行進度、地方回應"],
      ],
      support: `支持方可能認為，處理「${keyword}」有助於改善公共服務或補足現行制度缺口，但仍需用數據與正式文件確認成效。`,
      concern: `疑慮方可能關注程序透明、成本負擔、地方執行能力或資訊不足，審稿時應補齊來源後再發布。`,
      next: "補上原始公告、第二來源、時間線與相關人員說法後，再決定是否發布。",
      sections: keywordDraftSections(keyword, topicName),
      published: false,
      createdAt: timestamp || now,
      updatedAt: timestamp || now,
      createdAtIso: now,
    };
  }

  window.PolicyPulseFirebaseReady = (async () => {
    if (!config.enabled || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
      return disabledApi;
    }

    const [
      appModule,
      authModule,
      firestoreModule,
      analyticsModule,
    ] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js").catch(() => null),
    ]);

    const app = appModule.initializeApp(firebaseConfig);
    const auth = authModule.getAuth(app);
    const db = firestoreModule.getFirestore(app);
    const analytics = firebaseConfig.measurementId && analyticsModule
      ? analyticsModule.getAnalytics(app)
      : null;

    await authModule.setPersistence(auth, authModule.browserLocalPersistence).catch(() => {});

    const serverNow = () => firestoreModule.serverTimestamp();
    const getCurrentUser = () => auth.currentUser;
    const isAdminEmail = (email) => adminEmails.includes(String(email || "").toLowerCase());
    const adminAccessCache = {
      uid: "",
      value: false,
      pending: null,
    };
    const isAdmin = () =>
      Boolean(
        auth.currentUser
          && adminAccessCache.uid === auth.currentUser.uid
          && adminAccessCache.value,
      );
    async function resolveAdminAccess({ force = false } = {}) {
      const user = auth.currentUser;
      if (!user) {
        adminAccessCache.uid = "";
        adminAccessCache.value = false;
        adminAccessCache.pending = null;
        return false;
      }
      if (!force && adminAccessCache.uid === user.uid && adminAccessCache.value) {
        return true;
      }
      if (!force && adminAccessCache.pending) return adminAccessCache.pending;

      adminAccessCache.pending = (async () => {
        let claimAdmin = false;
        try {
          const token = await user.getIdTokenResult();
          claimAdmin = token.claims?.admin === true || token.claims?.role === "admin";
        } catch {
          claimAdmin = false;
        }

        let docAdmin = false;
        try {
          const snapshot = await firestoreModule.getDoc(firestoreModule.doc(db, "admins", user.uid));
          docAdmin = snapshot.exists();
        } catch {
          docAdmin = false;
        }

        adminAccessCache.uid = user.uid;
        adminAccessCache.value = Boolean(claimAdmin || docAdmin);
        adminAccessCache.pending = null;
        return adminAccessCache.value;
      })();

      return adminAccessCache.pending;
    }
    async function requireAdmin() {
      if (await resolveAdminAccess()) return;
      throw new Error("目前登入帳號不是管理員。");
    }
    const contentPolicyRef = () => firestoreModule.doc(db, "settings", "contentPolicy");

    function createGoogleProvider() {
      const provider = new authModule.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      return provider;
    }

    async function signInWithGoogle() {
      const provider = createGoogleProvider();
      try {
        return await authModule.signInWithPopup(auth, provider);
      } catch (error) {
        const popupBlocked = [
          "auth/popup-blocked",
          "auth/cancelled-popup-request",
          "auth/popup-closed-by-user",
          "auth/operation-not-supported-in-this-environment",
        ].includes(error.code);
        if (popupBlocked) return authModule.signInWithRedirect(auth, provider);
        throw error;
      }
    }

    async function createEmailUser(email, password, displayName = "") {
      const credential = await authModule.createUserWithEmailAndPassword(auth, email, password);
      if (displayName && credential.user) {
        await authModule.updateProfile(credential.user, { displayName }).catch(() => {});
      }
      if (credential.user && !credential.user.emailVerified) {
        await authModule.sendEmailVerification(credential.user).catch(() => {});
      }
      return credential;
    }

    async function signInWithEmail(email, password) {
      return authModule.signInWithEmailAndPassword(auth, email, password);
    }

    async function sendPasswordReset(email) {
      return authModule.sendPasswordResetEmail(auth, email);
    }

    async function updateCurrentPassword(currentPassword, newPassword) {
      if (!auth.currentUser) throw new Error("尚未登入。");
      if (currentPassword && auth.currentUser.email) {
        const credential = authModule.EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await authModule.reauthenticateWithCredential(auth.currentUser, credential);
      }
      return authModule.updatePassword(auth.currentUser, newPassword);
    }

    async function sendCurrentUserVerification() {
      if (!auth.currentUser) throw new Error("尚未登入。");
      return authModule.sendEmailVerification(auth.currentUser);
    }

    async function finishRedirectSignIn() {
      return authModule.getRedirectResult(auth).catch((error) => {
        window.PolicyPulseFirebaseRedirectError = {
          code: error.code,
          message: error.message,
        };
        return null;
      });
    }

    async function signOut() {
      return authModule.signOut(auth);
    }

    async function getUserWatchlist() {
      const user = getCurrentUser();
      if (!user) return [];
      const snapshot = await firestoreModule.getDoc(firestoreModule.doc(db, "users", user.uid));
      return snapshot.exists() && Array.isArray(snapshot.data()?.watchlist)
        ? snapshot.data().watchlist.map((item) => String(item)).filter(Boolean)
        : [];
    }

    async function updateUserWatchlist(watchlist = []) {
      const user = getCurrentUser();
      if (!user) throw new Error("請先登入後再同步追蹤清單。");
      const next = [...new Set(
        (Array.isArray(watchlist) ? watchlist : [])
          .map((item) => String(item).trim())
          .filter(Boolean),
      )].slice(0, 300);
      await firestoreModule.setDoc(firestoreModule.doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email || "",
        watchlist: next,
        updatedAt: serverNow(),
      }, { merge: true });
      return next;
    }

    function onAuthChange(callback) {
      return authModule.onAuthStateChanged(auth, callback);
    }

    async function loadPublishedContent() {
      const articlesRef = firestoreModule.collection(db, "articles");
      let snapshot;
      try {
        snapshot = await firestoreModule.getDocs(
          firestoreModule.query(
            articlesRef,
            firestoreModule.where("published", "==", true),
            firestoreModule.limit(80),
          ),
        );
      } catch {
        snapshot = await firestoreModule.getDocs(articlesRef);
      }
      const articles = snapshot.docs
        .map(normalizeArticle)
        .filter((article) => article.published !== false);
      let timeline = [];
      try {
        const timelineSnapshot = await firestoreModule.getDocs(firestoreModule.collection(db, "timeline"));
        timeline = timelineSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch {
        timeline = [];
      }
      return { articles, timeline };
    }

    async function listDrafts() {
      await requireAdmin();
      const draftsRef = firestoreModule.collection(db, "drafts");
      let snapshot;
      try {
        snapshot = await firestoreModule.getDocs(
          firestoreModule.query(draftsRef, firestoreModule.orderBy("createdAt", "desc")),
        );
      } catch {
        snapshot = await firestoreModule.getDocs(draftsRef);
      }
      return snapshot.docs.map(normalizeDraft);
    }

    async function approveDrafts(files) {
      await requireAdmin();
      const batch = firestoreModule.writeBatch(db);
      const publishedAt = new Date().toISOString();
      const published = [];

      for (const file of files) {
        const draftRef = firestoreModule.doc(db, "drafts", file);
        const draftSnap = await firestoreModule.getDoc(draftRef);
        if (!draftSnap.exists()) continue;

        const draft = { id: draftSnap.id, ...draftSnap.data() };
        const articleId = draft.id || draftSnap.id;
        const article = {
          ...draft,
          id: articleId,
          published: true,
          status: draft.status || "已發布",
          publishedAt,
          reviewedAt: publishedAt,
          updated: draft.updated || publishedAt.slice(0, 10),
        };
        const articleRef = firestoreModule.doc(db, "articles", articleId);
        const timelineRef = firestoreModule.doc(db, "timeline", `timeline-${articleId}`);
        batch.set(articleRef, {
          ...article,
          updatedAt: serverNow(),
        }, { merge: true });
        batch.set(timelineRef, articleTimeline(article), { merge: true });
        batch.delete(draftRef);
        published.push({ file, id: articleId, title: article.title, topic: article.topic });
      }

      await batch.commit();
      return published;
    }

    async function rejectDrafts(files) {
      await requireAdmin();
      const batch = firestoreModule.writeBatch(db);
      const rejected = [];
      for (const file of files) {
        const draftRef = firestoreModule.doc(db, "drafts", file);
        const draftSnap = await firestoreModule.getDoc(draftRef);
        if (!draftSnap.exists()) continue;
        const draft = draftSnap.data();
        batch.set(firestoreModule.doc(db, "rejectedDrafts", file), {
          ...draft,
          rejectedAt: new Date().toISOString(),
          updatedAt: serverNow(),
        }, { merge: true });
        batch.delete(draftRef);
        rejected.push({ file, title: draft.title || file });
      }
      await batch.commit();
      return rejected;
    }

    async function createKeywordDrafts(options = {}) {
      await requireAdmin();
      const topic = String(options.topic || "budget");
      const sourceUrls = Array.isArray(options.sourceUrls)
        ? options.sourceUrls.map((item) => String(item).trim()).filter(Boolean)
        : [];
      const keywords = splitKeywords(options.keywords).slice(0, Math.max(1, Math.min(Number(options.maxDrafts || 1), 5)));
      if (!keywords.length) throw new Error("請先輸入關鍵字。");

      const now = new Date().toISOString();
      const date = taipeiDate();
      const batch = firestoreModule.writeBatch(db);
      const created = [];
      const reports = [];
      const blockedKeywords = await getKeywordBlacklist().catch(() => []);

      keywords.forEach((keyword) => {
        const draft = buildKeywordDraft({ keyword, topic, sourceUrls, now, timestamp: serverNow(), date });
        const blocked = findBlockedKeywords({ keyword, draft, sourceUrls }, blockedKeywords);
        const report = {
          keyword,
          topic,
          usedAI: false,
          sourceCount: sourceUrls.length,
          title: draft.title,
        };
        if (blocked.length) {
          reports.push({
            ...report,
            skipped: true,
            reason: "blockedKeyword",
            blockedKeywords: blocked,
          });
          return;
        }
        batch.set(firestoreModule.doc(db, "drafts", draft.id), draft, { merge: true });
        created.push({ file: draft.id, id: draft.id, title: draft.title, topic });
        reports.push(report);
      });

      if (created.length) await batch.commit();
      return { created, reports };
    }

    async function getKeywordBlacklist() {
      await requireAdmin();
      const snapshot = await firestoreModule.getDoc(contentPolicyRef());
      return normalizeBlockedKeywords(snapshot.exists() ? snapshot.data()?.blockedKeywords || [] : []);
    }

    async function saveKeywordBlacklist(blockedKeywords = []) {
      await requireAdmin();
      const next = normalizeBlockedKeywords(blockedKeywords);
      await firestoreModule.setDoc(contentPolicyRef(), {
        blockedKeywords: next,
        updatedAt: serverNow(),
      }, { merge: true });
      return next;
    }

    async function attachCommentReactions(comments) {
      const viewerUid = auth.currentUser?.uid || "";
      return Promise.all(comments.map(async (comment) => {
        try {
          const snapshot = await firestoreModule.getDocs(
            firestoreModule.collection(db, "comments", comment.id, "reactions"),
          );
          let likeCount = 0;
          let dislikeCount = 0;
          let viewerReaction = "";
          snapshot.docs.forEach((doc) => {
            const reaction = doc.data()?.type;
            if (reaction === "like") likeCount += 1;
            if (reaction === "dislike") dislikeCount += 1;
            if (doc.id === viewerUid) viewerReaction = reaction;
          });
          return { ...comment, likeCount, dislikeCount, viewerReaction };
        } catch {
          return comment;
        }
      }));
    }

    async function attachCommentReports(comments) {
      const viewerUid = auth.currentUser?.uid || "";
      return Promise.all(comments.map(async (comment) => {
        try {
          const snapshot = await firestoreModule.getDocs(
            firestoreModule.collection(db, "comments", comment.id, "reports"),
          );
          return {
            ...comment,
            reportCount: snapshot.size,
            reportReasons: snapshot.docs.map((doc) => doc.data()?.reason).filter(Boolean),
            viewerReported: Boolean(viewerUid && snapshot.docs.some((doc) => doc.id === viewerUid)),
          };
        } catch {
          return comment;
        }
      }));
    }

    async function enrichComments(comments) {
      return attachCommentReports(await attachCommentReactions(comments));
    }

    async function listComments(articleId) {
      const commentsRef = firestoreModule.collection(db, "comments");
      let snapshot;
      try {
        snapshot = await firestoreModule.getDocs(
          firestoreModule.query(
            commentsRef,
            firestoreModule.where("articleId", "==", articleId),
            firestoreModule.where("status", "==", "visible"),
            firestoreModule.limit(80),
          ),
        );
      } catch {
        snapshot = await firestoreModule.getDocs(
          firestoreModule.query(
            commentsRef,
            firestoreModule.where("articleId", "==", articleId),
            firestoreModule.limit(80),
          ),
        );
      }
      const comments = snapshot.docs
        .map(normalizeComment)
        .filter((comment) => comment.status === "visible")
        .sort((a, b) => String(a.createdAtIso).localeCompare(String(b.createdAtIso)));
      return enrichComments(comments);
    }

    async function addComment(articleId, body, parentId = "") {
      const user = getCurrentUser();
      if (!user) throw new Error("請先登入後再留言。");
      const cleanBody = String(body || "").replace(/\s+/g, " ").trim();
      if (cleanBody.length < 2) throw new Error("留言內容太短。");
      if (cleanBody.length > 1000) throw new Error("留言最多 1000 個字。");

      const createdAtIso = new Date().toISOString();
      const payload = {
        articleId,
        parentId: String(parentId || ""),
        body: cleanBody,
        uid: user.uid,
        authorName: user.displayName || user.email?.split("@")[0] || "會員",
        authorEmail: user.email || "",
        photoURL: user.photoURL || "",
        status: "visible",
        createdAtIso,
        createdAt: serverNow(),
        updatedAt: serverNow(),
      };
      const ref = await firestoreModule.addDoc(firestoreModule.collection(db, "comments"), payload);
      return { id: ref.id, ...payload, createdAt: createdAtIso };
    }

    async function toggleCommentReaction(commentId, reaction) {
      const user = getCurrentUser();
      if (!user) throw new Error("請先登入後再點讚。");
      if (!["like", "dislike"].includes(reaction)) throw new Error("不支援的反應類型。");

      const reactionRef = firestoreModule.doc(db, "comments", commentId, "reactions", user.uid);
      const reactionSnap = await firestoreModule.getDoc(reactionRef);
      if (reactionSnap.exists() && reactionSnap.data()?.type === reaction) {
        await firestoreModule.deleteDoc(reactionRef);
        return { id: commentId, reaction: "" };
      }

      await firestoreModule.setDoc(reactionRef, {
        uid: user.uid,
        type: reaction,
        updatedAt: serverNow(),
      }, { merge: true });
      return { id: commentId, reaction };
    }

    async function reportComment(commentId, reason = "member_report") {
      const user = getCurrentUser();
      if (!user) throw new Error("請先登入後再檢舉留言。");
      const reportRef = firestoreModule.doc(db, "comments", commentId, "reports", user.uid);
      await firestoreModule.setDoc(reportRef, {
        uid: user.uid,
        email: user.email || "",
        reason: String(reason || "member_report").slice(0, 80),
        createdAtIso: new Date().toISOString(),
        createdAt: serverNow(),
      }, { merge: true });
      return { id: commentId, reported: true };
    }

    async function listRecentComments(limitCount = 80) {
      if (!(await resolveAdminAccess())) return [];
      const commentsRef = firestoreModule.collection(db, "comments");
      let snapshot;
      try {
        snapshot = await firestoreModule.getDocs(commentsRef);
      } catch {
        snapshot = await firestoreModule.getDocs(
          firestoreModule.query(
            commentsRef,
            firestoreModule.where("status", "==", "visible"),
            firestoreModule.limit(limitCount),
          ),
        );
      }
      const comments = snapshot.docs
        .map(normalizeComment);
      const enriched = await enrichComments(comments);
      return enriched
        .sort((a, b) =>
          Number(b.reportCount || 0) - Number(a.reportCount || 0) ||
          String(b.createdAtIso).localeCompare(String(a.createdAtIso)),
        )
        .slice(0, limitCount);
    }

    async function hideComment(commentId) {
      await requireAdmin();
      await firestoreModule.updateDoc(firestoreModule.doc(db, "comments", commentId), {
        status: "hidden",
        hiddenAt: new Date().toISOString(),
        hiddenBy: auth.currentUser?.uid || "",
        updatedAt: serverNow(),
      });
      return { id: commentId };
    }

    async function deleteComment(commentId) {
      await requireAdmin();
      await firestoreModule.deleteDoc(firestoreModule.doc(db, "comments", commentId));
      return { id: commentId };
    }

    async function recordEvent(type, payload = {}) {
      const user = getCurrentUser();
      await firestoreModule.addDoc(firestoreModule.collection(db, "events"), {
        type,
        payload,
        path: location.pathname.split("/").pop() || "index.html",
        uid: user?.uid || null,
        email: user?.email || null,
        at: new Date().toISOString(),
        createdAt: serverNow(),
      });
    }

    async function readEvents(limitCount = 80) {
      if (!(await resolveAdminAccess())) return [];
      const snapshot = await firestoreModule.getDocs(
        firestoreModule.query(
          firestoreModule.collection(db, "events"),
          firestoreModule.orderBy("createdAt", "desc"),
          firestoreModule.limit(limitCount),
        ),
      );
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).reverse();
    }

    function logEvent(name, params = {}) {
      if (analytics && analyticsModule?.logEvent) {
        analyticsModule.logEvent(analytics, name, params);
      }
    }

    const api = {
      enabled: true,
      ready: true,
      adminEmails,
      app,
      auth,
      db,
      getCurrentUser,
      isAdminEmail,
      isAdmin,
      resolveAdminAccess,
      signInWithGoogle,
      createEmailUser,
      signInWithEmail,
      sendPasswordReset,
      updateCurrentPassword,
      sendCurrentUserVerification,
      finishRedirectSignIn,
      signOut,
      getUserWatchlist,
      updateUserWatchlist,
      onAuthChange,
      loadPublishedContent,
      listDrafts,
      approveDrafts,
      rejectDrafts,
      createKeywordDrafts,
      getKeywordBlacklist,
      saveKeywordBlacklist,
      listComments,
      addComment,
      toggleCommentReaction,
      reportComment,
      listRecentComments,
      hideComment,
      deleteComment,
      recordEvent,
      readEvents,
      logEvent,
    };

    window.PolicyPulseFirebase = api;
    document.dispatchEvent(new CustomEvent("policy-firebase-ready"));
    return api;
  })().catch((error) => {
    console.warn("Firebase initialization failed", error);
    window.PolicyPulseFirebase = {
      ...disabledApi,
      error,
    };
    return window.PolicyPulseFirebase;
  });
})();
