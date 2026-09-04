import {Platform} from 'react-native';

type CellValue=string|number|boolean|null|undefined;

const encoder=new TextEncoder();
const crcTable=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;table[n]=c>>>0}return table})();

function crc32(bytes:Uint8Array){let crc=0xFFFFFFFF;for(const b of bytes)crc=crcTable[(crc^b)&0xFF]^(crc>>>8);return (crc^0xFFFFFFFF)>>>0}
function u16(value:number){return Uint8Array.of(value&0xFF,(value>>>8)&0xFF)}
function u32(value:number){return Uint8Array.of(value&0xFF,(value>>>8)&0xFF,(value>>>16)&0xFF,(value>>>24)&0xFF)}
function join(parts:Uint8Array[]){const size=parts.reduce((sum,p)=>sum+p.length,0),out=new Uint8Array(size);let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length}return out}
function xml(value:unknown){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
function columnName(index:number){let n=index+1,name='';while(n){n--;name=String.fromCharCode(65+n%26)+name;n=Math.floor(n/26)}return name}
function cellXml(value:CellValue,row:number,column:number,header=false){const ref=`${columnName(column)}${row}`;if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}"${header?' s="1"':''}><v>${value}</v></c>`;if(typeof value==='boolean')return `<c r="${ref}" t="b"${header?' s="1"':''}><v>${value?1:0}</v></c>`;return `<c r="${ref}" t="inlineStr"${header?' s="1"':''}><is><t xml:space="preserve">${xml(value)}</t></is></c>`}

function zipStore(files:Array<{name:string;content:string|Uint8Array}>){const locals:Uint8Array[]=[],centrals:Uint8Array[]=[];let offset=0;for(const file of files){const name=encoder.encode(file.name),data=typeof file.content==='string'?encoder.encode(file.content):file.content,crc=crc32(data);const local=join([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);locals.push(local);const central=join([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);centrals.push(central);offset+=local.length}const localData=join(locals),centralData=join(centrals),end=join([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralData.length),u32(localData.length),u16(0)]);return join([localData,centralData,end])}

export function buildXlsx(headers:string[],rows:CellValue[][],sheetName='Dados'){
  const safeSheet=sheetName.replace(/[\\/*?:\[\]]/g,' ').slice(0,31)||'Dados';
  const matrix:[CellValue[],...CellValue[][]]=[headers,...rows];
  const sheetRows=matrix.map((row,rowIndex)=>`<row r="${rowIndex+1}">${row.map((value,columnIndex)=>cellXml(value,rowIndex+1,columnIndex,rowIndex===0)).join('')}</row>`).join('');
  const lastColumn=columnName(Math.max(0,headers.length-1));
  const worksheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastColumn}${Math.max(1,matrix.length)}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${lastColumn}${Math.max(1,matrix.length)}"/></worksheet>`;
  const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(safeSheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`;
  const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const rootRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbookRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  return zipStore([
    {name:'[Content_Types].xml',content:contentTypes},
    {name:'_rels/.rels',content:rootRels},
    {name:'xl/workbook.xml',content:workbook},
    {name:'xl/_rels/workbook.xml.rels',content:workbookRels},
    {name:'xl/styles.xml',content:styles},
    {name:'xl/worksheets/sheet1.xml',content:worksheet},
  ]);
}

export async function presentXlsx(filename:string,bytes:Uint8Array){
  if(Platform.OS!=='web'||typeof document==='undefined')throw new Error('A exportação XLSX está disponível na versão Web.');
  const copy=new Uint8Array(bytes.length);copy.set(bytes);
  const blob=new Blob([copy.buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob);
  try{const anchor=document.createElement('a');anchor.href=url;anchor.download=filename.endsWith('.xlsx')?filename:`${filename}.xlsx`;anchor.style.display='none';document.body.appendChild(anchor);anchor.click();anchor.remove()}finally{URL.revokeObjectURL(url)}
}
