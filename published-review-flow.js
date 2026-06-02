(function publishedReviewFlow() {
  const firebaseReady = window.PolicyPulseFirebaseReady;
  const replacements = [
    ["AI 草稿審核", "已發布待檢查"],
    ["草稿審核", "發布後檢查"],
    ["待審草稿", "已發布待檢查文章"],
    ["更新草稿", "更新待檢查"],
    ["建立草稿", "已發布待檢查"],
    ["批次確認發布", "批次標記已檢查"],
    ["確認發布", "標記已檢查"],
    ["正在檢查待審草稿", "正在檢查已發布文章"],
    ["正在載入待審草稿", "正在載入已發布待檢查文章"],
    ["目前沒有待審草稿", "目前沒有已發布待檢查文章"],
    ["待審核", "待檢查"],
    ["退回", "下架"],
  ];

  function reviewText(value) {
    return replacements.reduce(
      (text, [from, to]) => text.replaceAll(from, to),
      String(value || ""),
    );
  }

  function cleanReviewItem(item) {
    return {
      ...item,
      title: reviewText(item.title || "未命名文章"),
      status: reviewText(item.status || "已發布待檢查"),
      summary: reviewText(item.summary || ""),
    };
  }

  function refreshVisibleText(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const tag = node.parentElement?.tagName;
        return tag === "SCRIPT" || tag === "STYLE"
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const next = reviewText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  }

  function startTextObserver() {
    refreshVisibleText();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        refreshVisibleText(mutation.target);
      });
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startTextObserver, { once: true });
  } else {
    startTextObserver();
  }

  if (!firebaseReady) return;

  window.PolicyPulseFirebaseReady = Promise.resolve(firebaseReady).then(async (api) => {
    if (!api?.enabled || !api.db) return api;

    const firestore = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
    const db = api.db;
    const originalCreateKeywordDrafts = api.createKeywordDrafts?.bind(api);
    const serverNow = () => firestore.serverTimestamp();
    const articleFile = (id) => `article:${id}`;
    const articleIdFromFile = (file) => String(file || "").replace(/^article:/, "");
    const isArticleFile = (file) => String(file || "").startsWith("article:");

    async function requireAdmin() {
      if (await api.resolveAdminAccess?.()) return;
      throw new Error("目前登入帳號不是管理員。");
    }

    function normalizeArticle(doc) {
      const data = doc.data ? doc.data() : doc;
      const article = { id: data.id || doc.id, ...data };
      return cleanReviewItem({
        file: articleFile(article.id),
        reviewMode: "published",
        id: article.id,
        topic: article.topic,
        topicName: article.topicName || article.topic,
        title: article.title || "未命名文章",
        status: article.status || "已發布待檢查",
        summary: article.summary || "",
        tags: article.tags || [],
        sources: article.sources || [],
        facts: article.facts || [],
        sections: article.sections || [],
        sourceLinks: article.sourceLinks || [],
        imagePrompt: article.imagePrompt || "",
        reviewChecklist: article.reviewChecklist || [],
        updatedAt: article.updatedAt || article.publishedAt || article.updated || "",
        publishedAt: article.publishedAt || "",
        reviewedAt: article.reviewedAt || "",
        reviewStatus: article.reviewStatus || "",
        publishedBeforeReview: Boolean(article.publishedBeforeReview),
      });
    }

    function articleTimeline(article) {
      return {
        id: `timeline-${article.id}`,
        articleId: article.id,
        date: article.updated || new Date().toISOString().slice(0, 10),
        publishedAt: article.publishedAt || new Date().toISOString(),
        topic: article.topic,
        title: `${reviewText(article.title)} 更新`,
        description: reviewText(article.summary),
      };
    }

    function markDraftPublishedForReview(draft, now) {
      return {
        ...draft,
        title: reviewText(draft.title || "未命名文章"),
        summary: reviewText(draft.summary || ""),
        id: draft.id,
        published: true,
        status: "已發布待檢查",
        reviewStatus: "needsReview",
        publishedBeforeReview: true,
        publishedAt: draft.publishedAt || now,
        reviewedAt: "",
        updated: draft.updated || now.slice(0, 10),
        updatedAt: serverNow(),
      };
    }

    async function promoteExistingDrafts() {
      const draftsRef = firestore.collection(db, "drafts");
      let draftSnapshot;
      try {
        draftSnapshot = await firestore.getDocs(
          firestore.query(draftsRef, firestore.orderBy("createdAt", "desc")),
        );
      } catch {
        draftSnapshot = await firestore.getDocs(draftsRef);
      }
      if (draftSnapshot.empty) return [];

      const now = new Date().toISOString();
      const batch = firestore.writeBatch(db);
      const promoted = [];
      draftSnapshot.docs.forEach((draftDoc) => {
        const draft = { id: draftDoc.id, ...draftDoc.data() };
        const articleId = draft.id || draftDoc.id;
        const article = markDraftPublishedForReview({ ...draft, id: articleId }, now);
        batch.set(firestore.doc(db, "articles", articleId), article, { merge: true });
        batch.set(firestore.doc(db, "timeline", `timeline-${articleId}`), articleTimeline(article), { merge: true });
        batch.delete(draftDoc.ref);
        promoted.push(normalizeArticle(article));
      });
      await batch.commit();
      return promoted;
    }

    async function readPublishedReviewArticles() {
      const articlesRef = firestore.collection(db, "articles");
      let snapshot;
      try {
        snapshot = await firestore.getDocs(
          firestore.query(
            articlesRef,
            firestore.where("reviewStatus", "==", "needsReview"),
            firestore.orderBy("publishedAt", "desc"),
          ),
        );
      } catch {
        snapshot = await firestore.getDocs(articlesRef);
      }
      return snapshot.docs
        .map(normalizeArticle)
        .filter((item) => (
          item.reviewStatus === "needsReview"
          || (item.publishedBeforeReview && !item.reviewedAt)
        ));
    }

    api.listDrafts = async () => {
      await requireAdmin();
      const promoted = await promoteExistingDrafts();
      const published = await readPublishedReviewArticles();
      const byFile = new Map([...promoted, ...published].map((item) => [item.file, item]));
      return [...byFile.values()].sort((a, b) =>
        String(b.updatedAt || b.publishedAt || "").localeCompare(String(a.updatedAt || a.publishedAt || "")),
      );
    };

    api.approveDrafts = async (files = []) => {
      await requireAdmin();
      const batch = firestore.writeBatch(db);
      const reviewedAt = new Date().toISOString();
      const published = [];

      for (const file of files) {
        const articleId = articleIdFromFile(file);
        if (!isArticleFile(file)) {
          const draftRef = firestore.doc(db, "drafts", file);
          const draftSnap = await firestore.getDoc(draftRef);
          if (!draftSnap.exists()) continue;
          const draft = { id: draftSnap.id, ...draftSnap.data() };
          const article = {
            ...markDraftPublishedForReview({ ...draft, id: draft.id || draftSnap.id }, reviewedAt),
            reviewStatus: "reviewed",
            publishedBeforeReview: false,
            status: "已檢查",
            reviewedAt,
          };
          batch.set(firestore.doc(db, "articles", article.id), article, { merge: true });
          batch.set(firestore.doc(db, "timeline", `timeline-${article.id}`), articleTimeline(article), { merge: true });
          batch.delete(draftRef);
          published.push({ file, id: article.id, title: article.title, topic: article.topic });
          continue;
        }

        const articleRef = firestore.doc(db, "articles", articleId);
        const articleSnap = await firestore.getDoc(articleRef);
        if (!articleSnap.exists()) continue;
        const article = { id: articleSnap.id, ...articleSnap.data() };
        batch.set(articleRef, {
          published: true,
          reviewStatus: "reviewed",
          publishedBeforeReview: false,
          status: "已檢查",
          reviewedAt,
          updatedAt: serverNow(),
        }, { merge: true });
        published.push({ file, id: articleId, title: article.title, topic: article.topic });
      }

      await batch.commit();
      return published;
    };

    api.rejectDrafts = async (files = []) => {
      await requireAdmin();
      const batch = firestore.writeBatch(db);
      const rejectedAt = new Date().toISOString();
      const rejected = [];

      for (const file of files) {
        if (isArticleFile(file)) {
          const articleId = articleIdFromFile(file);
          const articleRef = firestore.doc(db, "articles", articleId);
          const articleSnap = await firestore.getDoc(articleRef);
          if (!articleSnap.exists()) continue;
          const article = { id: articleSnap.id, ...articleSnap.data() };
          batch.set(articleRef, {
            published: false,
            reviewStatus: "rejected",
            publishedBeforeReview: false,
            status: "已下架",
            rejectedAt,
            updatedAt: serverNow(),
          }, { merge: true });
          batch.delete(firestore.doc(db, "timeline", `timeline-${articleId}`));
          rejected.push({ file, id: articleId, title: article.title, topic: article.topic });
          continue;
        }

        const draftRef = firestore.doc(db, "drafts", file);
        const draftSnap = await firestore.getDoc(draftRef);
        if (!draftSnap.exists()) continue;
        const draft = draftSnap.data();
        batch.set(firestore.doc(db, "rejectedDrafts", file), {
          ...draft,
          rejectedAt,
          updatedAt: serverNow(),
        }, { merge: true });
        batch.delete(draftRef);
        rejected.push({ file, title: draft.title || file });
      }

      await batch.commit();
      return rejected;
    };

    if (originalCreateKeywordDrafts) {
      api.createKeywordDrafts = async (options = {}) => {
        const result = await originalCreateKeywordDrafts(options);
        const drafts = await api.listDrafts();
        return { ...result, drafts };
      };
    }

    window.PolicyPulseFirebase = api;
    return api;
  });
})();
