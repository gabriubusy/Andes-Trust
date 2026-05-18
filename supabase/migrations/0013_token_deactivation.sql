-- RF-012: allow deactivating a traceability token (e.g. animal sold/dead)
alter table traceability_tokens
  add column if not exists deactivated_at  timestamptz,
  add column if not exists deactivation_reason text;

comment on column traceability_tokens.deactivated_at is 'When the public QR link was deactivated. NULL = still active.';
comment on column traceability_tokens.deactivation_reason is 'Human-readable reason: sold, deceased, error, etc.';
