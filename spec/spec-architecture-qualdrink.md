---
title: QualDrink v1 — arquitetura, dados, interface e sincronização
version: 1.0
date_created: 2026-09-27
last_updated: 2026-09-27
owner: Equipe QualDrink
tags: [architecture, design, app, mobile]
---

# Introduction

Esta especificação define a primeira versão do QualDrink, aplicativo mobile em que a pessoa descobre a receita de um drink pelo nome ou pelos ingredientes que reconhece. Ela é a fonte única para as fases de implementação. Visão computacional fica fora desta versão e entra só no 2º bimestre, sem mudar o modelo de dados nem a navegação definidos aqui.

## 1. Purpose & Scope

### Purpose

Definir requisitos, contratos de dados, interface, regras de sincronização e critérios de aceite da versão 1, de forma que uma fase de implementação possa ser executada sem decisões de produto em aberto.

### In scope

- Aplicativo React Native com Expo SDK 57 e Expo Router.
- Quatro abas: Buscar, Identificar, Favoritos, Conta. Uma tela de receita.
- Catálogo fixo de drinks e ingredientes, legível offline.
- Identificação manual: a pessoa marca ingredientes e o aplicativo ordena drinks pela cobertura.
- Favoritos gravados no aparelho e sincronizados com a conta.
- Autenticação por e-mail e senha.
- Persistência local com Expo SQLite e persistência online com Supabase (PostgreSQL).
- Tema escuro único, definido por tokens nesta especificação.

### Out of scope

- Câmera, permissão de câmera, galeria, visão computacional, código de barras e reconhecimento de garrafa ou copo.
- Criação ou edição de receitas pelo usuário.
- Estoque pessoal de garrafas, notas, avaliações, comentários e compartilhamento.
- Notificações push, tema claro e idiomas além de pt-BR.
- Histórico de identificações.

### Audience

Quem implementar, revisar ou testar o QualDrink v1. A interface exibida à pessoa usuária está em português do Brasil.

### Assumptions

- O catálogo da versão 1 é o conjunto fechado da seção 4. Os mesmos identificadores existem no seed local e no PostgreSQL.
- Há um projeto Supabase com Auth por e-mail e senha. A confirmação de e-mail está desligada, para o cadastro devolver sessão imediata.
- A pessoa pode usar busca, identificação e favoritos sem conta. A conta existe para sincronizar favoritos e atualizar o catálogo.
- Um aparelho tem no máximo uma sessão Supabase por vez.

## 2. Definitions

| Termo | Definição |
| --- | --- |
| Drink | Receita do catálogo: nome, categoria, descrição, passos e lista de ingredientes com dose. |
| Ingrediente | Item marcado na identificação e listado na receita. A identificação compara presença, não quantidade. |
| Catálogo | Conjunto somente leitura de `ingredients`, `drinks` e `drink_ingredients`. |
| Identificação | Seleção em memória de ingredientes. Não é gravada no banco. |
| Cobertura | Para um drink, `matched / total`, em que `total` é a quantidade de ingredientes da receita e `matched` é quantos desses estão selecionados. |
| Favorito | Vínculo entre uma conta (ou o aparelho, antes do login) e um drink. |
| Tombstone | Favorito com `deleted = 1`. Continua no banco para o sync não recriar o item. |
| Fold | Forma de busca do nome: minúsculas, sem acento, sem espaços nas pontas. |
| Seed | Carga inicial do catálogo, idêntica no SQLite e no PostgreSQL. |
| Sessão | Sessão Supabase Auth persistida no aparelho. |
| Publishable key | Chave pública do projeto Supabase enviada ao cliente. Também chamada de anon key em projetos antigos. |
| RLS | Row Level Security do PostgreSQL, obrigatória nas tabelas expostas. |
| pt-BR | Português do Brasil, único idioma da interface. |

## 3. Requirements, Constraints & Guidelines

### Product

- **REQ-001**: O aplicativo resolve um problema explícito: a pessoa não sabe o nome ou o preparo de um drink e obtém a receita pelo nome ou pelos ingredientes reconhecidos.
- **REQ-002**: Buscar lista drinks do catálogo local e filtra pelo texto digitado, comparado a `name_folded`.
- **REQ-003**: A busca é insensível a maiúsculas e a acentos. `caipirinha`, `Caipirinha` e `CAIPIRINHA` retornam o mesmo drink. `limonada suica` encontra `Limonada suíça`.
- **REQ-004**: Identificar exibe todos os ingredientes do catálogo, agrupados por categoria, e permite marcar e desmarcar.
- **REQ-005**: Com ao menos um ingrediente marcado, Identificar lista drinks com `matched >= 1`, ordenados por cobertura decrescente, depois por `matched` decrescente, depois por `name` crescente.
- **REQ-006**: Cada resultado de identificação mostra o nome, `matched` de `total` e a cobertura em percentual inteiro (`round(100 * matched / total)`).
- **REQ-007**: A seleção de ingredientes vive só em memória. Fechar o processo do aplicativo descarta a seleção. Trocar de aba não descarta.
- **REQ-008**: A tela de receita mostra nome, categoria, descrição, doses e passos, e permite favoritar e desfavoritar.
- **REQ-009**: Favoritar grava no SQLite antes de qualquer rede. Desfavoritar grava tombstone no SQLite antes de qualquer rede.
- **REQ-010**: Sem sessão, busca, identificação, receita e favoritos funcionam com o seed local.
- **REQ-011**: Com sessão, favoritos locais pendentes sobem ao PostgreSQL e favoritos remotos dessa conta descem ao SQLite.
- **REQ-012**: Com sessão, o catálogo remoto faz upsert no SQLite pelos `id` estáveis. Linhas locais ausentes no remoto não são apagadas nesta versão.
- **REQ-013**: Falha de rede não apaga dados locais nem bloqueia busca, identificação ou favoritos.
- **REQ-014**: A aba Identificar mostra um aviso não interativo: `Identificar pela câmera chega no 2º bimestre`.
- **REQ-015**: A interface visível está em pt-BR.

### Navigation

- **REQ-020**: Há quatro abas, nesta ordem: Buscar, Identificar, Favoritos, Conta.
- **REQ-021**: Tocar um drink em Buscar, Identificar ou Favoritos abre a receita desse `id`. Voltar retorna à aba de origem.
- **REQ-022**: Favoritos lista somente linhas visíveis com `deleted = 0`. A lista vazia mostra `Nenhum favorito ainda`.
- **REQ-023**: Busca sem resultado mostra `Nenhum drink com esse nome`.
- **REQ-024**: Identificar sem seleção mostra `Selecione ao menos um ingrediente` e não lista drinks.
- **REQ-025**: Identificar sem drink com `matched >= 1` mostra `Nenhum drink usa esses ingredientes`.

### Account

- **REQ-030**: Conta oferece cadastro e entrada com e-mail e senha, e saída quando há sessão.
- **REQ-031**: Senha com menos de 6 caracteres é recusada antes do pedido de rede, com a mensagem `A senha precisa ter ao menos 6 caracteres`.
- **REQ-032**: E-mail sem `@` é recusado antes do pedido de rede, com a mensagem `E-mail inválido`.
- **REQ-033**: Credencial recusada pelo Auth mostra `E-mail ou senha incorretos`. Falha de rede na conta mostra `Sem conexão. Tente de novo.`
- **REQ-034**: Conta autenticada mostra o e-mail, o resultado do último sync e um botão `Sincronizar`.
- **REQ-035**: Sair encerra a sessão e mantém o SQLite. Os favoritos da última conta continuam visíveis.
- **REQ-036**: No primeiro login de uma conta neste aparelho, favoritos com `user_id` nulo passam a pertencer a essa conta e entram na fila de sync. Favoritos já marcados com outro `user_id` não são enviados nem exibidos para a conta atual.

### Local database

- **REQ-040**: Na primeira abertura, o aplicativo cria o schema SQLite da seção 4 e, se `drinks` estiver vazio, insere o seed.
- **REQ-041**: Busca, identificação, receita e favoritos leem e gravam somente pelo SQLite no caminho de interface. A tela não consulta o Supabase para renderizar lista ou receita.
- **REQ-042**: A identificação executa a consulta SQL da seção 4 no SQLite, com `JOIN` e agregação. A ordenação não é feita só em memória sobre um `SELECT *` sem filtro relacional.

### Online database

- **REQ-050**: O PostgreSQL contém as quatro tabelas da seção 4, com chave primária e chaves estrangeiras declaradas.
- **REQ-051**: RLS está ligado em todas as tabelas de `public` usadas pelo aplicativo. Não existe política `USING (true)` para escrita.
- **REQ-052**: Catálogo (`ingredients`, `drinks`, `drink_ingredients`) permite `SELECT` ao papel `authenticated` e não permite `INSERT`, `UPDATE` nem `DELETE` a esse papel.
- **REQ-053**: `favorites` permite `SELECT`, `INSERT` e `UPDATE` somente quando `user_id = auth.uid()`. Não há `DELETE` físico pelo cliente; desfavoritar é `UPDATE` de `deleted_at`.
- **REQ-054**: O seed do catálogo no PostgreSQL usa os mesmos `id` do seed local.

### Sync

- **REQ-060**: Sync roda somente com sessão ativa, nestes momentos: depois de entrar ou cadastrar, ao tocar `Sincronizar`, ao voltar o aplicativo para primeiro plano, e depois de alterar um favorito se já houver sessão.
- **REQ-061**: O sync de favoritos segue a ordem da seção 4: enviar pendências, marcar `pending_sync = 0` só após sucesso de cada linha, depois baixar a conta.
- **REQ-062**: Conflito de favorito usa `updated_at`. O valor mais novo vence. Empate favorece o remoto no pull.
- **REQ-063**: A Conta mostra `Sincronizado` com data e hora locais após sucesso, ou `Não sincronizado` com o último erro após falha. O texto de erro não inclui chave, token nem corpo cru de resposta HTTP.

### Visual design

- **REQ-070**: O tema é único e escuro. Não há alternância para tema claro.
- **REQ-071**: Cores, tipo e raios vêm dos tokens da seção 4. Componentes não declaram hexadecimal solto fora do módulo de tema.
- **REQ-072**: Nome de drink e título de aba usam Fraunces. Demais textos usam Outfit.
- **REQ-073**: O fundo da splash screen é `#0E0C0B`. A primeira pintura espera as fontes, sobre esse fundo.
- **REQ-074**: O acento `#FF2E63` aparece em ação principal, aba ativa e favorito ativo. Doses, chip selecionado e percentual de cobertura usam `#F0B429`.

### Security

- **SEC-001**: O cliente contém apenas a URL do projeto e a publishable key. A secret key e a service role não entram no repositório do aplicativo nem em variável `EXPO_PUBLIC_`.
- **SEC-002**: Autorização no PostgreSQL usa `auth.uid()` contra a coluna `user_id`. `user_metadata` e `raw_user_meta_data` não entram em política RLS.
- **SEC-003**: Senha não é gravada no SQLite, em log, nem em mensagem de erro.
- **SEC-004**: A sessão fica em armazenamento seguro do aparelho (`expo-secure-store`), não em texto plano no SQLite.

### Constraints

- **CON-001**: Cliente mobile em React Native com Expo SDK 57 (estável). Expo SDK 58 beta não é alvo desta versão.
- **CON-002**: Armazenamento local é Expo SQLite, com tabelas, índices e SQL explícito. Não substitui o banco por armazenamento chave-valor.
- **CON-003**: Persistência online é Supabase sobre PostgreSQL. Não há segundo backend.
- **CON-004**: Navegação é Expo Router, com rotas de arquivo. Não há um navigator paralelo fora do Router.
- **CON-005**: Esta versão não chama API de câmera, não pede permissão de câmera e não adiciona biblioteca de visão computacional.
- **CON-006**: Identificadores de catálogo são texto estável (slug). Não são UUID gerado no cliente.
- **CON-007**: Confirmação de e-mail do Auth permanece desligada neste projeto, para o cadastro obter sessão na hora.
- **CON-008**: O aplicativo funciona no Expo Go do SDK 57 em Android. iOS é desejável e não é critério de bloqueio da versão 1.

### Guidelines

- **GUD-001**: Módulos de banco, sync, seed e tema ficam fora das telas. A tela chama funções nomeadas na seção 4.
- **GUD-002**: Texto de interface mora junto da tela que o exibe, em pt-BR, sem framework de i18n nesta versão.
- **GUD-003**: Migration SQL do PostgreSQL é gerada pelo fluxo oficial do Supabase (`supabase migration new`), com RLS e políticas no mesmo arquivo do schema.
- **GUD-004**: Depois do schema online, rodar os advisors de segurança do Supabase e corrigir achados de RLS antes de encerrar a fase correspondente.

### Patterns

- **PAT-001**: Escrita local primeiro. Rede é consequência do sync, nunca pré-condição para favoritar.
- **PAT-002**: Catálogo é imutável para o cliente. Mudança de receita nesta versão é mudança de seed e de migration, nos dois lados, com o mesmo `id`.
- **PAT-003**: Desfavoritar não apaga a linha. Atualiza tombstone e `updated_at`.

### Academic traceability

Estes itens existem para a avaliação do 1º bimestre. Cada um é coberto pelos requisitos acima.

| Critério | Pontos | Requisitos |
| --- | --- | --- |
| React Native + Expo, interface e navegação funcionais | 2,0 | REQ-020, REQ-021, REQ-070 a REQ-074, CON-001, CON-004 |
| Expo SQLite para armazenamento local | 3,0 | REQ-040 a REQ-042, REQ-009, CON-002 |
| Supabase/PostgreSQL para persistência online | 3,0 | REQ-050 a REQ-054, REQ-060 a REQ-063, SEC-001, SEC-002 |
| Proposta coerente para um problema real | 2,0 | REQ-001 a REQ-008, REQ-014 |

## 4. Interfaces & Data Contracts

### 4.1 Module boundaries

| Módulo | Responsabilidade |
| --- | --- |
| `src/theme/colors.ts` | Tokens de cor. Único lugar com hexadecimal. |
| `src/theme/typography.ts` | Famílias Fraunces e Outfit e tamanhos. |
| `src/data/fold.ts` | Função pura `foldName(value: string): string`. |
| `src/data/seed.ts` | Catálogo canônico exportado como dados tipados. |
| `src/db/client.ts` | Abre o banco `qualdrink.db`, cria schema e índices, grava seed se `drinks` estiver vazio. |
| `src/db/queries.ts` | Busca, identificação, leitura de receita, favoritos. |
| `src/supabase/client.ts` | Cliente Supabase com persistência de sessão em secure store. |
| `src/sync/sync.ts` | `syncAll(userId: string): Promise<SyncResult>`. |
| `app/(tabs)/index.tsx` | Aba Buscar. |
| `app/(tabs)/identificar.tsx` | Aba Identificar. |
| `app/(tabs)/favoritos.tsx` | Aba Favoritos. |
| `app/(tabs)/conta.tsx` | Aba Conta. |
| `app/drink/[id].tsx` | Receita. |
| `supabase/migrations/` | Schema PostgreSQL, RLS e seed remoto. |

### 4.2 Routes

| Rota | Nome na tab bar | Função |
| --- | --- | --- |
| `/(tabs)` index | Buscar | Campo de busca e lista. |
| `/(tabs)/identificar` | Identificar | Chips e resultados. |
| `/(tabs)/favoritos` | Favoritos | Lista de favoritos visíveis. |
| `/(tabs)/conta` | Conta | Auth e estado de sync. |
| `/drink/[id]` | sem tab | Receita. `id` inexistente mostra `Drink não encontrado`. |

### 4.3 Visual tokens

Cores:

| Token | Hex | Uso |
| --- | --- | --- |
| `background` | `#0E0C0B` | Fundo de tela, tab bar, splash |
| `surface` | `#1A1614` | Cartão de drink |
| `surfaceRaised` | `#26211C` | Campo de texto e chip em repouso |
| `text` | `#F6F0E8` | Texto principal |
| `textMuted` | `#A39890` | Texto secundário e aba inativa |
| `border` | `#342C28` | Borda de cartão e campo |
| `accent` | `#FF2E63` | Botão principal, aba ativa, favorito ativo |
| `amber` | `#F0B429` | Dose, chip selecionado, percentual de cobertura |

Tipo:

| Papel | Família | Tamanho | Peso |
| --- | --- | --- | --- |
| Título de drink e título de tela | Fraunces | 28 | 600 |
| Nome de drink em lista | Fraunces | 22 | 600 |
| Corpo e passos | Outfit | 16 | 400 |
| Rótulo, aba, chip | Outfit | 14 | 600 |
| Percentual de cobertura | Outfit | 22 | 600 |

Raios: cartão `16`, campo `12`, chip e botão `999`. Padding horizontal de tela `16`. Espaço entre cartões `12`.

Status bar com conteúdo claro. Tab bar usa `background`, ícone e rótulo ativos em `accent`, inativos em `textMuted`.

### 4.4 Name folding

`foldName` aplica, nesta ordem:

1. Normalização Unicode NFD.
2. Remoção dos code points de marca combinante (`\p{M}`).
3. `trim`.
4. Conversão para minúsculas com locale invariante (`toLowerCase`, sem regra específica de turco).

`name_folded` é persistido. A interface não recalcula o fold lendo acentos na SQL.

### 4.5 PostgreSQL

```sql
create table public.ingredients (
  id text primary key,
  name text not null,
  name_folded text not null,
  category text not null check (
    category in ('destilado', 'citrico', 'mixer', 'adocante', 'fruta', 'outro')
  )
);

create table public.drinks (
  id text primary key,
  name text not null,
  name_folded text not null,
  category text not null check (
    category in ('brasileiro', 'classico', 'sem_alcool')
  ),
  description text not null,
  steps_json text not null,
  alcoholic boolean not null
);

create table public.drink_ingredients (
  drink_id text not null references public.drinks (id),
  ingredient_id text not null references public.ingredients (id),
  amount text not null,
  unit text not null,
  primary key (drink_id, ingredient_id)
);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  drink_id text not null references public.drinks (id),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  primary key (user_id, drink_id)
);

create index drink_ingredients_ingredient_idx
  on public.drink_ingredients (ingredient_id);
create index favorites_user_idx
  on public.favorites (user_id);
```

`steps_json` é um array JSON de strings. Cada string é um passo, já na ordem de preparo. Exemplo: `["Corte o limão.","Misture no copo."]`

RLS:

- `ingredients`, `drinks`, `drink_ingredients`: policy de `SELECT` para `authenticated` com `using (true)`. Sem policies de escrita para `authenticated` ou `anon`.
- `favorites`: policies de `SELECT`, `INSERT` e `UPDATE` para `authenticated` com `using (user_id = auth.uid())` e `with check (user_id = auth.uid())`. `UPDATE` exige policy de `SELECT`, senão o Postgres não altera a linha.

O seed remoto é inserido pela migration, com os `id` da seção 4.8. O cliente não insere catálogo.

### 4.6 SQLite

Tipos locais: texto e inteiro. Boolean vira `0` ou `1`. Instantes viram epoch em milissegundos.

```sql
create table ingredients (
  id text primary key not null,
  name text not null,
  name_folded text not null,
  category text not null
);

create table drinks (
  id text primary key not null,
  name text not null,
  name_folded text not null,
  category text not null,
  description text not null,
  steps_json text not null,
  alcoholic integer not null
);

create table drink_ingredients (
  drink_id text not null,
  ingredient_id text not null,
  amount text not null,
  unit text not null,
  primary key (drink_id, ingredient_id)
);

create table favorites (
  drink_id text primary key not null,
  user_id text,
  created_at integer not null,
  updated_at integer not null,
  pending_sync integer not null,
  deleted integer not null
);

create table local_meta (
  key text primary key not null,
  value text not null
);

create index drink_ingredients_ingredient_idx
  on drink_ingredients (ingredient_id);
create index drinks_name_folded_idx
  on drinks (name_folded);
```

Chaves de `local_meta`:

| key | value |
| --- | --- |
| `schema_version` | `1` |
| `last_user_id` | UUID da última sessão, ou ausente |
| `last_sync_at` | Epoch ms do último sync completo com sucesso, ou ausente |
| `last_sync_error` | Mensagem pt-BR da última falha, ou ausente. Limpa no sucesso. |

`favorites.drink_id` é a chave primária local porque a tela mostra um conjunto de favoritos por aparelho filtrado pela conta. O par remoto continua `(user_id, drink_id)`.

### 4.7 Query contracts

Assinaturas que as telas podem chamar:

```text
searchDrinks(term: string): DrinkListItem[]
identifyDrinks(ingredientIds: string[]): IdentifyHit[]
getDrink(id: string): DrinkDetail | null
listIngredients(): Ingredient[]
listVisibleFavorites(viewerUserId: string | null): DrinkListItem[]
listIngredientNamesByDrink(): Map<string, { id, name }[]>
setFavorite(drinkId: string, favorite: boolean, viewerUserId: string | null): void
claimAnonymousFavorites(userId: string): void
```

`viewerUserId` é o id da sessão ou, sem sessão, `last_user_id`. Se ambos faltam, o filtro de favoritos visíveis é `user_id is null`.

`DrinkListItem`: `id`, `name`, `category`, `alcoholic`.

`DrinkDetail`: `DrinkListItem` mais `description`, `steps: string[]`, `ingredients: { id, name, amount, unit }[]`, `isFavorite: boolean`.

`IdentifyHit`: `DrinkListItem` mais `matched: number`, `total: number`, `coveragePercent: number`.

`Ingredient`: `id`, `name`, `category`.

`SyncResult`: `{ ok: true, syncedAt: number } | { ok: false, message: string }`.

`listIngredientNamesByDrink` lê `drink_ingredients` com `JOIN` em `ingredients`, na ordem da receita. Buscar e Favoritos usam essa leitura para mostrar, em cada linha, os ingredientes do drink sem o gelo. Em Buscar, a categoria vira cabeçalho de seção (Brasileiro, Clássico, Sem álcool).

Busca, termo vazio após `trim` retorna todos os drinks ordenados por `name` crescente.

Busca, termo não vazio: `where name_folded like '%' || foldName(term) || '%'`.

Identificação, SQL obrigatório (os ids entram como placeholders, nunca por concatenação de string da interface):

```sql
select
  d.id,
  d.name,
  d.category,
  d.alcoholic,
  sum(case when di.ingredient_id in (/* placeholders */) then 1 else 0 end) as matched,
  count(di.ingredient_id) as total
from drinks d
join drink_ingredients di on di.drink_id = d.id
group by d.id
having matched >= 1
order by (matched * 1.0 / total) desc, matched desc, d.name asc;
```

`setFavorite(id, true)` insere ou reativa a linha: `deleted = 0`, `pending_sync = 1`, `updated_at = agora`, `created_at` preservado se a linha já existe. `user_id` fica nulo sem sessão; com sessão, recebe o id da sessão.

`setFavorite(id, false)` em linha existente: `deleted = 1`, `pending_sync = 1`, `updated_at = agora`. Sem linha existente, não cria tombstone.

Favorito visível:

```sql
select d.*
from favorites f
join drinks d on d.id = f.drink_id
where f.deleted = 0
  and (
    (? is null and f.user_id is null)
    or f.user_id = ?
  )
order by f.updated_at desc;
```

O mesmo `viewerUserId` ocupa os dois placeholders. Nulo casa só linhas anônimas.

### 4.8 Canonical catalog

Categorias de ingrediente exibidas nesta ordem: Destilado, Cítrico, Mixer, Adoçante, Fruta, Outros.

| category | Rótulo |
| --- | --- |
| `destilado` | Destilado |
| `citrico` | Cítrico |
| `mixer` | Mixer |
| `adocante` | Adoçante |
| `fruta` | Fruta |
| `outro` | Outros |

Rótulos de drink:

| category | Rótulo | `alcoholic` |
| --- | --- | --- |
| `brasileiro` | Brasileiro | 1 |
| `classico` | Clássico | 1 |
| `sem_alcool` | Sem álcool | 0 |

Ingredientes:

| id | name | category |
| --- | --- | --- |
| `cachaca` | Cachaça | destilado |
| `vodka` | Vodka | destilado |
| `gin` | Gin | destilado |
| `rum` | Rum | destilado |
| `tequila` | Tequila | destilado |
| `whisky` | Whisky | destilado |
| `licor_laranja` | Licor de laranja | destilado |
| `campari` | Campari | destilado |
| `vermute_rosso` | Vermute rosso | destilado |
| `aperol` | Aperol | destilado |
| `espumante` | Espumante | destilado |
| `limao` | Limão | citrico |
| `laranja` | Laranja | citrico |
| `agua_tonica` | Água tônica | mixer |
| `agua_com_gas` | Água com gás | mixer |
| `cola` | Refrigerante de cola | mixer |
| `ginger_beer` | Ginger beer | mixer |
| `suco_cranberry` | Suco de cranberry | mixer |
| `suco_abacaxi` | Suco de abacaxi | mixer |
| `leite_coco` | Leite de coco | mixer |
| `acucar` | Açúcar | adocante |
| `leite_condensado` | Leite condensado | adocante |
| `hortela` | Hortelã | outro |
| `gelo` | Gelo | outro |

`name_folded` é `foldName(name)` e não precisa de coluna extra nesta tabela.

Drinks:

| id | name | category | description |
| --- | --- | --- | --- |
| `caipirinha` | Caipirinha | brasileiro | Cachaça com limão e açúcar, servida bem gelada. |
| `caipiroska` | Caipiroska | classico | A mesma base da caipirinha, com vodka no lugar da cachaça. |
| `mojito` | Mojito | classico | Rum, hortelã e limão, completado com água com gás. |
| `gin_tonica` | Gin tônica | classico | Gin com água tônica e um corte de limão. |
| `cuba_libre` | Cuba libre | classico | Rum com refrigerante de cola e limão. |
| `moscow_mule` | Moscow mule | classico | Vodka com ginger beer e limão. |
| `margarita` | Margarita | classico | Tequila, licor de laranja e limão, servida gelada. |
| `pina_colada` | Piña colada | classico | Rum batido com abacaxi e leite de coco. |
| `negroni` | Negroni | classico | Partes iguais de gin, Campari e vermute rosso. |
| `aperol_spritz` | Aperol spritz | classico | Aperol com espumante e um pouco de água com gás. |
| `whisky_sour` | Whisky sour | classico | Whisky, limão e açúcar. Esta versão não leva clara de ovo. |
| `cosmopolitan` | Cosmopolitan | classico | Vodka, licor de laranja, cranberry e limão. |
| `mojito_sem_alcool` | Mojito sem álcool | sem_alcool | Hortelã, limão e água com gás, sem rum. |
| `limonada_suica` | Limonada suíça | sem_alcool | Limão batido com leite condensado e gelo. |

Doses (`amount` e `unit` são texto):

| drink_id | ingredient_id | amount | unit |
| --- | --- | --- | --- |
| `caipirinha` | `cachaca` | 50 | ml |
| `caipirinha` | `limao` | 1 | unidade |
| `caipirinha` | `acucar` | 2 | colher de chá |
| `caipirinha` | `gelo` | 1 | copo |
| `caipiroska` | `vodka` | 50 | ml |
| `caipiroska` | `limao` | 1 | unidade |
| `caipiroska` | `acucar` | 2 | colher de chá |
| `caipiroska` | `gelo` | 1 | copo |
| `mojito` | `rum` | 50 | ml |
| `mojito` | `limao` | 1 | unidade |
| `mojito` | `hortela` | 8 | folhas |
| `mojito` | `acucar` | 2 | colher de chá |
| `mojito` | `agua_com_gas` | 1 | completar o copo |
| `mojito` | `gelo` | 1 | copo |
| `gin_tonica` | `gin` | 50 | ml |
| `gin_tonica` | `agua_tonica` | 150 | ml |
| `gin_tonica` | `limao` | 1 | fatia |
| `gin_tonica` | `gelo` | 1 | copo |
| `cuba_libre` | `rum` | 50 | ml |
| `cuba_libre` | `cola` | 120 | ml |
| `cuba_libre` | `limao` | 1 | fatia |
| `cuba_libre` | `gelo` | 1 | copo |
| `moscow_mule` | `vodka` | 50 | ml |
| `moscow_mule` | `ginger_beer` | 120 | ml |
| `moscow_mule` | `limao` | 0,5 | unidade |
| `moscow_mule` | `gelo` | 1 | copo |
| `margarita` | `tequila` | 50 | ml |
| `margarita` | `licor_laranja` | 20 | ml |
| `margarita` | `limao` | 30 | ml |
| `margarita` | `gelo` | 1 | copo |
| `pina_colada` | `rum` | 50 | ml |
| `pina_colada` | `suco_abacaxi` | 90 | ml |
| `pina_colada` | `leite_coco` | 30 | ml |
| `pina_colada` | `gelo` | 1 | copo |
| `negroni` | `gin` | 30 | ml |
| `negroni` | `campari` | 30 | ml |
| `negroni` | `vermute_rosso` | 30 | ml |
| `negroni` | `gelo` | 1 | copo |
| `aperol_spritz` | `aperol` | 60 | ml |
| `aperol_spritz` | `espumante` | 90 | ml |
| `aperol_spritz` | `agua_com_gas` | 30 | ml |
| `aperol_spritz` | `gelo` | 1 | copo |
| `whisky_sour` | `whisky` | 50 | ml |
| `whisky_sour` | `limao` | 25 | ml |
| `whisky_sour` | `acucar` | 1 | colher de chá |
| `whisky_sour` | `gelo` | 1 | copo |
| `cosmopolitan` | `vodka` | 40 | ml |
| `cosmopolitan` | `licor_laranja` | 15 | ml |
| `cosmopolitan` | `suco_cranberry` | 30 | ml |
| `cosmopolitan` | `limao` | 15 | ml |
| `cosmopolitan` | `gelo` | 1 | copo |
| `mojito_sem_alcool` | `limao` | 1 | unidade |
| `mojito_sem_alcool` | `hortela` | 8 | folhas |
| `mojito_sem_alcool` | `acucar` | 2 | colher de chá |
| `mojito_sem_alcool` | `agua_com_gas` | 1 | completar o copo |
| `mojito_sem_alcool` | `gelo` | 1 | copo |
| `limonada_suica` | `limao` | 2 | unidades |
| `limonada_suica` | `leite_condensado` | 3 | colheres de sopa |
| `limonada_suica` | `gelo` | 1 | copo |

Passos, em ordem:

- `caipirinha`: Corte o limão em pedaços. / Macere o limão com o açúcar no copo. / Complete com cachaça e gelo.
- `caipiroska`: Corte o limão em pedaços. / Macere o limão com o açúcar no copo. / Complete com vodka e gelo.
- `mojito`: Macere o limão, a hortelã e o açúcar. / Junte o rum e o gelo. / Complete com água com gás.
- `gin_tonica`: Encha o copo com gelo. / Adicione o gin e complete com água tônica. / Finalize com a fatia de limão.
- `cuba_libre`: Encha o copo com gelo. / Adicione o rum e o limão. / Complete com refrigerante de cola.
- `moscow_mule`: Encha o copo com gelo. / Adicione a vodka e o limão. / Complete com ginger beer.
- `margarita`: Junte tequila, licor de laranja e limão na coqueteleira com gelo. / Bata até gelar. / Sirva sem coar o gelo, ou coe se preferir o copo limpo.
- `pina_colada`: Bata rum, suco de abacaxi, leite de coco e gelo. / Sirva em seguida.
- `negroni`: Junte gin, Campari e vermute no copo com gelo. / Mexa até gelar.
- `aperol_spritz`: Coloque gelo no copo. / Adicione Aperol e espumante. / Complete com água com gás.
- `whisky_sour`: Bata whisky, limão e açúcar com gelo. / Sirva no copo.
- `cosmopolitan`: Bata vodka, licor de laranja, suco de cranberry e limão com gelo. / Coe e sirva.
- `mojito_sem_alcool`: Macere o limão, a hortelã e o açúcar. / Junte o gelo. / Complete com água com gás.
- `limonada_suica`: Bata o limão, o leite condensado e o gelo. / Sirva em seguida.

Na receita, a dose aparece como `amount` + espaço + `unit` (exemplo: `50 ml`). O rótulo de categoria do drink aparece no cartão. Drink com `alcoholic = 0` também mostra o texto `Sem álcool` na cor `amber`.

### 4.9 Sync algorithm

`syncAll` exige sessão. Sem sessão, retorna `{ ok: false, message: "Entre na conta para sincronizar." }` e não altera o catálogo.

Ordem:

1. `claimAnonymousFavorites(userId)` se ainda existirem linhas com `user_id` nulo. Isso ocorre no login, antes do primeiro `syncAll` dessa sessão. Grava `last_user_id`.
2. Ler favoritos locais com `pending_sync = 1` e `user_id` igual à sessão.
3. Para cada um, upsert remoto em `favorites` com `on conflict (user_id, drink_id)`. Enviar `created_at`, `updated_at` e `deleted_at` (`null` se `deleted = 0`).
4. Somente após o upsert dessa linha, gravar `pending_sync = 0` nela.
5. Baixar todas as linhas remotas de `favorites` da sessão.
6. Para cada linha remota, converter instantes para epoch ms.
   - Sem linha local: inserir com `pending_sync = 0` e `deleted = 1` se `deleted_at` remoto não for nulo.
   - Com linha local e `pending_sync = 0`: substituir pelos valores remotos.
   - Com linha local e `pending_sync = 1`: manter a local se `local.updated_at > remote.updated_at`. Caso contrário, aplicar a remota e zerar `pending_sync`.
7. Baixar `ingredients`, `drinks` e `drink_ingredients` e fazer upsert por chave primária. Não apagar linhas locais que o remoto não devolveu.
8. Gravar `last_sync_at` e apagar `last_sync_error`.
9. Se o passo 3 ou 4 falhar, não executar o pull de favoritos nem o pull de catálogo. Manter `pending_sync = 1` nas linhas não confirmadas. Gravar `last_sync_error` com `Não sincronizado. Tente de novo.`
10. Se o passo 5 ou 6 falhar depois de um push confirmado, manter o push já marcado com `pending_sync = 0` e gravar o mesmo erro. O próximo sync tenta de novo.
11. Se só o passo 7 falhar, favoritos já confirmados permanecem com `pending_sync = 0` e o erro fica registrado.

O pull de catálogo não roda dentro de uma transação que desfaça favoritos já confirmados.

### 4.10 Environment

| Variável | Onde | Conteúdo |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Cliente Expo | URL do projeto |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente Expo | Publishable key ou anon key |

Arquivo local de segredo: `.env`. Não versionar `.env`. Versionar `.env.example` só com os nomes das variáveis e valores vazios.

### 4.11 Account screen states

| Estado | Conteúdo |
| --- | --- |
| Sem sessão | Campos e-mail e senha. Botões `Entrar` e `Criar conta`. |
| Com sessão | E-mail, linha de sync, botão `Sincronizar`, botão `Sair`. |
| Sync em andamento | Botão `Sincronizar` desabilitado e rótulo `Sincronizando...`. |
| Último sync ok | `Sincronizado` e a data/hora local de `last_sync_at`. |
| Último sync com erro | `Não sincronizado` e `last_sync_error`. |
| Nunca sincronizou | `Ainda não sincronizado`. |

## 5. Acceptance Criteria

- **AC-001**: Given o primeiro lançamento sem rede, When a aba Buscar abre, Then a lista contém os 14 drinks do catálogo, incluindo Caipirinha e Limonada suíça.
- **AC-002**: Given a Buscar aberta, When a pessoa digita `gin`, Then Gin tônica aparece. When digita `suica`, Then Limonada suíça aparece. When digita `xyz`, Then a tela mostra `Nenhum drink com esse nome`.
- **AC-003**: Given Identificar sem marcas, When a tela renderiza, Then mostra `Selecione ao menos um ingrediente` e nenhum resultado de drink.
- **AC-004**: Given os ingredientes Cachaça, Limão, Açúcar e Gelo marcados, When a identificação roda, Then Caipirinha é o primeiro resultado com cobertura 100 por cento e texto `4 de 4 ingredientes`.
- **AC-005**: Given só Limão e Açúcar marcados, When a identificação roda, Then Caipirinha aparece acima de Gin tônica, porque a cobertura da Caipirinha é maior.
- **AC-006**: Given a receita da Caipirinha, When a pessoa favorita e encerra a sessão de rede, Then o favorito continua em Favoritos após reabrir o aplicativo.
- **AC-007**: Given um favorito anônimo, When a pessoa cria uma conta e o sync conclui, Then a linha remota de `favorites` existe com o `user_id` dessa conta e `deleted_at` nulo.
- **AC-008**: Given o mesmo favorito em um segundo aparelho com a mesma conta, When o sync conclui, Then a Caipirinha aparece em Favoritos nesse aparelho.
- **AC-009**: Given a Caipirinha favoritada e sincronizada, When a pessoa desfavorita offline e depois sincroniza, Then `deleted_at` remoto fica preenchido e a lista local não mostra a Caipirinha.
- **AC-010**: Given modo avião depois do seed, When a pessoa busca, identifica e favorita, Then as três ações concluem sem mensagem de falha de banco.
- **AC-011**: Given Conta sem sessão, When a pessoa envia senha `123`, Then a mensagem é `A senha precisa ter ao menos 6 caracteres` e não há pedido de Auth.
- **AC-012**: Given a aba Identificar, When a tela renderiza, Then o aviso `Identificar pela câmera chega no 2º bimestre` está visível e não dispara permissão nem navegação.
- **AC-013**: Given o binário do cliente e o repositório, When se procura a service role, Then ela não aparece. As tabelas de catálogo recusam `INSERT` com a publishable key de um usuário autenticado.
- **AC-014**: Given qualquer tela, When comparada aos tokens, Then o fundo é `#0E0C0B`, o título do drink usa Fraunces e o botão principal usa `#FF2E63`.

## 6. Test Automation Strategy

- **Test Levels**: Teste de unidade para regras puras. Teste manual de ponta a ponta no Expo Go para navegação, SQLite e sync. Não há suíte de interface automatizada obrigatória nesta versão.
- **Frameworks**: Jest para `foldName`, ordenação de cobertura e a decisão de conflito do sync (função pura que recebe relógio local, relógio remoto e `pending_sync`). Consultas SQL podem ser exercidas com Expo SQLite em teste de integração local se o ambiente já tiver isso; não é bloqueio abrir a fase sem esse teste de integração.
- **Test Data Management**: O seed da seção 4.8 é o único catálogo de teste. Favoritos de teste usam uma conta criada para a avaliação e podem ser apagados no painel do Supabase ao final. Não usar a service role dentro do aplicativo de teste.
- **CI/CD Integration**: Sem pipeline obrigatório nesta versão. O aceite é o roteiro manual da seção 10.
- **Coverage Requirements**: 100 por cento dos caminhos de `foldName` e da função pura de conflito de favorito. Sem meta de cobertura global.
- **Performance Testing**: Catálogo de 14 drinks. Sem teste de carga. A busca e a identificação devem responder no mesmo gesto, sem indicador de progresso, em um aparelho Android intermediário.

Casos mínimos de unidade:

| Caso | Entrada | Saída |
| --- | --- | --- |
| Fold com acento | `Limão` | `limao` |
| Fold com espaço | `  Gin Tônica ` | `gin tonica` |
| Conflito local mais novo | local `updated_at` 200, remoto 100, `pending_sync` 1 | manter local |
| Conflito remoto mais novo | local 100, remoto 200, `pending_sync` 1 | aplicar remoto e zerar pendência |
| Conflito empate | ambos 100, `pending_sync` 0 | aplicar remoto |

## 7. Rationale & Context

O problema da versão 1 é a pessoa que vê um drink, ou reconhece ingredientes, e precisa da receita. A câmera é o mesmo problema no 2º bimestre: a entrada deixa de ser o toque nos chips e passa a ser a imagem. Por isso a seleção não vira tabela, e a navegação já reserva o aviso na aba Identificar.

SQLite é a fonte de leitura da interface para a avaliação exigir uso real do banco local, inclusive offline. A consulta de cobertura com `JOIN` e `GROUP BY` é o uso que diferencia o SQLite de uma lista em memória. O PostgreSQL existe para a conta levar favoritos a outro aparelho e para o catálogo ter uma cópia online. O cliente não escreve no catálogo, então a publishable key não precisa de permissão de escrita nesse dado.

Favorito usa tombstone porque um `DELETE` local seguido de pull recriaria o item remoto. `updated_at` decide o conflito sem fila separada. O relógio do aparelho pode empatar ou inverter ordem se estiver errado; a versão 1 aceita esse limite e documenta o empate a favor do remoto.

Gelo entra nas receitas porque faz parte da dose exibida. Ele também entra na cobertura. O aceite AC-004 usa os quatro ingredientes da Caipirinha, inclusive gelo, para o resultado ser determinístico.

O tema escuro, o rosa `#FF2E63` e o âmbar `#F0B429` são a identidade visual desta versão: fundo de bar, um acento de ação e a cor do líquido nas doses. Fraunces carrega o nome do drink; Outfit carrega a interface. Não há segunda paleta.

A confirmação de e-mail fica desligada para o cadastro devolver sessão em sala, sem depender de caixa de entrada.

## 8. Dependencies & External Integrations

### External Systems

- **EXT-001**: Supabase Auth — cadastro, entrada, saída e sessão por e-mail e senha.
- **EXT-002**: Supabase Postgres — tabelas da seção 4.5, RLS e leitura do catálogo pelo cliente autenticado.

### Third-Party Services

- **SVC-001**: Supabase — disponibilidade suficiente para a demonstração em sala. Sem SLA formal. Sem a confirmação de e-mail, o fluxo não depende de provedor de e-mail.

### Infrastructure Dependencies

- **INF-001**: Projeto Supabase único, compartilhado pela equipe, com as migrations aplicadas antes do teste de sync.
- **INF-002**: Aparelho ou emulador Android com Expo Go compatível com o SDK 57 para o roteiro manual.

### Data Dependencies

- **DAT-001**: Seed canônico da seção 4.8 nos dois bancos. Sem API externa de receitas.

### Technology Platform Dependencies

- **PLT-001**: Expo SDK 57 e React Native dessa linha. Expo Router para rotas. Expo SQLite para o banco local. Cliente Supabase para Auth e Postgres. Expo Google Fonts para Fraunces e Outfit. Expo Secure Store para a sessão.
- **PLT-002**: A versão exata de cada pacote é a que `npx expo install` fixar para o SDK 57. Não elevar para o SDK 58 beta nesta versão.

### Compliance Dependencies

- **COM-001**: Sem exigência regulatória adicional. Receitas desta versão são texto original curto do catálogo fechado, não reprodução de livro.

## 9. Examples & Edge Cases

Cobertura com Cachaça, Limão e Açúcar marcados, e Gelo desmarcado:

| Drink | matched | total | coveragePercent | Ordem relativa |
| --- | --- | --- | --- | --- |
| Caipirinha | 3 | 4 | 75 | Primeira entre as que levam esses itens |
| Caipiroska | 2 | 4 | 50 | Depois da Caipirinha |

Caipiroska não sobe acima da Caipirinha nesse conjunto. Gin tônica, se limão estiver marcado, fica em `1 de 4` (25 por cento) e abaixo das duas.

Busca:

| Texto | Resultados esperados |
| --- | --- |
| vazio | 14 drinks, ordem alfabética pelo nome exibido |
| `mojito` | Mojito e Mojito sem álcool |
| `  NEGRONI ` | Negroni |
| `pinha` | nenhum; o nome persistido é Piña colada, cujo fold é `pina colada` |
| `pina` | Piña colada |

`pinha` não encontra Piña colada. O fold remove acento e não troca `nh` por `n`. A pessoa precisa digitar a forma sem acento (`pina`) ou parte do nome já dobrado.

Conta e aparelho:

- Nunca houve login: favoritos ficam com `user_id` nulo e aparecem na aba.
- Login da conta A: esses favoritos passam para A e sobem no sync.
- Sair: a lista de A continua visível. Novo favorito offline fica com `user_id` de A e `pending_sync = 1`.
- Login da conta B no mesmo aparelho: a lista passa a mostrar só B. Linhas de A permanecem no SQLite, ocultas, e não são enviadas como se fossem de B.
- Drink id desconhecido em `/drink/nao-existe`: `Drink não encontrado`, sem quebra de navegação.
- Duplo toque em favoritar: o estado final é favorito único, uma linha por `drink_id`.
- Sync com catálogo remoto igual ao seed: upsert não duplica drinks.

## 10. Validation Criteria

A versão 1 está conforme quando todos os itens abaixo são verdadeiros.

1. AC-001 a AC-014 passam no roteiro manual em um Android com Expo Go.
2. O schema SQLite contém as cinco tabelas da seção 4.6 e a identificação usa a SQL da seção 4.7.
3. O PostgreSQL contém as quatro tabelas, RLS ligado, catálogo sem escrita para `authenticated`, e favoritos restritos a `auth.uid()`.
4. `.env` não está versionado. A service role não está no cliente.
5. O aviso de câmera está na aba Identificar e nenhuma dependência de visão computacional foi adicionada.
6. Os 14 drinks e as doses da seção 4.8 existem no aparelho após o primeiro lançamento limpo.
7. Os advisors de segurança do Supabase não apontam tabela `public` sem RLS.

Roteiro manual mínimo, nesta ordem: instalar e abrir offline; buscar `suica`; identificar Cachaça + Limão + Açúcar + Gelo; abrir a receita; favoritar; matar e reabrir o app; criar conta; sincronizar; repetir o login em outro aparelho ou após limpar os dados locais mantendo a conta; desfavoritar; sincronizar de novo; confirmar a ausência na lista.

## 11. Related Specifications / Further Reading

- [Expo SDK 57](https://expo.dev/changelog/sdk-57)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Supabase Auth — passwords](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

Não há outra spec neste repositório. Mudança de produto desta versão altera este arquivo antes do código.

## 12. Implementation Phases

As fases são o corte de execução desta spec. Uma fase começa somente com a anterior aceita. Cada fase entrega software verificável, sem deixar decisão de produto para a fase seguinte.

### Fase 1 — Casca e tema

Requisitos: REQ-014, REQ-015, REQ-020, REQ-070 a REQ-074, CON-001, CON-004, CON-005, CON-008.

Entrega: aplicativo Expo SDK 57 abre no Expo Go, com as quatro abas, a rota de receita ainda estática e os tokens aplicados. O aviso de câmera já está na aba Identificar. Fontes Fraunces e Outfit carregam. Não há banco nem rede.

Saída: a tab bar usa `#0E0C0B` e `#FF2E63`, e o título usa Fraunces.

### Fase 2 — SQLite, seed e leitura

Requisitos: REQ-002 a REQ-008, REQ-022 a REQ-025, REQ-040 a REQ-042, CON-002, CON-006, mais os contratos 4.4 a 4.8 de leitura.

Entrega: schema, seed e telas de Buscar, Identificar e receita lendo só o SQLite. Favoritos ainda não gravam.

Saída: AC-001 a AC-005 passam offline.

### Fase 3 — Favoritos locais

Requisitos: REQ-009, REQ-010, REQ-035, REQ-036, PAT-001, PAT-003, contrato `setFavorite` e favoritos visíveis.

Entrega: favoritar e desfavoritar persiste no aparelho, inclusive depois de matar o processo. Sem conta.

Saída: AC-006 e AC-010 passam. AC-010 cobre busca, identificação e favorito em modo avião.

### Fase 4 — Supabase, Auth e sync

Requisitos: REQ-011, REQ-012, REQ-013, REQ-030 a REQ-034, REQ-050 a REQ-054, REQ-060 a REQ-063, SEC-001 a SEC-004, CON-003, CON-007, GUD-003, GUD-004.

Entrega: migration com schema, RLS e seed remoto; tela Conta; `syncAll` conforme a seção 4.9; `.env.example`.

Saída: AC-007 a AC-009, AC-011 e AC-013 passam. Advisors sem tabela `public` sem RLS.

### Fase 5 — Aceite da versão 1

Requisitos: AC-001 a AC-014 e a seção 10.

Entrega: roteiro manual executado e registrado, com correção só de desvio em relação a esta spec.

Saída: os sete itens da seção 10 estão verdadeiros.

Fora de todas as fases: câmera, visão computacional e qualquer tabela que não esteja na seção 4.
