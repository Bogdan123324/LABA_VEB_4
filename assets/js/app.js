/* PizzaPoint: единая корзина и локальные данные для всех экранов. */
(() => {
  'use strict';
  const D=PizzaData,C=PizzaCore;
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const money=value=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(value)+' ₽';
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon=name=>`<svg class="icon" aria-hidden="true" focusable="false"><use href="assets/icons/ui.svg#${name}"></use></svg>`;
  const photo=product=>`<div class="pizza-visual pizza-visual--${product.photo}" role="img" aria-label="Пицца ${escape(product.name)}"></div>`;
  const STORAGE='pizzapoint.app.v2';
  const initial=()=>({version:2,cart:[],favorites:[],orders:[],coupon:'',method:'delivery',nextOrder:1048,sampleStatus:1,profile:{name:'Богдан',phone:'',address:'',bonuses:480,notifications:true},waitlist:null,feedback:[],installDismissedUntil:0});
  let state=initial(),toastTimer,installPrompt=null,storyIndex=0,catalogCategory='all',catalogSearch='',catalogSort='popular',orderFilter='all',productDraft=null,editKey='';
  try {
    const raw=JSON.parse(localStorage.getItem(STORAGE)||'null');
    if(raw&&raw.version===2){
      state={...initial(),...raw,profile:{...initial().profile,...raw.profile}};
      state.cart=C.normalizeCart(raw.cart);
      state.favorites=[...new Set(Array.isArray(raw.favorites)?raw.favorites:[])].filter(id=>C.getProduct(id));
      state.orders=(Array.isArray(raw.orders)?raw.orders:[]).filter(order=>order&&Array.isArray(order.items)).map(order=>({...order,items:C.normalizeCart(order.items),status:Math.max(0,Math.min(3,Number(order.status)||0))}));
      for(const [name,limit] of [['name',50],['phone',22],['address',180]])state.profile[name]=String(state.profile[name]||'').slice(0,limit);
      state.profile.name=state.profile.name||'Богдан';
      state.profile.bonuses=Math.max(0,Math.floor(Number(state.profile.bonuses)||0));
      state.nextOrder=Math.max(1048,Math.floor(Number(state.nextOrder)||1048));
      state.method=state.method==='pickup'?'pickup':'delivery';
    }
  } catch(_){/* Если данные повреждены, меню всё равно откроется. */}

  function persist(next){
    try{localStorage.setItem(STORAGE,JSON.stringify(next));state=next;return true;}
    catch(_){toast('Не удалось сохранить данные. Проверьте доступ к хранилищу браузера.');return false;}
  }
  function toast(message,link='',label='Открыть'){
    const root=$('[data-toast]');if(!root)return;
    clearTimeout(toastTimer);root.replaceChildren();
    const text=document.createElement('span');text.textContent=message;root.append(text);
    if(link){const a=document.createElement('a');a.href=link;a.textContent=label;root.append(a);}
    root.hidden=false;toastTimer=setTimeout(()=>root.hidden=true,3200);
  }
  function updateShared(bump=false){
    const count=C.count(state.cart);
    $$('[data-cart-count]').forEach(el=>{el.textContent=count;el.hidden=!count;if(bump){el.classList.remove('is-bumping');void el.offsetWidth;el.classList.add('is-bumping');}});
    $$('[data-cart-title-count]').forEach(el=>el.textContent=count);
    $$('[data-name]').forEach(el=>el.textContent=state.profile.name);
    $$('[data-initial]').forEach(el=>el.textContent=state.profile.name.trim().charAt(0).toUpperCase()||'П');
    $$('[data-address]').forEach(el=>el.textContent=state.profile.address||'Укажите адрес доставки');
    $$('[data-profile-phone]').forEach(el=>el.textContent=state.profile.phone||'Добавьте телефон');
    $$('[data-favorites-count]').forEach(el=>el.textContent=state.favorites.length);
    $$('[data-favorite-dot]').forEach(el=>el.hidden=!state.favorites.length);
    $$('[data-orders-count]').forEach(el=>el.textContent=state.orders.length);
    $$('[data-bonuses]').forEach(el=>el.textContent=new Intl.NumberFormat('ru-RU').format(state.profile.bonuses));
    $$('[data-notification-toggle]').forEach(el=>el.checked=!!state.profile.notifications);
    $$('[data-favorite]').forEach(el=>{const active=state.favorites.includes(el.dataset.favorite);el.setAttribute('aria-pressed',String(active));el.setAttribute('aria-label',(active?'Убрать из избранного: ':'В избранное: ')+(C.getProduct(el.dataset.favorite)?.name||'Пицца'));});
  }
  function empty(title,text,kind='pizza',link='products.html',label='Выбрать пиццу'){
    return `<section class="empty-state"><div class="empty-state__icon">${icon(kind)}</div><h2>${escape(title)}</h2><p>${escape(text)}</p><a class="button button--primary" href="${link}">${escape(label)}${icon('arrow')}</a></section>`;
  }
  function favoriteButton(product){
    const saved=state.favorites.includes(product.id);
    return `<button class="favorite-button" type="button" data-favorite="${product.id}" aria-pressed="${saved}" aria-label="${saved?'Убрать из избранного: ':'В избранное: '}${escape(product.name)}">${icon('heart')}</button>`;
  }
  function productCard(product){
    return `<article class="product-card"><a class="product-card__media" href="product.html?id=${product.id}">${photo(product)}<span class="product-card__badge ${product.oldPrice?'product-card__badge--sale':''}">${escape(product.badge)}</span></a>${favoriteButton(product)}<div class="product-card__body"><div class="product-card__top"><h3 class="product-card__title"><a href="product.html?id=${product.id}">${escape(product.name)}</a></h3><span class="rating">${icon('star')}${product.rating}</span></div><p class="product-card__meta">30 см · ${product.weight} г</p><p class="product-card__desc" title="${escape(product.ingredients)}">${escape(product.ingredients)}</p><div class="product-card__bottom"><div><span class="product-card__price">${money(product.price)}</span>${product.oldPrice?`<del class="product-card__old">${money(product.oldPrice)}</del>`:''}</div><button class="product-card__add" type="button" data-add-product="${product.id}" aria-label="Добавить в корзину: ${escape(product.name)}">${icon('plus')}</button></div></div></article>`;
  }
  function renderCategories(){
    $$('[data-categories]').forEach(root=>{
      const filters=root.dataset.categories==='filters';
      root.innerHTML=D.categories.map(category=>{const active=filters?category.id===catalogCategory:category.id==='all';const attrs=filters?`type="button" data-category="${category.id}" aria-pressed="${active}"`:`href="products.html?category=${category.id}"`;const tag=filters?'button':'a';return `<${tag} class="category-pill ${active?'is-active':''}" ${attrs}>${icon(category.icon)}${category.name}</${tag}>`;}).join('');
    });
  }
  function renderProducts(){
    $$('[data-products]').forEach(root=>{
      const mode=root.dataset.products;let products=[...D.products];
      if(mode==='home')products=products.slice(0,4);
      if(mode==='favorites')products=products.filter(product=>state.favorites.includes(product.id));
      if(mode==='catalog'){
        const query=catalogSearch.trim().toLocaleLowerCase('ru-RU');
        products=products.filter(product=>(catalogCategory==='all'||product.tags.includes(catalogCategory))&&(!query||(product.name+' '+product.ingredients).toLocaleLowerCase('ru-RU').includes(query)));
        if(catalogSort==='price-asc')products.sort((a,b)=>a.price-b.price);
        if(catalogSort==='price-desc')products.sort((a,b)=>b.price-a.price);
        if(catalogSort==='rating')products.sort((a,b)=>Number(b.rating.replace(',','.'))-Number(a.rating.replace(',','.')));
        $('[data-result-count]').textContent=products.length+' '+(products.length===1?'пицца':products.length>=2&&products.length<=4?'пиццы':'пицц');
      }
      root.innerHTML=products.length?products.map(productCard).join(''):mode==='favorites'?empty('Здесь будут любимые вкусы','Нажимайте на сердечко рядом с пиццей, чтобы сохранить её на следующий раз.','heart'):empty('Пока не нашли такую пиццу','Попробуйте другой ингредиент или сбросьте фильтры.','search','products.html','Показать всё меню');
    });
  }
  function renderStories(){
    const root=$('[data-stories]');if(!root)return;
    root.innerHTML=D.reviews.map((review,index)=>`<button class="story" type="button" data-story="${index}" aria-label="Читать отзыв: ${review.name}"><span class="story__avatar story__avatar--${review.color}">${review.initials}</span><span class="story__text"><strong>${review.name}<span class="story__stars">★★★★★</span></strong><small>${review.time}</small></span></button>`).join('');
  }
  function showStory(index,open=true){
    storyIndex=(index+D.reviews.length)%D.reviews.length;const review=D.reviews[storyIndex];const product=D.products.find(product=>product.photo===review.photo);
    $('[data-story-content]').innerHTML=`<div class="story-modal__image">${photo(product)}</div><div class="story-modal__body"><div class="story-modal__author"><span class="story__avatar story__avatar--${review.color}">${review.initials}</span><div><strong>${review.name}</strong><small>${review.time} · ★★★★★</small></div></div><h2>${review.title}</h2><blockquote>${review.text}</blockquote></div>`;
    if(open)$('#story-dialog').showModal();
  }
  function addToCart(raw,button=null){
    const item=C.normalizeItem(raw),existing=state.cart.find(row=>row.key===item?.key);
    if(existing&&existing.quantity+item.quantity>20){toast('В одном заказе можно выбрать до 20 одинаковых пицц.');return;}
    if(!persist({...state,cart:C.addItem(state.cart,raw)}))return;
    updateShared(true);toast(C.getProduct(raw.id).name+' в корзине','cart.html','В корзину');
    if(button){button.classList.add('is-added');const original=button.innerHTML;button.innerHTML=icon('check');setTimeout(()=>{if(button.isConnected){button.classList.remove('is-added');button.innerHTML=original;}},900);}
  }
  function toggleFavorite(id){
    const active=state.favorites.includes(id);const favorites=active?state.favorites.filter(value=>value!==id):[...state.favorites,id];
    if(!persist({...state,favorites}))return;
    updateShared();if($('[data-products="favorites"]'))renderProducts();toast(active?'Убрали из избранного':'Сохранили в избранное',active?'':'favorites.html','Посмотреть');
  }

  function renderProduct(){
    const root=$('[data-product-view]');if(!root)return;
    const params=new URLSearchParams(location.search),product=C.getProduct(params.get('id')||'pepperoni');
    if(!product){root.innerHTML=empty('Такой пиццы пока нет','Посмотрите наше меню — там уже есть из чего выбрать.');return;}
    document.title=product.name+' — PizzaPoint';editKey=params.get('edit')||'';
    const existing=state.cart.find(item=>item.key===editKey);
    if(!existing||existing.id!==product.id)editKey='';
    productDraft=C.normalizeItem(existing?.id===product.id?existing:{id:product.id,size:params.get('size'),dough:params.get('dough'),quantity:1});
    root.innerHTML=`<div class="product-detail"><div class="product-detail__media">${photo(product)}<span class="product-card__badge">${product.badge}</span>${favoriteButton(product)}</div><article class="product-detail__content"><span class="eyebrow">Из печи — с любовью</span><h1>${product.name}</h1><div class="product-meta"><span class="rating">${icon('star')}${product.rating}</span><span>${product.reviews} отзывов</span><span data-product-weight></span></div><p class="product-detail__description">${product.description}</p><div class="product-detail__price"><span data-product-unit-price></span>${product.oldPrice?`<del data-product-old-price>${money(product.oldPrice)}</del>`:''}</div><form data-product-options><fieldset class="config-group"><legend>Какой размер?</legend><div class="segmented">${[25,30,35].map(size=>`<label><input type="radio" name="size" value="${size}" ${productDraft.size===size?'checked':''}><span>${size} см</span></label>`).join('')}</div></fieldset><fieldset class="config-group"><legend>Выберите тесто</legend><div class="segmented"><label><input type="radio" name="dough" value="classic" ${productDraft.dough==='classic'?'checked':''}><span>Традиционное</span></label><label><input type="radio" name="dough" value="thin" ${productDraft.dough==='thin'?'checked':''}><span>Тонкое</span></label></div></fieldset><fieldset class="config-group"><legend>Сделаем ещё вкуснее?</legend><div class="extras-grid">${D.extras.map(extra=>`<label class="addon"><input type="checkbox" name="extras" value="${extra.id}" ${productDraft.extras.includes(extra.id)?'checked':''}>${icon(extra.icon)}<span><strong>${extra.name}</strong><small>+${money(extra.price)}</small></span></label>`).join('')}</div></fieldset></form><p class="product-allergens">${icon('info')}Содержит пшеницу и молочные продукты. Вес зависит от размера, теста и добавок.</p></article></div><div class="purchase-bar purchase-bar--product"><div class="quantity"><button type="button" data-product-qty="-1" aria-label="Уменьшить количество">${icon('minus')}</button><output data-product-quantity aria-live="polite">${productDraft.quantity}</output><button type="button" data-product-qty="1" aria-label="Увеличить количество">${icon('plus')}</button></div><button class="button button--primary" type="button" data-add-config></button></div>`;
    updateProductPrice();
  }
  function readProductOptions(){
    const form=$('[data-product-options]');if(!form||!productDraft)return;
    productDraft=C.normalizeItem({...productDraft,size:$('input[name="size"]:checked',form).value,dough:$('input[name="dough"]:checked',form).value,extras:$$('input[name="extras"]:checked',form).map(input=>input.value)});updateProductPrice();
  }
  function updateProductPrice(){
    if(!productDraft)return;
    $('[data-product-unit-price]').textContent=money(C.unitPrice(productDraft));
    const product=C.getProduct(productDraft.id);
    if($('[data-product-old-price]'))$('[data-product-old-price]').textContent=money(C.unitPrice(productDraft)+product.oldPrice-product.price);
    $('[data-product-weight]').textContent=productDraft.size+' см · '+C.weight(productDraft)+' г';
    $('[data-product-quantity]').textContent=productDraft.quantity;
    $('[data-product-qty="-1"]').disabled=productDraft.quantity<=1;
    $('[data-product-qty="1"]').disabled=productDraft.quantity>=20;
    $('[data-add-config]').textContent=(editKey?'Сохранить — ':'В корзину — ')+money(C.unitPrice(productDraft)*productDraft.quantity);
  }
  function receipt(amounts){
    return `<div class="receipt"><div class="receipt__row"><span>Пицца · ${amounts.quantity} шт.</span><strong>${money(amounts.subtotal)}</strong></div>${amounts.discount?`<div class="receipt__row receipt__row--discount"><span>Вторая пицца −20%</span><strong>−${money(amounts.discount)}</strong></div>`:''}<div class="receipt__row"><span>${state.method==='pickup'?'Самовывоз':'Доставка'}</span><strong>${amounts.delivery?money(amounts.delivery):'Бесплатно'}</strong></div><div class="receipt__row receipt__row--total"><span>Итого</span><strong>${money(amounts.total)}</strong></div><p class="receipt__footnote">Без дополнительных сборов. Всё уже включено.</p></div>`;
  }
  function renderCart(){
    const root=$('[data-cart-view]');if(!root)return;
    if(!state.cart.length){root.innerHTML=empty('Пока только предвкушение','Добавьте любимую пиццу — и начнём готовить ваш вкусный вечер.','cart');return;}
    const amounts=C.totals(state.cart,state.coupon,state.method),progress=Math.min(100,Math.round(amounts.payable/D.freeDeliveryFrom*100));
    const progressText=state.method==='pickup'?'Заберёте заказ сами — доставка не нужна':amounts.toFree?'Ещё '+money(amounts.toFree)+' до бесплатной доставки':'Доставка за наш счёт. Приятного аппетита!';
    root.innerHTML=`<section class="free-progress ${!amounts.toFree?'is-free':''}"><div class="free-progress__head">${icon(!amounts.toFree?'check':'truck')}<span>${progressText}</span></div>${state.method!=='pickup'?`<div class="free-progress__track"><span style="width:${progress}%"></span></div>`:''}</section><div class="cart-list">${state.cart.map(item=>{
      const product=C.getProduct(item.id),extras=item.extras.map(id=>D.extras.find(extra=>extra.id===id).name).join(', ');
      return `<article class="cart-item"><a class="cart-item__image" href="product.html?id=${product.id}&edit=${encodeURIComponent(item.key)}">${photo(product)}</a><div class="cart-item__main"><h2>${product.name}</h2><p class="cart-item__meta">${C.configuration(item)}${extras?`<span class="cart-item__extras">+ ${extras}</span>`:''}</p><a class="cart-item__edit" href="product.html?id=${product.id}&edit=${encodeURIComponent(item.key)}">Изменить</a></div><button class="cart-item__remove" type="button" data-remove-item="${escape(item.key)}" aria-label="Убрать из корзины: ${product.name}">${icon('trash')}</button><div class="cart-item__bottom"><div class="quantity"><button type="button" data-cart-qty="-1" data-key="${escape(item.key)}" aria-label="Уменьшить количество ${product.name}">${icon('minus')}</button><output>${item.quantity}</output><button type="button" data-cart-qty="1" data-key="${escape(item.key)}" aria-label="Увеличить количество ${product.name}" ${item.quantity>=20?'disabled':''}>${icon('plus')}</button></div><strong class="cart-item__price">${money(C.unitPrice(item)*item.quantity)}</strong></div></article>`;
    }).join('')}</div><details class="coupon-panel" ${state.coupon?'open':''}><summary>${icon('tag')}Есть промокод?${icon('down')}</summary><form class="coupon-form" data-promo-form><label class="sr-only" for="promo-input">Промокод</label><input class="input" id="promo-input" name="code" value="${escape(state.coupon)}" maxlength="20" placeholder="ВТОРАЯ20" autocomplete="off"><button class="button button--outline" type="submit">Применить</button></form><p class="coupon-note" data-coupon-note>${state.coupon?(amounts.discount?'Промокод применён. На вторую пиццу действует скидка.':'Добавьте минимум две пиццы, чтобы получить скидку.'):'ВТОРАЯ20 — скидка 20% на одну пиццу с меньшей ценой при заказе двух и более.'}</p></details>${receipt(amounts)}<div class="purchase-bar"><div><small>Итого</small><strong>${money(amounts.total)}</strong></div><a class="button button--primary" href="checkout.html">К оформлению${icon('arrow')}</a></div>`;
  }
  function updateCartQuantity(key,difference){
    const item=state.cart.find(item=>item.key===key);if(!item)return;
    if(!persist({...state,cart:C.changeQuantity(state.cart,key,item.quantity+difference)}))return;
    renderCart();updateShared();
    $$('[data-cart-qty]').find(el=>el.dataset.key===key&&Number(el.dataset.cartQty)===difference)?.focus({preventScroll:true});
  }

  function initCheckout(){
    const form=$('[data-checkout-form]');if(!form)return;
    if(!state.cart.length){$('[data-checkout-content]').hidden=true;const root=$('[data-checkout-empty]');root.hidden=false;root.innerHTML=empty('Сначала выберем пиццу','Ваша корзина пуста. В меню уже ждут любимые вкусы.','bag');return;}
    form.elements.name.value=state.profile.name;
    form.elements.phone.value=state.profile.phone;
    form.elements.address.value=state.profile.address;
    $('input[name="method"][value="'+state.method+'"]',form).checked=true;
    const now=new Date(Date.now()+30*60000);now.setMinutes(now.getMinutes()-now.getTimezoneOffset());
    form.elements.scheduled.min=now.toISOString().slice(0,16);
    updateCheckout();
    form.addEventListener('invalid',event=>{const block=event.target.closest('details');if(block)block.open=true;},true);
  }
  function updateCheckout(){
    const form=$('[data-checkout-form]');if(!form||!state.cart.length)return;
    const method=$('input[name="method"]:checked',form).value,pickup=method==='pickup';
    $('[data-delivery-field]').hidden=pickup;$('[data-pickup-address]').hidden=!pickup;
    form.elements.address.required=!pickup;form.elements.address.disabled=pickup;
    $('[data-method-summary]').textContent=pickup?'Самовывоз · Центральная, 24':'Доставка курьером · 35–45 минут';
    $('[data-checkout-address-summary]').textContent=pickup?'Контакты для получения':form.elements.address.value||'Контакты и адрес';
    const scheduled=form.elements.timeChoice.value==='scheduled';
    $('[data-schedule-field]').hidden=!scheduled;form.elements.scheduled.required=scheduled;form.elements.scheduled.disabled=!scheduled;
    $('[data-time-summary]').textContent=({asap:'Как можно скорее',hour:'Примерно через час',scheduled:'К определённому времени'})[form.elements.timeChoice.value];
    $('[data-payment-summary]').textContent=$('input[name="payment"]:checked',form).value==='cash'?'Наличными при получении':'Картой при получении';
    if(state.method!==method)persist({...state,method});
    const amounts=C.totals(state.cart,state.coupon,method);
    $('[data-checkout-total]').textContent=money(amounts.total);
    $('[data-checkout-count]').textContent=amounts.quantity+' шт. · '+money(amounts.subtotal);
    $('[data-checkout-receipt]').innerHTML=receipt(amounts);
    $('[data-checkout-submit]').disabled=!navigator.onLine;
    $('[data-checkout-offline]').hidden=navigator.onLine;
  }
  function validPhone(input,required=false){
    const value=input.value.trim(),length=value.replace(/\D/g,'').length;
    input.setCustomValidity((required||value)&&(length<10||length>15)?'Укажите номер телефона: от 10 до 15 цифр.':'');
    return input.checkValidity();
  }
  function validText(input,min,message,optional=false){
    const length=input.value.trim().length;
    input.setCustomValidity((length||!optional)&&length<min?message:'');
    return input.checkValidity();
  }
  function submitCheckout(form){
    validText(form.elements.name,2,'Укажите имя: минимум две буквы.');
    if(!form.elements.address.disabled)validText(form.elements.address,5,'Укажите улицу и номер дома.');
    validPhone(form.elements.phone,true);
    const scheduled=form.elements.timeChoice.value==='scheduled';
    form.elements.scheduled.setCustomValidity(scheduled&&new Date(form.elements.scheduled.value).getTime()<Date.now()+15*60000?'Выберите время хотя бы через 15 минут.':'');
    if(!form.reportValidity())return;
    if(!navigator.onLine){toast('Подключитесь к сети для оформления. Корзина сохранена.');return;}
    if(!state.cart.length)return;
    const method=$('input[name="method"]:checked',form).value,amounts=C.totals(state.cart,state.coupon,method),id='PP-'+state.nextOrder;
    const order={id,createdAt:Date.now(),status:0,items:C.normalizeCart(state.cart),amounts,name:form.elements.name.value.trim(),phone:form.elements.phone.value.trim(),address:method==='pickup'?D.pickupAddress:form.elements.address.value.trim(),method,time:form.elements.timeChoice.value,scheduled:scheduled?form.elements.scheduled.value:'',payment:$('input[name="payment"]:checked',form).value,comment:form.elements.comment.value.trim(),noCall:form.elements.noCall.checked,rewarded:false};
    const profile={...state.profile,name:order.name,phone:order.phone,address:method==='pickup'?state.profile.address:order.address};
    if(persist({...state,orders:[order,...state.orders],cart:[],coupon:'',profile,nextOrder:state.nextOrder+1}))location.href='orders.html?new='+encodeURIComponent(id);
  }

  function orderCard(order,sample=false){
    const status=Math.max(0,Math.min(3,Number(order.status)||0));
    const date=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(order.createdAt));
    const items=C.normalizeCart(order.items),amounts=order.amounts||C.totals(items);
    return `<article class="order-card ${sample?'order-card--example':''}" id="order-${escape(order.id)}">${sample?'<span class="order-card__example">Пример заказа</span>':''}<div class="order-card__header"><div><h2>Заказ #${escape(order.id)}</h2><small>${date}</small></div><strong>${money(amounts.total)}</strong></div><div class="order-card__status"><span class="status-pill">${icon(status===3?'check':'clock')}${D.statuses[status]}</span><span class="order-card__eta">${status===3?'Спасибо за ваш вкусный выбор':order.method==='pickup'?'Самовывоз · около 20 мин':'Ориентир · 35–45 минут'}</span></div><ol class="order-stepper" aria-label="Этапы заказа">${D.statuses.map((label,index)=>`<li class="order-step ${index<status?'is-done':index===status?'is-current':''}" ${index===status?'aria-current="step"':''}><span class="order-step__dot">${index<status?icon('check'):index+1}</span>${label}</li>`).join('')}</ol><div class="order-card__items">${items.map(item=>`<a class="order-card__thumb" href="product.html?id=${item.id}" aria-label="${escape(C.getProduct(item.id).name)}">${photo(C.getProduct(item.id))}</a>`).join('')}</div><details class="order-card__detail"><summary>Состав и детали заказа${icon('down')}</summary><ul>${items.map(item=>`<li>${escape(C.getProduct(item.id).name)} · ${C.configuration(item)} × ${item.quantity}${item.extras.length?' · '+item.extras.map(id=>escape(D.extras.find(extra=>extra.id===id).name)).join(', '):''}</li>`).join('')}</ul><p>${order.method==='pickup'?'Забрать в пиццерии':'Доставка'}: ${escape(order.address)}</p><p>${order.payment==='cash'?'Наличными':'Картой'} при получении${order.scheduled?' · '+escape(order.scheduled.replace('T',' ')):''}</p>${order.comment?`<p>Комментарий: ${escape(order.comment)}</p>`:''}</details>${status<3?`<div class="demo-controls"><small>${sample?'Это демонстрационный пример. Оформленные вами заказы появятся здесь.':'Учебный заказ без оплаты. Можно посмотреть все этапы доставки.'}</small><button class="button button--outline" type="button" data-next-order="${sample?'sample':escape(order.id)}">Следующий этап${icon('arrow')}</button></div>`:`<button class="button button--outline button--full order-repeat" type="button" data-repeat-order="${sample?'sample':escape(order.id)}">Повторить заказ${icon('plus')}</button>`}${order.earned?`<p class="order-card__earned">+${order.earned} бонусов за этот заказ</p>`:''}</article>`;
  }
  function sampleOrder(){
    const items=C.normalizeCart([{id:'pepperoni',quantity:1},{id:'four-cheese',dough:'thin',quantity:1}]);
    return {id:'1047',createdAt:Date.now()-12*60000,status:Math.max(0,Math.min(3,Number(state.sampleStatus)||0)),items,amounts:C.totals(items),address:'ул. Центральная, 12',method:'delivery',payment:'card'};
  }
  function renderOrders(){
    const root=$('[data-orders-view]');if(!root)return;
    if(!state.orders.length){root.innerHTML=orderFilter==='all'?orderCard(sampleOrder(),true):empty(orderFilter==='active'?'Сейчас нет активных заказов':'Вкусные воспоминания впереди','Здесь появятся ваши заказы. А пока можно присмотреть любимую пиццу.','orders');return;}
    const orders=state.orders.filter(order=>orderFilter==='active'?order.status<3:orderFilter==='history'?order.status===3:true);
    root.innerHTML=orders.length?orders.map(order=>orderCard(order)).join(''):empty(orderFilter==='active'?'Сейчас ничего не готовится':'История начинается с первого заказа','Самое время выбрать что-нибудь вкусное.','orders');
  }
  function nextOrder(id){
    if(id==='sample'){if(persist({...state,sampleStatus:Math.min(3,(Number(state.sampleStatus)||0)+1)}))renderOrders();return;}
    const source=state.orders.find(order=>order.id===id);if(!source)return;
    const result=C.advanceOrder(source,state.profile.bonuses);
    if(persist({...state,orders:state.orders.map(order=>order.id===id?result.order:order),profile:{...state.profile,bonuses:result.balance}})){
      renderOrders();updateShared();toast(result.order.status===3?'Заказ доставлен. Бонусы начислены!':'Новый статус: '+D.statuses[result.order.status]);
    }
  }
  function repeatOrder(id){
    const order=id==='sample'?sampleOrder():state.orders.find(order=>order.id===id);if(!order)return;
    let cart=state.cart;for(const item of order.items)cart=C.addItem(cart,item);
    if(persist({...state,cart})){updateShared(true);toast('Добавили заказ в корзину','cart.html','Посмотреть');}
  }
  function openAddress(){const dialog=$('#address-dialog');$('input[name="address"]',dialog).value=state.profile.address;dialog.showModal();}
  function openProfile(){const form=$('[data-profile-form]');['name','phone','address'].forEach(name=>form.elements[name].value=state.profile[name]);$('#profile-dialog').showModal();}
  function setZone(zone){
    const settings=({center:['В центре города','35–45 мин','Бесплатно от 1 500 ₽','Заказ меньше — доставка 149 ₽'],near:['Рядом с центром','50–70 мин','Бесплатно от 1 500 ₽','Заказ меньше — доставка 149 ₽'],pickup:['Загляните к нам','Около 20 мин','Самовывоз бесплатно','Центральная, 24 · 10:00–23:00']})[zone];
    if(!settings)return;
    $$('[data-zone]').forEach(button=>{const active=button.dataset.zone===zone;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    ['title','time','fee','detail'].forEach((part,index)=>$('[data-zone-'+part+']').textContent=settings[index]);
  }
  function initCountdown(){
    if(!$('[data-countdown]'))return;
    const tick=()=>{const now=new Date(),end=new Date(now);end.setHours(23,59,59,999);const diff=Math.max(0,end-now);$('[data-hours]').textContent=String(Math.floor(diff/3600000)).padStart(2,'0');$('[data-minutes]').textContent=String(Math.floor(diff%3600000/60000)).padStart(2,'0');$('[data-seconds]').textContent=String(Math.floor(diff%60000/1000)).padStart(2,'0');};
    tick();setInterval(tick,1000);if(!state.profile.notifications)$('[data-marketing]').hidden=true;
  }
  function updateNetwork(){
    const offline=!navigator.onLine;document.body.classList.toggle('is-offline',offline);$('[data-offline-banner]').hidden=!offline;
    if($('[data-offline-title]')){$('[data-offline-title]').textContent=offline?'Вы офлайн':'Снова на связи';$('[data-offline-description]').textContent=offline?'Соединение потерялось, но меню и корзина остались с вами. Можно продолжить выбирать пиццу.':'Соединение работает. Меню, избранное и ваши заказы снова доступны онлайн.';}
    if($('[data-checkout-form]')&&state.cart.length)updateCheckout();
  }
  function initPWA(){
    const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
    if(standalone){$('[data-install-banner]').hidden=true;$$('[data-installed-status]').forEach(el=>el.textContent='Приложение уже установлено');}
    if('serviceWorker' in navigator&&location.protocol!=='file:'){
      navigator.serviceWorker.register('./service-worker.js').then(()=>navigator.serviceWorker.ready).then(()=>{const root=$('[data-cache-status]');if(root)root.innerHTML=icon('check')+'Меню сохранено для работы без сети';}).catch(()=>{const root=$('[data-cache-status]');if(root)root.textContent='Для офлайн-доступа откройте приложение через HTTPS или localhost.';});
    }
    if(location.protocol==='file:')setTimeout(()=>toast('Для установки и офлайн-режима откройте проект через localhost.'),800);
  }
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;if(state.installDismissedUntil<Date.now()&&!window.matchMedia('(display-mode: standalone)').matches&&document.body.dataset.page==='index.html'){const banner=$('[data-install-banner]');if(banner)banner.hidden=false;}});
  window.addEventListener('appinstalled',()=>{installPrompt=null;const banner=$('[data-install-banner]');if(banner)banner.hidden=true;toast('PizzaPoint теперь на главном экране');});
  async function install(){
    if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone){toast('Вы уже открыли приложение PizzaPoint');return;}
    if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();const choice=await prompt.userChoice;$('[data-install-banner]').hidden=true;if(choice.outcome==='accepted')toast('Добавляем PizzaPoint на главный экран');}
    else{const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent);$('[data-install-instructions]').textContent=ios?'В Safari нажмите «Поделиться», затем «На экран Домой». После первого открытия меню будет доступно без сети.':'Откройте меню браузера → «Установить PizzaPoint» или «Добавить на главный экран». Если такого пункта нет, проверьте, что сайт открыт через HTTPS или localhost.';$('#install-dialog').showModal();}
  }

  function bind(){
    document.addEventListener('click',event=>{
      const target=event.target.closest('button,a');if(!target)return;
      if(target.matches('[data-favorite]')){event.preventDefault();toggleFavorite(target.dataset.favorite);}
      if(target.matches('[data-add-product]'))addToCart({id:target.dataset.addProduct,quantity:1},target);
      if(target.matches('[data-category]')){catalogCategory=target.dataset.category;renderCategories();renderProducts();}
      if(target.matches('[data-clear-search]')){catalogSearch='';$('[data-search]').value='';target.hidden=true;renderProducts();$('[data-search]').focus();}
      if(target.matches('[data-story]'))showStory(Number(target.dataset.story));
      if(target.matches('[data-story-prev]'))showStory(storyIndex-1,false);
      if(target.matches('[data-story-next]'))showStory(storyIndex+1,false);
      if(target.matches('[data-open-address]'))openAddress();
      if(target.matches('[data-open-profile]'))openProfile();
      if(target.matches('[data-close-dialog]'))target.closest('dialog').close();
      if(target.matches('[data-cart-qty]'))updateCartQuantity(target.dataset.key,Number(target.dataset.cartQty));
      if(target.matches('[data-remove-item]')){if(persist({...state,cart:state.cart.filter(item=>item.key!==target.dataset.removeItem)})){renderCart();updateShared();toast('Убрали пиццу из корзины');}}
      if(target.matches('[data-product-qty]')&&productDraft){productDraft={...productDraft,quantity:Math.max(1,Math.min(20,productDraft.quantity+Number(target.dataset.productQty)))};updateProductPrice();}
      if(target.matches('[data-add-config]')&&productDraft){if(editKey){const rest=state.cart.filter(item=>item.key!==editKey);if(persist({...state,cart:C.addItem(rest,productDraft)}))location.href='cart.html';}else addToCart(productDraft);}
      if(target.matches('[data-save-promo]')){if(persist({...state,coupon:D.promoCode}))toast('Промокод сохранён для двух пицц','cart.html','В корзину');}
      if(target.matches('[data-order-filter]')){orderFilter=target.dataset.orderFilter;$$('[data-order-filter]').forEach(button=>{const active=button===target;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});renderOrders();}
      if(target.matches('[data-next-order]'))nextOrder(target.dataset.nextOrder);
      if(target.matches('[data-repeat-order]'))repeatOrder(target.dataset.repeatOrder);
      if(target.matches('[data-zone]'))setZone(target.dataset.zone);
      if(target.matches('[data-install]'))install();
      if(target.matches('[data-dismiss-install]')){$('[data-install-banner]').hidden=true;persist({...state,installDismissedUntil:Date.now()+7*86400000});}
      if(target.matches('[data-reconnect]')){if(navigator.onLine)location.href='index.html';else toast('Пока нет соединения. Меню доступно без сети.');}
    });
    $$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}}));
    document.addEventListener('input',event=>{
      const input=event.target;
      if(input.matches('[data-search]')){catalogSearch=input.value;$('[data-clear-search]').hidden=!input.value;renderProducts();}
      if(input.type==='tel'||['scheduled','name','address','message'].includes(input.name))input.setCustomValidity('');
      if(input.closest('[data-checkout-form]')&&input.name==='address')$('[data-checkout-address-summary]').textContent=input.value||'Контакты и адрес';
    });
    document.addEventListener('change',event=>{
      const input=event.target;
      if(input.matches('[data-sort]')){catalogSort=input.value;renderProducts();}
      if(input.closest('[data-product-options]'))readProductOptions();
      if(input.closest('[data-checkout-form]'))updateCheckout();
      if(input.matches('[data-notification-toggle]')){if(persist({...state,profile:{...state.profile,notifications:input.checked}}))toast(input.checked?'Предложения и новинки включены':'Предложения скрыты');}
    });
    document.addEventListener('submit',event=>{
      const form=event.target;
      if(!form.matches('[data-address-form],[data-profile-form],[data-promo-form],[data-checkout-form],[data-waitlist-form],[data-feedback-form]'))return;
      event.preventDefault();
      if(form.matches('[data-address-form]')){
        validText(form.elements.address,5,'Укажите улицу и номер дома.');
        if(!form.reportValidity())return;const address=form.elements.address.value.trim();
        if(persist({...state,profile:{...state.profile,address}})){$('#address-dialog').close();updateShared();const checkout=$('[data-checkout-form]');if(checkout){checkout.elements.address.value=address;updateCheckout();}toast('Адрес сохранён');}
      }
      if(form.matches('[data-profile-form]')){
        validText(form.elements.name,2,'Укажите имя: минимум две буквы.');
        validText(form.elements.address,5,'Укажите улицу и номер дома.',true);
        validPhone(form.elements.phone);if(!form.reportValidity())return;
        const profile={...state.profile,name:form.elements.name.value.trim(),phone:form.elements.phone.value.trim(),address:form.elements.address.value.trim()};
        if(persist({...state,profile})){$('#profile-dialog').close();updateShared();toast('Личные данные сохранены');}
      }
      if(form.matches('[data-promo-form]')){
        const code=form.elements.code.value.trim().toUpperCase();
        if(code&&!C.isPromo(code)){$('[data-coupon-note]').textContent='Этот промокод не найден. Попробуйте ВТОРАЯ20.';return;}
        if(persist({...state,coupon:code})){renderCart();toast(code?'Промокод сохранён':'Промокод убран');}
      }
      if(form.matches('[data-checkout-form]'))submitCheckout(form);
      if(form.matches('[data-waitlist-form]')){
        if(!form.reportValidity())return;
        if(persist({...state,waitlist:{email:form.elements.email.value.trim(),createdAt:Date.now()}})){$('[data-waitlist-note]').textContent='Ваш интерес сохранён на этом устройстве. Рассылка будет доступна после запуска сервиса.';toast('Сохранили ваше напоминание');}
      }
      if(form.matches('[data-feedback-form]')){
        validText(form.elements.name,2,'Укажите имя: минимум две буквы.');
        validText(form.elements.message,5,'Напишите сообщение: минимум пять символов.');
        validPhone(form.elements.phone,true);if(!form.reportValidity())return;
        const draft={name:form.elements.name.value.trim(),phone:form.elements.phone.value.trim(),message:form.elements.message.value.trim(),createdAt:Date.now()};
        if(persist({...state,feedback:[draft,...(Array.isArray(state.feedback)?state.feedback:[])].slice(0,20)})){toast('Обращение сохранено как черновик');form.reset();}
      }
    });
    window.addEventListener('online',()=>{updateNetwork();toast('Снова на связи');});
    window.addEventListener('offline',updateNetwork);
    window.addEventListener('storage',event=>{if(event.key===STORAGE&&event.newValue){try{const next=JSON.parse(event.newValue);if(next.version===2){state=next;state.cart=C.normalizeCart(state.cart);updateShared();renderProducts();renderCart();renderOrders();updateCheckout();}}catch(_){}}});
  }
  function init(){
    const params=new URLSearchParams(location.search),category=params.get('category');
    if(D.categories.some(item=>item.id===category))catalogCategory=category;
    renderCategories();renderProducts();renderStories();renderProduct();renderCart();renderOrders();updateShared();initCheckout();bind();initCountdown();updateNetwork();initPWA();
    if(state.waitlist&&$('[data-waitlist-form]'))$('[data-waitlist-form]').elements.email.value=String(state.waitlist.email||'');
    if(params.has('new')&&$('[data-orders-view]'))toast('Учебный заказ создан. Начинаем готовить!');
  }
  document.addEventListener('DOMContentLoaded',init);
})();
