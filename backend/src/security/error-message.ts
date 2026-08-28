export function errorMessage(error:unknown,fallback='Erro inesperado'):string{return error instanceof Error&&error.message?error.message:String(error||fallback);}
