#!/usr/bin/env node
/**
 * 경계 전처리 파이프라인 (SPEC §4.1)
 *
 * 입력:  WGS84(EPSG:4326) 로 변환된 시군구 경계 GeoJSON 1개
 *        (SGIS 원본 SHP → QGIS/ogr2ogr/mapshaper 로 EPSG:4326 변환 + 2026-07 개편 수동 패치 후)
 *
 * 출력:
 *   - public/boundaries/display.geojson      화면용(강하게 단순화 + quantize)
 *   - src/lib/boundaries/judge.geojson        판정용(약하게 단순화, 정확도 우선)
 *
 * 사용:  node scripts/build-boundaries.mjs <input.geojson> [codeField] [nameField]
 *   codeField/nameField: 원본의 시군구 코드/이름 속성명 (기본: SIG_CD, SIG_KOR_NM — SGIS/통계청 관례)
 *
 * 전제: 속성에 시군구 코드가 있어야 한다. 일반구는 구 단위로 분리된 데이터여야 한다(DECISIONS #2).
 */
import mapshaper from "mapshaper";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const [, , input, codeField = "SIG_CD", nameField = "SIG_KOR_NM"] = process.argv;

if (!input) {
  console.error(
    "usage: node scripts/build-boundaries.mjs <input.geojson> [codeField] [nameField]",
  );
  process.exit(1);
}

const DISPLAY_OUT = "public/boundaries/display.geojson";
const JUDGE_OUT = "src/lib/boundaries/judge.geojson";

// region_code / full_name 으로 표준화하고 나머지 속성 제거
const rename = `-each 'region_code=String(${codeField}), full_name=${nameField}' -filter-fields region_code,full_name`;

async function run(commands) {
  await mapshaper.runCommands(commands);
}

await mkdir(dirname(DISPLAY_OUT), { recursive: true });
await mkdir(dirname(JUDGE_OUT), { recursive: true });

// 화면용: 4% 단순화 + 정수 양자화로 용량 최소화
await run(
  `-i "${input}" ${rename} -simplify 4% keep-shapes -clean -o "${DISPLAY_OUT}" format=geojson precision=0.00001`,
);

// 판정용: 20% 단순화(정확도 우선)
await run(
  `-i "${input}" ${rename} -simplify 20% keep-shapes -clean -o "${JUDGE_OUT}" format=geojson`,
);

console.log(`✓ ${DISPLAY_OUT}`);
console.log(`✓ ${JUDGE_OUT}`);
console.log(
  "→ display.geojson gzip 크기를 확인하세요 (목표 ≤500KB). 초과 시 simplify % 를 낮추거나 뷰포트 로딩 검토.",
);
