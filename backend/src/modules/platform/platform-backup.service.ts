import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { createBackupManifest, type BackupManifest, verifyBackupPayload } from '../../operations/backup-manifest';
import { restorePreflight } from '../../operations/restore-preflight';

const execFileAsync = promisify(execFile);

type BackupStatus = 'ready' | 'invalid';
type StoredBackupManifest = BackupManifest & {
  id: string;
  description?: string;
  fileName: string;
  status: BackupStatus;
};

@Injectable()
export class PlatformBackupService {
  private readonly storageDir = process.env.BACKUP_STORAGE_DIR?.trim()
    ? path.resolve(process.env.BACKUP_STORAGE_DIR.trim())
    : path.resolve(process.cwd(), 'var', 'backups');

  private readonly retentionCount = Math.max(1, Math.min(200, Number(process.env.BACKUP_RETENTION_COUNT ?? 20) || 20));

  private databaseConfig() {
    const raw = process.env.DATABASE_URL?.trim();
    if (!raw) throw new Error('DATABASE_URL não configurada');
    const url = new URL(raw);
    const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
    if (!database) throw new Error('Nome do banco não identificado em DATABASE_URL');
    return {
      database,
      env: {
        ...process.env,
        PGHOST: url.hostname,
        PGPORT: url.port || '5432',
        PGUSER: decodeURIComponent(url.username),
        PGPASSWORD: decodeURIComponent(url.password),
        PGDATABASE: database,
        PGSSLMODE: url.searchParams.get('sslmode') || (process.env.NODE_ENV === 'production' ? 'require' : process.env.PGSSLMODE),
      },
    };
  }

  private manifestPath(id: string) {
    return path.join(this.storageDir, `${id}.json`);
  }

  private backupPath(fileName: string) {
    return path.join(this.storageDir, fileName);
  }

  private validateId(id: string) {
    if (!/^backup-[a-zA-Z0-9-]{10,80}$/.test(id)) throw new Error('Identificador de backup inválido');
  }

  private async ensureStorage() {
    await fs.mkdir(this.storageDir, { recursive: true });
    const probe = path.join(this.storageDir, `.probe-${process.pid}-${Date.now()}`);
    await fs.writeFile(probe, 'ok');
    await fs.unlink(probe).catch(() => undefined);
  }

  private async toolAvailable(command: 'pg_dump' | 'pg_restore') {
    try {
      await execFileAsync(command, ['--version'], { timeout: 4000, windowsHide: true });
      return true;
    } catch {
      return false;
    }
  }

  async storageStatus() {
    let writable = false;
    try {
      await this.ensureStorage();
      writable = true;
    } catch {
      writable = false;
    }
    const [pgDump, pgRestore] = await Promise.all([this.toolAvailable('pg_dump'), this.toolAvailable('pg_restore')]);
    const persistent = process.env.BACKUP_STORAGE_PERSISTENT === 'true';
    return {
      state: writable && pgDump && pgRestore ? (persistent ? 'ok' : 'warning') : 'down',
      writable,
      pgDump,
      pgRestore,
      persistent,
      retentionCount: this.retentionCount,
      detail: !writable
        ? 'Armazenamento de backup indisponível'
        : !pgDump || !pgRestore
          ? 'Ferramentas PostgreSQL de backup/restauração não disponíveis no servidor'
          : persistent
            ? 'Armazenamento persistente operacional'
            : 'Armazenamento operacional, mas persistência não confirmada',
    };
  }

  private async readManifest(id: string): Promise<StoredBackupManifest> {
    this.validateId(id);
    const content = await fs.readFile(this.manifestPath(id), 'utf8');
    const parsed = JSON.parse(content) as StoredBackupManifest;
    if (parsed.id !== id || parsed.fileName !== `${id}.dump`) throw new Error('Manifesto de backup inválido');
    return parsed;
  }

  private async manifests(): Promise<StoredBackupManifest[]> {
    await this.ensureStorage();
    const files = await fs.readdir(this.storageDir);
    const manifests: StoredBackupManifest[] = [];
    for (const file of files.filter((name) => /^backup-.*\.json$/.test(name))) {
      try {
        const parsed = JSON.parse(await fs.readFile(path.join(this.storageDir, file), 'utf8')) as StoredBackupManifest;
        if (parsed?.id && parsed?.fileName && parsed?.createdAt) manifests.push(parsed);
      } catch {
        // Um manifesto corrompido não deve impedir a listagem dos backups íntegros.
      }
    }
    return manifests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async list() {
    const [storage, items] = await Promise.all([this.storageStatus(), this.manifests().catch(() => [])]);
    return {
      storage,
      items: items.map((item) => ({
        id: item.id,
        description: item.description ?? null,
        createdAt: item.createdAt,
        bytes: item.bytes,
        sha256: item.sha256,
        status: item.status,
        database: item.database,
      })),
    };
  }

  async create(description?: string) {
    await this.ensureStorage();
    if (!(await this.toolAvailable('pg_dump'))) throw new Error('pg_dump não está disponível no servidor');
    const { database, env } = this.databaseConfig();
    const id = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
    const fileName = `${id}.dump`;
    const target = this.backupPath(fileName);

    try {
      await execFileAsync('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--file', target], {
        env,
        timeout: 10 * 60 * 1000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      });
      const payload = await fs.readFile(target);
      const base = createBackupManifest(database, payload);
      const manifest: StoredBackupManifest = {
        ...base,
        id,
        fileName,
        description: description?.trim() || undefined,
        status: 'ready',
      };
      await fs.writeFile(this.manifestPath(id), JSON.stringify(manifest, null, 2), 'utf8');
      await this.enforceRetention();
      return {
        id,
        description: manifest.description ?? null,
        createdAt: manifest.createdAt,
        bytes: manifest.bytes,
        sha256: manifest.sha256,
        status: manifest.status,
        database: manifest.database,
      };
    } catch (error) {
      await fs.unlink(target).catch(() => undefined);
      await fs.unlink(this.manifestPath(id)).catch(() => undefined);
      throw error;
    }
  }

  async download(id: string) {
    const manifest = await this.readManifest(id);
    const filePath = this.backupPath(manifest.fileName);
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error('Arquivo de backup não encontrado');
    return { fileName: manifest.fileName, path: filePath, bytes: stat.size };
  }

  async verify(id: string) {
    const manifest = await this.readManifest(id);
    const payload = await fs.readFile(this.backupPath(manifest.fileName));
    const valid = verifyBackupPayload(manifest, payload);
    return {
      id,
      ok: valid,
      bytes: payload.length,
      sha256: manifest.sha256,
      checkedAt: new Date().toISOString(),
      message: valid ? 'Checksum e tamanho conferem com o manifesto.' : 'O arquivo diverge do manifesto e não deve ser restaurado.',
    };
  }

  async simulateRestore(id: string) {
    if (!(await this.toolAvailable('pg_restore'))) throw new Error('pg_restore não está disponível no servidor');
    const manifest = await this.readManifest(id);
    const payloadPath = this.backupPath(manifest.fileName);
    const payload = await fs.readFile(payloadPath);
    const { database } = this.databaseConfig();
    const preflight = restorePreflight(manifest, payload, database, 24 * 365 * 10);
    if (!preflight.ok) {
      return { id, ok: false, reasons: preflight.reasons, checkedAt: new Date().toISOString(), objects: 0 };
    }
    try {
      const { stdout } = await execFileAsync('pg_restore', ['--list', payloadPath], {
        timeout: 60_000,
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024,
      });
      const objects = stdout.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith(';')).length;
      return {
        id,
        ok: true,
        reasons: [],
        checkedAt: new Date().toISOString(),
        objects,
        message: 'Backup legível pelo PostgreSQL e aprovado no preflight. Nenhum dado foi alterado.',
      };
    } catch {
      return {
        id,
        ok: false,
        reasons: ['pg_restore não conseguiu ler o arquivo de backup'],
        checkedAt: new Date().toISOString(),
        objects: 0,
      };
    }
  }

  private async enforceRetention() {
    const items = await this.manifests();
    for (const item of items.slice(this.retentionCount)) {
      await Promise.all([
        fs.unlink(this.backupPath(item.fileName)).catch(() => undefined),
        fs.unlink(this.manifestPath(item.id)).catch(() => undefined),
      ]);
    }
  }
}
