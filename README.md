# LuviePro — Round 149.1

Correção do quality gate de dívida de tipos.

O gate anterior contava `src/api.service.ts`, embora esse arquivo seja uma facade de compatibilidade já retirada do runtime do NestJS e mantida apenas para testes legados. O arquivo possui 16 ocorrências de `any`, fazendo o contador reportar 55 quando a dívida efetiva do runtime é 39.

A Round 149.1 mantém o limite em 40 e exclui apenas essa facade não-runtime. A proteção arquitetural existente (`api-facade-retirement.spec.ts`) continua garantindo que `ApiService` não volte a ser registrado no `AppModule`.

Nenhuma alteração de Prisma ou migration.


## Backup e recuperação — Plataforma

A área de Plataforma inclui backup manual do PostgreSQL do próprio LuviePro, histórico, checksum SHA-256, download do arquivo `.dump`, verificação de integridade e simulação não destrutiva de restauração. O backend usa `DATABASE_URL` e os binários `pg_dump`/`pg_restore`.

Em HML no Render Free, `BACKUP_STORAGE_PERSISTENT=false`: o filesystem é efêmero e os arquivos podem desaparecer em reinicializações, redeploys ou spin-down. Faça o download do `.dump` para manter uma cópia externa. Em ambiente com disco persistente, configure `BACKUP_STORAGE_DIR` para o ponto de montagem e `BACKUP_STORAGE_PERSISTENT=true`.


## Ajustes 08/09/2026 - v5
- Identidade visual: detecção automática da cor principal agora usa a imagem local selecionada antes do upload, evitando bloqueio CORS ao tentar ler a URL remota da logo no navegador.
- A cor detectada é persistida no tenant e o AppShell é notificado para atualizar a identidade imediatamente.

## Validação 08/09/2026
Consulte `VALIDACAO_2026-09-08.md` para o checklist de regressão dos apontamentos da validação da Calculadora/P.O., identidade visual, responsividade e primeiro acesso.

### Ajustes 08/09/2026 - v11
- Identidade visual: validação e normalização de cores hexadecimais (#RGB -> #RRGGBB).
- Erro de cor inválida exibido abaixo do campo correspondente.
- Validação equivalente no backend para `primaryColor` e `secondaryColor`.
- Prévia visual das cores na tela Empresa > Identidade visual.
- Correção do feedback de upload: mensagem de cor automática somente quando a cor foi realmente detectada.

### Ajustes 08/09/2026 - v12
- Navegação responsiva: menu de opções em telas reduzidas convertido para drawer lateral à direita, mantendo hamburger no cabeçalho, todas as rotas permitidas, conta, plano, idioma e logout.


### Ajustes 08/09/2026 - v13
- Novos serviços passam a iniciar com diária base de R$ 300,00 e 1 dia, alinhando o cadastro ao cenário validado da Calculadora P.O.
- Serviço sem equipe reaproveita essa diária no orçamento como P.O. responsável; com equipe, não há soma duplicada.
