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

export type VerseRangeResult = {
  verses: string;
  text: string;
  book: string;
  startChapter: string;
  endChapter: string;
  isRange: boolean;
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

export const parseVerseRangeReference = (query: string): { 
  book: string; 
  startChapter: string; 
  startVerse: string;
  endChapter: string;
  endVerse: string;
} | null => {
  // Match patterns like "Genesis 3:1-14" (same chapter) or "Genesis 3:1-4:40" (cross-chapter)
  const match = query.match(/^(\d?\s?[a-zA-Z\s]+?)\s+(\d+):(\d+)-(?:(\d+):)?(\d+)$/i);
  if (!match) return null;

  let book = match[1].trim().toLowerCase();
  const startChapter = match[2];
  const startVerse = match[3];
  const endChapter = match[4] || match[2]; // If no chapter specified, use start chapter
  const endVerse = match[5];

  // Handle numbered books: "1 peter" -> "1-peter", "2 corinthians" -> "2-corinthians"
  book = book.replace(/^(\d+)\s+/, '$1-').replace(/\s+/g, '-');

  return { book, startChapter, startVerse, endChapter, endVerse };
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

export const fetchVerseRange = async (
  reference: string,
  rapidApiKey: string,
  rapidApiHost: string
): Promise<VerseRangeResult | null> => {
  const parsed = parseVerseRangeReference(reference);
  if (!parsed) return null;

  const { book, startChapter, startVerse, endChapter, endVerse } = parsed;
  const hasNumberPrefix = /^\d/.test(book);
  const versesText: string[] = [];
  const versesReferences: string[] = [];

  try {
    if (hasNumberPrefix) {
      // For numbered books, use RapidAPI
      const bookId = Object.keys(BOOK_ID_MAP).find(
        id => BOOK_ID_MAP[id].toLowerCase().replace(/\s+/g, '-') === book
      );

      if (!bookId) return null;

      const startChapterNum = parseInt(startChapter);
      const endChapterNum = parseInt(endChapter);

      // Fetch verses across chapters
      for (let ch = startChapterNum; ch <= endChapterNum; ch++) {
        const chapterStr = ch.toString().padStart(3, '0');
        const startV = ch === startChapterNum ? parseInt(startVerse) : 1;
        const endV = ch === endChapterNum ? parseInt(endVerse) : 999; // 999 as max verse

        for (let v = startV; v <= endV; v++) {
          const verseId = `${bookId}${chapterStr}${v.toString().padStart(3, '0')}`;
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

          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              const verseData = data[0];
              versesText.push(verseData.t);
              versesReferences.push(`${ch}:${v}`);
            } else {
              break; // No more verses in this chapter
            }
          } else {
            break;
          }
        }
      }
    } else {
      // For non-numbered books, use bible-api
      const startChapterNum = parseInt(startChapter);
      const endChapterNum = parseInt(endChapter);

      for (let ch = startChapterNum; ch <= endChapterNum; ch++) {
        const url = `https://cdn.jsdelivr.net/gh/wldeh/bible-api@master/bibles/en-asv/books/${book}/chapters/${ch}.json`;
        const response = await fetch(url);

        if (!response.ok) continue;

        const chapterData = await response.json();
        const verses = chapterData.data || [];

        const startV = ch === startChapterNum ? parseInt(startVerse) : 1;
        const endV = ch === endChapterNum ? parseInt(endVerse) : verses.length;

        for (let v = startV; v <= endV; v++) {
          const verseData = verses.find((verse: any) => parseInt(verse.verse) === v);
          if (verseData) {
            versesText.push(verseData.text);
            versesReferences.push(`${ch}:${v}`);
          }
        }
      }
    }

    if (versesText.length === 0) return null;

    return {
      verses: versesReferences.join(', '),
      text: versesText.join('\n\n'),
      book,
      startChapter,
      endChapter,
      isRange: true,
    };
  } catch (error) {
    console.error('Error fetching verse range:', error);
    return null;
  }
};

// Dedicated function for Bible Stories verse retrieval
export const fetchBibleStoriesVerse = async (
  reference: string,
  rapidApiKey: string,
  rapidApiHost: string
): Promise<VerseRangeResult | null> => {
  try {
    // Parse the reference - handles both "Genesis 1:1" and "Genesis 1:1-31"
    const rangeMatch = reference.match(/^([a-zA-Z\s\d]+?)\s+(\d+):(\d+)(?:-(\d+))?$/i);
    if (!rangeMatch) {
      console.error('Invalid verse reference format:', reference);
      return null;
    }

    const bookName = rangeMatch[1].trim();
    const chapter = rangeMatch[2];
    const startVerse = rangeMatch[3];
    const endVerse = rangeMatch[4] || rangeMatch[3]; // If no end verse, use start verse

    // Find book ID from BOOK_ID_MAP
    const bookId = Object.keys(BOOK_ID_MAP).find(
      id => BOOK_ID_MAP[id].toLowerCase() === bookName.toLowerCase()
    );

    if (!bookId) {
      console.error('Book not found:', bookName);
      return null;
    }

    const versesText: string[] = [];
    const versesReferences: string[] = [];

    // Fetch all verses in the range
    for (let v = parseInt(startVerse); v <= parseInt(endVerse); v++) {
      const verseId = `${bookId}${chapter.padStart(3, '0')}${v.toString().padStart(3, '0')}`;
      
      try {
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

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const verseData = data[0];
            versesText.push(`${v}. ${verseData.t}`);
            versesReferences.push(`${v}`);
          }
        }
      } catch (err) {
        console.error(`Error fetching verse ${v}:`, err);
      }
    }

    if (versesText.length === 0) {
      console.error('No verses found for reference:', reference);
      return null;
    }

    return {
      verses: `${startVerse}-${endVerse}`,
      text: versesText.join('\n\n'),
      book: bookName.toLowerCase().replace(/\s+/g, '-'),
      startChapter: chapter,
      endChapter: chapter,
      isRange: true,
    };
  } catch (error) {
    console.error('Error in fetchBibleStoriesVerse:', error);
    return null;
  }
};
