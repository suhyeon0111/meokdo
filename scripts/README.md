# 경계 데이터 전처리

## 0. 원본 받기 (수동)
1. SGIS 통계지리정보 시군구 경계(2025-06-30 기준) SHP 다운로드.
2. 좌표계를 WGS84(EPSG:4326)로 변환. 예: `ogr2ogr -t_srs EPSG:4326 out.geojson sgis_sig.shp`
3. **2026-07 개편 수동 패치**(DECISIONS #1·#3): 인천 2군·9구(제물포·영종·검단 신설 등), 전남광주통합특별시 경계·코드 반영. (베타 타깃에 포함될 때만 — 축소안 A)
4. 일반구가 구 단위로 분리돼 있는지 확인(DECISIONS #2).

## 1. 빌드
```bash
node scripts/build-boundaries.mjs <wgs84.geojson> [codeField] [nameField]
```
- `public/boundaries/display.geojson` (화면용, MapLibre 로드)
- `src/lib/boundaries/judge.geojson` (판정용, Turf)

두 산출물의 `region_code`는 동일 키. `regions` 테이블·`boundary_version`과 맞출 것.

## 2. 검증 (Day 2·3)
- display.geojson gzip 크기 ≤ 500KB 목표 (`gzip -c public/boundaries/display.geojson | wc -c`).
- 모바일에서 MapLibre 렌더 FPS·첫 로드 측정.
- 판정 정확도: `region.test.ts` 50좌표.

> 현재 `public/boundaries/display.geojson`은 **샘플 더미**다. 위 빌드가 실제 데이터로 덮어쓴다.
