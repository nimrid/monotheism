// Book ID to name mapping for RapidAPI
export const BOOK_ID_MAP: { [key: string]: string } = {
  '01': 'Genesis', '02': 'Exodus', '03': 'Leviticus', '04': 'Numbers', '05': 'Deuteronomy',
  '06': 'Joshua', '07': 'Judges', '08': 'Ruth', '09': '1 Samuel', '10': '2 Samuel',
  '11': '1 Kings', '12': '2 Kings', '13': '1 Chronicles', '14': '2 Chronicles', '15': 'Ezra',
  '16': 'Nehemiah', '17': 'Esther', '18': 'Job', '19': 'Psalms', '20': 'Proverbs',
  '21': 'Ecclesiastes', '22': 'Song of Solomon', '23': 'Isaiah', '24': 'Jeremiah', '25': 'Lamentations',
  '26': 'Ezekiel', '27': 'Daniel', '28': 'Hosea', '29': 'Joel', '30': 'Amos',
  '31': 'Obadiah', '32': 'Jonah', '33': 'Micah', '34': 'Nahum', '35': 'Habakkuk',
  '36': 'Zephaniah', '37': 'Haggai', '38': 'Zechariah', '39': 'Malachi',
  '40': 'Matthew', '41': 'Mark', '42': 'Luke', '43': 'John', '44': 'Acts',
  '45': 'Romans', '46': '1 Corinthians', '47': '2 Corinthians', '48': 'Galatians', '49': 'Ephesians',
  '50': 'Philippians', '51': 'Colossians', '52': '1 Thessalonians', '53': '2 Thessalonians', '54': '1 Timothy',
  '55': '2 Timothy', '56': 'Titus', '57': 'Philemon', '58': 'Hebrews', '59': 'James',
  '60': '1 Peter', '61': '2 Peter', '62': '1 John', '63': '2 John', '64': '3 John',
  '65': 'Jude', '66': 'Revelation',
};

export type VerseResult = {
  verse: string;
  text: string;
  book: string;
  chapter: string;
};

export const parseVerseReference = (query: string): { book: string; chapter: string; verse: string } | null => {
  // Match patterns like "John 3:16", "1 John 3:16", "2 Corinthians 4:16", "Psalm 23:1"
  const match = query.match(/^(\d?\s?[a-zA-Z\s]+?)\s+(\d+):(\d+)$/i);
  if (!match) return null;

  let book = match[1].trim().toLowerCase();
  const chapter = match[2];
  const verse = match[3];

  // Handle numbered books: "1 peter" -> "1-peter", "2 corinthians" -> "2-corinthians"
  book = book.replace(/^(\d+)\s+/, '$1-').replace(/\s+/g, '-');

  return { book, chapter, verse };
};

export const fetchVerse = async (
  reference: string,
  rapidApiKey: string,
  rapidApiHost: string
): Promise<VerseResult | null> => {
  const parsed = parseVerseReference(reference);
  if (!parsed) return null;

  const hasNumberPrefix = /^\d/.test(parsed.book);

  if (hasNumberPrefix) {
    // For numbered books, find the book ID and use RapidAPI
    const bookId = Object.keys(BOOK_ID_MAP).find(
      id => BOOK_ID_MAP[id].toLowerCase().replace(/\s+/g, '-') === parsed.book
    );

    if (!bookId) return null;

    // Construct verseId: bookId + chapter (3 digits) + verse (3 digits)
    const verseId = `${bookId}${parsed.chapter.padStart(3, '0')}${parsed.verse.padStart(3, '0')}`;

    const response = await fetch(
      `https://iq-bible.p.rapidapi.com/GetVerse?verseId=${verseId}&versionId=kjv`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': rapidApiHost,
          'x-rapidapi-key': rapidApiKey,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.length === 0) return null;

    const verseData = data[0];
    return {
      verse: verseData.v,
      text: verseData.t,
      book: parsed.book,
      chapter: verseData.c,
    };
  } else {
    // Fetch the entire chapter and extract the specific verse
    const url = `https://cdn.jsdelivr.net/gh/wldeh/bible-api@master/bibles/en-asv/books/${parsed.book}/chapters/${parsed.chapter}.json`;
    const response = await fetch(url);

    if (!response.ok) return null;

    const chapterData = await response.json();
    const verses = chapterData.data || [];
    const verseData = verses.find((v: any) => v.verse === parsed.verse);

    if (!verseData) return null;

    return {
      verse: verseData.verse,
      text: verseData.text,
      book: parsed.book,
      chapter: parsed.chapter,
    };
  }
};
