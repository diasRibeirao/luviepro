# Rounds 90–109 — Type Safety & Boundary Hardening

Baseline: fontes atualizados pelo Codex + Rounds 70–89 validadas pelo usuário em 62 suites / 225 testes.

## R90 — JSON domain contract
Contrato explícito `JsonPrimitive/JsonValue/JsonObject` para dados serializáveis.

## R91 — JSON safe input
Suporte explícito a `Date`, arrays readonly e `undefined` antes de persistir JSON.

## R92 — Deterministic JSON normalization
`toJsonValue()` converte Date para ISO, remove chaves undefined e normaliza arrays.

## R93 — Audit metadata boundary
`AuditMetadata` e `auditMetadata()` centralizam a conversão para `Prisma.InputJsonObject`.

## R94 — Client audit typing
`ClientsService` deixou de persistir metadata `any` diretamente.

## R95 — Client current-state typing
Normalização de clientes passou a usar payload Prisma tipado em vez de `current:any`.

## R96 — Client patch semantics
Atualizações preservam `false` e distinguem campo ausente de campo vazio.

## R97 — Calendar audit typing
Metadata de agenda passa pelo boundary JSON-safe.

## R98 — Shared date parsing
Parser `parseDateOrThrow` centraliza rejeição de datas inválidas.

## R99 — Shared date ordering
`assertDateOrder` centraliza regra início/fim.

## R100 — Project audit typing
Metadata de projeto passa pelo boundary JSON-safe.

## R101 — Integer clamp primitive
`clampInteger` padroniza limites inteiros; progresso de projeto usa o helper.

## R102 — Nullable string patch primitive
`nullableTrimmed` diferencia undefined/null/vazio e foi aplicado às notas do projeto.

## R103 — Account audit typing
Auditoria de conta deixa de receber JSON não tipado diretamente.

## R104 — HTML escaping extraction
Escape HTML foi movido para `security/html.ts`, reutilizável e testável.

## R105 — Typed mail transport boundary
`MailService` remove `any` explícito do módulo nodemailer/transporter.

## R106 — Mail delivery contract
Resultado de envio agora possui union `MailDelivery` (`sent`/`reason`).

## R107 — Invitation TTL config
TTL de convite passa a ter parser central com limites 1–720h.

## R108 — Invitation expiry primitive
Cálculo de expiração ganhou função pura e teste determinístico.

## R109 — Type-hardening architecture gate
Nova suíte impede regressões nas fronteiras audit/mail e agrega `npm run verify:type-hardening`.

## Banco de dados
Nenhuma mudança em `schema.prisma`. Não há migration nova.

## Validação
No ambiente de geração foi executada validação sintática/transpilação de todos os arquivos TypeScript: 0 erros sintáticos. O `npm install` local do ambiente de geração excedeu o tempo e deixou dependências de tipos incompletas, portanto o gate semântico final deve ser executado no ambiente do projeto:

```powershell
npm install
npx prisma generate
npm run typecheck
npm run build
npm test
```

Gate focado:

```powershell
npm run verify:type-hardening
```
