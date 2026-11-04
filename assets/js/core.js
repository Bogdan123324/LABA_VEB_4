/* Расчёты не зависят от страницы: итоговая сумма везде одинаковая. */
var PizzaCore = (() => {
  const data = typeof PizzaData !== 'undefined' ? PizzaData : require('./data.js');
  const getProduct = id => data.products.find(product => product.id === id);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function normalizeItem(raw) {
    if (!raw || !getProduct(raw.id)) return null;
    const size = [25,30,35].includes(Number(raw.size)) ? Number(raw.size) : 30;
    const dough = raw.dough === 'thin' ? 'thin' : 'classic';
    const extras = [...new Set(Array.isArray(raw.extras) ? raw.extras : [])]
      .filter(id => data.extras.some(extra => extra.id === id)).sort();
    const quantity = clamp(Math.floor(Number(raw.quantity) || 1), 1, 20);
    const key = [raw.id,size,dough,extras.join(',')].join('|');
    return {id:raw.id,size,dough,extras,quantity,key};
  }

  function unitPrice(raw) {
    const item = normalizeItem(raw);
    if (!item) return 0;
    const sizeDifference = item.size === 25 ? -120 : item.size === 35 ? 180 : 0;
    return getProduct(item.id).price + sizeDifference +
      item.extras.reduce((sum,id) => sum + data.extras.find(extra => extra.id === id).price, 0);
  }

  function weight(raw) {
    const item = normalizeItem(raw);
    if (!item) return 0;
    const factor = item.size === 25 ? .74 : item.size === 35 ? 1.3 : 1;
    const doughFactor = item.dough === 'thin' ? .91 : 1;
    return Math.round(getProduct(item.id).weight * factor * doughFactor) +
      item.extras.reduce((sum,id) => sum + data.extras.find(extra => extra.id === id).weight, 0);
  }

  function normalizeCart(raw) {
    const result = [];
    for (const source of Array.isArray(raw) ? raw : []) {
      const item = normalizeItem(source);
      if (!item) continue;
      const existing = result.find(row => row.key === item.key);
      if (existing) existing.quantity = clamp(existing.quantity + item.quantity,1,20);
      else result.push(item);
    }
    return result;
  }

  function addItem(cart, raw) {
    const result = normalizeCart(cart);
    const item = normalizeItem(raw);
    if (!item) return result;
    const existing = result.find(row => row.key === item.key);
    if (existing) existing.quantity = clamp(existing.quantity + item.quantity,1,20);
    else result.push(item);
    return result;
  }

  function changeQuantity(cart,key,value) {
    return normalizeCart(cart).flatMap(item => {
      if (item.key !== key) return [item];
      const quantity = Math.floor(Number(value));
      return quantity > 0 ? [{...item,quantity:clamp(quantity,1,20)}] : [];
    });
  }

  function count(cart) {
    return normalizeCart(cart).reduce((sum,item) => sum + item.quantity,0);
  }

  function isPromo(code) {
    return ['ВТОРАЯ20','PIZZA20'].includes(String(code || '').trim().toUpperCase());
  }

  function totals(cart,code='',method='delivery') {
    const items = normalizeCart(cart);
    const quantity = count(items);
    const subtotal = items.reduce((sum,item) => sum + unitPrice(item) * item.quantity,0);
    const discount = isPromo(code) && quantity >= 2 ? Math.round(Math.min(...items.map(unitPrice)) * .2) : 0;
    const payable = subtotal - discount;
    const delivery = quantity && method !== 'pickup' && payable < data.freeDeliveryFrom ? data.deliveryFee : 0;
    return {quantity,subtotal,discount,payable,delivery,total:payable + delivery,
      toFree:quantity && method !== 'pickup' ? Math.max(0,data.freeDeliveryFrom - payable) : 0};
  }

  function configuration(item) {
    const normalized = normalizeItem(item);
    if (!normalized) return '';
    const dough = normalized.dough === 'thin' ? 'тонкое тесто' : 'традиционное тесто';
    return normalized.size + ' см · ' + dough;
  }

  function advanceOrder(order,balance) {
    const nextStatus = Math.min(3,Math.max(0,Number(order.status) || 0) + 1);
    const result = {...order,status:nextStatus};
    let nextBalance = Math.max(0,Number(balance) || 0);
    if (nextStatus === 3 && !order.rewarded) {
      const bonus = Math.floor((Number(order.amounts?.payable) || 0) * .03);
      result.rewarded = true;
      result.earned = bonus;
      nextBalance += bonus;
    }
    return {order:result,balance:nextBalance};
  }

  return {getProduct,normalizeItem,normalizeCart,unitPrice,weight,addItem,changeQuantity,
    count,isPromo,totals,configuration,advanceOrder};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = PizzaCore;
