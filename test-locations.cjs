const assert=require('node:assert/strict'),E=require('./dist/engine.js'),L=require('./dist/locations.js');
const s=()=>({season:2026,ingredients:[{id:0,name:'Flour',unit:'cup',unitsPerPackage:4,price:8,pantry:1,stock:{WV:1,OH:0},unitFactors:{}}],recipes:[{id:0,name:'Cookie',yield:24,baked:0,lines:[{ingredientId:0,amount:2,unit:'cup'}]}],requests:[{id:'a',name:'A',home:'WV',status:'Accepted',items:{0:25}},{id:'b',name:'B',home:'OH',status:'Accepted',items:{0:10}}]});
let a=s(),p=L.calculate(a,E);assert.equal(p.batches,2);assert.equal(p.extra,13);assert.equal(p.locationRows.reduce((n,r)=>n+r.assigned,0),2);assert.equal(p.locationIngredients[0].buy,1);
a.batchAssignments={0:{OH:1}};p=L.calculate(a,E);assert.equal(p.locationIngredients[0].byHome.OH.buy,1);assert.equal(p.locationIngredients[0].byHome.WV.buy,0);
L.transfer(a,'ingredient-transfer',0,'WV','OH',.5,E);assert.equal(L.calculate(a,E).locationIngredients[0].buy,0);
L.bake(a,E,0,'OH','WV',1);assert.equal(a.ingredients[0].stock.OH,0);p=L.calculate(a,E);assert.equal(p.freezer.WV[0],24);assert.equal(p.remaining,1);assert.equal(p.locationIngredients[0].byHome.OH.amount,0);
L.bake(a,E,0,'WV','WV',1);assert.equal(L.calculate(a,E).locationIngredients.length,0);assert.equal(L.calculate(a,E).freezer.WV[0],48);
L.transfer(a,'cookie-transfer',0,'WV','OH',10,E);assert.equal(L.calculate(a,E).freezer.OH[0],10);assert.equal(L.calculate(a,E).freezer.WV[0],38);
assert.throws(()=>L.transfer(a,'cookie-transfer',0,'OH','WV',11,E));assert.throws(()=>L.transfer(a,'ingredient-transfer',0,'OH','WV',1,E));
const before=JSON.stringify(a);assert.throws(()=>L.bake(a,E,0,'OH','OH',1));assert.equal(JSON.stringify(a),before);
a.movements.push({kind:'donation',recipeId:0,home:'WV',quantity:13});assert.equal(L.calculate(a,E).freezer.WV[0],25);
a=s();a.recipes[0].lines.push({ingredientId:0,amount:2,unit:'cup'});L.bake(a,E,0,'WV','WV',1);assert.equal(a.ingredients[0].stock.WV,0);
console.log('Passed: shared whole batches, separate-home shortages, pantry transfers, atomic consumption, cross-home freezing, remaining shopping, freezer transfers and donations.');

a=s();a.movements=[{kind:'bake',recipeId:0,home:'OH',storeHome:'OH',batches:0,cookies:48,carryover:true}];p=L.calculate(a,E);assert.equal(p.remaining,0);assert.equal(p.locationIngredients.length,0);assert.equal(p.extra,13);
a=s();L.bake(a,E,0,'WV','WV',1);a.requests[0].items[0]=1;a.requests[1].status='Cancelled';p=L.calculate(a,E);assert.equal(p.remaining,0);assert.equal(p.extra,23);assert.equal(p.produced,24);
console.log('Passed: carryover freezer stock offsets baking and reduced demand preserves recorded production.');

a=s();a.movements=[{kind:'freezer-count',recipeId:0,home:'OH',quantity:48,adjustment:48}];assert.equal(L.calculate(a,E).remaining,0);a.movements.push({kind:'freezer-count',recipeId:0,home:'OH',quantity:0,adjustment:-48});assert.equal(L.calculate(a,E).remaining,2);console.log('Passed: freezer opening stock and corrected counts update the bake plan.');
