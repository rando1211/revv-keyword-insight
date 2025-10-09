-- Create cron job to run the impact measurement function daily at 2 AM
SELECT cron.schedule(
  'measure-optimization-impact-daily',
  '0 2 * * *', -- Daily at 2 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://vplwrfapmvxffnrfywqh.supabase.co/functions/v1/measure-optimization-impact',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwbHdyZmFwbXZ4ZmZucmZ5d3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5ODA2MDcsImV4cCI6MjA2OTU1NjYwN30.E_USY2hokMeolB8Wqu032sLAKfw_4mxNPE1k6MKqb2M"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);