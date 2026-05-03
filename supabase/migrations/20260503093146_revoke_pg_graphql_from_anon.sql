-- Reduce pg_graphql exposure to the anon role.
--
-- Background
-- ----------
-- Supabase Security Advisor warns `pg_graphql_anon_table_exposed` for every
-- table the anon role has SELECT on (DIS-176, parent DIS-174). pg_graphql
-- exposes those tables through `/graphql/v1` introspection: row data is
-- still protected by RLS, but table names, columns, and relationships leak.
--
-- Intended approach (closing pg_graphql at the schema level by revoking
-- USAGE/EXECUTE on `graphql` and `graphql_public` from anon) is not viable:
-- those grants are owned by `supabase_admin`, and the migration role
-- (`postgres`) cannot revoke or `SET ROLE supabase_admin`. The Supabase
-- event trigger `issue_pg_graphql_access` also re-grants on every pg_graphql
-- DDL, and we cannot disable it for the same reason.
--
-- What this migration does
-- ------------------------
-- Revoke all privileges from anon on tables where no anon RLS policy
-- exists. The application never reads these tables as anon (verified via
-- code search and `pg_policies`); the GRANTs were only present because
-- Supabase grants table privileges to anon by default. After this change,
-- `pg_graphql` will no longer surface them in introspection.
--
-- Tables intentionally NOT touched here:
--   * `guilds`           - has `anon_can_read_public_guilds` policy (public calendar)
--   * `service_health`   - has `allow_read_service_health` policy (public status)
--   * `events`           - has `anon_can_read_public_events` policy (public calendar)
--                          (not in DIS-176 list because column-level grants are
--                          already restricted via `restrict_anon_event_columns`).
-- These remain reachable via PostgREST and stay as expected pg_graphql exposures.

REVOKE ALL ON TABLE
  public.event_attendees,
  public.event_poll_options,
  public.event_poll_votes,
  public.event_polls,
  public.event_settings,
  public.guild_config,
  public.ics_feed_tokens,
  public.sent_notifications,
  public.user_guilds
FROM anon;
