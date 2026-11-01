import { MENUS } from "@/lib/menus";

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

      <p style={{ color: "var(--muted)", marginTop: 24, fontSize: 14 }}>
        기반 셋업 완료(API·DB·라이브러리). 다음: 카카오 JS SDK로 내 칸 찾기 + 가게 검색(SCHEDULE Day 1~3).
      </p>

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
