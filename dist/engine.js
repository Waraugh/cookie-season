(function(root){
 'use strict';
 const aliases={c:'cup',cups:'cup',t:'tsp',teaspoon:'tsp',teaspoons:'tsp',ta:'tbsp',tablespoon:'tbsp',tablespoons:'tbsp',ounce:'oz',ounces:'oz',pounds:'lb',pound:'lb',lbs:'lb',w:'each',whole:'each',count:'each',drops:'drop',grams:'g',gram:'g',kilograms:'kg',milliliters:'ml',liters:'l'};
 const units={cup:['volume',48],tbsp:['volume',3],tsp:['volume',1],'fl oz':['volume',6],ml:['volume',1/4.92892159375],l:['volume',1000/4.92892159375],g:['mass',1],kg:['mass',1000],oz:['mass',28.349523125],lb:['mass',453.59237],each:['count',1],drop:['drop',1]};
 const normalizeUnit=u=>aliases[String(u).trim().toLowerCase()]||String(u).trim().toLowerCase();
 function factor(unit,i){unit=normalizeUnit(unit);const base=normalizeUnit(i.unit);if(unit===base)return 1;if(i.unitFactors?.[unit]>0)return i.unitFactors[unit];const a=units[unit],b=units[base];if(a&&b&&a[0]===b[0])return a[1]/b[1];return null;}
 function convert(amount,from,to,i){const a=factor(from,i),b=factor(to,i);return a==null||b==null?null:amount*a/b;}
 function upgradeState(state,source){
  const wasUpgraded=state.schemaVersion>=2;
  state.schemaVersion=2;
  state.ingredients.forEach(i=>{i.unit=normalizeUnit(i.unit);i.unitFactors??={};});
  if(!wasUpgraded)for(const r of source?.recipes||[])for(const l of r.lines){const i=state.ingredients.find(i=>i.id===l.ingredientId);if(i&&l.amount>0)i.unitFactors[normalizeUnit(l.sourceUnit)]=l.canonicalAmount/l.amount;}
  state.recipes.forEach(r=>{r.archived??=false;r.instructions??='';r.notes??='';r.lines.forEach((l,n)=>{
   if(l.unit&&l.amount!=null)return;
   const i=state.ingredients.find(i=>i.id===l.ingredientId),original=source?.recipes.find(x=>x.id===r.id)?.lines[n];
   if(original&&Math.abs(l.canonicalAmount-original.canonicalAmount)<1e-8){l.amount=original.amount;l.unit=normalizeUnit(original.sourceUnit);}
   else{l.amount=l.canonicalAmount;l.unit=i?.unit||'cup';}
  });});
  return state;
 }
 function calculate(state){
  const active=state.requests.filter(o=>!['Pending','Cancelled'].includes(o.status));
  const issues=[];
  const recipePlans=state.recipes.map(r=>{
   const requested=active.reduce((sum,o)=>sum+Number(o.items[r.id]||0),0);
   const validYield=Number.isInteger(r.yield)&&r.yield>0;
   const batches=requested===0?0:validYield?Math.ceil(requested/r.yield):0;
   const produced=batches*(r.yield||0);
   const lines=r.lines.map(l=>{const i=state.ingredients.find(i=>i.id===l.ingredientId);const amount=i?(l.unit?convert(l.amount,l.unit,i.unit,i):l.canonicalAmount):null;return {...l,canonicalAmount:amount,ingredient:i};});
   let batchCost=0;let missing=false;
   for(const l of lines){const i=l.ingredient;if(!i||l.canonicalAmount==null||!Number.isFinite(i.unitsPerPackage)||i.unitsPerPackage<=0){missing=true;if(requested>0)issues.push({recipe:r.name,ingredient:i?.name||'Missing ingredient',message:`Conversion needed: ${l.unit||'?'} to ${i?.unit||'?'}`,kind:'conversion'});continue;}if(i.price==null){missing=true;}else batchCost+=l.canonicalAmount/i.unitsPerPackage*i.price;}
   if(requested>0&&!validYield)issues.push({recipe:r.name,message:'Batch yield needed',kind:'yield'});
   if(requested>0&&!lines.length){missing=true;issues.push({recipe:r.name,message:'Recipe has no ingredients',kind:'ingredients'});}
   return {...r,lines,requested,batches,produced,extra:Math.max(0,produced-requested),batchCost,missing,usedCost:batchCost*batches,bakedCookies:Math.min(r.baked||0,batches)*(r.yield||0)};
  });
  const ingredientPlans=state.ingredients.map(i=>{
   const uses=recipePlans.filter(r=>r.batches>0&&r.lines.some(l=>l.ingredientId===i.id)).map(r=>{const lines=r.lines.filter(l=>l.ingredientId===i.id);return {name:r.name,amount:lines.reduce((s,l)=>s+(l.canonicalAmount||0)*r.batches,0),incomplete:lines.some(l=>l.canonicalAmount==null)};});
   const amount=uses.reduce((s,u)=>s+u.amount,0),incomplete=uses.some(u=>u.incomplete)||!Number.isFinite(i.unitsPerPackage)||i.unitsPerPackage<=0;
   const packages=incomplete?null:amount/i.unitsPerPackage;
   const buy=packages==null?null:Math.max(0,Math.ceil(packages-(i.pantry||0)-1e-9));
   return {...i,uses,amount,incomplete,packages,buy,spend:i.price==null||buy==null?null:buy*i.price,usedCost:i.price==null||packages==null?null:packages*i.price};
  }).filter(i=>i.uses.length>0);
  const requested=recipePlans.reduce((s,r)=>s+r.requested,0),produced=recipePlans.reduce((s,r)=>s+r.produced,0);
  return {active,recipePlans,ingredientPlans,requested,produced,extra:recipePlans.reduce((s,r)=>s+r.extra,0),batches:recipePlans.reduce((s,r)=>s+r.batches,0),baked:recipePlans.reduce((s,r)=>s+Math.min(r.baked||0,r.batches),0),usedCost:ingredientPlans.reduce((s,i)=>s+(i.usedCost||0),0),spend:ingredientPlans.reduce((s,i)=>s+(i.spend||0),0),missingPrices:ingredientPlans.filter(i=>i.price==null).length,packagesToBuy:ingredientPlans.reduce((s,i)=>s+(i.buy||0),0),issues,missingConversions:ingredientPlans.filter(i=>i.incomplete).length,archivedRequests:recipePlans.filter(r=>r.archived&&r.requested>0)};
 }
 root.CookieEngine={calculate,convert,normalizeUnit,upgradeState,units:Object.keys(units)};
 if(typeof module!=='undefined')module.exports=root.CookieEngine;
})(typeof window==='undefined'?globalThis:window);
