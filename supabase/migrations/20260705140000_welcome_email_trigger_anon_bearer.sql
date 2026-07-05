CREATE OR REPLACE FUNCTION public.notify_welcome_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform net.http_post(
    url := 'https://vxzholcypozuurmsmbub.supabase.co/functions/v1/welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- anon-key Bearer satisfies the gateway JWT check (verify_jwt);
      -- real authorization is the x-cron-secret checked inside the function
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4emhvbGN5cG96dXVybXNtYnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMDM2MjcsImV4cCI6MjA3NTg3OTYyN30.qn6tFm2I5HSP3X0XNa-dRoBYUmuuaemoKRGBs7wzNCg',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'edge_cron_secret')
    ),
    body := jsonb_build_object('id', NEW.id, 'email', NEW.email)
  );
  return NEW;
end;
$function$;
