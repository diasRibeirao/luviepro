# Round 129.1 — Typecheck regression fix

Correções após validação local das Rounds 90–129:
- caminhos dos imports do Prisma Client em módulos aninhados;
- narrowing explícito de PlanCode/BillingPeriod no registro e billing;
- adaptação de JSON seguro para Prisma InputJsonValue;
- status remoto opcional do Mercado Pago;
- normalização de Client com retorno Prisma tipado sem união string/boolean/Date.

Sem alteração de schema ou migration.
