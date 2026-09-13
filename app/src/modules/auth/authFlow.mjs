export function isBillingRestrictedSession(session){
  const status=String(session?.tenantStatus??session?.tenant?.status??'').toLowerCase();
  const expiresAt=session?.subscriptionExpiresAt??session?.tenant?.subscriptionExpiresAt;
  const expiresAtMs=expiresAt?Date.parse(String(expiresAt)):Number.NaN;
  const expiredByDate=Number.isFinite(expiresAtMs)&&expiresAtMs<=Date.now();
  return status==='expired'||status==='payment_review'||expiredByDate;
}

export function postLoginRoute(session){
  if(session.platform)return '/platform';
  if(isBillingRestrictedSession({
    ...session.user,
    tenantStatus:session.tenant?.status,
    subscriptionExpiresAt:session.tenant?.subscriptionExpiresAt,
  }))return '/plans';
  return '/home';
}

export function isPublicAuthRoute(path){
  return path==='/'||path==='/register'||path==='/forgot-password'||path==='/reset-password'||path==='/first-access'||path.startsWith('/first-access?')||path.startsWith('/invite/')||path.startsWith('/p/');
}

export function authGuardRedirect(authenticated,path,platform=false,billingRestricted=false){
  if(!authenticated&&!isPublicAuthRoute(path))return '/';
  if(!authenticated)return undefined;

  if(platform){
    if(path!=='/platform'&&!path.startsWith('/platform/'))return '/platform';
    return undefined;
  }

  if(path==='/platform'||path.startsWith('/platform/'))return billingRestricted?'/plans':'/home';

  if(billingRestricted){
    if(path==='/plans'||path.startsWith('/plans?'))return undefined;
    return '/plans';
  }

  if(path==='/'||path==='/register')return '/home';
  return undefined;
}

export async function runLogin(email,password,request,establish){
  const response=await request(email,password);
  establish(response);
  return postLoginRoute(response);
}

export async function runLogout(confirmLogout,logout,replace){
  if(!await confirmLogout())return false;
  await logout();
  replace('/');
  return true;
}