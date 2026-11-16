import type { SeedData } from './seed.schema.js';

/**
 * Public-domain quotes, each traceable to a named work. Translations are
 * public-domain editions (Long's Marcus Aurelius and Epictetus, Gummere's
 * Seneca, Legge's Confucius and Lao Tzu, Jowett's Plato, Ross's Aristotle).
 *
 * Edit freely: the seed script upserts by slug and by (author, text), so
 * rerunning it adds new entries without duplicating old ones.
 */
export const seedData: SeedData = {
  categories: [
    { slug: 'wisdom', name: 'Wisdom' },
    { slug: 'life', name: 'Life' },
    { slug: 'stoicism', name: 'Stoicism' },
    { slug: 'courage', name: 'Courage' },
    { slug: 'happiness', name: 'Happiness' },
    { slug: 'work', name: 'Work' },
    { slug: 'learning', name: 'Learning' },
    { slug: 'change', name: 'Change' },
    { slug: 'humor', name: 'Humor' },
    { slug: 'virtue', name: 'Virtue' },
    { slug: 'time', name: 'Time' },
    { slug: 'friendship', name: 'Friendship' },
  ],
  authors: [
    {
      slug: 'marcus-aurelius',
      name: 'Marcus Aurelius',
      quotes: [
        {
          text: 'Such as are thy habitual thoughts, such also will be the character of thy mind; for the soul is dyed by the thoughts.',
          categories: ['stoicism', 'wisdom'],
        },
        {
          text: 'No longer talk at all about the kind of man that a good man ought to be, but be such.',
          categories: ['virtue', 'stoicism'],
        },
        {
          text: 'Remember this, that very little indeed is necessary for living a happy life.',
          categories: ['happiness', 'stoicism'],
        },
        {
          text: 'The universe is transformation; life is opinion.',
          categories: ['change', 'stoicism'],
        },
        {
          text: 'Loss is nothing else than change.',
          categories: ['change', 'stoicism'],
        },
        {
          text: 'Do every act of thy life as if it were the last.',
          categories: ['time', 'stoicism'],
        },
      ],
    },
    {
      slug: 'seneca',
      name: 'Seneca',
      quotes: [
        {
          text: 'While we are postponing, life speeds by.',
          categories: ['time', 'life'],
        },
        {
          text: 'We suffer more often in imagination than in reality.',
          categories: ['stoicism', 'wisdom'],
        },
        {
          text: 'It is not the man who has too little, but the man who craves more, that is poor.',
          categories: ['happiness', 'wisdom'],
        },
        {
          text: "Nothing, to my way of thinking, is a better proof of a well ordered mind than a man's ability to stop just where he is and pass some time in his own company.",
          categories: ['wisdom', 'stoicism'],
        },
        {
          text: 'Associate with those who will make a better man of you. Welcome those whom you yourself can improve.',
          categories: ['friendship', 'virtue'],
        },
        {
          text: 'Life is long if you know how to use it.',
          categories: ['time', 'life'],
        },
      ],
    },
    {
      slug: 'epictetus',
      name: 'Epictetus',
      quotes: [
        {
          text: 'Men are disturbed not by the things which happen, but by the opinions about the things.',
          categories: ['stoicism', 'wisdom'],
        },
        {
          text: 'Of things some are in our power, and others are not.',
          categories: ['stoicism'],
        },
        {
          text: 'If you would be a good reader, read; if a writer, write.',
          categories: ['work', 'learning'],
        },
        {
          text: 'No man is free who is not master of himself.',
          categories: ['virtue', 'stoicism'],
        },
      ],
    },
    {
      slug: 'confucius',
      name: 'Confucius',
      quotes: [
        {
          text: 'Is it not pleasant to learn with a constant perseverance and application?',
          categories: ['learning'],
        },
        {
          text: 'Learning without thought is labour lost; thought without learning is perilous.',
          categories: ['learning', 'wisdom'],
        },
        {
          text: 'When we see men of worth, we should think of equalling them; when we see men of a contrary character, we should turn inwards and examine ourselves.',
          categories: ['virtue'],
        },
        {
          text: 'When you know a thing, to hold that you know it; and when you do not know a thing, to allow that you do not know it; this is knowledge.',
          categories: ['learning', 'wisdom'],
        },
        {
          text: 'What you do not want done to yourself, do not do to others.',
          categories: ['virtue'],
        },
        {
          text: 'The superior man is modest in his speech, but exceeds in his actions.',
          categories: ['virtue', 'work'],
        },
      ],
    },
    {
      slug: 'lao-tzu',
      name: 'Lao Tzu',
      quotes: [
        {
          text: 'The journey of a thousand li commences with a single step.',
          categories: ['change', 'courage'],
        },
        {
          text: 'He who knows other men is discerning; he who knows himself is intelligent.',
          categories: ['wisdom'],
        },
        {
          text: 'He who is satisfied with his lot is rich.',
          categories: ['happiness'],
        },
        {
          text: 'He who knows does not speak; he who speaks does not know.',
          categories: ['wisdom'],
        },
      ],
    },
    {
      slug: 'benjamin-franklin',
      name: 'Benjamin Franklin',
      quotes: [
        {
          text: 'Early to bed and early to rise, makes a man healthy, wealthy, and wise.',
          categories: ['life', 'work'],
        },
        { text: 'Lost time is never found again.', categories: ['time'] },
        { text: 'Well done is better than well said.', categories: ['work'] },
        {
          text: 'Three may keep a secret, if two of them are dead.',
          categories: ['humor'],
        },
        {
          text: "Dost thou love life? Then do not squander time, for that's the stuff life is made of.",
          categories: ['time', 'life'],
        },
        {
          text: 'There never was a good war or a bad peace.',
          categories: ['wisdom'],
        },
        {
          text: 'Fish and visitors stink in three days.',
          categories: ['humor'],
        },
      ],
    },
    {
      slug: 'mark-twain',
      name: 'Mark Twain',
      quotes: [
        {
          text: 'Always do right. This will gratify some people and astonish the rest.',
          categories: ['virtue', 'humor'],
        },
        {
          text: 'Courage is resistance to fear, mastery of fear, not absence of fear.',
          categories: ['courage'],
        },
        {
          text: 'Let us endeavor so to live that when we come to die even the undertaker will be sorry.',
          categories: ['humor', 'life'],
        },
        {
          text: "Truth is stranger than fiction, but it is because Fiction is obliged to stick to possibilities; Truth isn't.",
          categories: ['humor', 'wisdom'],
        },
        {
          text: 'The report of my death was an exaggeration.',
          categories: ['humor'],
        },
        {
          text: 'Habit is habit, and not to be flung out of the window by any man, but coaxed down-stairs a step at a time.',
          categories: ['change'],
        },
        {
          text: "If you tell the truth you don't have to remember anything.",
          categories: ['virtue'],
        },
      ],
    },
    {
      slug: 'oscar-wilde',
      name: 'Oscar Wilde',
      quotes: [
        {
          text: 'I can resist everything except temptation.',
          categories: ['humor'],
        },
        {
          text: 'We are all in the gutter, but some of us are looking at the stars.',
          categories: ['life'],
        },
        {
          text: 'Experience is the name every one gives to their mistakes.',
          categories: ['wisdom', 'learning'],
        },
        {
          text: 'To love oneself is the beginning of a lifelong romance.',
          categories: ['happiness', 'humor'],
        },
        {
          text: 'There is only one thing in the world worse than being talked about, and that is not being talked about.',
          categories: ['humor'],
        },
        {
          text: 'Education is an admirable thing, but it is well to remember from time to time that nothing that is worth knowing can be taught.',
          categories: ['learning'],
        },
      ],
    },
    {
      slug: 'ralph-waldo-emerson',
      name: 'Ralph Waldo Emerson',
      quotes: [
        {
          text: 'A foolish consistency is the hobgoblin of little minds.',
          categories: ['wisdom', 'change'],
        },
        {
          text: 'Nothing great was ever achieved without enthusiasm.',
          categories: ['work', 'courage'],
        },
        {
          text: 'Trust thyself: every heart vibrates to that iron string.',
          categories: ['courage'],
        },
        {
          text: 'The only way to have a friend is to be one.',
          categories: ['friendship'],
        },
        {
          text: 'Nothing can bring you peace but yourself.',
          categories: ['happiness'],
        },
        { text: 'Finish each day and be done with it.', categories: ['time'] },
      ],
    },
    {
      slug: 'henry-david-thoreau',
      name: 'Henry David Thoreau',
      quotes: [
        {
          text: 'The mass of men lead lives of quiet desperation.',
          categories: ['life'],
        },
        {
          text: 'I went to the woods because I wished to live deliberately, to front only the essential facts of life.',
          categories: ['life'],
        },
        {
          text: 'If a man does not keep pace with his companions, perhaps it is because he hears a different drummer.',
          categories: ['courage'],
        },
        {
          text: 'Our life is frittered away by detail. Simplify, simplify.',
          categories: ['life', 'happiness'],
        },
        {
          text: 'Rather than love, than money, than fame, give me truth.',
          categories: ['virtue'],
        },
      ],
    },
    {
      slug: 'abraham-lincoln',
      name: 'Abraham Lincoln',
      quotes: [
        {
          text: 'A house divided against itself cannot stand.',
          categories: ['wisdom'],
        },
        {
          text: 'With malice toward none, with charity for all.',
          categories: ['virtue'],
        },
        {
          text: 'Let us have faith that right makes might.',
          categories: ['courage', 'virtue'],
        },
        {
          text: 'Always bear in mind that your own resolution to succeed is more important than any other one thing.',
          categories: ['work', 'courage'],
        },
      ],
    },
    {
      slug: 'leo-tolstoy',
      name: 'Leo Tolstoy',
      quotes: [
        {
          text: 'All happy families are alike; each unhappy family is unhappy in its own way.',
          categories: ['happiness', 'life'],
        },
        {
          text: 'The two most powerful warriors are patience and time.',
          categories: ['time'],
        },
        {
          text: 'Everyone thinks of changing the world, but no one thinks of changing himself.',
          categories: ['change'],
        },
      ],
    },
    {
      slug: 'socrates',
      name: 'Socrates',
      quotes: [
        {
          text: 'The unexamined life is not worth living.',
          categories: ['life', 'wisdom'],
        },
        {
          text: 'I neither know nor think that I know.',
          categories: ['learning', 'wisdom'],
        },
      ],
    },
    {
      slug: 'plato',
      name: 'Plato',
      quotes: [
        {
          text: 'The beginning is the most important part of the work.',
          categories: ['work'],
        },
      ],
    },
    {
      slug: 'aristotle',
      name: 'Aristotle',
      quotes: [
        {
          text: 'One swallow does not make a spring, nor does one day; and so too one day, or a short time, does not make a man blessed and happy.',
          categories: ['happiness', 'virtue'],
        },
        {
          text: 'The roots of education are bitter, but the fruit is sweet.',
          categories: ['learning'],
        },
        {
          text: 'Wishing to be friends is quick work, but friendship is a slowly ripening fruit.',
          categories: ['friendship'],
        },
        { text: 'Man is by nature a political animal.', categories: ['life'] },
      ],
    },
    {
      slug: 'heraclitus',
      name: 'Heraclitus',
      quotes: [
        {
          text: 'You cannot step twice into the same river.',
          categories: ['change'],
        },
        { text: 'Character is destiny.', categories: ['virtue'] },
      ],
    },
    {
      slug: 'epicurus',
      name: 'Epicurus',
      quotes: [
        {
          text: 'Of all the means which wisdom acquires to ensure happiness throughout the whole of life, by far the most important is friendship.',
          categories: ['friendship', 'happiness'],
        },
      ],
    },
    {
      slug: 'cicero',
      name: 'Cicero',
      quotes: [
        {
          text: 'Gratitude is not only the greatest of virtues, but the parent of all the others.',
          categories: ['virtue'],
        },
      ],
    },
    {
      slug: 'william-shakespeare',
      name: 'William Shakespeare',
      quotes: [
        {
          text: 'This above all: to thine own self be true.',
          categories: ['virtue'],
        },
        {
          text: 'There is nothing either good or bad, but thinking makes it so.',
          categories: ['stoicism', 'wisdom'],
        },
        {
          text: 'The fool doth think he is wise, but the wise man knows himself to be a fool.',
          categories: ['wisdom', 'humor'],
        },
        {
          text: 'Our doubts are traitors, and make us lose the good we oft might win by fearing to attempt.',
          categories: ['courage'],
        },
        {
          text: 'Cowards die many times before their deaths; the valiant never taste of death but once.',
          categories: ['courage'],
        },
        {
          text: "All the world's a stage, and all the men and women merely players.",
          categories: ['life'],
        },
        { text: 'Brevity is the soul of wit.', categories: ['humor'] },
      ],
    },
    {
      slug: 'voltaire',
      name: 'Voltaire',
      quotes: [
        {
          text: 'The best is the enemy of the good.',
          categories: ['work', 'wisdom'],
        },
        {
          text: 'Let us cultivate our garden.',
          categories: ['work', 'happiness'],
        },
        {
          text: 'Common sense is not so common.',
          categories: ['humor', 'wisdom'],
        },
      ],
    },
    {
      slug: 'friedrich-nietzsche',
      name: 'Friedrich Nietzsche',
      quotes: [
        {
          text: 'If we have our own why of life, we shall get along with almost any how.',
          categories: ['courage', 'life'],
        },
        {
          text: 'What does not destroy me, makes me stronger.',
          categories: ['courage'],
        },
        {
          text: 'Without music, life would be a mistake.',
          categories: ['life', 'happiness'],
        },
      ],
    },
    {
      slug: 'samuel-johnson',
      name: 'Samuel Johnson',
      quotes: [
        {
          text: 'Curiosity is one of the permanent and certain characteristics of a vigorous mind.',
          categories: ['learning'],
        },
        {
          text: 'Knowledge is of two kinds. We know a subject ourselves, or we know where we can find information upon it.',
          categories: ['learning'],
        },
        {
          text: 'Self-confidence is the first requisite to great undertakings.',
          categories: ['courage'],
        },
        {
          text: 'When a man is tired of London, he is tired of life.',
          categories: ['life', 'humor'],
        },
      ],
    },
    {
      slug: 'francis-bacon',
      name: 'Francis Bacon',
      quotes: [
        { text: 'Knowledge itself is power.', categories: ['learning'] },
        {
          text: 'Some books are to be tasted, others to be swallowed, and some few to be chewed and digested.',
          categories: ['learning'],
        },
        {
          text: 'Reading maketh a full man; conference a ready man; and writing an exact man.',
          categories: ['learning', 'work'],
        },
      ],
    },
    {
      slug: 'jane-austen',
      name: 'Jane Austen',
      quotes: [
        {
          text: 'There is no charm equal to tenderness of heart.',
          categories: ['virtue'],
        },
        {
          text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
          categories: ['humor'],
        },
      ],
    },
    {
      slug: 'thomas-edison',
      name: 'Thomas Edison',
      quotes: [
        {
          text: 'Genius is one per cent inspiration and ninety-nine per cent perspiration.',
          categories: ['work'],
        },
      ],
    },
    {
      slug: 'theodore-roosevelt',
      name: 'Theodore Roosevelt',
      quotes: [
        {
          text: 'It is not the critic who counts; not the man who points out how the strong man stumbles, or where the doer of deeds could have done them better.',
          categories: ['courage', 'work'],
        },
        {
          text: 'Speak softly and carry a big stick; you will go far.',
          categories: ['wisdom'],
        },
      ],
    },
  ],
};
