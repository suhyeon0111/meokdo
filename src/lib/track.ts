/** 익명 이벤트 1건 전송 (fire-and-forget). 개인정보 없음. */
export function track(name: string): void {
  try {
    fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* 무시 */
  }
}
