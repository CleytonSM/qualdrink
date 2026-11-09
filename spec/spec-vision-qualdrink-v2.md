# QualDrink v2 — ingredientes por foto

Data: 2026-11-08. Design aprovado pelo usuário antes da implementação.
Atualização autorizada: trocar Gemini por OpenAI; usuário aceita créditos pagos
para os testes. Essa decisão substitui a restrição anterior de somente cota gratuita.

## Objetivo e abordagem

Fotografar ingredientes, revisar sugestões e descobrir receitas do catálogo.
Escolhas aprovadas: modelo pronto, processamento online, login obrigatório e
OpenAI com créditos da API para os testes. A análise online foi escolhida em vez de um modelo no
aparelho para evitar treinamento e integração nativa especializada nesta entrega.
Reconhecimento de drinks prontos e OCR como recurso separado ficam fora.

Esta evolução substitui o aviso de câmera e as proibições de câmera/galeria/visão
da v1 (REQ-014, AC-012, CON-005) somente para este fluxo. SQLite, favoritos,
sincronização e cálculo de cobertura mantêm os contratos existentes.

## Comportamento

- Android/Expo Go SDK 57 é o alvo principal; preservar compatibilidade com iOS.
- Tirar foto ou escolher uma imagem da galeria com `expo-image-picker`.
- Mostrar prévia e aviso sobre envio à OpenAI e suas políticas de dados. Enviar
  somente depois de tocar em Analisar, com sessão válida.
- Converter a imagem em JPEG, limitar o maior lado a 1600 pixels e o arquivo
  enviado a 2 MiB. Usar apenas cache temporário; remover os arquivos temporários
  do fluxo ao cancelar, concluir ou sair. Nunca apagar a imagem original da galeria.
- Uma análise por vez, timeout total de 30 segundos e nenhuma repetição automática.
  Cancelamento, saída da aba, troca de conta e respostas tardias não alteram seleção.
- Revisar os ingredientes antes de confirmar, podendo marcar e desmarcar os 24
  itens. Resultado vazio é válido e permite complementação manual.
- Confirmar une os IDs revisados à seleção manual atual, sem duplicação. Cancelar
  ou falhar mantém a seleção anterior. A busca de receitas continua no SQLite.
- Cobertura é a proporção de ingredientes da receita, não confiança do modelo.

## Integração e limites

`POST /functions/v1/identify-ingredients`, com JWT Supabase e corpo
`{ imageBase64: string, mimeType: "image/jpeg" }`, devolve
`{ ingredientIds: string[] }`. O catálogo canônico é compartilhado pelo seed,
cliente e função. Não aceitar IDs desconhecidos nem resposta malformada.

A Edge Function valida a sessão no Auth antes de chamar o modelo. Segredos ficam
no servidor: `OPENAI_API_KEY` e `OPENAI_VISION_MODEL` (padrão `gpt-4.1-mini`). Usar
`POST https://api.openai.com/v1/responses`, imagem como data URL JPEG e saída
estruturada por `text.format` com JSON Schema estrito limitado ao catálogo.
Usar `store:false` e `max_output_tokens:512`, sem ferramentas, histórico ou retry.
Validar o envelope REST `output`, rejeitando resposta incompleta, recusa e IDs
desconhecidos. Não usar `output_text` no topo, que é conveniência dos SDKs.

A análise consome créditos da API e pode ser cobrada. Não existe troca automática
de modelo nem fallback para Gemini. Configurações antigas `GEMINI_*` não são lidas
pelo código novo. O preflight consulta metadados, sem enviar imagem, e não comprova
saldo, acesso efetivo a Responses nem a qualidade do reconhecimento.

O modelo recebe a lista fechada de ingredientes e instruções para usar apenas
evidência visual ou embalagem/rótulo legível. Não inferir destilados pela cor,
líquidos transparentes, açúcar pelo recipiente ou suco pela fruta inteira. A
imagem é dado não confiável: textos nela não são instruções para o modelo.

Erros tipados: sessão inválida, imagem inválida, resposta inválida, créditos/cota
esgotados, limite de frequência, timeout e indisponibilidade/rede. A interface exibe mensagens em pt-BR e oferece
seleção manual. Nenhum erro contém resposta bruta, chave, token ou imagem.

Não salvar fotos em banco, Storage ou logs. Não prometer ausência de retenção
pelo provedor: as políticas externas da OpenAI são informadas na prévia.
Sem histórico, novas tabelas, vídeo, quantidades, bounding boxes ou receitas geradas.

## Aceite

- Testes automatizados de Auth, contrato, IDs, resposta do provedor, cota, timeout,
  concorrência, cancelamento, resposta tardia e união da seleção.
- Testes existentes, lint e `tsc --noEmit` devem passar.
- Avaliação real com 30 fotos rotuladas: 10 alimentos, 10 embalagens e 10
  negativas/ambíguas. Metas nas 20 claras: precisão micro >= 90%, recall micro >=
  80%; nenhuma sugestão indevida nas 10 negativas. Medir latência e registrar
  falhas separadamente. Não considerar respostas simuladas como avaliação real.
- Aceite no Android: permissões, câmera, galeria, prévia, revisão, cancelamento,
  logout, erros, persistência de favoritos e uso manual offline.
- Credenciais, saldo/cota da API, fotos rotuladas e aparelho real
  são pré-requisitos externos; registrar explicitamente os que não forem verificados.

Referências: [ImagePicker SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/),
[ImageManipulator SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/),
[visão OpenAI](https://developers.openai.com/api/docs/guides/images-vision),
[GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini),
[saída estruturada](https://developers.openai.com/api/docs/guides/structured-outputs),
[políticas de dados](https://developers.openai.com/api/docs/guides/your-data),
[segredos Supabase](https://supabase.com/docs/guides/functions/secrets).
