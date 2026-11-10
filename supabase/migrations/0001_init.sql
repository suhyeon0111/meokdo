-- 오늘 점심 지도 — 초기 스키마 (SPEC §2)
-- 로그인 없음. 개인 식별정보 저장 안 함. 집계 카운트만.

-- ─────────────── 테이블 ───────────────

-- 표 집계: (오늘, 칸, 메뉴, 방문구간) 당 한 행
create table vote_counts (
  vote_date    date    not null,              -- KST 05:00 경계 기준 "오늘"
  region_code  text    not null,              -- 시군구 코드
  menu_type    text    not null,              -- 10종 중 하나(키)
  visit_bucket text    not null,              -- 'first' | 'd2_7' | 'd8plus'
  count        integer not null default 0,
  primary key (vote_date, region_code, menu_type, visit_bucket)
);
create index vote_counts_date_region_idx on vote_counts(vote_date, region_code);

-- 단계별 이벤트 횟수
create table event_counts (
  event_date date    not null,
  name       text    not null,
  count      integer not null default 0,
  primary key (event_date, name)
);

-- ─────────────── 증가 함수 (service_role 로만 호출) ───────────────

create function bump_vote(d date, r text, m text, b text)
returns void language sql as $$
  insert into vote_counts(vote_date, region_code, menu_type, visit_bucket, count)
  values (d, r, m, b, 1)
  on conflict (vote_date, region_code, menu_type, visit_bucket)
  do update set count = vote_counts.count + 1;
$$;

create function bump_event(d date, n text)
returns void language sql as $$
  insert into event_counts(event_date, name, count) values (d, n, 1)
  on conflict (event_date, name) do update set count = event_counts.count + 1;
$$;

-- ─────────────── 집계 함수 ───────────────

-- 특정 칸의 메뉴별 표 합 (내림차순)
create function top_menus(d date, r text)
returns table(menu_type text, cnt bigint) language sql stable as $$
  select menu_type, sum(count)::bigint
  from vote_counts where vote_date = d and region_code = r
  group by menu_type order by sum(count) desc;
$$;

-- 접두(시도) 또는 전국('')의 메뉴별 표 합
create function top_menus_prefix(d date, p text)
returns table(menu_type text, cnt bigint) language sql stable as $$
  select menu_type, sum(count)::bigint
  from vote_counts where vote_date = d and region_code like p || '%'
  group by menu_type order by sum(count) desc;
$$;

-- 오늘 지도: 칸별 1위 메뉴/총표/동률 (총표 5 이상만)
create function map_today(d date)
returns table(region_code text, top_menu text, total bigint, tie boolean)
language sql stable as $$
  with sums as (
    select region_code, menu_type, sum(count)::bigint c
    from vote_counts where vote_date = d
    group by region_code, menu_type
  ),
  agg as (
    select region_code, sum(c) total, max(c) maxc
    from sums group by region_code
  )
  select a.region_code,
         (select s.menu_type from sums s
            where s.region_code = a.region_code and s.c = a.maxc
            order by s.menu_type limit 1),
         a.total,
         (select count(*) from sums s
            where s.region_code = a.region_code and s.c = a.maxc) > 1
  from agg a
  where a.total >= 5;
$$;

-- ─────────────── RLS: anon 전면 차단, service_role 만 통과 ───────────────
alter table vote_counts  enable row level security;
alter table event_counts enable row level security;
-- 정책을 만들지 않음 = anon/authenticated 읽기·쓰기 모두 거부.
-- 모든 읽기/쓰기는 Route Handler 에서 service_role 로 수행.
