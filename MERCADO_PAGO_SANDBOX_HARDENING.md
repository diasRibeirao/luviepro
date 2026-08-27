# Mercado Pago Sandbox Hardening

## Ambiente

Use credenciais de teste no `.env` local do backend. Arquivos `.env.example` não devem conter tokens reais.

```env
MERCADO_PAGO_ACCESS_TOKEN=""
MERCADO_PAGO_WEBHOOK_SECRET=""
MERCADO_PAGO_WEBHOOK_URL=""
MERCADO_PAGO_USE_SANDBOX="true"
MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS="false"
```

`MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS=true` deve ser usado apenas em desenvolvimento controlado quando for necessário testar chamadas sem assinatura. Em produção, webhook sem secret é rejeitado.

## Regras comerciais

- **Nova assinatura:** entra em vigor imediatamente quando não existe período ativo.
- **Renovação:** mantém o mesmo plano e estende o vencimento a partir da validade atual.
- **Upgrade:** entra em vigor imediatamente após aprovação do pagamento.
- **Downgrade:** é pré-pago e fica agendado para o fim do período atual; o plano atual permanece ativo até essa data.

Assinaturas futuras usam `Subscription.status = scheduled` e são ativadas na próxima criação/renovação de sessão ou consulta de conta quando `startsAt` já tiver chegado.

## Segurança da confirmação

A confirmação do Mercado Pago valida:

- assinatura `x-signature` quando configurada;
- `external_reference`;
- valor em centavos;
- moeda BRL;
- consulta server-to-server do pagamento antes de alterar a assinatura.

O retorno do navegador nunca ativa o plano.

## Reconciliação

`POST /billing/payments/:id/reconcile`

Permite ao proprietário/administrador consultar novamente o Mercado Pago. É especialmente útil no sandbox quando a notificação não chega automaticamente.

## Status detalhado

`Payment` agora armazena `providerStatus`, `providerStatusDetail`, `currency`, `payerEmail`, datas de cancelamento/estorno/chargeback e `billingAction`.

Estornos e chargebacks não removem automaticamente o acesso do cliente. A assinatura é marcada para revisão (`payment_review`) quando já estava ativa, ou cancelada se ainda era futura. A ocorrência fica disponível para auditoria/suporte.

## Migration

`20260827213000_mercado_pago_billing_hardening`
