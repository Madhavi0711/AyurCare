/**
 * Default diet templates — one per Prakriti type.
 * These serve as the base plan when generating a diet recommendation.
 */
const dietTemplates = {
  vata: {
    prakriti_type: 'vata',
    recommended_foods:
      'Warm, cooked, oily, and nourishing foods. Favour: ghee, sesame oil, warm milk, cooked grains (rice, oats, wheat), root vegetables (sweet potato, carrot, beet), ripe sweet fruits (banana, mango, avocado), nuts and seeds (almonds, sesame), warming spices (ginger, cinnamon, cardamom, cumin), legumes well-cooked with oil.',
    avoid_foods:
      'Cold, raw, dry, and light foods. Avoid: raw salads, cold drinks and ice cream, dry crackers and popcorn, carbonated beverages, frozen foods, excessive caffeine, astringent or bitter vegetables (raw broccoli, raw cabbage), dried fruits.',
    lifestyle_tips:
      'Eat at regular, consistent times each day. Prefer warm beverages. Avoid skipping meals. Rest adequately and maintain a stable daily routine. Gentle oil massage (abhyanga) with sesame oil supports grounding.',
  },
  pitta: {
    prakriti_type: 'pitta',
    recommended_foods:
      'Cooling, sweet, and bitter foods. Favour: coconut oil, ghee, sweet fruits (grapes, melons, pears, pomegranate), leafy greens, cucumber, zucchini, sweet potatoes, basmati rice, oats, wheat, dairy (milk, butter, unsalted cheese), cooling spices (coriander, fennel, cardamom, mint), legumes (mung beans, chickpeas).',
    avoid_foods:
      'Spicy, sour, salty, and heating foods. Avoid: chilli, hot peppers, garlic, onion, tomatoes, citrus fruits, vinegar, fermented foods, red meat, alcohol, fried foods, excessive salt, coffee and black tea.',
    lifestyle_tips:
      'Eat in a calm environment without rushing. Avoid skipping meals, especially lunch (the main meal). Stay well hydrated with cool (not ice-cold) water. Limit sun exposure during peak hours. Favour leisure activities that are calming rather than competitive.',
  },
  kapha: {
    prakriti_type: 'kapha',
    recommended_foods:
      'Light, dry, warm, and stimulating foods. Favour: honey (raw), light grains (barley, millet, corn, rye), legumes (lentils, black beans), most vegetables especially leafy greens and bitter/astringent types (kale, spinach, Brussels sprouts), light fruits (apples, pears, berries, pomegranate), warming spices (ginger, black pepper, turmeric, mustard seed, cloves), small amounts of low-fat dairy.',
    avoid_foods:
      'Heavy, oily, cold, and sweet foods. Avoid: wheat, rice (in excess), dairy (especially cheese, yoghurt, ice cream), red meat, fried foods, sweets and refined sugar, cold drinks, excessive salt, nuts and seeds in large quantities, bananas, avocados.',
    lifestyle_tips:
      'Eat the largest meal at midday and keep dinner light. Avoid daytime napping. Engage in regular vigorous exercise. Favour dry cooking methods (baking, grilling) over frying. Use warming spices liberally. Avoid eating when not genuinely hungry.',
  },
};

module.exports = dietTemplates;
