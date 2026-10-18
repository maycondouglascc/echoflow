# Research
- Decision: separate persistent worker, not frontend API or CI. Rationale: automatic retry/backfill without privileged client or hosting-plan cron dependency. Alternatives: inline send loses durable retries; Vercel schedule depends on plan; database HTTP hook alone lacks reconciliation.
- Decision: durable creation marker plus ID query. Rationale: Notion query is not atomic uniqueness and write 503 may have committed. Ambiguous calls cannot be blindly retried. No promise of automatic recovery from unknowable outcome.
- Decision: native file_upload, not public Storage URL. Rationale: accepted private screenshot requirement; <=2MiB app limit fits free Notion 5MiB.
- Sources: https://developers.notion.com/reference/versioning ; https://developers.notion.com/reference/query-a-data-source ; https://developers.notion.com/reference/request-limits ; https://developers.notion.com/guides/data-apis/uploading-small-files . API research delegated per Spec Kit plan; primary sources only.
