-- meokdo 초기 스키마 (SPEC §2)
-- 저장 원칙: 좌표·주소·카카오 상호명은 저장하지 않는다. 상호명은 사용자 입력. (DECISIONS #6)

-- ─────────────────────────────── 테이블 ───────────────────────────────

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  home_region_code text,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_name text not null check (char_length(place_name) between 1 and 60), -- 사용자 입력
  region_code text not null,                 -- Turf 판정 결과
  boundary_version date not null,            -- 판정에 쓴 경계 기준일
  kakao_place_id text,                       -- (선택) 약관상 저장 허용. 중복감지·딥링크
  kakao_url text,                            -- (선택) 저장 허용
  rating smallint not null check (rating between 1 and 5),
  memo text not null check (char_length(memo) between 1 and 200),
  menu text,
  visited_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index records_user_place_uq
  on records(user_id, kakao_place_id) where kakao_place_id is not null;
create index records_user_region_idx on records(user_id, region_code);

create table record_photos (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references records(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index record_photos_record_idx on record_photos(record_id, sort_order);

create table events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index events_name_created_idx on events(name, created_at);

create table regions (
  code text primary key,
  name text not null,
  full_name text not null,
  sido_code text not null,
  sido_name text not null,
  has_gu boolean not null default false,
  boundary_version date not null
);

-- ─────────────────────────────── 함수 / 트리거 ───────────────────────────────

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger records_touch before update on records
  for each row execute function touch_updated_at();

create function enforce_photo_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from record_photos where record_id = new.record_id) >= 5 then
    raise exception 'photo limit (5) exceeded for record %', new.record_id;
  end if;
  return new;
end $$;

create trigger record_photos_limit before insert on record_photos
  for each row execute function enforce_photo_limit();

-- store_count -> stage (TS toStage() 와 동일하게 유지)
create function region_stage(cnt int) returns int language sql immutable as $$
  select case
    when cnt <= 0 then 0 when cnt <= 5 then 1 when cnt <= 10 then 2
    when cnt <= 15 then 3 when cnt <= 20 then 4 else 5 end
$$;

-- ─────────────────────────────── 집계 뷰 ───────────────────────────────

-- 가게당 1기록이므로 region별 기록 수 = 서로 다른 가게 수
create view v_region_counts with (security_invoker = true) as
  select user_id, region_code, count(*)::int as store_count
  from records
  group by user_id, region_code;

-- ─────────────────────────────── RLS ───────────────────────────────

alter table profiles      enable row level security;
alter table records       enable row level security;
alter table record_photos enable row level security;
alter table events        enable row level security;
alter table regions       enable row level security;

create policy own_profiles on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy own_records on records
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_photos on record_photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_events_insert on events
  for insert with check (user_id = auth.uid());
create policy own_events_select on events
  for select using (user_id = auth.uid());
create policy regions_read on regions
  for select using (true);

-- Storage 버킷 record-photos(비공개) 정책은 버킷 생성 후 적용:
-- create policy photos_own on storage.objects for all
--   using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text)
--   with check (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text);
