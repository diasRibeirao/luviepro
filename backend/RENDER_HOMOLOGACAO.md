# LuviePro — Homologação no Render

Arquitetura:
- Web Service `luviepro-api-hml` (Node/NestJS, Free)
- PostgreSQL `luviepro-postgres-hml` (Free)
- Key Value `luviepro-redis-hml` (Free)
- Região `virginia`
- API: `https://luviepro-api-hml.onrender.com/api`
- Health: `https://luviepro-api-hml.onrender.com/api/health/live`

O serviço mantém `NODE_ENV=production` para preservar cookies seguros, CORS restrito,
rate limit distribuído e demais proteções. `APP_ENV=staging` libera apenas o Mercado
Pago Sandbox e torna SMTP opcional na homologação. Webhooks sem assinatura e alteração
direta de plano continuam bloqueados.

Na criação inicial do Blueprint, informe somente no Dashboard:
- `PLATFORM_ADMIN_PASSWORD`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`

O start executa migrations, seed idempotente e depois sobe a API.

Depois que a API estiver online, altere o perfil EAS preview para:
`EXPO_PUBLIC_API_URL=https://luviepro-api-hml.onrender.com/api`

Remova `EXPO_PUBLIC_ALLOW_INSECURE_API=true` do preview antes de gerar o novo APK.

Se `luviepro-api-hml` já estiver em uso, altere o nome do Web Service e também
`APP_WEB_URL`, `CORS_ORIGINS` e `MERCADO_PAGO_WEBHOOK_URL` no `render.yaml`.
