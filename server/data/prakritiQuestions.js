/**
 * 10-question Prakriti Parikshan questionnaire.
 * A → Vata, B → Pitta, C → Kapha
 */
const prakritiQuestions = [
  {
    id: 1,
    text: 'How would you describe your body frame?',
    answers: [
      { value: 'a', text: 'Thin, bony, and difficult to gain weight', weights: { vata: 1, pitta: 0, kapha: 0 } },
      { value: 'b', text: 'Medium, athletic, and well-proportioned', weights: { vata: 0, pitta: 1, kapha: 0 } },
      { value: 'c', text: 'Large, broad, and easy to gain weight', weights: { vata: 0, pitta: 0, kapha: 1 } },
    ],
  },
  {
    id: 2,
    text: 'How is your skin texture?',
    answers: [
      { value: 'a', text: 'Dry, rough, and cold', weights: { vata: 1, pitta: 0, kapha: 0 } },
      { value: 'b', text: 'Oily, warm, and reddish', weights: { vata: 0, pitta: 1, kapha: 0 } },
      { value: 'c', text: 'Thick, smooth, moist, and cool', weights: { vata: 0, pitta: 0, kapha: 1 } },
    ],
  },
  {
    id: 3,
    text: 'How would you describe your hair quality?',
    answers: [
      { value: 'a', text: 'Dry, brittle, and curly', weights: { vata: 1, pitta: 0, kapha: 0 } },
      { value: 'b', text: 'Fine, soft, oily, and prone to early greying', weights: { vata: 0, pitta: 1, kapha: 0 } },
      { value: 'c', text: 'Thick, wavy, dark, and shiny', weights: { vata: 0, pitta: 0, kapha: 1 } },
    ],
  },
  {
    id: 4,
    text: 'How is your appetite and digestion?',
    answers: [
      { value: 'a', text: 'Irregular appetite with frequent bloating', weights: { vata: 1, pitta: 0, kapha: 0 } },
      { value: 'b', text: 'Strong appetite — I get irritable if I miss a meal', weights: { vata: 0, pitta: 1, kapha: 0 } },
      { value: 'c', text: 'Low but steady appetite with slow digestion', weights: { vata: 0, pitta: 0, kapha: 1 } },
    ],
  },
  {
    id: 5,
    text: 'How is your sleep pattern?',
    answers: [
      { value: 'a', text: 'Light sleeper, 5–7 hrs, with vivid dreams', weights: { vata: 1, pitta: 0, kapha: 0 } },
      { value: 'b', text: 'Sound sleeper, 6–8 hrs, wake up refreshed', weights: { vata: 0, pitta: 1, kapha: 0 } },
      { value: 'c', text: 'Deep sleeper, 8+ hrs, hard to wake up', weights: { vata: 0, pitta: 0, kapha: 1 } },
    ],
  },
  {
    id: 6,
    text: 'How is your learning and memory?',
    answers: [
      { value: 'a', text: 'Quick to learn but quick to forget', weights: { vata: 1, pitta: 0, kapha: 0 } },
      { value: 'b', text: 'Sharp mind, moderate pace, remembers well', weights: { vata: 0, pitta: 1, kapha: 0 } },
      { value: 'c', text: 'Slow to learn but excellent long-term memory', weights: { vata: 0, pitta: 0, kapha: 1 } },
    ],
  },
  {
    id: 7,
    text: 'How do you react under stress?',
    answers: [
      { value: 'a', text: 'Anxious, worried, and fearful', weights: { vata: 1, pitta: 0, kapha: 0 } },
      { value: 'b', text: 'Irritable, angry, and impatient', weights: { vata: 0, pitta: 1, kapha: 0 } },
      { value: 'c', text: 'Calm and steady but can become stubborn', weights: { vata: 0, pitta: 0, kapha: 1 } },
    ],
  },
  {
    id: 8,
    text: 'What is your weather preference?',
    answers: [
      { value: 'a', text: 'Loves warm weather, dislikes cold', weights: { vata: 1, pitta: 0, kapha: 0 } },
      { value: 'b', text: 'Loves cool weather, dislikes heat', weights: { vata: 0, pitta: 1, kapha: 0 } },
      { value: 'c', text: 'Loves dry and warm, dislikes damp and cold', weights: { vata: 0, pitta: 0, kapha: 1 } },
    ],
  },
  {
    id: 9,
    text: 'How would you describe your physical activity level?',
    answers: [
      { value: 'a', text: 'Very active, restless, and quick-moving', weights: { vata: 1, pitta: 0, kapha: 0 } },
      { value: 'b', text: 'Moderate, purposeful, and competitive', weights: { vata: 0, pitta: 1, kapha: 0 } },
      { value: 'c', text: 'Slow, steady, and tends toward sedentary', weights: { vata: 0, pitta: 0, kapha: 1 } },
    ],
  },
  {
    id: 10,
    text: 'How would you describe your speech?',
    answers: [
      { value: 'a', text: 'Fast, talkative, and tends to wander', weights: { vata: 1, pitta: 0, kapha: 0 } },
      { value: 'b', text: 'Sharp, clear, convincing, and logical', weights: { vata: 0, pitta: 1, kapha: 0 } },
      { value: 'c', text: 'Slow, melodious, and deliberate', weights: { vata: 0, pitta: 0, kapha: 1 } },
    ],
  },
];

module.exports = prakritiQuestions;
