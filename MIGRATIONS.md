# Supabase Migrations Playbook

Use this flow every time to avoid version conflicts.

## Standard Flow

1. Pull latest code:
   - `git pull`
2. Check migration state:
   - `supabase migration list`
3. Create a new migration with CLI:
   - `supabase migration new short_description`
4. Put SQL in the new file under `supabase/migrations`.
5. Optional local validation:
   - `supabase db reset`
6. Push to remote:
   - `supabase db push`
7. Verify local/remote match:
   - `supabase migration list`

## Rules (Important)

- Never rename a migration after it has been applied remotely.
- Never edit old applied migrations.
- Always create a new fix migration instead.
- Let one person run `supabase db push` at a time.
- Do not paste file paths in SQL editor. Paste SQL content.

## Naming

- Always create migrations with `supabase migration new ...`.
- This generates a unique timestamp version.
- Avoid manual names like only `20260310_...` (can collide).

## If You Get a Mismatch Error

1. Check status:
   - `supabase migration list`
2. Repair only the mismatched version(s):
   - `supabase migration repair --status reverted <version>`
   - `supabase migration repair --status applied <version>`
3. Push again:
   - `supabase db push --debug`

## Quick Troubleshooting

- Error: `duplicate key value violates unique constraint "schema_migrations_pkey"`
  - Cause: duplicate migration version.
  - Fix: ensure each file has unique timestamp version and repair history.

- Error: `Remote migration versions not found in local migrations directory`
  - Cause: local/remote history mismatch.
  - Fix: `migration repair` + `migration list` until both columns align.

- SQL editor error when running file path
  - Cause: path is not SQL.
  - Fix: run SQL content in editor, or use `supabase db push`.
