import next from "eslint-config-next";

const config = [
  {
    // 벤더링된 외부 스킬(taste-skill 등)과 빌드 산출물은 린트 대상에서 제외
    ignores: [".next/**", "node_modules/**", "public/**", ".agents/**", "scripts/**"],
  },
  ...next,
];

export default config;
