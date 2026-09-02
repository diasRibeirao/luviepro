import {Platform,Share} from 'react-native';

export function csvCell(value:unknown){
  const text=value==null?'':String(value);
  return `"${text.replace(/"/g,'""')}"`;
}

export function buildCsv(headers:string[],rows:unknown[][],separator=';'){
  return '\uFEFF'+[headers.map(csvCell).join(separator),...rows.map(row=>row.map(csvCell).join(separator))].join('\r\n');
}

export async function presentCsv(filename:string,csv:string){
  if(Platform.OS==='web'&&typeof document!=='undefined'){
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    try{
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download=filename;anchor.style.display='none';
      document.body.appendChild(anchor);anchor.click();anchor.remove();
    }finally{URL.revokeObjectURL(url)}
    return;
  }
  await Share.share({title:filename,message:csv});
}
