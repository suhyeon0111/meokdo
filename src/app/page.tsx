export default function Home() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "48px 20px",
        minHeight: "100dvh",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>meokdo</h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
        맛집 기록이 쌓일수록 시군구 지도가 칠해지는 맛집 일기.
      </p>
      <p style={{ color: "var(--muted)", marginTop: 24, fontSize: 14 }}>
        Day 1 셋업 완료. 다음: 경계 폴리곤 렌더(Day 2).
      </p>
    </main>
  );
}
