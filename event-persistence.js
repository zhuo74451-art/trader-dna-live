(() => {
  const VERSION = 'v1';
  const RESULT_KEY = `82trade-trader-dna:completed:${VERSION}`;
  const OUTBOX_KEY = `82trade-trader-dna:outbox:${VERSION}`;
  const CLAIM_KEY = `82trade-trader-dna:claim:${VERSION}`;
  const MAX_OUTBOX = 12;

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function randomToken() {
    const bytes = new Uint8Array(32);
    try {
      crypto.getRandomValues(bytes);
      return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }
  }

  function endpoint() {
    const meta = document.querySelector('meta[name="traderdna-completion-endpoint"]');
    const value = meta?.content?.trim();
    if (!value) return null;
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin && url.protocol !== 'https:') return null;
      return url.href;
    } catch {
      return null;
    }
  }

  function claimTokenFor(sessionId) {
    const existing = readJson(CLAIM_KEY, null);
    if (existing?.sessionId === sessionId && typeof existing.token === 'string' && existing.token.length >= 32) {
      return existing.token;
    }
    const token = randomToken();
    writeJson(CLAIM_KEY, { sessionId, token, createdAt: new Date().toISOString() });
    return token;
  }

  function persistCompleted(record) {
    if (!record || typeof record !== 'object' || !record.sessionId || !record.assessmentVersion) return null;
    const enriched = {
      ...record,
      claimToken: claimTokenFor(record.sessionId),
      cachedAt: new Date().toISOString(),
    };
    writeJson(RESULT_KEY, enriched);
    return enriched;
  }

  function enqueue(record) {
    const key = `${record.assessmentVersion}:${record.sessionId}:${record.mode}`;
    const existing = readJson(OUTBOX_KEY, []);
    const withoutSameKey = existing.filter(item => item?.key !== key);
    const next = [
      ...withoutSameKey,
      { key, record, attempts: 0, queuedAt: new Date().toISOString() },
    ].slice(-MAX_OUTBOX);
    writeJson(OUTBOX_KEY, next);
  }

  async function postRecord(url, record) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(record),
      keepalive: true,
      credentials: 'omit',
    });
    if (!response.ok) throw new Error(`completion upload failed: ${response.status}`);
  }

  async function flush() {
    const url = endpoint();
    if (!url || !navigator.onLine) return;
    const queue = readJson(OUTBOX_KEY, []);
    if (!queue.length) return;

    const remaining = [];
    for (const item of queue) {
      try {
        await postRecord(url, item.record);
      } catch {
        remaining.push({ ...item, attempts: Number(item.attempts || 0) + 1, lastAttemptAt: new Date().toISOString() });
      }
    }
    writeJson(OUTBOX_KEY, remaining.slice(-MAX_OUTBOX));
  }

  document.addEventListener('traderdna:completed', event => {
    const record = persistCompleted(event.detail);
    if (!record) return;
    enqueue(record);
    void flush();
  });

  addEventListener('online', () => void flush());
  addEventListener('pageshow', () => void flush());

  window.TraderDNAEventStore = Object.freeze({
    getLastCompleted() {
      return readJson(RESULT_KEY, null);
    },
    getOutboxSize() {
      return readJson(OUTBOX_KEY, []).length;
    },
    flush,
  });

  void flush();
})();
