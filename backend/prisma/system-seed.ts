import { PrismaClient } from '../../generated-prisma';
import { hash } from 'bcryptjs';

const db = new PrismaClient();

async function ensurePlatformAdmin() {
  const email=(process.env.PLATFORM_ADMIN_EMAIL||'').trim().toLowerCase();
  const password=process.env.PLATFORM_ADMIN_PASSWORD||'';
  if(!email)throw new Error('PLATFORM_ADMIN_EMAIL não configurado');

  const existing=await db.platformAdmin.findUnique({where:{email},select:{id:true}});
  if(existing){
    console.log(`[SYSTEM_SEED] platform admin existente preservado: ${email}`);
    return;
  }

  if(password.length<8)throw new Error('PLATFORM_ADMIN_PASSWORD deve possuir pelo menos 8 caracteres para criar o administrador da plataforma');
  await db.platformAdmin.create({data:{name:'LuviePro Master',email,passwordHash:await hash(password,12),role:'platform_admin',active:true}});
  console.log(`[SYSTEM_SEED] platform admin criado: ${email}`);
}

async function main(){await ensurePlatformAdmin();}
main().catch(error=>{console.error('[SYSTEM_SEED_ERROR]',error instanceof Error?error.message:error);process.exitCode=1;}).finally(()=>db.$disconnect());
