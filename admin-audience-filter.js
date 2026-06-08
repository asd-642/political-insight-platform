(function installAdminAudienceFilter() {
  if (!window.PolicyPulseStats || window.PolicyPulseStats.__audienceFiltered) return;

  const originalStats = {
    read: window.PolicyPulseStats.read?.bind(window.PolicyPulseStats),
    readRemote: window.PolicyPulseStats.readRemote?.bind(window.PolicyPulseStats),
  };

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function adminEmails() {
    return [
      ...(window.PolicyPulseFirebaseConfig?.adminEmails || []),
      ...(window.PolicyPulseFirebase?.adminEmails || []),
      ...(window.PolicyPulseAuth?.adminEmails || []),
    ].map(normalizeEmail).filter(Boolean);
  }

  function payloadOf(event) {
    return event?.payload && typeof event.payload === "object" ? event.payload : {};
  }

  function eventField(event, ...keys) {
    const payload = payloadOf(event);
    for (const key of keys) {
      const value = event?.[key] ?? payload[key];
      if (value != null && value !== "") return value;
    }
    return "";
  }

  function isLocalHost(value) {
    const text = String(value || "").toLowerCase();
    return ["localhost", "127.0.0.1", "::1", ""].includes(text);
  }

  function isAdminEvent(event) {
    const email = normalizeEmail(eventField(event, "email", "authorEmail", "userEmail"));
    if (email && adminEmails().includes(email)) return true;

    const currentUser = window.PolicyPulseFirebase?.getCurrentUser?.();
    if (currentUser?.uid && eventField(event, "uid") === currentUser.uid) return true;

    const pageKind = String(eventField(event, "pageKind")).toLowerCase();
    const path = String(event?.path || payloadOf(event).path || "").toLowerCase();
    return pageKind === "admin" || path === "admin.html";
  }

  function isLocalPreviewEvent(event) {
    const payload = payloadOf(event);
    const host = eventField(event, "host", "hostname", "originHost");
    const environment = String(eventField(event, "environment", "env")).toLowerCase();
    if (isLocalHost(host)) return true;
    if (environment === "local" || environment === "development") return true;
    return Boolean(event?.localOnly || payload.localOnly || payload.isLocalPreview);
  }

  function filterAudienceEvents(events) {
    return (Array.isArray(events) ? events : [])
      .filter((event) => !isAdminEvent(event))
      .filter((event) => !isLocalPreviewEvent(event));
  }

  window.PolicyPulseStats.read = () => [];
  window.PolicyPulseStats.readRemote = async () => {
    try {
      const events = await originalStats.readRemote?.();
      return filterAudienceEvents(events);
    } catch {
      return [];
    }
  };
  window.PolicyPulseStats.filterAudienceEvents = filterAudienceEvents;
  window.PolicyPulseStats.__audienceFiltered = true;
})();
