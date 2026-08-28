export interface PageMeta { page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean; hasPrevious: boolean; }
export interface Page<T> { items: T[]; meta: PageMeta; }
export function pageOf<T>(items:T[], total:number, page:number, pageSize:number):Page<T>{
 const safePage=Math.max(1,page), safeSize=Math.max(1,pageSize), totalPages=Math.ceil(Math.max(0,total)/safeSize);
 return {items,meta:{page:safePage,pageSize:safeSize,total:Math.max(0,total),totalPages,hasNext:safePage<totalPages,hasPrevious:safePage>1}};
}
