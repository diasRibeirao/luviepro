const KEY=/^[A-Za-z0-9._:-]{8,128}$/;export function validIdempotencyKey(value:unknown):value is string{return typeof value==='string'&&KEY.test(value)}
