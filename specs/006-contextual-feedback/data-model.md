# Data model

app_feedback: id uuid primary key (client request ID); user_id uuid FK auth.users ON DELETE CASCADE; message text 10–5000 trimmed characters; page_path allowlisted /home or /scenarios/slug; submitted_at server timestamptz; captured_at ISO browser instant; viewport JSON width/height (1–10000); navigation JSON array <=20 entries {path, action, at}; screenshot_path nullable text owner/id.png; request_sha256 hex64.

State: draft -> submitting -> success; failed -> retained draft retry. Edited request -> fresh UUID. Capture pending/ready/failed; attachments optional. Navigation append/prune in memory, snapshot on open, clear on account unmount. Immutable records, owned SELECT/INSERT only. Team accesses through existing privileged administrative tooling.

feedback-screenshots: private PNG-only bucket, 2 MiB maximum, names user-id/feedback-id.png. Own-folder SELECT/INSERT/DELETE; UPDATE denied. Database enforces owner-bound path. Backend validates PNG signature/IHDR dimensions before upload. File absence represented by null.
