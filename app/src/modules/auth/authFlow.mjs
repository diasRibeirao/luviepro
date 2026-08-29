export function postLoginRoute(session){
  return session.platform?'/platform':'/home';
}

export function isPublicAuthRoute(path){
  return path==='/'||path==='/register'||path==='/forgot-password'||path==='/reset-password'||path.startsWith('/invite/')||path.startsWith('/p/');
}

export function authGuardRedirect(authenticated,path,platform=false){
  if(!authenticated&&!isPublicAuthRoute(path))return '/';
  if(!authenticated)return undefined;

  if(platform){
    if(path!=='/platform'&&!path.startsWith('/platform/'))return '/platform';
    return undefined;
  }

  if(path==='/platform'||path.startsWith('/platform/'))return '/home';
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
