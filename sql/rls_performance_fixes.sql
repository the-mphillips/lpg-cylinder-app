-- Replace auth.* calls in RLS with (select auth.*()) to avoid per-row re-evaluation

-- app_settings policies
drop policy if exists app_settings_admin_all on public.app_settings;
create policy app_settings_admin_all on public.app_settings
  for all to authenticated
  using (
    (select coalesce((current_setting('request.jwt.claims', true))::jsonb->>'role','')) in ('Admin','Super Admin')
  )
  with check (
    (select coalesce((current_setting('request.jwt.claims', true))::jsonb->>'role','')) in ('Admin','Super Admin')
  );

drop policy if exists app_settings_read_branding on public.app_settings;
create policy app_settings_read_branding on public.app_settings
  for select to authenticated
  using (
    key in ('company_name','company_tagline','company_address','company_contact','primary_color','secondary_color','logo_light_url','logo_dark_url','favicon_url','logo_url','mark_url')
  );

-- reports admin policy
drop policy if exists reports_admin_all on public.reports;
create policy reports_admin_all on public.reports
  for all to authenticated
  using ((select coalesce((current_setting('request.jwt.claims', true))::jsonb->>'role','')) in ('Admin','Super Admin'))
  with check ((select coalesce((current_setting('request.jwt.claims', true))::jsonb->>'role','')) in ('Admin','Super Admin'));

-- users self policies
drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));


