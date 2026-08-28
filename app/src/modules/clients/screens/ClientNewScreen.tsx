import { Redirect } from 'expo-router';

/**
 * O cadastro principal de clientes continua sendo realizado
 * pelo modal da tela de clientes.
 */
export default function ClientNewScreen(){
  return <Redirect href="/clients"/>;
}
