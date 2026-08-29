# Build mobile — LuviePro

## Pré-requisitos

1. Conta Expo/EAS.
2. API pública via HTTPS para builds instaláveis.
3. Substituir `REPLACE_WITH_EAS_PROJECT_ID` em `app.json` após executar `npx eas-cli init`.
4. Configurar `EXPO_PUBLIC_API_URL` no ambiente EAS com a URL HTTPS da API.

## Validar configuração

```bat
npm run typecheck
npm run test:auth
npm run config
```

## Android APK interno

```bat
npm run build:android:preview
```

O perfil `preview` gera APK para instalação direta em aparelhos de teste.

## Android Play Store

```bat
npm run build:android:production
```

O perfil `production` gera AAB, formato usado na Google Play.

## iOS

```bat
npm run build:ios:preview
npm run build:ios:production
```

A publicação iOS exige credenciais Apple válidas.

## Identificadores

- Android package: `br.com.luvieorganiza.luviepro`
- iOS bundle identifier: `br.com.luvieorganiza.luviepro`
- Deep link scheme: `luviepro://`

## Importante

Não gere build de produção apontando para `localhost`. O app já bloqueia URL HTTP em builds nativas de produção.

Antes de publicação final ainda devem ser adicionados os assets oficiais de ícone/splash da marca e executado QA em aparelho físico.
