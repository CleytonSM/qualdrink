# QualDrink

Aplicativo Expo (SDK 57) para buscar drinks, identificar por ingredientes e guardar favoritos. A leitura fica no SQLite do aparelho. Conta e sincronização usam o projeto Supabase de testes.

## Ambiente de testes

O roteiro de aceite roda no **Expo Go para Android**, no projeto Supabase `yyhxqasurvmaxeqrxffu`. Busca, identificação e favoritos funcionam sem rede. Entrar, criar conta e sincronizar precisam do `.env` e de internet.

### Pré-requisitos

- Node.js **22.13** ou mais novo
- npm
- Celular Android com [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) na mesma rede Wi-Fi do computador

Não é preciso Android Studio nem Xcode para este roteiro.

### 1. Instalar

Na raiz do repositório:

```bash
npm install
```

### 2. Configurar o `.env`

Copie o exemplo e preencha com os dados do projeto de testes. No painel do Supabase: **Project Settings → API**. Use a URL do projeto e a **publishable key** (ou a anon key). Não use a secret key nem a service role.

```bash
copy .env.example .env
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://yyhxqasurvmaxeqrxffu.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

O arquivo `.env` não entra no git. Se você alterar essas variáveis com o servidor já aberto, pare e suba de novo com cache limpo:

```bash
npx expo start -c
```

### 3. Confirmação de e-mail

No painel: **Authentication → Sign In / Providers → Email**, deixe **Confirm email** desligado.

Com a confirmação ligada, `Criar conta` não devolve sessão e a aba Conta mostra `E-mail ou senha incorretos`. Contas criadas antes de desligar a confirmação não servem; crie outra.

A senha precisa ter ao menos 6 caracteres.

### 4. Subir o aplicativo

```bash
npm start
```

No celular, abra o Expo Go e escaneie o QR code do terminal. O primeiro lançamento cria o banco `qualdrink.db` e carrega o catálogo (14 drinks).

Se o celular não alcançar o computador, use túnel:

```bash
npx expo start --tunnel
```

### O que conferir na interface

| Aba | Sem conta | Com conta e rede |
| --- | --- | --- |
| Buscar | Lista e filtro por nome | Igual |
| Identificar | Chips de ingredientes e cobertura | Igual. O aviso de câmera não abre a câmera |
| Favoritos | Grava no aparelho | Sobe e desce no sync |
| Conta | `Entrar` e `Criar conta` | `Sincronizar` e `Sair` |

Roteiro manual, nesta ordem: abrir offline; buscar `suica`; identificar Cachaça, Limão, Açúcar e Gelo; abrir a receita; favoritar; fechar e reabrir o app; criar conta; sincronizar; repetir o login em outro aparelho (ou depois de limpar os dados locais, mantendo a conta); desfavoritar; sincronizar de novo; confirmar que a Caipirinha saiu da lista.

## Conferências no computador

Testes de unidade (não precisam de aparelho nem de Supabase):

```bash
npm test
```

Tipos:

```bash
npx tsc --noEmit
```

Aceite de dados (SQLite local e API do projeto de testes). Exige `.env` preenchido e a confirmação de e-mail desligada. O script cria uma conta temporária no Auth.

```bash
npx tsx scripts/aceite-fase-5.ts
```

A saída é um JSON. `failed: 0` encerra o roteiro. Apague essa conta no painel do Supabase quando terminar.
