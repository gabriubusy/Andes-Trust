-- =====================================================================
-- RF-008 — Estado del escrow on-chain por venta
-- =====================================================================

create type escrow_status as enum ('none','created','funded','released','refunded','failed');

alter table sales
  add column if not exists escrow_status   escrow_status not null default 'none',
  add column if not exists escrow_token    text,
  add column if not exists escrow_amount   numeric(38,0),
  add column if not exists escrow_buyer    text,
  add column if not exists escrow_seller   text,
  add column if not exists conditions_hash text,
  add column if not exists payload_hash    text,
  add column if not exists escrow_deadline timestamptz,
  add column if not exists escrow_create_tx  text,
  add column if not exists escrow_fund_tx    text,
  add column if not exists escrow_release_tx text,
  add column if not exists escrow_refund_tx  text;

create index if not exists sales_escrow_status_idx on sales(escrow_status);
