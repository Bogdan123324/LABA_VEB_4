const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

test('Service Worker кеширует меню, учитывает подпапку и правильно обрабатывает офлайн',async()=>{
  const listeners={},stores=new Map();let offline=false;
  const scope='https://example.test/pizzapoint/';
  const key=value=>typeof value==='string'?value:value.url;
  const fetchAsset=async request=>{
    if(offline)throw new TypeError('offline');
    const url=new URL(key(request));
    const relative=url.pathname.replace('/pizzapoint/','')||'index.html';
    assert.equal(fs.existsSync(path.join(__dirname,'..',relative)),true,'cached file must exist: '+relative);
    return new Response('CONTENT:'+relative);
  };
  const caches={
    async open(name){
      if(!stores.has(name))stores.set(name,new Map());
      const store=stores.get(name);
      return {async addAll(urls){for(const url of urls)store.set(url,await fetchAsset(url));},async put(request,response){store.set(key(request),response);},async match(request){const response=store.get(key(request));return response?.clone();}};
    },
    async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}
  };
  const self={registration:{scope},location:{origin:'https://example.test'},clients:{async claim(){}},async skipWaiting(){},addEventListener(name,handler){listeners[name]=handler;}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8'),{self,caches,fetch:fetchAsset,URL,Request,Response});
  let work;listeners.install({waitUntil(p){work=p;}});await work;
  stores.set('pizzapoint-v1',new Map());stores.set('unrelated-app',new Map());
  listeners.activate({waitUntil(p){work=p;}});await work;
  assert.equal(stores.has('pizzapoint-v1'),false);assert.equal(stores.has('unrelated-app'),true);
  offline=true;
  async function request(url,mode='navigate',method='GET'){
    let response;listeners.fetch({request:{url,mode,method},respondWith(p){response=p;}});return response?await response:undefined;
  }
  assert.equal(await (await request(scope+'product.html?id=pepperoni&size=35')).text(),'CONTENT:product.html');
  assert.equal(await (await request(scope)).text(),'CONTENT:index.html');
  assert.equal(await (await request(scope+'unknown.html')).text(),'CONTENT:offline.html');
  assert.equal((await request(scope+'missing.png','no-cors')).status,504);
  assert.equal(await request('https://other.test/data'),undefined);
  assert.equal(await request(scope+'order','cors','POST'),undefined);
});
