# Validação LuviePro — 08/09/2026

Checklist de regressão dos apontamentos recebidos em `Validação_Calculadora_P.O (1)(1).docx`.

## Orçamentos / P.O.
- [x] Serviço com equipe usa as diárias dos integrantes cadastrados.
- [x] Serviço sem equipe pode usar a diária base como P.O. responsável.
- [x] A diária base não é somada novamente quando já existe equipe.
- [x] Alteração de diária participa do recálculo do orçamento.
- [x] Calculadora com vários serviços soma as diárias mínimas de todos os serviços selecionados.
- [x] Serviço sem equipe entra na calculadora com sua diária cadastrada como P.O. responsável.

## Composição de serviços
- [x] Novo serviço pode ser composto a partir de serviços existentes.
- [x] Composição reaproveita equipe/diárias, etapas e custos/valores aplicáveis.
- [x] Em composição mista, serviço sem equipe preserva sua diária como P.O. responsável, sem perder valor quando outro serviço possui equipe.

## Identidade visual
- [x] Logo e cores do tenant são aplicadas no AppShell.
- [x] Alteração salva atualiza a identidade visual da aplicação.
- [x] No web, a cor pode ser detectada a partir do arquivo local da logo antes do upload, evitando dependência de CORS da URL remota.

## Navegação responsiva
- [x] Marca/logo navega para `/home`.
- [x] Layout reduzido possui botão de menu.
- [x] Menu mobile expõe as opções permitidas ao perfil.
- [x] Barra inferior mantém Início, Clientes, Orçamentos, Projetos e Mais.

## Nova conta / primeiro acesso
- [x] Cadastro de nova conta direciona para `/first-access?newAccount=1`.
- [x] Primeiro acesso direciona para configuração inicial da empresa.
- [x] Configuração inicial deve ser concluída antes do fluxo normal para a Home.
- [x] Conclusão do onboarding fica persistida no tenant; tentativa de abrir outra tela antes da conclusão retorna para Empresa.

## Acompanhamento
- [ ] Revalidar em 14/09/2026 eventual alteração do plano, conforme observação do documento de validação.

## Teste em homologação recomendado
1. Criar conta nova e confirmar Primeiro acesso -> Empresa -> Home.
2. Trocar logo e confirmar atualização da marca/cor sem recarregar a página.
3. Reduzir a largura da janela e confirmar acesso ao menu completo.
4. Criar serviço com P.O. de valor conhecido e gerar orçamento a partir dele.
5. Confirmar que a P.O. não aparece duplicada e que o total reage à alteração da diária.
6. Criar serviço composto e conferir equipe, etapas e custos/valores trazidos dos serviços de origem.

## Complemento v11 — identidade visual

- Cores primária e de destaque agora são validadas antes do salvamento.
- Formato curto (#RGB) é normalizado para #RRGGBB.
- Campos inválidos exibem mensagem abaixo do próprio campo.
- Backend também valida #RRGGBB para impedir valores inválidos via API.
- A tela mostra prévia das duas cores configuradas.
- O aviso de cor detectada automaticamente só é exibido quando a detecção realmente encontrou uma cor.
- Auditoria: `node scripts/audit-visual-identity-colors.mjs` — 6/6 checks OK.

## v12 — Navegação em tela reduzida
- O menu de opções em celular/tablet passa a abrir como drawer lateral pela direita, em vez de folha inferior.
- O botão de menu permanece visível no cabeçalho reduzido.
- O drawer mantém todas as opções permitidas ao perfil, conta, plano, idioma e sair.
- A navegação fecha automaticamente o drawer.

## v13 — Diária base padrão do serviço
- Novo serviço inicia com diária base de R$ 300,00, conforme apontamento da validação.
- O padrão mantém 1 dia de projeto.
- Quando o serviço não possui equipe, a diária base é levada ao orçamento como `P.O. responsável`.
- Quando há equipe, permanecem válidas as diárias dos integrantes, sem duplicar a diária base.
