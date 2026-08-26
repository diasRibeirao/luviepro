const digits=(value:string)=>value.replace(/\D/g,'');

export function isValidEmail(value:string){
  if(!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function documentMessage(value:string,type:'individual'|'company'){
  const size=digits(value).length;
  if(!size) return '';
  if(type==='individual'&&size!==11) return 'CPF deve ter 11 dígitos.';
  if(type==='company'&&size!==14) return 'CNPJ deve ter 14 dígitos.';
  return '';
}

export function cepMessage(value:string){
  const size=digits(value).length;
  return size===0||size===8?'':'CEP deve ter 8 dígitos.';
}
