import { Redirect } from 'expo-router';

// O cadastro principal é feito no modal da tela de clientes.
export default function ClientNew(){
  return <Redirect href="/clients"/>;
}
