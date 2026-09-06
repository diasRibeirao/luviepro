import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'src','i18n.tsx');
let src=fs.readFileSync(file,'utf8');

const entries=new Map([
  ["Produtos", ["Products", "Productos"]],
  ["Novo produto", ["New product", "Nuevo producto"]],
  ["Editar produto", ["Edit product", "Editar producto"]],
  ["Dados comerciais e parâmetros para o estoque.", ["Commercial data and inventory parameters.", "Datos comerciales y parámetros de inventario."]],
  ["Salvar produto", ["Save product", "Guardar producto"]],
  ["Excluindo...", ["Deleting...", "Eliminando..."]],
  ["Excluir produto", ["Delete product", "Eliminar producto"]],
  ["Excluir produto?", ["Delete product?", "¿Eliminar producto?"]],
  ["Produto excluído", ["Product deleted", "Producto eliminado"]],
  ["Não foi possível excluir o produto", ["Unable to delete product", "No fue posible eliminar el producto"]],
  ["Produto atualizado", ["Product updated", "Producto actualizado"]],
  ["Produto criado", ["Product created", "Producto creado"]],
  ["Não foi possível salvar", ["Unable to save", "No fue posible guardar"]],
  ["Nome *", ["Name *", "Nombre *"]],
  ["SKU / código *", ["SKU / code *", "SKU / código *"]],
  ["Descrição", ["Description", "Descripción"]],
  ["Categoria", ["Category", "Categoría"]],
  ["Digite uma categoria", ["Enter a category", "Ingresa una categoría"]],
  ["Unidade (un, kit, cx, pct, m, kg)", ["Unit (un, kit, box, pkg, m, kg)", "Unidad (un, kit, caja, paquete, m, kg)"]],
  ["Custo (R$)", ["Cost (R$)", "Costo (R$)"]],
  ["Preço de venda (R$)", ["Sale price (R$)", "Precio de venta (R$)"]],
  ["Estoque mínimo", ["Minimum stock", "Stock mínimo"]],
  ["Fornecedор", ["Supplier", "Proveedor"]],
  ["Fornecedor", ["Supplier", "Proveedor"]],
  ["Código de barras", ["Barcode", "Código de barras"]],
  ["Produto ativo para novas vendas", ["Product active for new sales", "Producto activo para nuevas ventas"]],
  ["Estoque inicial", ["Initial stock", "Stock inicial"]],
  ["Estoque físico", ["Physical stock", "Stock físico"]],
  ["Reservado", ["Reserved", "Reservado"]],
  ["Disponível", ["Available", "Disponible"]],
  ["Mínimo", ["Minimum", "Mínimo"]],
  ["SKU", ["SKU", "SKU"]],
  ["Preço", ["Price", "Precio"]],
  ["Estoque", ["Stock", "Stock"]],
  ["Ativo", ["Active", "Activo"]],
  ["Inativo", ["Inactive", "Inactivo"]],
  ["Todos", ["All", "Todos"]],
  ["Nenhum produto encontrado", ["No products found", "No se encontraron productos"]],
  ["Buscar produtos...", ["Search products...", "Buscar productos..."]],
  ["Buscar por nome, SKU ou categoria...", ["Search by name, SKU or category...", "Buscar por nombre, SKU o categoría..."]],
  ["Catálogo de produtos", ["Product catalog", "Catálogo de productos"]],
  ["Gerencie produtos, preços e estoque", ["Manage products, prices and inventory", "Gestiona productos, precios e inventario"]],
  ["Categorias de produtos", ["Product categories", "Categorías de productos"]],
  ["Unidades de produtos", ["Product units", "Unidades de productos"]],
  ["Adicionar categoria", ["Add category", "Agregar categoría"]],
  ["Nova categoria", ["New category", "Nueva categoría"]],
]);

const start=src.indexOf('const exact:Record');
if(start<0)throw new Error('Objeto exact de i18n não encontrado.');
const end=src.indexOf('\n};',start);
if(end<0)throw new Error('Fim do objeto exact de i18n não encontrado.');

let block=src.slice(start,end);
const keyMatches=[...block.matchAll(/^\s*(?:'([^']+)'|"([^"]+)")\s*:\s*\[/gm)];
const existing=new Set(keyMatches.map(m=>m[1]??m[2]));
const missing=[];

for(const [key,pair] of entries){
  if(!existing.has(key)){
    missing.push(` ${JSON.stringify(key)}:[${JSON.stringify(pair[0])},${JSON.stringify(pair[1])}],`);
  }
}

if(missing.length){
  block=block.replace(/\s*$/,'')+'\n'+missing.join('\n')+'\n';
  src=src.slice(0,start)+block+src.slice(end);
  fs.writeFileSync(file,src,'utf8');
}

console.log(`OK   product i18n keys already present: ${entries.size-missing.length}`);
console.log(`OK   product i18n keys added: ${missing.length}`);
console.log(`INFO total product i18n keys: ${entries.size}`);
console.log('\nv198 product i18n consolidation complete.');
