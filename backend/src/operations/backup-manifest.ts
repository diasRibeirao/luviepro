import {createHash} from 'crypto';
export interface BackupManifest{version:1;createdAt:string;database:string;bytes:number;sha256:string}
export function sha256(buffer:Buffer){return createHash('sha256').update(buffer).digest('hex');}
export function createBackupManifest(database:string,payload:Buffer,now=new Date()):BackupManifest{if(!database.trim())throw new Error('database obrigatório');if(!payload.length)throw new Error('backup vazio');return {version:1,createdAt:now.toISOString(),database:database.trim(),bytes:payload.length,sha256:sha256(payload)};}
export function verifyBackupPayload(manifest:BackupManifest,payload:Buffer){return manifest.version===1&&manifest.bytes===payload.length&&manifest.sha256===sha256(payload);}
