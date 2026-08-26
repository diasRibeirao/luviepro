import * as SecureStore from 'expo-secure-store';
const KEY='luviepro.auth.v2';
export const readAuth=()=>SecureStore.getItemAsync(KEY);
export const writeAuth=(value:string)=>SecureStore.setItemAsync(KEY,value);
export const clearAuth=()=>SecureStore.deleteItemAsync(KEY);
