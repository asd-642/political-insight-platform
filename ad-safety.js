(function setupAdSafety() {
  const STORAGE_KEY = "policyPulseAdFocusEvents";
  const WINDOW_MS = 3 * 60 * 1000;
  const MAX_FOCUS_EVENTS = 3;
  let pointerInsidePromotion = false;

  function readEvents() {
    try {
      const events = JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || [];
      const since = Date.now() - WINDOW_MS;
      return events.filter((time) => Number(time) >= since);
    } catch {
      return [];
    }
  }

  function writeEvents(events) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function hasActivePromotionFrame() {
    const active = document.activeElement;
    return Boolean(
      active?.tagName === "IFRAME" &&
        active.closest?.(".promo-slot, [data-promo-slot]"),
    );
  }

  function activateGuard(eventCount) {
    document.documentElement.classList.add("promo-guard-active");
    document.querySelectorAll(".promo-slot, [data-promo-slot]").forEach((slot) => {
      slot.style.pointerEvents = "none";
      if (!slot.style.minHeight) slot.style.minHeight = "250px";
      slot.innerHTML = `
        <div class="ad-safety-shield" role="status">
          <strong>廣告安全防護已啟動</strong>
          <span>系統偵測到短時間內的異常互動，已暫停本頁廣告點擊以保護帳戶。</span>
        </div>
      `;
    });
    window.PolicyPulseStats?.record?.("ad_bombing_blocked", {
      events: eventCount,
      timestamp: Date.now(),
    });
  }

  document.addEventListener("pointerover", (event) => {
    pointerInsidePromotion = Boolean(event.target.closest?.(".promo-slot, [data-promo-slot]"));
  }, true);

  document.addEventListener("pointerout", (event) => {
    if (!event.relatedTarget || !event.relatedTarget.closest?.(".promo-slot, [data-promo-slot]")) {
      pointerInsidePromotion = false;
    }
  }, true);

  window.addEventListener("blur", () => {
    if (!pointerInsidePromotion && !hasActivePromotionFrame()) return;
    const events = [...readEvents(), Date.now()];
    writeEvents(events);
    if (events.length >= MAX_FOCUS_EVENTS) {
      activateGuard(events.length);
    }
  });
})();
