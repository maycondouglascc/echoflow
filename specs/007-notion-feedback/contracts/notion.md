# Contract
Database: https://app.notion.com/p/e953e342cbd54be3a253d8f7289258ee
Data source: 173fea48-0b42-40cc-996f-14c762857aa1
Guide: https://app.notion.com/p/3ef805f1b4d781508d0dcdc5fe9c254f
Original properties: Feedback/title, Feedback ID/rich_text, Mensagem/rich_text, Página/rich_text, Recebido em/date, Capturado em/date, Usuário ID/rich_text, Viewport/rich_text, Contexto/rich_text, Screenshot/files.
Triage: Status/select, Prioridade/select, Categoria/select, Responsável/people, Notas Hermes/rich_text, Próxima ação/rich_text, Issue/url. Defaults Novo and Não definida. Worker never updates an existing page.
POST query by exact Feedback ID, page_size 2; >1 match is duplicate_remote. Create all original properties plus triage defaults in one POST pages. File upload create/send and uploaded state, files property file_upload attachment. Full data without markdown interpretation.
Worker environment: ECHOFLOW_FEEDBACK_SUPABASE_URL, ECHOFLOW_FEEDBACK_SERVICE_ROLE_KEY, NOTION_FEEDBACK_TOKEN, NOTION_FEEDBACK_DATA_SOURCE_ID (fixed destination). --check validates schema read-only; --once bounded 10 jobs; default continuous. Logs counters/error codes only. No browser or Next imports of queue client.

Views created and schema fetched/verified via connected Notion:
- Novos — triagem Hermes: view://3f0805f1-b4d7-8164-84b5-000ce3a74508
- Pipeline: view://3f0805f1-b4d7-81e9-ab2e-000c3edb697c
- Prioridade alta: view://3f0805f1-b4d7-813e-9cf6-000c2e950e18
No real feedback exported and no claim of Hermes permissions; token not configured.
