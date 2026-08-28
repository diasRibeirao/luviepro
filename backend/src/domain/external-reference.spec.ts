import {buildExternalReference,isSafeExternalReference} from './external-reference';
describe('external reference',()=>{it('accepts generated refs and rejects unsafe characters',()=>{expect(isSafeExternalReference(buildExternalReference('luviepro','tenant1','abc12345'))).toBe(true);expect(isSafeExternalReference('bad ref/?')).toBe(false);});});
