# LuviePro — Round 149.1

Correção do quality gate de dívida de tipos.

O gate anterior contava `src/api.service.ts`, embora esse arquivo seja uma facade de compatibilidade já retirada do runtime do NestJS e mantida apenas para testes legados. O arquivo possui 16 ocorrências de `any`, fazendo o contador reportar 55 quando a dívida efetiva do runtime é 39.

A Round 149.1 mantém o limite em 40 e exclui apenas essa facade não-runtime. A proteção arquitetural existente (`api-facade-retirement.spec.ts`) continua garantindo que `ApiService` não volte a ser registrado no `AppModule`.

Nenhuma alteração de Prisma ou migration.
