-- 0004_worker_details.sql
-- إضافة أعمدة التفاصيل للعاملات: الدول السابقة + نبذة تعريفية.
-- تُشغَّل يدوياً في Supabase Dashboard → SQL Editor.

alter table public.workers
  add column if not exists previous_countries text[] not null default '{}';

alter table public.workers
  add column if not exists bio text;
