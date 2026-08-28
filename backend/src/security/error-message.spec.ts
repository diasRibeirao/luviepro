import {errorMessage} from './error-message';
describe('errorMessage',()=>{it('normalizes unknown errors',()=>{expect(errorMessage(new Error('x'))).toBe('x');expect(errorMessage('y')).toBe('y');expect(errorMessage(null,'f')).toBe('f');});});
