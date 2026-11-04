// Проверка обработчиков приложения в изолированной среде без браузерного рендеринга.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const PizzaData=require('../assets/js/data.js');
const PizzaCore=require('../assets/js/core.js');
const code=fs.readFileSync(path.join(__dirname,'../assets/js/app.js'),'utf8');

class Element {
  constructor(attrs={}){
    this.attrs=attrs;this.dataset={};this.value='';this.hidden=false;this.innerHTML='';this.children=[];
    this.classList={add(){},remove(){},toggle(){}};
    for(const [key,value] of Object.entries(attrs))if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;
  }
  matches(selector){return selector.split(',').some(part=>{const m=part.trim().match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return m?Object.hasOwn(this.attrs,m[1])&&(m[2]===undefined||this.attrs[m[1]]===m[2]):false;});}
  closest(selector){return selector==='button,a'&&this.tagName==='BUTTON'?this:null;}
  querySelector(){return null;}
  querySelectorAll(){return [];}
  setAttribute(name,value){this.attrs[name]=value;}
  addEventListener(){}
  append(child){this.children.push(child);}
  replaceChildren(){this.children=[];}
  close(){this.open=false;}
  focus(){}
  setCustomValidity(value){this.validation=value;}
  checkValidity(){return !this.validation&&(!this.required||this.value.length>0);}
}
function field(value='',required=false){const el=new Element();el.value=value;el.required=required;return el;}
function form(kind){
  const el=new Element({['data-'+kind+'-form']:''});
  el.elements={name:field('',true),phone:field('',kind==='checkout'),address:field('',kind==='checkout'),timeChoice:field('asap'),scheduled:field(),comment:field(),noCall:{checked:false},code:field(),email:field(),message:field()};
  el.values={method:'delivery',payment:'card'};
  el.reportValidity=()=>Object.values(el.elements).every(input=>typeof input.checkValidity!=='function'||input.disabled||input.checkValidity());
  el.querySelector=selector=>{
    const m=selector.match(/input\[name="(method|payment)"\](?:\[value="([^"]+)"\])?/);
    if(!m)return null;
    const value=m[2]||el.values[m[1]];
    const radio={value};Object.defineProperty(radio,'checked',{get:()=>el.values[m[1]]===value,set:checked=>{if(checked)el.values[m[1]]=value;}});return radio;
  };
  return el;
}
function boot(storage,page='cart.html'){
  const events={},roots=new Map();
  const add=selector=>{const el=new Element();roots.set(selector,el);return el;};
  add('[data-toast]');add('[data-offline-banner]');
  if(page==='cart.html'){add('[data-cart-view]');add('[data-coupon-note]');}
  if(page==='orders.html')add('[data-orders-view]');
  if(page==='profile.html'){add('#profile-dialog');}
  let checkout;
  if(page==='checkout.html'){
    checkout=form('checkout');roots.set('[data-checkout-form]',checkout);
    for(const selector of ['data-checkout-content','data-checkout-empty','data-delivery-field','data-pickup-address','data-method-summary','data-checkout-address-summary','data-schedule-field','data-time-summary','data-payment-summary','data-checkout-total','data-checkout-count','data-checkout-receipt','data-checkout-submit','data-checkout-offline'])add('['+selector+']');
  }
  const document={body:{dataset:{page},classList:{toggle(){}}},title:page,
    querySelector:selector=>roots.get(selector)||null,querySelectorAll:()=>[],
    createElement:()=>new Element(),addEventListener:(name,handler)=>events[name]=handler};
  const location={search:'',protocol:'https:',href:''};
  const context={document,window:{matchMedia:()=>({matches:false}),addEventListener(){}},navigator:{onLine:true,userAgent:'unit-test'},location,
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    PizzaData,PizzaCore,URLSearchParams,Intl,Date,Math,Number,String,Array,Set,Object,JSON,setTimeout:()=>1,clearTimeout(){},setInterval(){}};
  vm.runInNewContext(code,context);events.DOMContentLoaded();
  return {roots,checkout,location,events,read:()=>JSON.parse(storage.get('pizzapoint.app.v2')),submit(target){let prevented=false;events.submit({target,preventDefault(){prevented=true;}});return prevented;},click(attrs){const target=new Element(attrs);target.tagName='BUTTON';events.click({target,preventDefault(){}});}};
}
function seed(){
  return new Map([['pizzapoint.app.v2',JSON.stringify({version:2,cart:[{id:'margherita',quantity:1},{id:'pepperoni',quantity:1}],favorites:[],orders:[],profile:{name:'Тестовый гость',phone:'+70000000000',address:'Тестовая улица, 12',bonuses:480,notifications:true},coupon:'',method:'delivery',nextOrder:1048})]]);
}

test('форма промокода сохраняет код и перерисовывает скидку',()=>{
  const app=boot(seed());const promo=form('promo');promo.elements.code.value='ВТОРАЯ20';
  assert.equal(app.submit(promo),true);assert.equal(app.read().coupon,'ВТОРАЯ20');
  assert.match(app.roots.get('[data-cart-view]').innerHTML,/Вторая пицца −20%/);
  assert.match(app.roots.get('[data-cart-view]').innerHTML,/1.237 ₽/);
});
test('оформление создаёт заказ со снимком состава и очищает корзину',()=>{
  const storage=seed(),app=boot(storage,'checkout.html');
  assert.equal(app.submit(app.checkout),true);
  const state=app.read();assert.equal(state.orders.length,1);assert.deepEqual(state.cart,[]);
  assert.equal(state.orders[0].name,'Тестовый гость');assert.equal(state.orders[0].amounts.total,1347);
  assert.equal(state.orders[0].items.length,2);assert.equal(state.orders[0].status,0);
  assert.equal(app.location.href,'orders.html?new=PP-1048');
});
test('переход по этапам начисляет бонусы; повторение восстанавливает корзину',()=>{
  const storage=seed(),checkout=boot(storage,'checkout.html');checkout.submit(checkout.checkout);
  const app=boot(storage,'orders.html');
  for(let step=0;step<3;step++)app.click({'data-next-order':'PP-1048'});
  assert.equal(app.read().orders[0].status,3);assert.equal(app.read().profile.bonuses,515);
  app.click({'data-repeat-order':'PP-1048'});assert.equal(PizzaCore.count(app.read().cart),2);
});
test('данные профиля и избранное сохраняются при новом открытии приложения',()=>{
  const storage=seed(),app=boot(storage,'profile.html');
  const profile=form('profile');profile.elements.name.value='Богдан';profile.elements.phone.value='';profile.elements.address.value='Другой тестовый адрес, 20';
  app.submit(profile);app.click({'data-favorite':'mushroom'});
  const reopened=boot(storage);
  assert.equal(reopened.read().profile.name,'Богдан');assert.equal(reopened.read().profile.address,'Другой тестовый адрес, 20');
  assert.deepEqual(reopened.read().favorites,['mushroom']);
});
test('имя из пробелов и некорректный телефон не создают заказ',()=>{
  const app=boot(seed(),'checkout.html');app.checkout.elements.name.value='   ';app.submit(app.checkout);
  assert.equal(app.read().orders.length,0);
  const other=boot(seed(),'checkout.html');other.checkout.elements.phone.value='not-a-phone';other.submit(other.checkout);
  assert.equal(other.read().orders.length,0);
});
