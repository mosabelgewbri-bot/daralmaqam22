import { Recipe } from './types';

export const RECIPES: Recipe[] = [
  {
    id: 'baileys-espresso-martini',
    title: 'Baileys Espresso Martini',
    description: 'A sophisticated twist on the classic Espresso Martini, adding a creamy, indulgent layer.',
    category: 'Cocktails',
    image: 'https://picsum.photos/seed/espresso-martini/800/1000',
    prepTime: '5 mins',
    ingredients: [
      '50ml Baileys Original Irish Cream',
      '25ml Espresso (freshly brewed)',
      '25ml Vodka',
      'Ice cubes',
      'Coffee beans for garnish'
    ],
    instructions: [
      'Fill a cocktail shaker with ice.',
      'Add Baileys, espresso, and vodka.',
      'Shake vigorously until chilled.',
      'Strain into a chilled martini glass.',
      'Garnish with three coffee beans.'
    ]
  },
  {
    id: 'baileys-hot-chocolate',
    title: 'Baileys Hot Chocolate',
    description: 'The ultimate comfort drink. Rich, velvety hot chocolate spiked with smooth Baileys.',
    category: 'Coffee',
    image: 'https://picsum.photos/seed/hot-chocolate/800/1000',
    prepTime: '10 mins',
    ingredients: [
      '50ml Baileys Original Irish Cream',
      '200ml Milk',
      '2 tbsp Cocoa powder',
      'Whipped cream',
      'Chocolate shavings'
    ],
    instructions: [
      'Heat milk in a small saucepan over medium heat.',
      'Whisk in cocoa powder until smooth and hot.',
      'Pour into a large mug and stir in Baileys.',
      'Top with a generous swirl of whipped cream.',
      'Garnish with chocolate shavings.'
    ]
  },
  {
    id: 'baileys-cheesecake',
    title: 'Baileys No-Bake Cheesecake',
    description: 'A decadent, creamy cheesecake with a hint of Baileys on a buttery biscuit base.',
    category: 'Desserts',
    image: 'https://picsum.photos/seed/cheesecake/800/1000',
    prepTime: '30 mins + chilling',
    ingredients: [
      '75ml Baileys Original Irish Cream',
      '250g Digestive biscuits (crushed)',
      '100g Butter (melted)',
      '500g Cream cheese',
      '100g Icing sugar',
      '300ml Double cream'
    ],
    instructions: [
      'Mix crushed biscuits with melted butter and press into a tin.',
      'Beat cream cheese, icing sugar, and Baileys until smooth.',
      'In a separate bowl, whisk double cream until soft peaks form.',
      'Fold the cream into the Baileys mixture.',
      'Spread over the biscuit base and chill for at least 4 hours.'
    ]
  },
  {
    id: 'baileys-flat-white-martini',
    title: 'Baileys Flat White Martini',
    description: 'A smooth, creamy cocktail that perfectly balances coffee and Baileys.',
    category: 'Cocktails',
    image: 'https://picsum.photos/seed/flat-white/800/1000',
    prepTime: '5 mins',
    ingredients: [
      '50ml Baileys Original Irish Cream',
      '25ml Espresso',
      '25ml Vodka',
      'Ice cubes'
    ],
    instructions: [
      'Add all ingredients to a shaker with ice.',
      'Shake hard for 20 seconds.',
      'Strain into a martini glass.',
      'Enjoy the silky smooth texture.'
    ]
  },
  {
    id: 'baileys-affogato',
    title: 'Baileys Affogato',
    description: 'A simple yet elegant Italian dessert with a Baileys twist.',
    category: 'Desserts',
    image: 'https://picsum.photos/seed/affogato/800/1000',
    prepTime: '2 mins',
    ingredients: [
      '50ml Baileys Original Irish Cream',
      '2 scoops Vanilla gelato or ice cream',
      '1 shot Hot espresso'
    ],
    instructions: [
      'Place two scoops of vanilla gelato in a glass or bowl.',
      'Pour over the hot espresso shot.',
      'Finish by drizzling Baileys over the top.',
      'Serve immediately.'
    ]
  }
];
