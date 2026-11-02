import { MENUS } from "@/lib/menus";
import FindMyCell from "@/components/FindMyCell";

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "40px 20px",
        minHeight: "100dvh",
      }}
    >
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>오늘 점심 지도</h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
        오늘 점심 메뉴를 고르면, 그 선택이 모여 동네 지도가 칠해집니다.
      </p>

      <FindMyCell />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 24 }}>
        {MENUS.map((m) => (
          <span
            key={m.key}
            style={{
              fontSize: 13,
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${m.color}`,
              color: m.color,
            }}
          >
            {m.label}
          </span>
        ))}
      </div>
    </main>
  );
}
