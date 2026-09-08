type Listener=()=>void;
const listeners=new Set<Listener>();

export function subscribeTenantBrand(listener:Listener){
  listeners.add(listener);
  return ()=>listeners.delete(listener);
}

export function emitTenantBrandChanged(){
  for(const listener of [...listeners])listener();
}
