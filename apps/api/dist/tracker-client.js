import { record } from "@rrweb/record";
const tag = document.currentScript;
const siteKey = tag?.dataset.site;
if (siteKey && !window.__akrosPulseLoaded) {
    window.__akrosPulseLoaded = true;
    const collectUrl = new URL("./v1/collect", tag.src);
    const replayUrl = new URL("./v1/replay-events", tag.src);
    collectUrl.searchParams.set("siteKey", siteKey);
    replayUrl.searchParams.set("siteKey", siteKey);
    const touched = Number(localStorage.getItem("akros_pulse_touched") || 0);
    let sessionId = localStorage.getItem("akros_pulse_session");
    if (!sessionId || Date.now() - touched > 1_800_000) {
        sessionId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
        localStorage.setItem("akros_pulse_session", sessionId);
    }
    const queryParams = () => {
        const values = {};
        new URLSearchParams(location.search).forEach((value, key) => {
            values[key] = value;
        });
        return values;
    };
    const sendPageView = () => {
        localStorage.setItem("akros_pulse_touched", String(Date.now()));
        const body = JSON.stringify({
            siteKey,
            sessionId,
            url: location.href,
            path: location.pathname,
            title: document.title,
            referrer: document.referrer,
            queryParams: queryParams()
        });
        if (navigator.sendBeacon) {
            navigator.sendBeacon(collectUrl, new Blob([body], { type: "application/json" }));
        }
        else {
            void fetch(collectUrl, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
        }
    };
    sendPageView();
    for (const name of ["pushState", "replaceState"]) {
        const original = history[name];
        history[name] = function (...args) {
            const result = original.apply(this, args);
            setTimeout(sendPageView, 0);
            return result;
        };
    }
    addEventListener("popstate", sendPageView);
    const replayAllowed = tag.dataset.recording !== "off" &&
        !navigator.globalPrivacyControl &&
        navigator.doNotTrack !== "1";
    if (replayAllowed) {
        let queue = [];
        let sequence = Date.now() * 100;
        let flushing = false;
        let lastFlush = Date.now();
        const flush = async () => {
            if (!queue.length || flushing)
                return;
            flushing = true;
            const events = queue;
            queue = [];
            lastFlush = Date.now();
            const body = JSON.stringify({ siteKey, sessionId, sequence: sequence++, events });
            try {
                if (navigator.sendBeacon && body.length < 58_000) {
                    navigator.sendBeacon(replayUrl, new Blob([body], { type: "application/json" }));
                }
                else {
                    await fetch(replayUrl, {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body,
                        keepalive: body.length < 60_000
                    });
                }
            }
            catch {
                queue.unshift(...events.slice(-100));
            }
            finally {
                flushing = false;
            }
        };
        record({
            emit(event) {
                queue.push(event);
                if (queue.length >= 45 || Date.now() - lastFlush >= 2_000)
                    void flush();
            },
            maskAllInputs: true,
            maskTextSelector: "[data-akros-mask]",
            blockSelector: "[data-akros-block], video, audio",
            ignoreSelector: "[data-akros-ignore]",
            recordCanvas: false,
            checkoutEveryNms: 300_000,
            sampling: { mousemove: 50, scroll: 100, input: "last" }
        });
        let recentClicks = [];
        addEventListener("click", (event) => {
            const now = Date.now();
            recentClicks = recentClicks.filter((click) => now - click.at < 1_500);
            recentClicks.push({ x: event.clientX, y: event.clientY, at: now });
            const closeClicks = recentClicks.filter((click) => Math.hypot(click.x - event.clientX, click.y - event.clientY) < 42);
            if (closeClicks.length >= 3) {
                record.addCustomEvent("akros:rage-click", {
                    x: event.clientX,
                    y: event.clientY,
                    path: location.pathname
                });
                recentClicks = [];
            }
        }, { capture: true, passive: true });
        setInterval(() => void flush(), 2_000);
        addEventListener("pagehide", () => void flush());
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden")
                void flush();
        });
    }
}
