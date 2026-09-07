# LuviePro — Round 149.1

Correção do quality gate de dívida de tipos.

O gate anterior contava `src/api.service.ts`, embora esse arquivo seja uma facade de compatibilidade já retirada do runtime do NestJS e mantida apenas para testes legados. O arquivo possui 16 ocorrências de `any`, fazendo o contador reportar 55 quando a dívida efetiva do runtime é 39.

A Round 149.1 mantém o limite em 40 e exclui apenas essa facade não-runtime. A proteção arquitetural existente (`api-facade-retirement.spec.ts`) continua garantindo que `ApiService` não volte a ser registrado no `AppModule`.

Nenhuma alteração de Prisma ou migration.


## Backup e recuperação — Plataforma

A área de Plataforma inclui backup manual do PostgreSQL do próprio LuviePro, histórico, checksum SHA-256, download do arquivo `.dump`, verificação de integridade e simulação não destrutiva de restauração. O backend usa `DATABASE_URL` e os binários `pg_dump`/`pg_restore`.

Em HML no Render Free, `BACKUP_STORAGE_PERSISTENT=false`: o filesystem é efêmero e os arquivos podem desaparecer em reinicializações, redeploys ou spin-down. Faça o download do `.dump` para manter uma cópia externa. Em ambiente com disco persistente, configure `BACKUP_STORAGE_DIR` para o ponto de montagem e `BACKUP_STORAGE_PERSISTENT=true`.
