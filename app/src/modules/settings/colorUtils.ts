export function normalizeHexColor(value?:string|null):string{
  const raw=(value??'').trim();
  if(!raw)return '';
  const withHash=raw.startsWith('#')?raw:`#${raw}`;
  if(/^#[0-9a-fA-F]{3}$/.test(withHash)){
    const [r,g,b]=withHash.slice(1).split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if(/^#[0-9a-fA-F]{6}$/.test(withHash))return withHash.toUpperCase();
  return raw;
}

export function hexColorMessage(value?:string|null):string{
  const raw=(value??'').trim();
  if(!raw)return '';
  const normalized=normalizeHexColor(raw);
  return /^#[0-9A-F]{6}$/.test(normalized)?'':'Use uma cor hexadecimal válida, por exemplo #364036.';
}
