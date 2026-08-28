export type ClientKind='individual'|'company';

export type ClientRecord={
  id:string;
  type:ClientKind|string;
  name:string;
  legalName?:string|null;
  document?:string|null;
  stateRegistration?:string|null;
  municipalRegistration?:string|null;
  contactName?:string|null;
  phone?:string|null;
  whatsapp?:string|null;
  email?:string|null;
  zipCode?:string|null;
  addressLine?:string|null;
  addressNumber?:string|null;
  addressComplement?:string|null;
  neighborhood?:string|null;
  city?:string|null;
  state?:string|null;
  notes?:string|null;
  createdAt?:string|null;
};

export type ClientForm={
  type:ClientKind;
  name:string;
  legalName:string;
  document:string;
  stateRegistration:string;
  municipalRegistration:string;
  contactName:string;
  phone:string;
  whatsapp:string;
  email:string;
  zipCode:string;
  addressLine:string;
  addressNumber:string;
  addressComplement:string;
  neighborhood:string;
  city:string;
  state:string;
  notes:string;
};

export const emptyClientForm:ClientForm={
  type:'individual',name:'',legalName:'',document:'',stateRegistration:'',municipalRegistration:'',
  contactName:'',phone:'',whatsapp:'',email:'',zipCode:'',addressLine:'',addressNumber:'',
  addressComplement:'',neighborhood:'',city:'',state:'',notes:''
};
