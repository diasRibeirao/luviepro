export type CepAddress={
  zipCode:string;
  addressLine:string;
  neighborhood:string;
  city:string;
  state:string;
};

const digits=(value:string)=>value.replace(/\D/g,'');

export async function lookupCep(value:string):Promise<CepAddress>{
  const cep=digits(value);
  if(cep.length!==8) throw new Error('Informe um CEP com 8 dígitos.');
  const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if(!response.ok) throw new Error('Não foi possível consultar o CEP.');
  const data=await response.json();
  if(data?.erro) throw new Error('CEP não encontrado.');
  return {
    zipCode:`${cep.slice(0,5)}-${cep.slice(5)}`,
    addressLine:data.logradouro??'',
    neighborhood:data.bairro??'',
    city:data.localidade??'',
    state:(data.uf??'').toUpperCase(),
  };
}
