import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const E2E_API_URL='https://e2e.invalid/api';
const appDir=process.cwd();

function run(label,command,args,env=process.env){
  console.log(`\n[E2E] ${label}`);
  console.log(`[E2E] > ${[command,...args].join(' ')}`);
  const result=spawnSync(command,args,{cwd:appDir,env:{...env},stdio:'inherit',windowsHide:false});
  if(result.error)throw new Error(`Falha ao iniciar "${label}": ${result.error.message}`);
  if(result.signal)throw new Error(`"${label}" foi encerrado pelo sinal ${result.signal}.`);
  if(result.status!==0){
    const error=new Error(`"${label}" falhou com exit code ${result.status}.`);
    error.exitCode=result.status??1;
    throw error;
  }
  console.log(`[E2E] ${label}: OK`);
}

const npmCli=process.env.npm_execpath;
const playwrightCli=resolve(appDir,'node_modules','@playwright','test','cli.js');
if(!npmCli||!existsSync(npmCli)){
  console.error('[E2E] Não foi possível localizar o npm CLI em process.env.npm_execpath.');
  process.exit(1);
}
if(!existsSync(playwrightCli)){
  console.error(`[E2E] Playwright CLI não encontrado em ${playwrightCli}. Execute npm install.`);
  process.exit(1);
}

try{
  // O Expo substitui EXPO_PUBLIC_* durante o bundle e pode reaproveitar cache.
  // Para o E2E usamos a própria variável pública oficial, com URL HTTPS fictícia,
  // desabilitamos o .env do projeto e limpamos o cache do Metro. Assim o teste
  // não toca na API local/HML e continua passando pela mesma regra de segurança
  // aplicada à build de produção.
  const e2eEnv={
    ...process.env,
    EXPO_NO_DOTENV:'1',
    EXPO_PUBLIC_API_URL:E2E_API_URL,
    EXPO_PUBLIC_E2E_API_URL:E2E_API_URL,
  };
  console.log(`[E2E] Override dedicado da API: ${E2E_API_URL}`);
  run('Gerando bundle Web',process.execPath,[npmCli,'run','export:web','--','--clear'],e2eEnv);
  run('Executando Playwright',process.execPath,[playwrightCli,'test'],e2eEnv);
  console.log('\n[E2E] Homologação Web concluída com sucesso.');
}catch(error){
  console.error(`\n[E2E] ${error instanceof Error?error.message:String(error)}`);
  process.exitCode=Number.isInteger(error?.exitCode)?error.exitCode:1;
}
