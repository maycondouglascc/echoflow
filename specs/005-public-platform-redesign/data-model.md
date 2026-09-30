# Modelo de dados proposto

## Identidade

`auth.users` é a fonte de identidade do Supabase. Não duplicar senha nem tokens Google. Uma tabela de perfil só deve existir se um dado de perfil além do email fornecido por Auth se tornar necessário; nesta feature não é necessário.

## Playlist (`public.playlists`)

Campos: `id` UUID imutável; `slug` único; `title`; `description` opcional; `sort_order`; `published` booleano; timestamps. Inicialmente somente `voice-comparison` publicada. Leitura de itens publicados só para papel `authenticated`; escrita apenas de manutenção privilegiada, sem cliente.

## Frase (`public.phrases`)

Campos: `id` UUID imutável; `playlist_id` FK; `category`; `text`; `sort_order`; `published` booleano. Unicidade de `(playlist_id, sort_order)`; texto não vazio. Seed reproduz cinco frases e ordem da fixture atual.

## Variante de áudio (`public.audio_variants`)

Campos: `id` UUID; `phrase_id` FK; `model_id`; `voice_id`; `voice_label`; `format`; `storage_path` estável, não URL assinada; `sha256`; `provenance`; `word_timings` JSONB com intervalos de início/fim validados; `active` booleano. Unicidade de `(phrase_id, model_id, voice_id)`. Dez variantes ativas em duas escolhas aceitas; baselines eSpeak preservados como arquivados sem acesso na UI. Política de Storage permite acesso ao conteúdo publicado apenas por fluxo autenticado; bucket não público. Endpoint autenticado transmite bytes sem expor caminho/URL de objeto e sem cache público.

## Conclusão de playlist (`public.playlist_completions`)

Campos: `user_id` UUID FK para `auth.users`, `playlist_id` UUID FK, `completed_at` timestamptz; PK composta `(user_id, playlist_id)`. A interface solicita conclusão após a sessão local completar cada frase por gravação e comparação; o servidor valida sessão, playlist publicada e propriedade da linha, mas não afirma provar a execução física da gravação, que ocorre no navegador. A implementação deve impedir submissão arbitrária de `user_id`, assegurar idempotência e registrar somente a conclusão, não tentativas, áudio ou transcrições pessoais. RLS: somente `authenticated` com `user_id = auth.uid()` pode ler/inserir/atualizar sua linha; negar `anon` e acesso cruzado. Conclusão já registrada continua válida quando a pessoa revisita a playlist.

## Estados e transições

`not_completed` → `completed` após todos os cinco exercícios comparados na mesma sessão. Falha ao persistir mantém `not_completed` e oferece retry; repetição de conclusão é idempotente. Saída/expiração antes do fim descarta somente o progresso parcial em memória. A gravação pessoal continua em memória da página e é descartada ao sair/recarregar. Não há transição automática de `completed` para `not_completed` nesta feature.

## Migração e integridade

Migration inicial aditiva cria tabelas, índices, constraints, grants, policies e bucket privado. Seed sintética incorpora catálogo existente com IDs estáveis, checksums e alinhamentos. Importação dos binários é passo separado, verificado por checksum antes de mudar reprodução; não executar em produção sem autorização. Testes devem conferir cinco frases, dez variantes ativas, paths existentes, política de Storage e que a role anônima não lê tabelas, áudio nem conclusão. `service_role` não vale como prova de isolamento.
