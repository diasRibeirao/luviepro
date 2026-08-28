import { escapeHtml } from './html';describe('escapeHtml',()=>it('escapes markup-sensitive characters',()=>expect(escapeHtml(`<b a='x'>&"`)).toBe('&lt;b a=&#039;x&#039;&gt;&amp;&quot;')));
