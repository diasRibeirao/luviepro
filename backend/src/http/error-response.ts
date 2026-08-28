export function errorCode(v:unknown,f='HTTP_ERROR'){if(typeof v!=='string')return f;const n=v.trim().toUpperCase().replace(/[^A-Z0-9_]+/g,'_').replace(/^_+|_+$/g,'');return n||f;}
