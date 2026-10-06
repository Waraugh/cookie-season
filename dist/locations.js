/* Location planning is pure: inventory movements are recorded separately. */
(function(root){
'use strict';
const homes=['WV','OH'];
function upgrade(s){
 s.locations=homes;s.season??=new Date().getFullYear();s.movements??=[];s.batchAssignments??={};s.seasons??=[];
 for(const i of s.ingredients){if(i.priceKind==='Illustrative'){i.price=null;i.priceKind='Missing';}i.stock??={WV:Number(i.pantry)||0,OH:0};i.stock.WV??=0;i.stock.OH??=0;i.pantry=homes.reduce((n,h)=>n+(Number(i.stock[h])||0),0);}
 for(const o of s.requests)o.home??='WV';
 return s;
}
function calculate(s,E){
 upgrade(s);const base=E.calculate(s),rows=[];
 const freezer={WV:{},OH:{}};for(const m of s.movements){if(m.kind==='bake')freezer[m.storeHome||m.home][m.recipeId]=(freezer[m.storeHome||m.home][m.recipeId]||0)+m.cookies;if(m.kind==='freezer-count')freezer[m.home][m.recipeId]=(freezer[m.home][m.recipeId]||0)+m.adjustment;if(m.kind==='cookie-transfer'){freezer[m.from][m.recipeId]=(freezer[m.from][m.recipeId]||0)-m.quantity;freezer[m.to][m.recipeId]=(freezer[m.to][m.recipeId]||0)+m.quantity;}if(m.kind==='handoff'||m.kind==='donation')freezer[m.home][m.recipeId]=(freezer[m.home][m.recipeId]||0)-m.quantity;}
 for(const r of base.recipePlans){
  const counts={WV:0,OH:0};for(const o of base.active)if(o.status!=='Handed over')counts[o.home]+=(o.items[r.id]||0);
  const baked={};for(const h of homes)baked[h]=s.movements.filter(m=>m.kind==='bake'&&m.recipeId===r.id&&m.home===h).reduce((n,m)=>n+m.batches,0);
  const future=Math.ceil(Math.max(0,counts.WV+counts.OH-(freezer.WV[r.id]||0)-(freezer.OH[r.id]||0))/r.yield);
  r.batches=baked.WV+baked.OH+future;
  r.produced=s.movements.filter(m=>m.kind==='bake'&&m.recipeId===r.id).reduce((n,m)=>n+m.cookies,0)+future*r.yield;
  r.produced+=s.movements.filter(m=>m.kind==='freezer-count'&&m.recipeId===r.id).reduce((n,m)=>n+m.adjustment,0);
  const donated=s.movements.filter(m=>m.kind==='donation'&&m.recipeId===r.id).reduce((n,m)=>n+m.quantity,0);
  r.extra=Math.max(0,r.produced-r.requested-donated);
  if(!r.batches&&!r.requested)continue;
  const split=s.batchAssignments[r.id]||{};
  const defaultOH=baked.OH+Math.min(future,Math.ceil(Math.max(0,counts.OH-(freezer.OH[r.id]||0))/r.yield));
  const oh=Math.min(r.batches-baked.WV,Math.max(baked.OH,Object.hasOwn(split,'OH')?Number(split.OH)||0:defaultOH));
  const assignments={WV:r.batches-oh,OH:oh};
  for(const h of homes)rows.push({...r,home:h,demand:counts[h],assigned:assignments[h],done:baked[h],remaining:assignments[h]-baked[h]});
 }
 base.batches=base.recipePlans.reduce((n,r)=>n+r.batches,0);base.produced=base.recipePlans.reduce((n,r)=>n+r.produced,0);base.extra=base.recipePlans.reduce((n,r)=>n+r.extra,0);
 const ingredients=[];
 for(const i of s.ingredients){
  const need={WV:0,OH:0},incomplete={WV:false,OH:false};
  for(const r of rows.filter(r=>r.remaining>0))for(const l of r.lines.filter(l=>l.ingredientId===i.id)){
   const amount=E.convert(l.amount,l.unit,i.unit,i);if(amount==null)incomplete[r.home]=true;else need[r.home]+=amount*r.remaining;
  }
  if(!homes.some(h=>need[h]>0||incomplete[h]))continue;
  const byHome={};for(const h of homes){const known=!incomplete[h]&&i.unitsPerPackage>0;const packages=known?need[h]/i.unitsPerPackage:null;const buy=known?Math.max(0,Math.ceil(packages-i.stock[h]-1e-9)):null;byHome[h]={amount:need[h],have:i.stock[h],packages,buy,spend:buy===0?0:buy==null||i.price==null?null:buy*i.price};}
  const complete=homes.every(h=>byHome[h].buy!=null);const buy=complete?homes.reduce((n,h)=>n+byHome[h].buy,0):null;
  ingredients.push({...i,byHome,buy,spend:buy===0?0:buy==null||i.price==null?null:buy*i.price});
 }
 return {...base,locationRows:rows,locationIngredients:ingredients,freezer,remaining:rows.reduce((n,r)=>n+r.remaining,0),shoppingSpend:ingredients.reduce((n,i)=>n+(i.spend||0),0)};
}
function bake(s,E,recipeId,home,storeHome,batches){
 upgrade(s);if(!homes.includes(home)||!homes.includes(storeHome)||!Number.isInteger(batches)||batches<1)throw Error('Choose a home and a positive whole batch count.');
 const r=s.recipes.find(r=>r.id===recipeId);if(!r)throw Error('Recipe not found.');
 const use=new Map();for(const l of r.lines){const i=s.ingredients.find(i=>i.id===l.ingredientId);if(!i)throw Error('Recipe ingredient missing.');const q=E.convert(l.amount,l.unit,i.unit,i);if(q==null||!(i.unitsPerPackage>0))throw Error('Complete the '+i.name+' conversion first.');use.set(i.id,(use.get(i.id)||0)+q*batches/i.unitsPerPackage);}
 for(const [id,q] of use){const i=s.ingredients.find(i=>i.id===id);if(i.stock[home]+1e-9<q)throw Error('Not enough '+i.name+' in '+home+'. Update pantry stock first.');}
 for(const [id,q] of use){const i=s.ingredients.find(i=>i.id===id);i.stock[home]=Math.max(0,i.stock[home]-q);i.pantry=homes.reduce((n,h)=>n+i.stock[h],0);}
 const m={id:crypto.randomUUID(),kind:'bake',recipeId,home,storeHome,batches,cookies:r.yield*batches,yield:r.yield,ingredients:Object.fromEntries(use),at:new Date().toISOString()};s.movements.push(m);return m;
}
function transfer(s,kind,id,from,to,quantity,E){
 upgrade(s);if(!homes.includes(from)||!homes.includes(to)||from===to||!(quantity>0)||!Number.isFinite(quantity))throw Error('Choose different homes and a positive amount.');
 if(kind==='ingredient-transfer'){const i=s.ingredients.find(i=>i.id===id);if(!i||i.stock[from]+1e-9<quantity)throw Error('Not enough pantry stock to transfer.');i.stock[from]-=quantity;i.stock[to]+=quantity;}
 else if(kind==='cookie-transfer'){if(!Number.isInteger(quantity)||((calculate(s,E).freezer[from][id]||0)<quantity))throw Error('Not enough cookies to transfer.');}
 else throw Error('Unknown transfer type.');
 s.movements.push({id:crypto.randomUUID(),kind,...(kind==='cookie-transfer'?{recipeId:id}:{ingredientId:id}),from,to,quantity,at:new Date().toISOString()});upgrade(s);
}
const api={homes,upgrade,calculate,bake,transfer};root.LocationEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
