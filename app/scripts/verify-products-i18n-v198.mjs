import fs from 'node:fs';
import path from 'node:path';

const src=fs.readFileSync(path.join(process.cwd(),'src','i18n.tsx'),'utf8');
const expected=new Map([
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
const end=src.indexOf('\n};',start);
if(start<0||end<0)throw new Error('Objeto exact de i18n não encontrado.');
const block=src.slice(start,end);

const keys=[...block.matchAll(/^\s*(?:'([^']+)'|"([^"]+)")\s*:\s*\[/gm)].map(m=>m[1]??m[2]);
const counts=new Map();
for(const key of keys)counts.set(key,(counts.get(key)||0)+1);

let failed=0;
for(const key of expected.keys()){
  const count=counts.get(key)||0;
  if(count!==1){
    console.error(`FAIL ${key} -> ${count}`);
    failed++;
  }
}
const duplicates=[...counts.entries()].filter(([,n])=>n>1);
if(duplicates.length){
  console.error('FAIL duplicate i18n keys detected:');
  for(const [key,n] of duplicates)console.error(` - ${key}: ${n}`);
  failed+=duplicates.length;
}

if(failed)process.exit(1);
console.log(`OK   ${expected.size} product i18n keys present exactly once`);
console.log('OK   no duplicate i18n keys');
console.log('\nv198 product i18n verification passed.');
