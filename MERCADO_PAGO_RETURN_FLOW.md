# Mercado Pago — retorno e reconciliação

## Ajustes

- Corrigidos os estilos ausentes `periods`, `period`, `periodOn`, `periodText` e `periodTextOn` de `app/register.tsx`.
- O retorno do Checkout Pro lê `payment_id`/`collection_id` enviado pelo Mercado Pago.
- Em retorno `success`, a tela de Planos chama o backend para consultar o pagamento diretamente no Mercado Pago.
- A assinatura só é alterada após a mesma validação de referência, valor, moeda e status usada pelo webhook.
- Se a consulta imediata falhar, o histórico continua oferecendo **Atualizar status**.
- O webhook continua sendo a fonte assíncrona principal; a reconciliação do retorno é uma aceleração/contingência, não substitui o webhook.

## Endpoint

`POST /billing/mercado-pago/return/:paymentId/reconcile`

Requer usuário autenticado owner/admin e restringe a cobrança ao tenant autenticado.
