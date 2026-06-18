import { MenuItem, Order, Review } from '../types';

export const INITIAL_MENU: MenuItem[] = [
  {
    id: '1',
    name: 'გოლიათი შაურმა „იან“ 👑',
    nameEn: 'ShaurmYAN Goliath Signature',
    description: 'ჩვენი საფირმო შაურმა. წვნიანი, ნელ ცეცხლზე შემწვარი შერჩეული ხორცი, სპეციალური „იან“ სოუსი, ხრაშუნა კარტოფილი ფრი, ცოცხალი მწვანილი და საიდუმლო სანელებლები.',
    descriptionEn: 'Our signature giant shawarma. Juicy slow-roasted selected meat, special YAN house sauce, crispy french fries, fresh greens and secret Armenian-style spices.',
    price: 15.50,
    image: '/goliath-shaurma.png',
    category: 'special',
    spicyLevel: 1,
    popular: true,
    sizes: [
      { label: 'სტანდარტული \n (30სმ)', multiplier: 1, price: 15.50 },
      { label: 'საშუალო \n (40სმ)', multiplier: 1.3, price: 19.90 },
      { label: 'გიგანტი \n (50სმ)', multiplier: 1.7, price: 25.00 }
    ],
    customizations: [
      { id: 'ext-cheese', name: 'ორმაგი ყველი 🧀', price: 2.00, description: 'გამდნარი მოცარელა და სულგუნი შიგნით' },
      { id: 'ext-meat', name: 'ორმაგი ხორცი 🥩', price: 3.50, description: 'დამატებითი 80გრ წვნიანი ხორცი' },
      { id: 'ext-jalapenos', name: 'ჰალაპენიო 🌶️', price: 1.00, description: 'მწარე მწნილის რგოლები' },
      { id: 'ext-mushrooms', name: 'შემწვარი სოკო 🍄', price: 1.50, description: 'ოქროსფრად შემწვარი შამპინიონები' }
    ]
  },
  {
    id: '2',
    name: 'სამეფო შაურმა ყველით 🧀',
    nameEn: 'Royal Cheese Shawarma',
    description: 'უგემრიელესი შაურმა, სადაც უხვად არის ჩადნობითი სულგუნი და მოცარელას ნაზავი. თითოეულ ლუკმაში იგრძნობა კლასიკური არომატი და ყველის წელვადობა.',
    descriptionEn: 'Splendid shawarma loaded with a blend of melted sulguni and mozzarella cheese. Cheese pull and premium flavor in every single bite.',
    price: 14.00,
    image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&q=80&w=1200',
    category: 'classic',
    spicyLevel: 0,
    popular: true,
    sizes: [
      { label: 'სტანდარტული', multiplier: 1, price: 14.00 },
      { label: 'საშუალო', multiplier: 1.3, price: 18.20 },
      { label: 'გიგანტი', multiplier: 1.7, price: 23.50 }
    ],
    customizations: [
      { id: 'ext-cheese', name: 'ორმაგი ყველი 🧀', price: 2.00, description: 'კიდევ უფრო მეტი წელვადი ყველი' },
      { id: 'ext-meat', name: 'ორმაგი ხორცი 🥩', price: 3.50, description: 'დამატებითი 80გრ წვნიანი ხორცი' },
      { id: 'ext-sauce', name: 'დამატებითი სოუსი 🥣', price: 0.80, description: 'ჩვენი საფირმო თეთრი სოუსი' }
    ]
  },
  {
    id: '3',
    name: 'ვულკანი ჩილი შაურმა 🔥🌶️',
    nameEn: 'Volcano Chili Shawarma',
    description: 'ნამდვილი გურმანებისთვის, ვისაც სიმწარე უყვარს! ცხარე ჩილი სოუსი, ჰალაპენიო, დამარინადებული ხახვი და წიწაკა, ხორცი და ხრაშუნა ლავაში.',
    descriptionEn: 'For true spice lovers! Hot chili explosion, jalapenos, marinated red onion, crispy roasted peppers and juicy meat in a crisp wrap.',
    price: 12.50,
    image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&q=80&w=1200',
    category: 'classic',
    spicyLevel: 3,
    popular: false,
    sizes: [
      { label: 'სტანდარტული', multiplier: 1, price: 12.50 },
      { label: 'საშუალო', multiplier: 1.3, price: 16.00 },
      { label: 'გიგანტი', multiplier: 1.7, price: 21.00 }
    ],
    customizations: [
      { id: 'ext-meat', name: 'ორმაგი ხორცი 🥩', price: 3.50, description: 'მეტი ხორცი ბალანსისთვის' },
      { id: 'ext-jalapenos', name: 'კიდევ უფრო მეტი ჩილი 🥵', price: 1.00, description: 'მეტი სიცხარე შაურმაში!' }
    ]
  },
  {
    id: '4',
    name: 'ვეგეტარიანული შემოქმედება 🌿',
    nameEn: 'Vegetarian Masterpiece',
    description: 'კარტოფილი ფრი, ოქროსფერი სოკო, პომიდორი კუბიკებით, კიტრი, თეთრი ნივრის სოუსი (ან სამარხვო სოუსი სურვილისამებრ) და ცოცხალი სალათის ფოთლები.',
    descriptionEn: 'Golden crispy fries, delicious grilled mushrooms, diced tomatoes, fresh cucumbers, organic garlic sauce and crispy lettuce in flatbread.',
    price: 10.00,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200',
    category: 'classic',
    spicyLevel: 0,
    popular: false,
    sizes: [
      { label: 'სტანდარტული', multiplier: 1, price: 10.00 },
      { label: 'საშუალო', multiplier: 1.3, price: 13.00 },
      { label: 'გიგანტი', multiplier: 1.7, price: 17.00 }
    ],
    customizations: [
      { id: 'ext-cheese', name: 'დაამატე ყველი 🧀', price: 2.00, description: 'შერეული ყველი შიგნით' },
      { id: 'ext-mushrooms', name: 'ორმაგი სოკო 🍄', price: 1.50, description: 'დამატებითი პორცია ოქროსფერი სოკო' }
    ]
  },
  {
    id: '5',
    name: 'იან - მეგა კომბო მენიუ 🍟🥤',
    nameEn: 'YAN Mega Combo Menu',
    description: 'სტანდარტული საფირმო შაურმა, პორცია ხრაშუნა კარტოფილი ფრი, ჩვენი დამზადებული საწებელი სოუსი და გაზიანი სასმელი (0.33ლ) არჩევით.',
    descriptionEn: 'Standard Signature Shawarma, medium crispy french fries, special house dipping sauce and a refreshing beverage of your choice.',
    price: 21.00,
    image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&q=80&w=1200',
    category: 'combos',
    spicyLevel: 1,
    popular: true,
    sizes: [
      { label: 'სტანდარტული კომბო', multiplier: 1, price: 21.00 },
      { label: 'დიდი კომბო (საშუალო შაურმა)', multiplier: 1.25, price: 26.00 }
    ],
    customizations: [
      { id: 'ext-cheese', name: 'ორმაგი ყველი შაურმაში 🧀', price: 2.00, description: 'გამდნარი ყველი შაურმაში' },
      { id: 'ext-fries', name: 'დიდი პორცია ფრი 🍟', price: 1.50, description: 'გაადიდე კარტოფილი ფრი' }
    ]
  },
  {
    id: '6',
    name: 'კარტოფილი ფრი „მოცარელათი“ 🍟🧀',
    nameEn: 'Cheese Fries Mozzarella',
    description: 'ცხელი, ოქროსფერი კარტოფილი ფრი სქელი გამდნარი მოცარელასა და სულგუნის საფარით, ზემოდან მოყრილი მწვანე ხახვითა და სანელებლებით.',
    descriptionEn: 'Hot golden crispy french fries covered with a thick crust of melted mozzarella and sulguni cheese, topped with fresh scallions.',
    price: 7.50,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=1200',
    category: 'sides',
    spicyLevel: 0,
    popular: false,
    sizes: [
      { label: 'სტანდარტული პორცია', multiplier: 1, price: 7.50 },
      { label: 'საოჯახო პორცია', multiplier: 1.6, price: 12.00 }
    ],
    customizations: [
      { id: 'ext-jalapenos', name: 'დაამატე ჰალაპენიო 🌶️', price: 1.00, description: 'ცხარე ფრის მოყვარულთათვის' }
    ]
  },
  {
    id: '7',
    name: 'ცივი ტანის სასმელი 🥛',
    nameEn: 'Cold Tan Drink',
    description: 'ტრადიციული, გაზიანი ტანის სასმელი პიტნითა და კიტრით - საუკეთესოდ აბალანსებს შაურმის ნოყიერ გემოს.',
    descriptionEn: 'Traditional cold sparkling Tan drink with a touch of mint and cucumber - perfect balance for shawarma richness.',
    price: 3.00,
    image: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&q=80&w=1200', // Milk glass look
    category: 'drinks',
    spicyLevel: 0,
    popular: false,
    sizes: [
      { label: 'საშუალო (0.4ლ)', multiplier: 1, price: 3.00 },
      { label: 'დიდი (0.5ლ)', multiplier: 1.5, price: 4.50 }
    ],
    customizations: []
  },
  {
    id: '8',
    name: 'კოკა-კოლა ორიგინალი🥤',
    nameEn: 'Coca-Cola Original',
    description: 'ინტენსიურად ცივი კოკა-კოლა (თუნუქის ქილა 0.33ლ).',
    descriptionEn: 'Ice cold Coca-Cola Can (0.33L).',
    price: 2.50,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=1200',
    category: 'drinks',
    spicyLevel: 0,
    popular: false,
    sizes: [
      { label: 'ქილა 0.33ლ', multiplier: 1, price: 2.50 },
      { label: 'ბოთლი 0.5ლ', multiplier: 1.4, price: 3.50 }
    ],
    customizations: []
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    author: 'გიორგი მიქაძე',
    rating: 5,
    comment: 'თბილისში საუკეთესო შაურმაა უდავოდ! ხორცი ყოველთვის იდეალურად არის შემწვარი, სოუსის ბალანსი ხო საერთოდ სასწაულია. გოლიათი შაურმა დამატებითი ყველით ჩემი ფავორიტია.',
    createdAt: '2026-06-12T19:30:00Z',
    approved: true
  },
  {
    id: 'rev-2',
    author: 'ნინო ტაბატაძე',
    rating: 5,
    comment: 'სქროლ-ანიმაციები საიტზე ძალიან ლამაზია მაგრამ შაურმა კიდევ უფრო გემრიელი! ველოდებოდი და მართლა ძალიან სწრაფად მოიტანეს. უაღრესად რეკომენდირებული ვერსიაა ყველით სამეფო.',
    createdAt: '2026-06-13T14:45:00Z',
    approved: true
  },
  {
    id: 'rev-3',
    author: 'ლუკა კოპალიანი',
    rating: 4,
    comment: 'ძალიან კარგი გემრიელი პორციაა, სუნელები იდეალურად არის შერჩეული, აშკარად ხარისხიან ხორცს იყენებენ. ცოტა ცხარე ვერსია ავიღე და ჩემს მოთხოვნებს დააკმაყოფილა.',
    createdAt: '2026-06-14T10:15:00Z',
    approved: true
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-8854',
    customerName: 'დავით კახიძე',
    customerPhone: '599 45 61 23',
    customerAddress: 'ვაჟა-ფშაველას გამზ. 24, ბინა 15',
    paymentMethod: 'card_courier',
    items: [
      { name: 'გოლიათი შაურმა „იან“ 👑', size: 'გიგანტი (50სმ)', extras: ['ორმაგი ყველი 🧀', 'ორმაგი ხორცი 🥩'], price: 30.50, quantity: 1 },
      { name: 'კოკა-კოლა ორიგინალი🥤', size: 'ბოთლი 0.5ლ', extras: [], price: 3.50, quantity: 2 }
    ],
    totalPrice: 37.50,
    status: 'delivered',
    createdAt: '2026-06-14T11:20:00+04:00',
    notes: 'კართან დატოვეთ და ზარი დარეკეთ.'
  },
  {
    id: 'ORD-1290',
    customerName: 'თამარ ბერიძე',
    customerPhone: '555 88 12 99',
    customerAddress: 'ილია ჭავჭავაძის გამზ. 40',
    paymentMethod: 'cash',
    items: [
      { name: 'სამეფო შაურმა ყველით 🧀', size: 'საშუალო', extras: ['ორმაგი ხორცი 🥩'], price: 21.70, quantity: 2 },
      { name: 'ცივი ტანის სასმელი 🥛', size: 'საშუალო (0.4ლ)', extras: [], price: 3.00, quantity: 1 }
    ],
    totalPrice: 46.40,
    status: 'preparing',
    createdAt: '2026-06-14T14:35:00+04:00',
    notes: 'ხახვის გარეშე თუ შეიძლება.'
  },
  {
    id: 'ORD-3321',
    customerName: 'ლევან ყიფიანი',
    customerPhone: '577 12 34 56',
    customerAddress: 'კოსტავას ქ. 12',
    paymentMethod: 'card_online',
    items: [
      { name: 'იან - მეგა კომბო მენიუ 🍟🥤', size: 'დიდი კომბო (საშუალო შაურმა)', extras: ['ორმაგი ყველი შაურმაში 🧀'], price: 28.00, quantity: 1 }
    ],
    totalPrice: 28.00,
    status: 'new',
    createdAt: '2026-06-14T14:46:00+04:00'
  }
];
