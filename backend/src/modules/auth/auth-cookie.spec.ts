import { clearRefreshCookie,isWebAuthClient,readRefreshCookie,setRefreshCookie,webSessionResponse } from './auth-cookie';

describe('auth refresh cookie',()=>{
  const previousEnv={...process.env};
  afterEach(()=>{process.env={...previousEnv};});

  it('detecta explicitamente o cliente web',()=>{
    expect(isWebAuthClient({headers:{'x-auth-client':'web'}} as any)).toBe(true);
    expect(isWebAuthClient({headers:{}} as any)).toBe(false);
  });

  it('lê somente o cookie de refresh esperado',()=>{
    expect(readRefreshCookie({headers:{cookie:'foo=1; luviepro_refresh=abc%20123; bar=2'}} as any)).toBe('abc 123');
  });

  it('grava refresh como HttpOnly e remove o token do payload web',()=>{
    process.env.NODE_ENV='production';
    const res:any={cookie:jest.fn(),clearCookie:jest.fn()};
    const safe=webSessionResponse(res,{token:'access',refreshToken:'refresh-secret',user:{id:'u1'}});
    expect(safe).toEqual({token:'access',user:{id:'u1'}});
    expect(res.cookie).toHaveBeenCalledWith('luviepro_refresh','refresh-secret',expect.objectContaining({httpOnly:true,secure:true,path:'/api/auth',sameSite:'strict'}));
  });

  it('limpa o cookie usando os mesmos atributos',()=>{
    process.env.NODE_ENV='production';
    const res:any={cookie:jest.fn(),clearCookie:jest.fn()};
    clearRefreshCookie(res);
    expect(res.clearCookie).toHaveBeenCalledWith('luviepro_refresh',expect.objectContaining({httpOnly:true,secure:true,path:'/api/auth'}));
  });

  it('recusa SameSite=None sem Secure',()=>{
    process.env.NODE_ENV='development';
    process.env.AUTH_REFRESH_COOKIE_SAMESITE='none';
    process.env.AUTH_REFRESH_COOKIE_SECURE='false';
    const res:any={cookie:jest.fn()};
    expect(()=>setRefreshCookie(res,'token')).toThrow(/exige cookie Secure/);
  });
});
