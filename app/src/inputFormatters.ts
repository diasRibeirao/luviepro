export const digits=(value:string,max?:number)=>{
  const out=String(value??'').replace(/\D/g,'');
  return typeof max==='number'?out.slice(0,max):out;
};

export function formatCpfCnpj(value:string){
  const d=digits(value,14);
  if(d.length<=11){
    return d
      .replace(/^(\d{3})(\d)/,'$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3')
      .replace(/\.(\d{3})(\d)/,'.$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/,'$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3')
    .replace(/\.(\d{3})(\d)/,'.$1/$2')
    .replace(/(\/\d{4})(\d)/,'$1-$2');
}

export function formatPhone(value:string){
  const d=digits(value,11);
  if(!d)return '';
  if(d.length<=2)return `(${d}`;
  if(d.length<=6)return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if(d.length<=10)return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

export function formatCep(value:string){
  const d=digits(value,8);
  return d.length>5?`${d.slice(0,5)}-${d.slice(5)}`:d;
}

export function formatUf(value:string){
  return String(value??'').replace(/[^a-zA-Z]/g,'').toUpperCase().slice(0,2);
}

export function decimalInput(value:string,decimals=2,max?:number){
  let text=String(value??'').replace(/\./g,',').replace(/[^\d,]/g,'');
  const comma=text.indexOf(',');
  if(comma>=0){
    text=text.slice(0,comma+1)+text.slice(comma+1).replace(/,/g,'').slice(0,decimals);
  }
  if(typeof max==='number'&&text){
    const number=Number(text.replace(',','.'));
    if(Number.isFinite(number)&&number>max)return String(max).replace('.',',');
  }
  return text;
}

export const integerInput=(value:string,maxLength=6)=>digits(value,maxLength);
