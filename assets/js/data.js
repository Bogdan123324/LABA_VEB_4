/* Одни и те же данные используются в меню, карточке, корзине и заказах. */
var PizzaData = {
  products: [
    {id:'margherita',name:'Маргарита',price:549,oldPrice:0,weight:510,rating:'4,9',reviews:128,photo:0,badge:'Любимая классика',tags:['classic','vegetarian','cheese'],ingredients:'Томаты, моцарелла, базилик',description:'Та самая итальянская классика: тянущаяся моцарелла, сочные томаты и свежий базилик на нашем фирменном тесте.'},
    {id:'pepperoni',name:'Пепперони',price:649,oldPrice:759,weight:560,rating:'4,9',reviews:246,photo:1,badge:'−110 ₽',tags:['classic','meat','spicy','sale'],ingredients:'Пепперони, моцарелла, томатный соус',description:'Щедрая порция пряной пепперони, моцарелла и томатный соус. Знакомый вкус, к которому хочется возвращаться.'},
    {id:'four-cheese',name:'Четыре сыра',price:699,oldPrice:0,weight:530,rating:'4,8',reviews:97,photo:2,badge:'Сырное счастье',tags:['cheese','vegetarian'],ingredients:'Моцарелла, чеддер, дорблю, пармезан',description:'Четыре характера в одной пицце: нежная моцарелла, яркий чеддер, пикантный дорблю и выдержанный пармезан.'},
    {id:'meat',name:'Мясная',price:749,oldPrice:0,weight:640,rating:'4,9',reviews:183,photo:3,badge:'Больше начинки',tags:['meat'],ingredients:'Бекон, курица, ветчина, пепперони',description:'Для большого аппетита: четыре вида мясной начинки, моцарелла и насыщенный томатный соус.'},
    {id:'mushroom',name:'Грибная',price:629,oldPrice:0,weight:550,rating:'4,8',reviews:86,photo:4,badge:'Без мяса',tags:['vegetarian','cheese'],ingredients:'Шампиньоны, моцарелла, сливочный соус',description:'Ароматные шампиньоны и нежная моцарелла на сливочной основе. Мягкий вкус с лёгкими нотками трав.'},
    {id:'bbq',name:'Барбекю',price:719,oldPrice:0,weight:610,rating:'4,9',reviews:154,photo:5,badge:'С дымком',tags:['meat','spicy'],ingredients:'Курица, бекон, красный лук, соус BBQ',description:'Запечённая курица, хрустящий бекон, красный лук и фирменный соус барбекю с лёгкой дымной ноткой.'}
  ],
  categories: [
    {id:'all',name:'Вся пицца',icon:'pizza'},
    {id:'meat',name:'Мясные',icon:'flame'},
    {id:'cheese',name:'Сырные',icon:'cheese'},
    {id:'spicy',name:'Острые',icon:'pepper'},
    {id:'vegetarian',name:'Без мяса',icon:'leaf'},
    {id:'sale',name:'Со скидкой',icon:'tag'}
  ],
  extras: [
    {id:'extra-cheese',name:'Больше сыра',price:59,weight:40,icon:'cheese'},
    {id:'extra-pepperoni',name:'Пепперони',price:79,weight:35,icon:'pizza'},
    {id:'extra-mushroom',name:'Шампиньоны',price:49,weight:40,icon:'leaf'},
    {id:'jalapeno',name:'Халапеньо',price:39,weight:25,icon:'pepper'}
  ],
  reviews: [
    {name:'Анна',initials:'АН',color:'peach',time:'сегодня',title:'Наш вечер стал вкуснее',text:'Привезли горячую пиццу, сыр ещё тянулся. Пепперони теперь наша постоянная!',photo:1},
    {name:'Игорь',initials:'ИГ',color:'sand',time:'вчера',title:'Идеально к кино',text:'Взяли две пиццы на вечер. Удобно выбрать тесто и добавить побольше сыра. Вернёмся за Мясной.',photo:3},
    {name:'Мария',initials:'МА',color:'rose',time:'вчера',title:'Четыре сыра — любовь',text:'Нежная основа и действительно четыре разных сыра. Одной пиццей дело не ограничилось.',photo:2},
    {name:'Олег',initials:'ОЛ',color:'taupe',time:'2 дня назад',title:'Просто хорошая пицца',text:'Заказывали на небольшую компанию. Каждый нашёл свой вкус, всё приехало аккуратно упакованным.',photo:0}
  ],
  statuses:['Принят','Готовится','В пути','Доставлен'],
  deliveryFee:149,
  freeDeliveryFrom:1500,
  pickupAddress:'ул. Центральная, 24',
  promoCode:'ВТОРАЯ20'
};
if (typeof module !== 'undefined' && module.exports) module.exports = PizzaData;
