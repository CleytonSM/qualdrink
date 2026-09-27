# Aceite da fase 5 — QualDrink v1

Data: 2026-09-27.

O roteiro da seção 10 foi executado no SQLite e no projeto Supabase `yyhxqasurvmaxeqrxffu`. Não havia aparelho Android com Expo Go nesta sessão, então os gestos da interface não foram repetidos no Expo Go. Os textos, as cores e o aviso de câmera foram conferidos no código das telas.

Comando: `npx tsx scripts/aceite-fase-5.ts`. Os 27 testes de unidade passaram e `npx tsc --noEmit` passou.

## Critérios

| Critério | Resultado | Evidência |
| --- | --- | --- |
| AC-001 | passou | Primeiro banco local lista 14 drinks, com Caipirinha e Limonada suíça. |
| AC-002 | passou | `gin` acha Gin tônica, `suica` acha Limonada suíça, `xyz` não acha drink. |
| AC-003 | passou | Identificação sem marcas não devolve drink. A tela mostra `Selecione ao menos um ingrediente`. |
| AC-004 | passou | Cachaça, Limão, Açúcar e Gelo colocam Caipirinha em primeiro, 4 de 4, 100%. |
| AC-005 | passou | Só Limão e Açúcar deixam Caipirinha acima de Gin tônica. |
| AC-006 | passou | Favorito da Caipirinha continua depois de fechar e reabrir o arquivo SQLite. |
| AC-007 | passou na API | Upsert em `favorites` com o `user_id` da conta e `deleted_at` nulo. O cadastro pelo aplicativo ainda não devolve sessão; ver desvio abaixo. |
| AC-008 | passou | Segunda sessão da mesma conta lê a Caipirinha. O pull local, com `deleted_at` nulo, deixa o drink visível. |
| AC-009 | passou | Depois do upsert com `deleted_at`, a linha remota fica tombstone e a lista local não mostra a Caipirinha. |
| AC-010 | passou | Busca, identificação e favorito concluem no SQLite sem rede. |
| AC-011 | passou | Senha `123` devolve `A senha precisa ter ao menos 6 caracteres` antes do Auth. |
| AC-012 | conferido no código | A aba Identificar mostra `Identificar pela câmera chega no 2º bimestre`, sem `onPress` e sem permissão de câmera. |
| AC-013 | passou | A chave do cliente é publishable. `INSERT` em `drinks`, `ingredients` e `drink_ingredients` com usuário autenticado responde `42501`. |
| AC-014 | conferido no código | Fundo `#0E0C0B`, título do drink em Fraunces, botão principal `#FF2E63`. |

## Seção 10

1. AC-001 a AC-014 passam no caminho de dados. O roteiro de toque no Expo Go Android não rodou nesta sessão.
2. O SQLite tem `ingredients`, `drinks`, `drink_ingredients`, `favorites` e `local_meta`. A identificação usa o `JOIN` com `GROUP BY` da seção 4.7.
3. O PostgreSQL tem as quatro tabelas, RLS ligado, catálogo só com `SELECT` para `authenticated`, e `favorites` com `SELECT`, `INSERT` e `UPDATE` restritos a `auth.uid()`. Não há `DELETE` para o cliente.
4. `.env` está no `.gitignore` e não aparece no índice do git. A service role não está no cliente.
5. O aviso de câmera está na aba Identificar. O `package.json` não tem biblioteca de visão computacional.
6. Os 14 drinks, 24 ingredientes e 59 doses da seção 4.8 existem no seed local e no PostgreSQL.
7. O advisor de segurança não aponta tabela `public` sem RLS. O aviso restante é `auth_leaked_password_protection`, que não é RLS.

## Desvio

CON-007 não está verdadeiro no projeto hospedado. O `supabase/config.toml` deixa `enable_confirmations = false`, mas o Auth remoto ainda exige confirmação de e-mail. `signUp` cria o usuário e devolve sessão nula. Na aba Conta, `Criar conta` então mostra `E-mail ou senha incorretos` e não chama o sync.

Para fechar o roteiro no Expo Go: em Authentication, no provedor Email, desligar a confirmação de e-mail. O próximo cadastro precisa devolver sessão na hora. A conta de teste usada nesta verificação foi apagada.
