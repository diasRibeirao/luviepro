# Revisão técnica e visual do dev.zip

## Melhorias aplicadas

- Shell Web reorganizado: controle de recolher/expandir saiu da sidebar e passou para a topbar, entre a marca/menu e o contexto da página.
- Topbar desktop agora prioriza título, subtítulo e breadcrumb da página, em vez de repetir a marca LuviePro.
- Sidebar preserva 260 px expandida e 76 px recolhida, com preferência persistida.
- Grupos do menu e textos estruturais adicionados ao catálogo PT-BR / EN-US / ES-ES.
- Acessibilidade do cabeçalho passou a respeitar o idioma selecionado.
- Datas das notificações passam a usar o locale selecionado, em vez de fixar `pt-BR`.
- Campo de senha da tela Conta passa pelo componente TextInput localizado.
- README atualizado para refletir o produto atual e não tratá-lo apenas como um MVP local.
- Pacote de entrega limpo: removidos `.env`, `.git`, `.expo`, `dist` e banco SQLite residual do ZIP.

## Pontos observados para próximas rodadas

- Há uso intenso de `any` no frontend e backend; a próxima rodada técnica deve tipar respostas da API e DTOs de tela gradualmente.
- O backend ainda concentra muitas responsabilidades em `api.service.ts`; recomenda-se separar por domínio (clientes, serviços, orçamentos, projetos, assinatura e notificações).
- O i18n atual mantém compatibilidade por tradução de literais. Funciona bem para migração, mas novas telas devem preferir chaves semânticas (`t('...')`) para textos dinâmicos.
- Recomenda-se adicionar testes de frontend para fluxos críticos e testes e2e da API antes de produção.
