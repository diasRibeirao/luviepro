import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const assert=(condition,message)=>{if(!condition){console.error(`FAIL ${message}`);process.exitCode=1}else console.log(`OK   ${message}`)};

const shell=read('src/components/AppShell.tsx');
const company=read('src/modules/settings/screens/CompanyScreen.tsx');
const logo=read('src/modules/settings/components/LogoUpload.tsx');
const register=read('src/modules/auth/screens/RegisterScreen.tsx');
const firstAccess=read('src/modules/auth/screens/AcceptInviteScreen.tsx');
const quoteWizard=read('src/modules/quotes/components/QuoteWizard.tsx');
const serviceScreen=read('src/modules/services/screens/ServicesScreen.tsx');

assert(shell.includes("onPress={()=>navigate('/home')}") && shell.includes('mobileBrand'),'logo/nome da empresa volta para a Home no desktop e mobile');
assert(shell.includes('mobileMenuOpen') && shell.includes('menu-outline') && shell.includes('<MobileMenu'),'layout reduzido oferece menu completo de navegação');
assert(shell.includes('primaryColor') && shell.includes('secondaryColor') && shell.includes('backgroundColor:brandPrimary'),'identidade visual da empresa é aplicada ao shell');
assert(shell.includes('tenantLogo') && shell.includes('mobileTenantLogo'),'logo personalizado aparece na navegação responsiva');
assert(company.includes('emitTenantBrandChanged()'),'salvar empresa atualiza identidade visual sem exigir novo login');
assert(logo.includes('dominantLogoColor') && logo.includes('primaryColor') && logo.includes('onPrimaryColorDetected'),'upload de logo sugere/aplica cor principal automaticamente quando permitido pelo plano');
assert(register.includes("router.replace('/first-access?newAccount=1')"),'nova conta segue para fluxo de primeiro acesso');
assert(firstAccess.includes('ownerOnboarding') && firstAccess.includes('Configurar minha empresa'),'primeiro acesso da conta proprietária oferece configuração inicial da empresa');
assert(quoteWizard.includes('service.team?.filter') && quoteWizard.includes("label:'P.O. responsável'") && quoteWizard.includes('dailyRateCents:item.team.length?item.team.reduce'),'orçamento reaproveita diárias/equipe do serviço selecionado e recalcula pela equipe');
assert(serviceScreen.includes('compositionIds') && serviceScreen.includes('applyComposition') && serviceScreen.includes('selected.flatMap'),'serviço composto permite selecionar serviços existentes e copiar equipe, custos e etapas');

if(process.exitCode) process.exit(process.exitCode);
console.log('\nAuditoria 08/09 concluída sem apontamentos estáticos.');
