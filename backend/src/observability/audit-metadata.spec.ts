import { auditMetadata } from './audit-metadata';
describe('auditMetadata',()=>it('returns prisma-safe JSON',()=>expect(auditMetadata({when:new Date('2026-01-01T00:00:00Z'),ok:true})).toEqual({when:'2026-01-01T00:00:00.000Z',ok:true})));
