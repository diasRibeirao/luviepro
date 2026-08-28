import {createHash} from 'crypto';export function weakEtag(value:unknown){const hash=createHash('sha1').update(JSON.stringify(value)).digest('base64url').slice(0,16);return `W/"${hash}"`}
