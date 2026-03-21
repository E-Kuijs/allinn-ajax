drop policy if exists "chat_messages_update_self" on public.chat_messages;
create policy "chat_messages_update_self"
on public.chat_messages
for update
using (auth.uid() = user_id or public.current_user_is_admin())
with check (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "chat_messages_delete_self" on public.chat_messages;
create policy "chat_messages_delete_self"
on public.chat_messages
for delete
using (auth.uid() = user_id or public.current_user_is_admin());
