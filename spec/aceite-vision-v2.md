# Configuração e aceite — ingredientes por foto

## Estado desta entrega

Migração para OpenAI preparada em 2026-11-08, autorizada pelo usuário com uso de
créditos pagos para os testes. A função usa Responses API e `gpt-4.1-mini` por
padrão. `OPENAI_API_KEY` foi preenchida no `.env` do servidor e cadastrada nos
segredos do projeto `yyhxqasurvmaxeqrxffu`. O preflight OpenAI passou. O caminho antigo do
Gemini foi desativado no servidor; não há fallback para outro provedor.
O novo código está publicado e com os segredos atualizados: função `ACTIVE`,
versão 4, `verify_jwt=true`.
Uma chamada sem sessão foi recusada com HTTP 401 após a publicação.

O `.env` local do app já contém a URL e a chave pública do Supabase. A validação
anterior de metadados do Gemini não constitui validação da OpenAI.

Teste real direto na Responses API OpenAI: HTTP 200, `ingredientIds:["limao"]`,
latência observada de 2486 ms, usando uma única foto pública de limão
([Evan-Amos / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lime-Whole-Split.jpg),
CC0, versão de 1280 × 615 px). Foram usados o construtor de request e o parser
da função implementada. Essa amostra valida uma chamada real, sem substituir
o fluxo autenticado pelo Supabase no celular nem o conjunto de 30 fotos.

A avaliação de reconhecimento real e o aceite completo em aparelho ainda estão
pendentes. O Samsung SM-G781B foi conectado por USB (Android 13, Expo Go 57.0.9);
ainda não há conjunto de fotos rotuladas. Testes simulados
verificam contratos e falhas, não medem a qualidade visual do modelo. A consulta
aos metadados da OpenAI não comprova saldo, permissões de Responses ou qualidade visual.

Verificações locais realizadas em 2026-11-08:

- 50 testes automatizados passaram, incluindo os testes existentes e os novos
  testes de contrato, backend, cancelamento e avaliação.
- `tsc --noEmit` e `deno check` passaram; lint sem erros, com um aviso preexistente
  de `Array<T>` em `src/db/client.ts`.
- Bundle de produção Android gerado com sucesso, incluindo os módulos de imagem.
- Conferência web em viewport de 390 × 844: painel sem conta, navegação para Conta,
  retorno com seleção preservada e Caipirinha com 4 de 4 ingredientes / 100%.
- Preflight recusa configuração sem `OPENAI_API_KEY`; avaliador recusa o
  manifesto de exemplo enquanto os arquivos e rótulos não forem preenchidos.
- Função publicada recusa chamadas sem sessão ou com sessão inválida (HTTP 401).
- Auth disponível (HTTP 200), com login por e-mail, cadastro e confirmação
  automática habilitados. A análise de foto com sessão válida ainda precisa ser
  conferida no aparelho e não está incluída no resultado do preflight.
- Inicialização Android por USB: corrigido o servidor que escutava somente em
  `::1`. `npm run android:usb` prioriza IPv4 e configura o redirecionamento ADB.
  `/status` e manifesto Android responderam HTTP 200 em `127.0.0.1:8081`;
  o aparelho solicitou o bundle, compilado em 9437 ms, e passou à
  `ExperienceActivity`. Isso verifica o download/início, sem substituir o aceite
  visual, login e teste de foto.

## Preparar o servidor

1. No [painel da API OpenAI](https://platform.openai.com/api-keys), criar uma chave
   de projeto com acesso a Responses e ao modelo `gpt-4.1-mini`. Conferir saldo e
   limites no painel. As chamadas de análise consomem créditos e podem ser cobradas;
   o usuário autorizou créditos pagos para estes testes. Consultar
   [modelo/preços](https://developers.openai.com/api/docs/models/gpt-4.1-mini) e
   [créditos](https://developers.openai.com/api/docs/guides/chatgpt-api-credits).
2. Preencher `OPENAI_API_KEY` em `supabase/functions/.env` e manter
   `OPENAI_VISION_MODEL=gpt-4.1-mini`. O setup já acrescentou esses campos sem
   sobrescrever credenciais locais existentes. Para uma instalação nova, copiar
   `.env.example` dessa pasta. Não sobrescrever o arquivo se já houver uma chave.
   O arquivo é ignorado pelo Git; as entradas antigas `GEMINI_*` não são usadas.
3. Rodar `npm run vision:preflight`. A consulta verifica chave/acesso aos metadados
   do modelo, sem enviar foto. Não comprova saldo ou permissão de criar Responses.
   O modelo só será considerado validado após as fotos reais.
4. Autenticar o CLI do Supabase e executar, usando o projeto de testes autorizado:

   ```powershell
   npx supabase secrets set --remote=yyhxqasurvmaxeqrxffu --env-file supabase/functions/.env
   npx supabase functions deploy identify-ingredients --remote=yyhxqasurvmaxeqrxffu --use-api
   ```

   Manter `verify_jwt=true` em `supabase/config.toml`. A função também consulta
   `/auth/v1/user` para validar o usuário, rejeitando token inválido e sessão de
   usuário anônimo. A URL e a anon key internas são fornecidas pelo Supabase.
   Não colocar `OPENAI_API_KEY` em `.env` do cliente nem em `EXPO_PUBLIC_`.
5. Configurar o `.env` do aplicativo conforme o README e iniciar `npm start`.
   Não é necessário migrar tabelas. A cota gratuita do próprio Supabase também
   precisa estar disponível. A função usa créditos OpenAI já configurados na conta;
   o código não compra saldo nem habilita recarga automática.

O servidor devolve indisponibilidade enquanto faltar a chave. Cada análise tem
uma imagem de até 2 MiB / 1600 px e saída limitada a 512 tokens, sem retries.
`store:false` evita armazenamento de Responses como estado da aplicação na OpenAI;
não equivale a promessa de retenção zero pelo provedor. Consulte as
[políticas de dados](https://developers.openai.com/api/docs/guides/your-data).

## Avaliar com 30 fotos reais

Copiar `vision-evaluation.example.json` para uma pasta local de avaliação, fora do
Git. Preencher `file` com caminhos relativos ao manifesto e
`expectedIngredientIds` com a verdade de referência **antes** de olhar as respostas.
Os placeholders `null` são intencionais: o avaliador recusa dados não rotulados.

- 10 alimentos: fotos claras de limão, laranja, hortelã e gelo, isolados e combinados.
- 10 embalagens: variar destilados, mixers e adoçantes do catálogo, com rótulos legíveis.
- 10 negativas/ambíguas: objetos sem ingredientes, líquido transparente sem
  identificação, garrafa sem rótulo, pó branco sem rótulo e abacaxi inteiro.
  Para este catálogo, abacaxi inteiro não equivale a `suco_abacaxi`.
- Usar JPEGs sem metadados sensíveis, maior lado até 1600 px e tamanho até 2 MiB,
  reproduzindo a entrada preparada pelo app. Não versionar as fotos.

Validar todos os arquivos e rótulos sem chamar API:

```powershell
npm run vision:evaluate -- --validate-only C:\caminho\avaliacao\manifesto.json
```

Definir `QUALDRINK_EVAL_ACCESS_TOKEN` em `.env.vision.local` (ignorado pelo Git),
usando o access token de uma conta de testes autenticada. Não usar service role,
publishable key ou token de usuário anônimo como substituto da sessão.

```powershell
npm run vision:evaluate -- C:\caminho\avaliacao\manifesto.json
```

O script usa a mesma função, contrato e deadline do app, sem retries. O relatório
JSON inclui métricas micro nas 20 fotos claras, métricas por ingrediente, falsos
positivos nas negativas, erros, latência média e p95. Retorna código diferente de
zero se não houver 30 análises válidas, precisão >= 90%, recall >= 80% e nenhuma
sugestão nas negativas. Erro de API não conta como negativa correta.

Em caso de crédito/cota atingida, limite de frequência, sessão inválida ou configuração indisponível, interrompe
a sequência e relata a avaliação incompleta. Não chamar os testes simulados de
resultado de reconhecimento real. Registrar modelo/configuração do painel junto
do relatório e remover o token local ao terminar.

## Roteiro manual no Android / Expo Go

- Abrir sem conta: seleção manual, receitas e favoritos funcionam; foto oferece login.
- Entrar e abrir Identificar: testar câmera com permissão concedida e negada;
  testar galeria e cancelamento no seletor. Não pedir microfone.
- Conferir prévia, orientação e aviso antes do envio. Abrir políticas de dados da OpenAI.
- Analisar foto clara; remover uma sugestão e adicionar um ingrediente ausente.
  Confirmar preserva marcas anteriores e não duplica ingredientes.
- Conferir Caipirinha com Cachaça, Limão, Açúcar e Gelo: cobertura 4 de 4 / 100%.
- Foto negativa retorna revisão vazia com seleção manual disponível.
- Cancelar durante análise, voltar pelo botão Android e trocar de aba: nenhuma
  resposta tardia altera a seleção. Após trocar de conta, não reaproveitar revisão.
- Testar duas tentativas rápidas: apenas uma requisição. Desligar rede e simular
  timeout/cota: mostrar mensagem sem perder marcas e sem repetir envio sozinho.
- Nas opções de desenvolvedor do Android, habilitar temporariamente "Não manter
  atividades": após o seletor recriar a Activity, recuperar somente a prévia,
  sem envio automático. Restaurar a opção após o teste.
- Concluir/cancelar: verificar remoção das cópias de cache do fluxo, sem alterar
  a foto original da galeria. Verificar ausência de imagens em tabelas/Storage/logs.
- Em modo avião: buscar, identificar manualmente, abrir receita e favoritar;
  reiniciar e conferir favorito. A cobertura continua sendo medida da receita.

## Verificações locais

```powershell
npm test
npx expo lint
npx tsc --noEmit
npx deno check --config supabase/functions/deno.json supabase/functions/identify-ingredients/index.ts
```

Conferir também o bundle Android com `npx expo export --platform android`.
Gerar bundle não substitui o roteiro no aparelho nem a integração com o provedor.
