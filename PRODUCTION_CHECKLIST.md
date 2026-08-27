# Checklist de produção — LuviePro

## Segurança e credenciais

- [ ] Revogar o Access Token do Mercado Pago exposto durante o desenvolvimento e gerar outro.
- [ ] Armazenar `JWT_SECRET`, `JWT_REFRESH_SECRET`, credenciais SMTP e Mercado Pago em secret manager/variáveis do servidor, nunca no Git.
- [ ] Usar segredos JWT diferentes, aleatórios e com pelo menos 32 caracteres.
- [ ] Remover senhas padrão do PostgreSQL e exigir autenticação no Redis.
- [ ] Manter PostgreSQL e Redis sem portas públicas na Internet.

## Domínio e rede

- [ ] Publicar frontend e API em HTTPS com certificado válido.
- [ ] Configurar `EXPO_PUBLIC_API_URL=https://api.seudominio.com/api` nas builds iOS/Android.
- [ ] Configurar `APP_WEB_URL`, `CORS_ORIGINS` e `MERCADO_PAGO_WEBHOOK_URL` com os domínios definitivos.
- [ ] Configurar `TRUST_PROXY_HOPS=1` somente quando houver exatamente um proxy confiável, como Nginx.
- [ ] Validar firewall e permitir somente HTTP/HTTPS públicos.

## Mercado Pago

- [ ] Configurar `MERCADO_PAGO_WEBHOOK_SECRET` e manter webhooks sem assinatura desabilitados.
- [ ] Executar pagamento aprovado, pendente, recusado e cancelado com contas distintas de vendedor e comprador.
- [ ] Confirmar idempotência por clique duplo e webhook duplicado.
- [ ] Confirmar upgrade imediato, renovação e downgrade agendado.
- [ ] Confirmar estorno e chargeback no painel master e na assinatura vinculada.

## E-mail

- [ ] Substituir Mailpit por SMTP transacional de produção.
- [ ] Configurar SPF, DKIM e DMARC no domínio de envio.
- [ ] Testar convite de usuário e recuperação de senha em provedores reais.

## Dados e operação

- [ ] Automatizar backup diário do PostgreSQL e testar restauração.
- [ ] Definir retenção de auditoria e política LGPD para dados de clientes.
- [ ] Configurar monitoramento de disponibilidade, erros 5xx, filas de webhook e uso de recursos.
- [ ] Centralizar logs preservando `requestId`, sem tokens, senhas ou dados sensíveis.
- [ ] Criar alertas para falha de PostgreSQL, Redis, SMTP e Mercado Pago.

## Aplicativos

- [ ] Gerar builds EAS assinadas para Android e iOS usando ambiente de produção.
- [ ] Validar navegação, teclado, safe areas, upload de logo e links externos em aparelhos reais.
- [ ] Preparar política de privacidade, termos de uso e informações exigidas pelas lojas.
- [ ] Executar smoke test Web, Android e iOS antes de cada liberação.

## Comandos de liberação

```powershell
cd C:\opt\projetos\luviepro\fonte
.\verify.cmd

cd backend
npm run prisma:status
npm audit --omit=dev
```

A liberação somente deve prosseguir quando o banco estiver atualizado, o health check retornar PostgreSQL e Redis saudáveis e os cenários críticos de pagamento estiverem homologados.
