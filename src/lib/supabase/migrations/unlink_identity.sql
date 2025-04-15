-- Function to unlink a user's identity from a specific provider
-- This should be executed in Supabase SQL Editor with admin privileges
-- or uploaded as a migration

-- Note: This requires auth.identities access which is restricted
-- Paste this into the Supabase SQL Editor to create the function

create or replace function unlink_identity(user_id uuid, identity_provider text)
returns json
language plpgsql
security definer -- Run with privileges of the function creator
as $$
declare
  identity_id uuid;
  identity_count int;
  result json;
begin
  -- Only allow for users with multiple identity providers to prevent lockout
  select count(*) into identity_count
  from auth.identities
  where user_id = $1;
  
  if identity_count <= 1 then
    return json_build_object(
      'success', false,
      'message', 'Cannot unlink the only identity provider. User would be locked out.'
    );
  end if;
  
  -- Find the identity ID to delete
  select id into identity_id
  from auth.identities
  where user_id = $1 and provider = $2;
  
  if identity_id is null then
    return json_build_object(
      'success', false,
      'message', 'Identity not found'
    );
  end if;
  
  -- Delete the identity
  delete from auth.identities
  where id = identity_id and user_id = $1;
  
  return json_build_object(
    'success', true,
    'message', 'Identity successfully unlinked'
  );
exception
  when others then
    return json_build_object(
      'success', false,
      'message', 'Error unlinking identity: ' || SQLERRM
    );
end;
$$; 