# LuviePro

MVP local do SaaS para personal organizers, com API NestJS multi-tenant e aplicativo React Native. A organização e os comandos seguem o padrão do projeto Atleta360.

## Estrutura

- `backend/`: API NestJS, Prisma e PostgreSQL;
- `app/`: frontend React Native com Expo e suporte web.
- `docker-compose.yml`: PostgreSQL 16 e Redis 7 para desenvolvimento.

## Primeira execução

Na primeira execução, use o instalador local na raiz do projeto:

```powershell
cd C:\opt\projetos\luviepro\fonte
.\setup.cmd
```

Depois, inicie PostgreSQL, Redis, API e aplicativo com:

```powershell
.\dev.cmd
```

Para executar no celular com Expo Go (SDK 54), use:

```powershell
.\mobile.cmd
```

O computador e o celular devem estar na mesma rede. No aplicativo nativo, o endereço da API é derivado automaticamente do endereço do Metro, evitando o uso incorreto de `localhost` no celular.

Acesse o endereço exibido pelo frontend. Para usar Expo Go em um aparelho físico, altere `EXPO_PUBLIC_API_URL` em `app/.env` para o IP da máquina.

Login demo: `luana@luviepro.local` / `LuviePro123!`.

## Arquitetura

- `backend`: NestJS + Prisma + PostgreSQL 16.
- `app`: Expo/React Native, também executável no navegador.
- Todas as entidades operacionais carregam `tenantId`; o tenant é obtido exclusivamente do JWT.
- Valores monetários trafegam e são persistidos em centavos.

## Serviços locais

| Serviço | Endereço |
|---|---|
| API | `http://localhost:3333/api` |
| PostgreSQL | `localhost:5434` |
| Redis | `localhost:6380` |
| Frontend web | `http://localhost:8081` |

Os volumes Docker `postgres_data` e `redis_data` preservam os dados entre reinicializações.
