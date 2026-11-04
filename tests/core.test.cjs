const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../assets/js/core.js');

test('цена учитывает размер и добавки без повторного учёта добавки',()=>{
  assert.equal(C.unitPrice({id:'pepperoni',size:30}),649);
  assert.equal(C.unitPrice({id:'pepperoni',size:35,extras:['extra-cheese','extra-cheese']}),888);
  assert.equal(C.unitPrice({id:'pepperoni',size:25,dough:'thin'}),529);
});
test('одинаковые конфигурации объединяются, разные размеры сохраняются отдельно',()=>{
  let cart=C.addItem([],{id:'margherita',extras:['jalapeno','extra-cheese']});
  cart=C.addItem(cart,{id:'margherita',extras:['extra-cheese','jalapeno']});
  cart=C.addItem(cart,{id:'margherita',size:35});
  assert.equal(cart.length,2);assert.equal(cart[0].quantity,2);assert.equal(C.count(cart),3);
});
test('уменьшение до нуля удаляет строку, верхний предел количества соблюдается',()=>{
  const cart=C.addItem([],{id:'pepperoni',quantity:20});
  assert.equal(C.addItem(cart,{id:'pepperoni',quantity:20})[0].quantity,20);
  assert.deepEqual(C.changeQuantity(cart,cart[0].key,0),[]);
});
test('промокод не применяется к одной пицце; доставка считается после скидки',()=>{
  assert.equal(C.totals([{id:'meat'}],'ВТОРАЯ20').discount,0);
  const total=C.totals([{id:'margherita'},{id:'pepperoni'}],'ВТОРАЯ20');
  assert.equal(total.subtotal,1198);assert.equal(total.discount,110);
  assert.equal(total.payable,1088);assert.equal(total.delivery,149);assert.equal(total.total,1237);
});
test('бесплатная доставка и самовывоз дают правильную итоговую сумму',()=>{
  assert.equal(C.totals([{id:'meat',size:35,quantity:2}]).delivery,0);
  const pickup=C.totals([{id:'margherita'}],'','pickup');
  assert.equal(pickup.total,549);assert.equal(pickup.delivery,0);assert.equal(pickup.toFree,0);
});
test('начисление бонусов выполняется один раз при переходе к доставленному заказу',()=>{
  const source={id:'PP-test',status:2,amounts:{payable:1000},rewarded:false};
  const first=C.advanceOrder(source,480);assert.equal(first.balance,510);assert.equal(first.order.status,3);
  const second=C.advanceOrder(first.order,first.balance);assert.equal(second.balance,510);
});
test('повреждённые товары и неизвестные добавки не ломают корзину',()=>{
  assert.equal(C.normalizeCart([{id:'unknown'},null,{id:'margherita',extras:['unknown']}]).length,1);
  assert.equal(C.weight({id:'margherita',size:35,dough:'thin'})<C.weight({id:'margherita',size:35}),true);
});
