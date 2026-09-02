import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const contracts = [
  ['app/(app)/home.tsx', 'src/modules/dashboard/screens/HomeScreen'],
  ['app/(app)/account.tsx', 'src/modules/account/screens/AccountScreen'],
  ['app/(app)/calculator.tsx', 'src/modules/calculator/screens/CalculatorScreen'],
  ['app/(app)/client-new.tsx', 'src/modules/clients/screens/ClientNewScreen'],
  ['app/(app)/project-statuses.tsx', 'src/modules/project-statuses/screens/ProjectStatusesScreen'],
  ['app/(app)/clients/index.tsx', 'src/modules/clients/screens/ClientsScreen'],
  ['app/(app)/services/index.tsx', 'src/modules/services/screens/ServicesScreen'],
  ['app/(app)/projects/index.tsx', 'src/modules/projects/screens/ProjectsScreen'],
  ['app/(app)/projects/[id].tsx', 'src/modules/projects/screens/ProjectDetailScreen'],
  ['app/(app)/quotes/index.tsx', 'src/modules/quotes/screens/QuotesScreen'],
  ['app/(app)/quote/[id]/index.tsx', 'src/modules/quotes/screens/QuoteDetailScreen'],
  ['app/(app)/settings/index.tsx', 'src/modules/settings/screens/SettingsScreen'],
  ['app/(app)/notifications/index.tsx', 'src/modules/notifications/screens/NotificationsScreen'],
  ['app/(app)/calendar/index.tsx', 'src/modules/calendar/screens/CalendarScreen'],
  ['app/(app)/plans/index.tsx', 'src/modules/plans/screens/PlansScreen'],
  ['app/(auth)/index.tsx', 'src/modules/auth/screens/LoginScreen'],
  ['app/(auth)/register.tsx', 'src/modules/auth/screens/RegisterScreen'],
  ['app/(auth)/forgot-password.tsx', 'src/modules/auth/screens/ForgotPasswordScreen'],
  ['app/(auth)/reset-password.tsx', 'src/modules/auth/screens/ResetPasswordScreen'],
  ['app/(public)/invite/[token].tsx', 'src/modules/auth/screens/AcceptInviteScreen'],
  ['app/(public)/p/[token].tsx', 'src/modules/quotes/screens/PublicProposalScreen'],
];

function resolveTarget(wrapper, targetNoExt) {
  const wrapperDir = path.dirname(path.join(root, wrapper));
  const candidates = ['.tsx', '.ts', '/index.tsx', '/index.ts'];
  for (const suffix of candidates) {
    const full = path.join(root, `${targetNoExt}${suffix}`);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function importedPath(content) {
  const match = content.match(/from\s+['"]([^'"]+)['"]/);
  return match?.[1] ?? null;
}

const errors = [];
for (const [wrapper, expectedTarget] of contracts) {
  const wrapperPath = path.join(root, wrapper);
  if (!fs.existsSync(wrapperPath)) {
    errors.push(`${wrapper}: wrapper ausente`);
    continue;
  }

  const targetPath = resolveTarget(wrapper, expectedTarget);
  if (!targetPath) {
    errors.push(`${wrapper}: tela esperada ausente (${expectedTarget})`);
    continue;
  }

  const content = fs.readFileSync(wrapperPath, 'utf8');
  const imported = importedPath(content);
  if (!imported) {
    errors.push(`${wrapper}: nenhum import de tela encontrado`);
    continue;
  }

  const importedAbs = path.resolve(path.dirname(wrapperPath), imported);
  const expectedAbs = path.join(root, expectedTarget);
  const normalizedImported = importedAbs.replaceAll('\\', '/');
  const normalizedExpected = expectedAbs.replaceAll('\\', '/');
  if (normalizedImported !== normalizedExpected) {
    errors.push(`${wrapper}: aponta para ${imported}; esperado ${expectedTarget}`);
  }
}

const behaviorContracts = [
  ['src/modules/purchases/screens/PurchasesScreen.tsx', 'Remover produto'],
  ['src/modules/purchases/screens/PurchasesScreen.tsx', 'Gerenciar fornecedores'],
  ['src/modules/purchases/components/SuppliersManager.tsx', 'updateSupplier'],
  ['src/modules/purchases/components/SuppliersManager.tsx', 'Buscar por nome, documento ou contato'],
  ['src/modules/quotes/paymentPlan.ts', 'depositBps=3000'],
  ['src/modules/quotes/screens/QuoteProposalScreen.tsx', 'Entrada via PIX (30%)'],
  ['src/modules/quotes/screens/QuoteProposalScreen.tsx', 'Saldo no cartão (70%)'],
  ['src/modules/quotes/screens/PublicProposalScreen.tsx', 'Entrada via PIX (30%)'],
  ['src/modules/quotes/screens/PublicProposalScreen.tsx', 'Saldo no cartão (70%)'],
];
for(const [file,expected] of behaviorContracts){
  const content=fs.readFileSync(path.join(root,file),'utf8');
  if(!content.includes(expected))errors.push(`${file}: contrato funcional ausente (${expected})`);
}

console.log(`Contratos de tela verificados: ${contracts.length}`);
if (errors.length) {
  console.error('\nFalhas nos contratos das rotas críticas:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Contratos das rotas críticas: OK');
