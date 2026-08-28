import { ApiError } from '../../api';
export const errorMessage=(error:unknown)=>error instanceof ApiError||error instanceof Error?error.message:'Erro inesperado';
