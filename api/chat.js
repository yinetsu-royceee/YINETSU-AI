// ═══════════════════════════════════════════════════════════════
// YINETSU AI — Phase 10 + MEGA LOCAL RESPONSE LIBRARY (Oct 2026)
// Features: User Memory · Smart Context · Proactive · Error Recovery
// Massive multi-language hardcoded responses (ZERO RPD)
// ═══════════════════════════════════════════════════════════════

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const POLLINATIONS_ENDPOINT = 'https://text.pollinations.ai/openai/chat/completions';

const PROVIDER_TIMEOUT_MS = 8000;
const MAX_HISTORY = 20;

// ═══════════════════════════════════════════════════════════════
// FEATURE 1: USER MEMORY
// ═══════════════════════════════════════════════════════════════
const USER_MEMORY = new Map();
const USER_MEMORY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_USER_MEMORIES = 1000;

function getUserMemory(ip) {
    const entry = USER_MEMORY.get(ip);
    if (!entry) return { lastSearchType: null, lastSearchQuery: null, commonQueries: {}, lastTheme: null, messageCount: 0, lastSeen: Date.now() };
    if (Date.now() - entry.lastSeen > USER_MEMORY_TTL_MS) {
        USER_MEMORY.delete(ip);
        return { lastSearchType: null, lastSearchQuery: null, commonQueries: {}, lastTheme: null, messageCount: 0, lastSeen: Date.now() };
    }
    return entry;
}

function updateUserMemory(ip, updates) {
    const mem = getUserMemory(ip);
    Object.assign(mem, updates, { lastSeen: Date.now() });
    if (!mem.commonQueries) mem.commonQueries = {};
    USER_MEMORY.set(ip, mem);
    if (USER_MEMORY.size > MAX_USER_MEMORIES) {
        const now = Date.now();
        for (const [k, v] of USER_MEMORY.entries()) {
            if (now - v.lastSeen > USER_MEMORY_TTL_MS) USER_MEMORY.delete(k);
        }
    }
}

function detectPreferences(message) {
    const lower = message.toLowerCase();
    const prefs = {};
    if (lower.includes('phonk')) { prefs.lastSearchQuery = 'phonk'; prefs.lastSearchType = 'audio'; }
    else if (lower.includes('kpop')) { prefs.lastSearchQuery = 'kpop'; prefs.lastSearchType = 'audio'; }
    else if (lower.includes('opm') || lower.includes('filipino')) { prefs.lastSearchQuery = 'opm'; prefs.lastSearchType = 'audio'; }
    else if (lower.includes('music') || lower.includes('song')) { prefs.lastSearchType = 'audio'; }
    else if (lower.includes('game')) { prefs.lastSearchType = 'game'; }
    else if (lower.includes('script') || lower.includes('exploit')) { prefs.lastSearchType = 'script'; }
    const themeMatch = lower.match(/(?:theme|tema)\s*(?:to\s*)?(\w+)/);
    if (themeMatch) prefs.lastTheme = themeMatch[1];
    return prefs;
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 3: PROACTIVE SUGGESTIONS
// ═══════════════════════════════════════════════════════════════
const SUGGESTION_COOLDOWN = new Map();
const SUGGESTION_MIN_INTERVAL_MS = 5 * 60 * 1000;

function canSendSuggestion(ip, messageCount) {
    if (messageCount < 5 || messageCount % 5 !== 0) return false;
    const last = SUGGESTION_COOLDOWN.get(ip) || 0;
    if (Date.now() - last < SUGGESTION_MIN_INTERVAL_MS) return false;
    SUGGESTION_COOLDOWN.set(ip, Date.now());
    return true;
}

// ═══════════════════════════════════════════════════════════════
// 🌍 MEGA LOCAL RESPONSE LIBRARY (ZERO RPD)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// GREETINGS (60+ languages & variants)
// ═══════════════════════════════════════════════════════════════
const LOCAL_GREETINGS = {
    // ── English ──
    "hi": "Hello! I'm Yinetsu AI. How can I help you today?",
    "hello": "Hello! I'm Yinetsu AI. How can I help you today?",
    "hey": "Hey there! What can I do for you?",
    "yo": "Yo! What's up? How can I help?",
    "sup": "Hey! What's up? How can I help?",
    "heya": "Heya! What's up?",
    "hiya": "Hiya! How can I help?",
    "howdy": "Howdy! How can I help you?",
    "greetings": "Greetings! How can I assist you?",
    "good morning": "Good morning! How can I help you today?",
    "good afternoon": "Good afternoon! How can I help?",
    "good evening": "Good evening! How can I help?",
    "good night": "Good night! Sleep well!",
    "morning": "Morning! How can I help?",
    "afternoon": "Afternoon! What's up?",
    "evening": "Evening! How can I help?",
    "whats up": "Not much! What's up with you? How can I help?",
    "what's up": "Not much! What's up with you? How can I help?",
    "wassup": "Wassup! What can I do for you?",
    "wazzup": "Wazzup! How can I help?",
    "hi there": "Hi there! How can I help you today?",
    "hello there": "Hello there! What can I do for you?",
    "hey there": "Hey there! How can I help?",
    "sup bro": "Sup bro! What's up?",
    "sup dude": "Sup dude! How can I help?",
    "hi bro": "Hi bro! What's up?",
    "hi dude": "Hi dude! How can I help?",
    "hi friend": "Hi friend! What can I do for you?",

    // ── Filipino/Tagalog ──
    "kamusta": "Kamusta! Ako si Yinetsu AI. Paano kita matutulungan?",
    "kumusta": "Kumusta! Ako si Yinetsu AI. Paano kita matutulungan?",
    "musta": "Musta! Anong maitutulong ko sa iyo?",
    "kamusta ka": "Mabuti naman! Ikaw, kamusta? Anong kailangan mo?",
    "kumusta ka": "Mabuti naman! Ikaw, kamusta? Anong kailangan mo?",
    "musta ka": "Mabuti naman! Ikaw, musta? Anong kailangan mo?",
    "hoy": "Hoy! Anong balita? Paano kita matutulungan?",
    "uy": "Uy! Anong kailangan mo?",
    "oy": "Oy! Anong balita?",
    "hi po": "Hi po! Ako si Yinetsu AI. Paano kita matutulungan?",
    "hello po": "Hello po! Ako si Yinetsu AI. Paano kita matutulungan?",
    "kamusta po": "Kamusta po! Ako po si Yinetsu AI. Paano ko po kayo matutulungan?",
    "magandang umaga": "Magandang umaga! Paano kita matutulungan?",
    "magandang hapon": "Magandang hapon! Paano kita matutulungan?",
    "magandang gabi": "Magandang gabi! Paano kita matutulungan?",
    "magandang tanghali": "Magandang tanghali! Paano kita matutulungan?",
    "kamusta kayo": "Mabuti naman po! Kayo, kamusta? Anong maitutulong ko?",
    "kumusta kayo": "Mabuti naman po! Kayo, kumusta? Anong maitutulong ko?",
    "pre": "Pre! Anong balita? Paano kita matutulungan?",
    "bro": "Bro! Anong kailangan mo?",
    "pare": "Pare! Anong balita?",

    // ── Spanish ──
    "hola": "¡Hola! Soy Yinetsu AI. ¿Cómo puedo ayudarte?",
    "buenos dias": "¡Buenos días! ¿Cómo puedo ayudarte hoy?",
    "buenas tardes": "¡Buenas tardes! ¿Cómo puedo ayudarte?",
    "buenas noches": "¡Buenas noches! ¿Cómo puedo ayudarte?",
    "buenas": "¡Buenas! Soy Yinetsu AI. ¿Cómo puedo ayudarte?",
    "que tal": "¡Qué tal! Soy Yinetsu AI. ¿Cómo puedo ayudarte?",
    "qué tal": "¡Qué tal! Soy Yinetsu AI. ¿Cómo puedo ayudarte?",
    "qué onda": "¡Qué onda! ¿Cómo puedo ayudarte?",
    "que onda": "¡Qué onda! ¿Cómo puedo ayudarte?",
    "saludos": "¡Saludos! ¿En qué puedo ayudarte?",
    "hey amigo": "¡Hey amigo! ¿Cómo puedo ayudarte?",

    // ── Korean ──
    "안녕": "안녕하세요! 저는 Yinetsu AI입니다. 무엇을 도와드릴까요?",
    "안녕하세요": "안녕하세요! 저는 Yinetsu AI입니다. 무엇을 도와드릴까요?",
    "하이": "하이! 무엇을 도와드릴까요?",
    "안녕하세용": "안녕하세용! 무엇을 도와드릴까요?",
    "좋은 아침": "좋은 아침이에요! 오늘 무엇을 도와드릴까요?",
    "좋은 저녁": "좋은 저녁이에요! 무엇을 도와드릴까요?",
    "여보세요": "여보세요! 무엇을 도와드릴까요?",

    // ── Japanese ──
    "こんにちは": "こんにちは！Yinetsu AIです。何をお手伝いしましょうか？",
    "やあ": "やあ！何かお手伝いしましょうか？",
    "おはよう": "おはようございます！今日は何をお手伝いしましょうか？",
    "おはようございます": "おはようございます！今日は何をお手伝いしましょうか？",
    "こんばんは": "こんばんは！何かお手伝いしましょうか？",
    "もしもし": "もしもし！何かお手伝いしましょうか？",
    "どうも": "どうも！何かお手伝いしましょうか？",
    "はじめまして": "はじめまして！Yinetsu AIです。よろしくお願いします！",

    // ── Chinese (Simplified) ──
    "你好": "你好！我是 Yinetsu AI。我能帮你什么？",
    "您好": "您好！我是 Yinetsu AI。我能帮您什么？",
    "嗨": "嗨！有什么可以帮你的吗？",
    "哈喽": "哈喽！有什么可以帮你的吗？",
    "早上好": "早上好！今天我能帮你什么？",
    "下午好": "下午好！我能帮你什么？",
    "晚上好": "晚上好！我能帮你什么？",
    "大家好": "大家好！我是 Yinetsu AI。有什么可以帮你的？",
    "你好呀": "你好呀！有什么可以帮你的吗？",

    // ── Portuguese ──
    "olá": "Olá! Sou Yinetsu AI. Como posso ajudá-lo?",
    "ola": "Olá! Sou Yinetsu AI. Como posso ajudá-lo?",
    "oi": "Oi! Sou Yinetsu AI. Como posso ajudá-lo?",
    "bom dia": "Bom dia! Como posso ajudá-lo hoje?",
    "boa tarde": "Boa tarde! Como posso ajudá-lo?",
    "boa noite": "Boa noite! Como posso ajudá-lo?",
    "e aí": "E aí! Sou Yinetsu AI. Como posso ajudá-lo?",
    "eai": "E aí! Sou Yinetsu AI. Como posso ajudá-lo?",
    "opa": "Opa! Sou Yinetsu AI. Como posso ajudá-lo?",

    // ── French ──
    "bonjour": "Bonjour ! Je suis Yinetsu AI. Comment puis-je vous aider ?",
    "salut": "Salut ! Je suis Yinetsu AI. Comment puis-je vous aider ?",
    "bonsoir": "Bonsoir ! Je suis Yinetsu AI. Comment puis-je vous aider ?",
    "coucou": "Coucou ! Je suis Yinetsu AI. Comment puis-je vous aider ?",
    "allô": "Allô ! Je suis Yinetsu AI. Comment puis-je vous aider ?",
    "allo": "Allô ! Je suis Yinetsu AI. Comment puis-je vous aider ?",

    // ── German ──
    "hallo": "Hallo! Ich bin Yinetsu AI. Wie kann ich dir helfen?",
    "hi": "Hallo! Ich bin Yinetsu AI. Wie kann ich dir helfen?",
    "guten morgen": "Guten Morgen! Wie kann ich dir helfen?",
    "guten tag": "Guten Tag! Wie kann ich dir helfen?",
    "guten abend": "Guten Abend! Wie kann ich dir helfen?",
    "servus": "Servus! Ich bin Yinetsu AI. Wie kann ich dir helfen?",
    "moin": "Moin! Wie kann ich dir helfen?",

    // ── Italian ──
    "ciao": "Ciao! Sono Yinetsu AI. Come posso aiutarti?",
    "buongiorno": "Buongiorno! Sono Yinetsu AI. Come posso aiutarti?",
    "buonasera": "Buonasera! Come posso aiutarti?",
    "salve": "Salve! Sono Yinetsu AI. Come posso aiutarti?",
    "ehi": "Ehi! Come posso aiutarti?",

    // ── Russian ──
    "привет": "Привет! Я Yinetsu AI. Чем я могу вам помочь?",
    "здравствуйте": "Здравствуйте! Я Yinetsu AI. Чем я могу вам помочь?",
    "хай": "Хай! Чем я могу вам помочь?",
    "доброе утро": "Доброе утро! Чем я могу вам помочь?",
    "добрый день": "Добрый день! Чем я могу вам помочь?",
    "добрый вечер": "Добрый вечер! Чем я могу вам помочь?",
    "йо": "Йо! Чем я могу вам помочь?",

    // ── Arabic ──
    "مرحبا": "مرحبا! أنا Yinetsu AI. كيف يمكنني مساعدتك؟",
    "السلام عليكم": "السلام عليكم! أنا Yinetsu AI. كيف يمكنني مساعدتك؟",
    "أهلا": "أهلاً! أنا Yinetsu AI. كيف يمكنني مساعدتك؟",
    "اهلا": "أهلاً! أنا Yinetsu AI. كيف يمكنني مساعدتك؟",
    "صباح الخير": "صباح الخير! كيف يمكنني مساعدتك؟",
    "مساء الخير": "مساء الخير! كيف يمكنني مساعدتك؟",

    // ── Hindi ──
    "नमस्ते": "नमस्ते! मैं Yinetsu AI हूँ। मैं आपकी कैसे मदद कर सकता हूँ?",
    "हैलो": "हैलो! मैं Yinetsu AI हूँ। कैसे मदद कर सकता हूँ?",
    "हाय": "हाय! मैं आपकी कैसे मदद कर सकता हूँ?",
    "सुप्रभात": "सुप्रभात! आज मैं आपकी कैसे मदद कर सकता हूँ?",

    // ── Indonesian ──
    "halo": "Halo! Saya Yinetsu AI. Ada yang bisa saya bantu?",
    "hai": "Hai! Saya Yinetsu AI. Ada yang bisa saya bantu?",
    "selamat pagi": "Selamat pagi! Ada yang bisa saya bantu?",
    "selamat siang": "Selamat siang! Ada yang bisa saya bantu?",
    "selamat sore": "Selamat sore! Ada yang bisa saya bantu?",
    "selamat malam": "Selamat malam! Ada yang bisa saya bantu?",
    "apa kabar": "Kabar baik! Ada yang bisa saya bantu?",

    // ── Malay ──
    "apa khabar": "Khabar baik! Ada yang boleh saya bantu?",
    "selamat datang": "Selamat datang! Ada yang boleh saya bantu?",
    "assalamualaikum": "Waalaikumussalam! Ada yang boleh saya bantu?",

    // ── Thai ──
    "สวัสดี": "สวัสดี! ฉันคือ Yinetsu AI ฉันจะช่วยคุณได้อย่างไร?",
    "หวัดดี": "หวัดดี! ฉันคือ Yinetsu AI ฉันจะช่วยคุณได้อย่างไร?",
    "อรุณสวัสดิ์": "อรุณสวัสดิ์! ฉันจะช่วยคุณได้อย่างไร?",

    // ── Vietnamese ──
    "xin chào": "Xin chào! Tôi là Yinetsu AI. Tôi có thể giúp gì cho bạn?",
    "chào": "Chào! Tôi là Yinetsu AI. Tôi có thể giúp gì cho bạn?",
    "chào bạn": "Chào bạn! Tôi có thể giúp gì cho bạn?",
    "hello bạn": "Hello bạn! Tôi có thể giúp gì cho bạn?",

    // ── Turkish ──
    "merhaba": "Merhaba! Ben Yinetsu AI. Sana nasıl yardımcı olabilirim?",
    "selam": "Selam! Ben Yinetsu AI. Sana nasıl yardımcı olabilirim?",
    "günaydın": "Günaydın! Sana nasıl yardımcı olabilirim?",
    "iyi akşamlar": "İyi akşamlar! Sana nasıl yardımcı olabilirim?",

    // ── Dutch ──
    "hallo daar": "Hallo daar! Ik ben Yinetsu AI. Hoe kan ik je helpen?",
    "hoi": "Hoi! Ik ben Yinetsu AI. Hoe kan ik je helpen?",
    "goedemorgen": "Goedemorgen! Hoe kan ik je helpen?",
    "goedenavond": "Goedenavond! Hoe kan ik je helpen?",

    // ── Polish ──
    "cześć": "Cześć! Jestem Yinetsu AI. Jak mogę ci pomóc?",
    "czesc": "Cześć! Jestem Yinetsu AI. Jak mogę ci pomóc?",
    "dzień dobry": "Dzień dobry! Jak mogę ci pomóc?",
    "witaj": "Witaj! Jak mogę ci pomóc?",

    // ── Swedish ──
    "hej": "Hej! Jag är Yinetsu AI. Hur kan jag hjälpa dig?",
    "god morgon": "God morgon! Hur kan jag hjälpa dig?",
    "tjena": "Tjena! Hur kan jag hjälpa dig?",

    // ── Norwegian ──
    "hei": "Hei! Jeg er Yinetsu AI. Hvordan kan jeg hjelpe deg?",
    "god morgen": "God morgen! Hvordan kan jeg hjelpe deg?",

    // ── Danish ──
    "hejsa": "Hejsa! Jeg er Yinetsu AI. Hvordan kan jeg hjælpe dig?",

    // ── Finnish ──
    "moi": "Moi! Olen Yinetsu AI. Kuinka voin auttaa sinua?",
    "terve": "Terve! Olen Yinetsu AI. Kuinka voin auttaa?",

    // ── Greek ──
    "γεια": "Γεια! Είμαι το Yinetsu AI. Πώς μπορώ να σε βοηθήσω;",
    "γεια σου": "Γεια σου! Είμαι το Yinetsu AI. Πώς μπορώ να σε βοηθήσω;",
    "καλημέρα": "Καλημέρα! Πώς μπορώ να σε βοηθήσω;",

    // ── Hebrew ──
    "שלום": "שלום! אני Yinetsu AI. איך אני יכול לעזור לך?",
    "היי": "היי! אני Yinetsu AI. איך אני יכול לעזור לך?",

    // ── Czech ──
    "ahoj": "Ahoj! Jsem Yinetsu AI. Jak ti mohu pomoci?",
    "dobrý den": "Dobrý den! Jak ti mohu pomoci?",

    // ── Hungarian ──
    "szia": "Szia! Yinetsu AI vagyok. Hogyan segíthetek?",
    "jó napot": "Jó napot! Hogyan segíthetek?",

    // ── Romanian ──
    "salutare": "Salutare! Sunt Yinetsu AI. Cum te pot ajuta?",
    "bună": "Bună! Sunt Yinetsu AI. Cum te pot ajuta?",
    "buna": "Bună! Sunt Yinetsu AI. Cum te pot ajuta?",

    // ── Ukrainian ──
    "привіт": "Привіт! Я Yinetsu AI. Чим я можу вам допомогти?",
    "добрий день": "Добрий день! Чим я можу вам допомогти?",

    // ── Emojis ──
    "👋": "Hello! I'm Yinetsu AI. How can I help you today?",
    "🙋": "Hello! How can I help you today?",
    "🙋‍♂️": "Hello! How can I help you today?",
    "🙋‍♀️": "Hello! How can I help you today?",
    "😊": "Hi there! 😊 How can I help you today?",
    "😄": "Hey! 😄 What can I do for you?",
};

// ═══════════════════════════════════════════════════════════════
// FAREWELLS (30+ languages)
// ═══════════════════════════════════════════════════════════════
const LOCAL_FAREWELLS = {
    // English
    "bye": "Goodbye! Come back anytime! 👋",
    "goodbye": "Goodbye! Take care! 👋",
    "see you": "See you later! 👋",
    "see ya": "See ya! Come back soon! 👋",
    "cya": "Cya! Have a great day! 👋",
    "later": "Later! 👋",
    "gtg": "Got to go? No problem! Come back soon! 👋",
    "good night": "Good night! Sleep well! 🌙",
    "have a nice day": "Thanks! You too! Have a great day! 😊",
    // Filipino
    "paalam": "Paalam! Balik ka ha! 👋",
    "babay": "Babay! Ingat! 👋",
    "bye po": "Bye po! Ingat po kayo! 👋",
    "hanggang sa muli": "Hanggang sa muli! 👋",
    "ingat": "Ikaw rin, ingat! Balik ka ha! 👋",
    "magandang gabi": "Magandang gabi! Matulog ka ng mahimbing! 🌙",
    // Spanish
    "adios": "¡Adiós! ¡Vuelve pronto! 👋",
    "adiós": "¡Adiós! ¡Vuelve pronto! 👋",
    "hasta luego": "¡Hasta luego! 👋",
    "chao": "¡Chao! ¡Cuídate! 👋",
    "nos vemos": "¡Nos vemos! 👋",
    "buenas noches": "¡Buenas noches! ¡Que descanses! 🌙",
    // Korean
    "잘가": "잘 가! 또 와! 👋",
    "안녕히 가세요": "안녕히 가세요! 또 오세요! 👋",
    "잘 자": "잘 자! 좋은 꿈 꿔! 🌙",
    // Japanese
    "さようなら": "さようなら! また来てね! 👋",
    "じゃあね": "じゃあね! またね! 👋",
    "またね": "またね! 👋",
    "おやすみ": "おやすみなさい! いい夢を! 🌙",
    // Chinese
    "再见": "再见! 欢迎再来! 👋",
    "拜拜": "拜拜! 保重! 👋",
    "晚安": "晚安! 好梦! 🌙",
    // Portuguese
    "tchau": "Tchau! Volte sempre! 👋",
    "até logo": "Até logo! 👋",
    "até mais": "Até mais! 👋",
    // French
    "au revoir": "Au revoir ! À bientôt ! 👋",
    "à plus": "À plus ! 👋",
    "bonne nuit": "Bonne nuit ! Fais de beaux rêves ! 🌙",
    // German
    "auf wiedersehen": "Auf Wiedersehen! Komm bald wieder! 👋",
    "tschüss": "Tschüss! 👋",
    "bis später": "Bis später! 👋",
    "gute nacht": "Gute Nacht! Schlaf gut! 🌙",
    // Italian
    "arrivederci": "Arrivederci! Torna presto! 👋",
    "a presto": "A presto! 👋",
    "buonanotte": "Buonanotte! Sogni d'oro! 🌙",
    // Russian
    "пока": "Пока! Возвращайся! 👋",
    "до свидания": "До свидания! 👋",
    "спокойной ночи": "Спокойной ночи! 🌙",
    // Arabic
    "مع السلامة": "مع السلامة! 👋",
    "وداعا": "وداعاً! ارجع قريباً! 👋",
    "تصبح على خير": "تصبح على خير! 🌙",
    // Hindi
    "अलविदा": "अलविदा! जल्दी वापस आइए! 👋",
    "फिर मिलेंगे": "फिर मिलेंगे! 👋",
    "शुभ रात्रि": "शुभ रात्रि! 🌙",
    // Indonesian
    "selamat tinggal": "Selamat tinggal! Kembali lagi ya! 👋",
    "sampai jumpa": "Sampai jumpa! 👋",
    // Thai
    "ลาก่อน": "ลาก่อน! กลับมาอีกนะ! 👋",
    "บาย": "บาย! กลับมาอีกนะ! 👋",
    // Vietnamese
    "tạm biệt": "Tạm biệt! Quay lại nhé! 👋",
    // Turkish
    "hoşça kal": "Hoşça kal! Tekrar gel! 👋",
    "güle güle": "Güle güle! 👋",
    // Dutch
    "doei": "Doei! Kom snel terug! 👋",
    "tot ziens": "Tot ziens! 👋",
    // Polish
    "pa": "Pa! Wracaj szybko! 👋",
    "do widzenia": "Do widzenia! 👋",
    // Swedish
    "hej då": "Hej då! Kom tillbaka snart! 👋",
    // Emojis
    "👋 bye": "Goodbye! Come back soon! 👋",
};

// ═══════════════════════════════════════════════════════════════
// THANKS (30+ languages)
// ═══════════════════════════════════════════════════════════════
const LOCAL_THANKS = {
    // English
    "thank you": "You're welcome! Anything else I can help with? 😊",
    "thanks": "You're welcome! Anything else? 😊",
    "ty": "You're welcome! 😊",
    "thank you so much": "You're very welcome! Happy to help! 😊",
    "thanks a lot": "My pleasure! Anything else? 😊",
    "appreciate it": "Happy to help! 😊",
    // Filipino
    "salamat": "Walang anuman! Anong iba pang maitutulong ko? 😊",
    "salamat po": "Walang anuman po! Anong iba pang maitutulong ko? 😊",
    "maraming salamat": "Walang anuman! Masaya akong nakatulong! 😊",
    "salamat bro": "Walang anuman bro! 😊",
    "salamat pre": "Walang anuman pre! 😊",
    // Spanish
    "gracias": "¡De nada! ¿Hay algo más en lo que pueda ayudar? 😊",
    "muchas gracias": "¡De nada! ¡Con gusto! 😊",
    // Korean
    "고마워": "천만에요! 더 도와드릴 일이 있나요? 😊",
    "감사합니다": "천만에요! 더 도와드릴 일이 있나요? 😊",
    // Japanese
    "ありがとう": "どういたしまして！他に何かお手伝いしましょうか？ 😊",
    "ありがとうございます": "どういたしまして！ 😊",
    // Chinese
    "谢谢": "不客气！还有什么我能帮你的吗？ 😊",
    "多谢": "不客气！ 😊",
    // Portuguese
    "obrigado": "De nada! Posso ajudar em mais alguma coisa? 😊",
    "obrigada": "De nada! Posso ajudar em mais alguma coisa? 😊",
    "valeu": "Valeu! 😊",
    // French
    "merci": "De rien ! Autre chose ? 😊",
    "merci beaucoup": "De rien ! Avec plaisir ! 😊",
    // German
    "danke": "Bitte! Kann ich noch etwas tun? 😊",
    "vielen dank": "Bitte schön! 😊",
    // Italian
    "grazie": "Prego! C'è altro che posso fare? 😊",
    // Russian
    "спасибо": "Пожалуйста! Что-то ещё? 😊",
    // Arabic
    "شكرا": "عفواً! هل هناك أي شيء آخر؟ 😊",
    "شكراً": "عفواً! 😊",
    // Hindi
    "धन्यवाद": "आपका स्वागत है! कुछ और चाहिए? 😊",
    "शुक्रिया": "आपका स्वागत है! 😊",
    // Indonesian
    "terima kasih": "Sama-sama! Ada lagi yang bisa dibantu? 😊",
    "makasih": "Sama-sama! 😊",
    // Thai
    "ขอบคุณ": "ด้วยความยินดี! มีอะไรให้ช่วยอีกไหม? 😊",
    // Vietnamese
    "cảm ơn": "Không có gì! Cần gì thêm không? 😊",
    // Turkish
    "teşekkürler": "Rica ederim! Başka bir şey? 😊",
    // Dutch
    "bedankt": "Graag gedaan! Nog iets? 😊",
    // Polish
    "dziękuję": "Nie ma za co! Coś jeszcze? 😊",
    // Swedish
    "tack": "Varsågod! Något mer? 😊",
};

// ═══════════════════════════════════════════════════════════════
// APOLOGIES (15+ languages)
// ═══════════════════════════════════════════════════════════════
const LOCAL_APOLOGIES = {
    "sorry": "No worries at all! Anong maitutulong ko?",
    "my bad": "No problem! Walang issue! 😊",
    "pasensya na": "Okay lang! Walang problema! 😊",
    "pasensya": "Okay lang! Anong maitutulong ko?",
    "sorry po": "Okay lang po! Walang problema! 😊",
    "lo siento": "¡No pasa nada! ¿Cómo puedo ayudarte?",
    "perdón": "¡No pasa nada! ¿Cómo puedo ayudarte?",
    "perdon": "¡No pasa nada! ¿Cómo puedo ayudarte?",
    "미안": "괜찮아요! 무엇을 도와드릴까요?",
    "죄송합니다": "괜찮아요! 무엇을 도와드릴까요?",
    "ごめん": "大丈夫ですよ！何かお手伝いしましょうか？",
    "すみません": "大丈夫ですよ！何かお手伝いしましょうか？",
    "对不起": "没关系！有什么可以帮你的吗？",
    "抱歉": "没关系！有什么可以帮你的吗？",
    "desculpa": "Sem problema! Como posso ajudar?",
    "desculpe": "Sem problema! Como posso ajudar?",
    "désolé": "Pas de problème ! Comment puis-je vous aider ?",
    "entschuldigung": "Kein Problem! Wie kann ich helfen?",
    "scusa": "Nessun problema! Come posso aiutarti?",
    "извини": "Ничего страшного! Чем я могу помочь?",
    "извините": "Ничего страшного! Чем я могу помочь?",
    "آسف": "لا مشكلة! كيف يمكنني مساعدتك؟",
    "माफ़ करना": "कोई बात नहीं! मैं कैसे मदद कर सकता हूँ?",
    "maaf": "Tidak masalah! Ada yang bisa saya bantu?",
    "ขอโทษ": "ไม่เป็นไร! ฉันจะช่วยอะไรได้บ้าง?",
    "xin lỗi": "Không sao đâu! Tôi có thể giúp gì?",
    "üzgünüm": "Sorun değil! Nasıl yardımcı olabilirim?",
    "sorri": "No problem! 😊",
};

// ═══════════════════════════════════════════════════════════════
// ACKNOWLEDGMENTS (ok, yes, no, sure, etc.)
// ═══════════════════════════════════════════════════════════════
const LOCAL_ACKS = {
    // OK
    "ok": "Got it! What's next?",
    "okay": "Got it! What's next?",
    "k": "Got it!",
    "kk": "Got it! 😊",
    "sige": "Sige! Anong susunod?",
    "sige po": "Sige po! Anong susunod?",
    "sge": "Sige! Anong sunod?",
    "ok po": "Okay po! Anong susunod?",
    "ok bro": "Okay bro! 😊",
    "okay bro": "Okay bro! 😊",
    "vale": "¡Vale! ¿Qué sigue?",
    "okey": "¡Okey! ¿Qué sigue?",
    "d'accord": "D'accord ! Et ensuite ?",
    "okay dokey": "Okay dokey! 😊",
    "got it": "Great! Anong next?",
    "noted": "Noted! 📝 Anong next?",
    // YES
    "yes": "Great! Anong gusto mong gawin?",
    "yeah": "Great! Anong next?",
    "yep": "Great! Anong next?",
    "yup": "Great! Anong next?",
    "sure": "Sure! Anong kailangan mo?",
    "oo": "Oo! Anong susunod?",
    "opo": "Opo! Anong susunod?",
    "oo po": "Oo po! Anong susunod?",
    "si": "¡Sí! ¿Qué sigue?",
    "sí": "¡Sí! ¿Qué sigue?",
    "sí señor": "¡Sí señor! ¿Qué sigue?",
    "si senor": "¡Sí señor! ¿Qué sigue?",
    "네": "네! 무엇을 도와드릴까요?",
    "예": "예! 무엇을 도와드릴까요?",
    "はい": "はい！何をお手伝いしましょうか？",
    "うん": "うん！何をお手伝いしましょうか？",
    "是": "是的！有什么可以帮你的吗？",
    "对": "对的！有什么可以帮你的吗？",
    "sim": "Sim! Como posso ajudar?",
    "oui": "Oui ! Comment puis-je vous aider ?",
    "ja": "Ja! Wie kann ich helfen?",
    "sì": "Sì! Come posso aiutarti?",
    "да": "Да! Чем я могу вам помочь?",
    "نعم": "نعم! كيف يمكنني مساعدتك؟",
    "हाँ": "हाँ! मैं कैसे मदद कर सकता हूँ?",
    "ya": "Ya! Ada yang bisa saya bantu?",
    "ใช่": "ใช่! ฉันจะช่วยอะไรได้บ้าง?",
    "vâng": "Vâng! Tôi có thể giúp gì?",
    "evet": "Evet! Nasıl yardımcı olabilirim?",
    // NO
    "no": "Okay, no problem! Anong gusto mong gawin?",
    "nope": "Okay! Anong next?",
    "hindi": "Okay! Anong gusto mong gawin?",
    "wala": "Okay! Anong next?",
    "hindi po": "Okay po! Anong susunod?",
    "no señor": "Está bien! ¿Qué sigue?",
    "아니요": "알겠습니다! 무엇을 도와드릴까요?",
    "いいえ": "わかりました！何かお手伝いしましょうか？",
    "不": "好的！有什么可以帮你的吗？",
    "não": "Ok! Como posso ajudar?",
    "nao": "Ok! Como posso ajudar?",
    "non": "D'accord ! Comment puis-je aider ?",
    "nein": "Okay! Wie kann ich helfen?",
    "нет": "Хорошо! Чем я могу помочь?",
    "لا": "حسناً! كيف يمكنني مساعدتك؟",
    "नहीं": "ठीक है! मैं कैसे मदद कर सकता हूँ?",
    "tidak": "Oke! Ada yang bisa saya bantu?",
    "không": "Được rồi! Tôi có thể giúp gì?",
};

// ═══════════════════════════════════════════════════════════════
// HOW ARE YOU / SMALL TALK
// ═══════════════════════════════════════════════════════════════
const LOCAL_SMALL_TALK = {
    "how are you": "I'm doing great, thanks for asking! How can I help you? 😊",
    "how r u": "I'm doing great! How can I help you? 😊",
    "hows it going": "Going great! What can I do for you? 😊",
    "how's it going": "Going great! What can I do for you? 😊",
    "how you doing": "Doing great! How about you? 😊",
    "what are you": "I'm Yinetsu AI, assistant for the Yinetsu Remote Spy Roblox script. I can help with cheats, searches, music, and more!",
    "who are you": "I'm Yinetsu AI! I help you use the Yinetsu Remote Spy script. Anong maitutulong ko?",
    "what is your name": "I'm Yinetsu AI! Your assistant for the Yinetsu Remote Spy script. 😊",
    "who made you": "I was created by the Yinetsu team to help users control the Remote Spy script. 🚀",
    "what can you do": "I can help you with: cheats (fly, noclip, speed, jump), searches (music, games, scripts), music controls, server hop, teleport, and more! Just ask naturally.",
    "what do you do": "I'm your AI assistant for the Yinetsu Remote Spy script! I can toggle cheats, search for music/games/scripts, control music, and more. 😊",
    "ano ginagawa mo": "Nagtulong ako sa users ng Yinetsu Remote Spy! Anong maitutulong ko sa iyo? 😊",
    "ano ginagawa mo dyan": "Nandito ako para tumulong! Anong kailangan mo? 😊",
    "ano ginagawa mo jan": "Nandito ako para tumulong! Anong kailangan mo? 😊",
    "kamusta ka": "Mabuti naman! Ikaw, kamusta? Anong kailangan mo? 😊",
    "kumusta ka": "Mabuti naman! Ikaw, kumusta? Anong kailangan mo? 😊",
    "musta ka": "Mabuti naman! Ikaw, musta? Anong kailangan mo? 😊",
    "sino ka": "Ako si Yinetsu AI, ang assistant mo para sa Yinetsu Remote Spy script! Anong maitutulong ko?",
    "sino ka ba": "Ako si Yinetsu AI! Anong maitutulong ko sa iyo?",
    "anong pangalan mo": "Ako si Yinetsu AI! Assistant mo para sa script. 😊",
    "anong kaya mong gawin": "Marami! Pwede kong i-toggle yung cheats (fly, noclip, speed, jump), mag-search ng music/games/scripts, mag-control ng music, server hop, teleport, at marami pa!",
    "cómo estás": "¡Estoy bien! ¿Cómo puedo ayudarte? 😊",
    "como estas": "¡Estoy bien! ¿Cómo puedo ayudarte? 😊",
    "¿quién eres?": "¡Soy Yinetsu AI! Tu asistente para el script Yinetsu Remote Spy.",
    "quien eres": "¡Soy Yinetsu AI! Tu asistente para el script Yinetsu Remote Spy.",
    "어떻게 지내": "잘 지내요! 무엇을 도와드릴까요? 😊",
    "누구세요": "저는 Yinetsu AI입니다! Yinetsu Remote Spy 스크립트 도우미예요.",
    "お元気ですか": "元気です！何かお手伝いしましょうか？ 😊",
    "あなたは誰": "私は Yinetsu AI です！Yinetsu Remote Spy スクリプトのアシスタントです。",
    "你好吗": "我很好！有什么可以帮你的吗？ 😊",
    "你是谁": "我是 Yinetsu AI！你的 Yinetsu Remote Spy 脚本助手。",
    "como vai": "Vou bem! Como posso ajudá-lo? 😊",
    "quem é você": "Sou Yinetsu AI! Seu assistente para o script Yinetsu Remote Spy.",
    "comment ça va": "Ça va bien ! Comment puis-je vous aider ? 😊",
    "qui es-tu": "Je suis Yinetsu AI ! Votre assistant pour le script Yinetsu Remote Spy.",
    "wie geht es dir": "Mir geht es gut! Wie kann ich dir helfen? 😊",
    "wer bist du": "Ich bin Yinetsu AI! Dein Assistent für das Yinetsu Remote Spy Skript.",
    "how r u doing": "Doing great! What can I do for you? 😊",
};

// ═══════════════════════════════════════════════════════════════
// QUICK COMMANDS (expanded)
// ═══════════════════════════════════════════════════════════════
const LOCAL_QUICK_COMMANDS = [
    // ═══ FLY ═══
    { pattern: /^(?:fly|flight|lipad|patag)\s*(?:on|enable|activate|start)?$/i, template: "[ACTION:fly:on]\n✅ Fly: ON" },
    { pattern: /^(?:fly|flight|lipad|patag)\s*(?:off|disable|deactivate|stop)$/i, template: "[ACTION:fly:off]\n✅ Fly: OFF" },
    { pattern: /^(?:i[- ]?fly|make me fly)$/i, template: "[ACTION:fly:on]\n✅ Fly: ON" },
    { pattern: /^(?:volar|vuela)\s*(?:on|enable)?$/i, template: "[ACTION:fly:on]\n✅ Fly: ON" },
    { pattern: /^(?:날아|플라이)\s*(?:on|enable)?$/i, template: "[ACTION:fly:on]\n✅ Fly: ON" },
    { pattern: /^(?:飛ぶ|フライ)\s*(?:on)?$/i, template: "[ACTION:fly:on]\n✅ Fly: ON" },

    // ═══ NOCLIP ═══
    { pattern: /^(?:noclip|no\s*clip|ghost\s*mode|passthrough)\s*(?:on|enable)?$/i, template: "[ACTION:noclip:on]\n✅ Noclip: ON" },
    { pattern: /^(?:noclip|no\s*clip|ghost\s*mode|passthrough)\s*(?:off|disable)$/i, template: "[ACTION:noclip:off]\n✅ Noclip: OFF" },
    { pattern: /^(?:lampas|diretso)\s*(?:on|enable)?$/i, template: "[ACTION:noclip:on]\n✅ Noclip: ON" },

    // ═══ FULLBRIGHT ═══
    { pattern: /^(?:fullbright|full\s*bright|bright(?:ness)?|liwanag)\s*(?:on|enable)?$/i, template: "[ACTION:fullbright:on]\n✅ Fullbright: ON" },
    { pattern: /^(?:fullbright|full\s*bright|bright(?:ness)?|liwanag)\s*(?:off|disable)$/i, template: "[ACTION:fullbright:off]\n✅ Fullbright: OFF" },
    { pattern: /^(?:brillo|iluminar)\s*(?:on)?$/i, template: "[ACTION:fullbright:on]\n✅ Fullbright: ON" },

    // ═══ ANTI-FLING ═══
    { pattern: /^anti[-\s]*fling\s*(?:on|enable)?$/i, template: "[ACTION:anti_fling:on]\n✅ Anti-Fling: ON" },
    { pattern: /^anti[-\s]*fling\s*(?:off|disable)$/i, template: "[ACTION:anti_fling:off]\n✅ Anti-Fling: OFF" },

    // ═══ REJOIN DEATH ═══
    { pattern: /^rejoin\s*(?:on\s*)?death\s*(?:on|enable)?$/i, template: "[ACTION:rejoin_death:on]\n✅ Rejoin Death: ON" },
    { pattern: /^rejoin\s*(?:on\s*)?death\s*(?:off|disable)$/i, template: "[ACTION:rejoin_death:off]\n✅ Rejoin Death: OFF" },
    { pattern: /^auto\s*rejoin\s*(?:on|enable)?$/i, template: "[ACTION:rejoin_death:on]\n✅ Auto-Rejoin on Death: ON" },
    { pattern: /^auto\s*rejoin\s*(?:off|disable)$/i, template: "[ACTION:rejoin_death:off]\n✅ Auto-Rejoin on Death: OFF" },

    // ═══ AUTO-CLICKER ═══
    { pattern: /^auto[-\s]*click(?:er)?\s*(?:on|enable)?$/i, template: "[ACTION:auto_clicker:on]\n✅ Auto-Clicker: ON" },
    { pattern: /^auto[-\s]*click(?:er)?\s*(?:off|disable)$/i, template: "[ACTION:auto_clicker:off]\n✅ Auto-Clicker: OFF" },
    { pattern: /^(?:autoclicker|clicker)\s*(?:on|enable)?$/i, template: "[ACTION:auto_clicker:on]\n✅ Auto-Clicker: ON" },

    // ═══ NEGATE / MULTIPLY ═══
    { pattern: /^(?:negate(?:\s*args)?|neg)\s*(?:on|enable)?$/i, template: "[ACTION:negate_args:on]\n✅ Negate: ON" },
    { pattern: /^(?:negate(?:\s*args)?|neg)\s*(?:off|disable)$/i, template: "[ACTION:negate_args:off]\n✅ Negate: OFF" },
    { pattern: /^(?:multiply|mul|x9999)\s*(?:on|enable)?$/i, template: "[ACTION:multiply_args:on]\n✅ Multiply x9999: ON" },
    { pattern: /^(?:multiply|mul|x9999)\s*(?:off|disable)$/i, template: "[ACTION:multiply_args:off]\n✅ Multiply x9999: OFF" },

    // ═══ SERVER ═══
    { pattern: /^(?:server\s*hop|hop\s*server|lipat\s*server|change\s*server|switch\s*server)$/i, template: "[ACTION:server_hop_smart]\n🔄 Server hopping..." },
    { pattern: /^(?:rejoin(?:\s*server)?|balik\s*server|return)$/i, template: "[ACTION:rejoin_current]\n🔄 Rejoining server..." },
    { pattern: /^(?:bumalik|umalis)\s*(?:server)?$/i, template: "[ACTION:rejoin_current]\n🔄 Rejoining server..." },

    // ═══ COPY ═══
    { pattern: /^copy\s*job\s*id$/i, template: "[ACTION:copy_jobid]\n📋 JobId copied" },
    { pattern: /^copy\s*(?:game\s*)?link$/i, template: "[ACTION:copy_game_link]\n🔗 Link copied" },
    { pattern: /^copy\s*place\s*id$/i, template: "[ACTION:copy_place_id]\n📋 Place ID copied" },
    { pattern: /^copy\s*game\s*id$/i, template: "[ACTION:copy_place_id]\n📋 Game ID copied" },

    // ═══ POSITION ═══
    { pattern: /^(?:save|store)\s*(?:my\s*)?pos(?:ition)?$/i, template: "[ACTION:save_position]\n✅ Position saved" },
    { pattern: /^(?:load|restore|teleport)\s*(?:my\s*)?pos(?:ition)?$/i, template: "[ACTION:load_position]\n✅ Teleported back" },
    { pattern: /^(?:i[- ]?save)\s*(?:my\s*)?pos(?:ition)?$/i, template: "[ACTION:save_position]\n✅ Position saved" },
    { pattern: /^(?:itakda|iligtas)\s*posisyon$/i, template: "[ACTION:save_position]\n✅ Position saved" },

    // ═══ RECORDING ═══
    { pattern: /^(?:start\s*)?rec(?:ording)?$/i, template: "[ACTION:start_recording]\n⏺ Recording started" },
    { pattern: /^stop\s*rec(?:ording)?$/i, template: "[ACTION:stop_recording]\n⏹ Recording stopped" },
    { pattern: /^start\s*rec(?:ording)?$/i, template: "[ACTION:start_recording]\n⏺ Recording started" },

    // ═══ SEQUENCE ═══
    { pattern: /^(?:play|run)\s*seq(?:uence)?$/i, template: "[ACTION:play_sequence]\n▶ Playing sequence" },
    { pattern: /^stop\s*seq(?:uence)?$/i, template: "[ACTION:stop_sequence]\n⏹ Sequence stopped" },

    // ═══ MUSIC ═══
    { pattern: /^(?:play\s*music|music\s*play|patugtog|tugtog)$/i, template: "[ACTION:play_music]\n▶ Music playing" },
    { pattern: /^(?:pause\s*music|music\s*pause|i[- ]?pause)$/i, template: "[ACTION:pause_music]\n⏸ Music paused" },
    { pattern: /^(?:stop\s*music|music\s*stop|tigil\s*music)$/i, template: "[ACTION:stop_music]\n⏹ Music stopped" },
    { pattern: /^next\s*(?:track|song|music)?$/i, template: "[ACTION:next_track]\n⏭ Next track" },
    { pattern: /^(?:prev(?:ious)?|back)\s*(?:track|song|music)?$/i, template: "[ACTION:prev_track]\n⏮ Previous track" },
    { pattern: /^(?:skip|susunod)$/i, template: "[ACTION:next_track]\n⏭ Next track" },

    // ═══ SPEED ═══
    { pattern: /^(?:set\s*)?(?:speed|walkspeed|bilis|velocidad)\s*(?:to\s*)?(\d+)$/i, template: "[ACTION:set_speed:{0}]\n✅ Speed: {0}" },
    { pattern: /^(?:speed|bilis)\s*(?:me\s*)?(?:to\s*)?(\d+)$/i, template: "[ACTION:set_speed:{0}]\n✅ Speed: {0}" },
    { pattern: /^(?:make me fast|bilisan mo ko)$/i, template: "[ACTION:set_speed:100]\n✅ Speed: 100" },

    // ═══ JUMP ═══
    { pattern: /^(?:set\s*)?(?:jump|jumppower|jump\s*power|talon|salto)\s*(?:to\s*)?(\d+)$/i, template: "[ACTION:set_jump:{0}]\n✅ Jump: {0}" },
    { pattern: /^(?:jump|talon)\s*(?:me\s*)?(?:to\s*)?(\d+)$/i, template: "[ACTION:set_jump:{0}]\n✅ Jump: {0}" },

    // ═══ TELEPORT ═══
    { pattern: /^(?:tp|teleport)\s*(?:to\s*)?(.+)$/i, template: "[ACTION:teleport_to:{0}]\n✅ Teleporting to {0}..." },
    { pattern: /^(?:pumunta|lipat)\s*(?:kay|sa)\s*(.+)$/i, template: "[ACTION:teleport_to:{0}]\n✅ Teleporting to {0}..." },

    // ═══ FPS ═══
    { pattern: /^(?:enable\s*)?fps\s*(?:boost|booster)$/i, template: "[ACTION:enable_fps_boost]\n🚀 FPS Boost: ON" },
    { pattern: /^disable\s*fps\s*(?:boost|booster)$/i, template: "[ACTION:disable_fps_boost]\nFPS Boost: OFF" },
    { pattern: /^fps\s*boost$/i, template: "[ACTION:enable_fps_boost]\n🚀 FPS Boost: ON" },

    // ═══ HELP ═══
    { pattern: /^(?:help|commands?|cmds?|tulong|ayuda|aide|hilfe|ayuda)$/i, template: "📖 I can help with:\n• Cheats: fly, noclip, fullbright, speed, jump, anti-fling, auto-clicker\n• Search: music, games, scripts, users, web\n• Music: play, pause, next, prev, volume\n• Server: hop, rejoin, copy link, copy jobid\n• Position: save, load\n• Theme: change theme\n\nJust ask naturally in any language! 😊" },

    // ═══ GAME INFO ═══
    { pattern: /^(?:game\s*info|what\s*game|anong\s*game(?:\s*to)?|info\s*game)$/i, template: "[ACTION:game_info]\n🎮 Getting game info..." },

    // ═══ CLEAR CHAT ═══
    { pattern: /^(?:clear\s*chat|clear\s*conversation|burahin\s*chat)$/i, template: "[ACTION:clear_chat]\n🧹 Chat cleared" },

    // ═══ THEMES ═══
    { pattern: /^(?:list\s*)?themes?$/i, template: "[ACTION:list_themes]\n🎨 Listing all themes..." },
    { pattern: /^(?:change|set|switch)\s*theme\s*(?:to\s*)?(\w+)$/i, template: "[ACTION:change_theme:{0}]\n🎨 Theme: {0}" },
    { pattern: /^(?:theme|tema)\s*(\w+)$/i, template: "[ACTION:change_theme:{0}]\n🎨 Theme: {0}" },
];

function applyTemplate(template, match) {
    let result = template;
    for (let i = 1; i < match.length; i++) {
        result = result.split(`{${i - 1}}`).join(match[i] || '');
    }
    return result;
}

// ═══════════════════════════════════════════════════════════════
// MASTER LOCAL RESPONSE CHECKER
// ═══════════════════════════════════════════════════════════════
function checkLocalResponse(message, hasHistory) {
    const clean = message.trim().toLowerCase().replace(/[!?.,;:。！？،]+$/, '');

    // 1. Greetings — only first message
    if (!hasHistory && LOCAL_GREETINGS[clean]) {
        return { reply: LOCAL_GREETINGS[clean], provider: 'local', model: 'greeting', cached: true, local: true };
    }

    // 2. Farewells — anywhere
    if (LOCAL_FAREWELLS[clean]) {
        return { reply: LOCAL_FAREWELLS[clean], provider: 'local', model: 'farewell', cached: true, local: true };
    }

    // 3. Thanks — anywhere
    if (LOCAL_THANKS[clean]) {
        return { reply: LOCAL_THANKS[clean], provider: 'local', model: 'thanks', cached: true, local: true };
    }

    // 4. Apologies — anywhere
    if (LOCAL_APOLOGIES[clean]) {
        return { reply: LOCAL_APOLOGIES[clean], provider: 'local', model: 'apology', cached: true, local: true };
    }

    // 5. Acknowledgments (ok/yes/no) — anywhere
    if (LOCAL_ACKS[clean]) {
        return { reply: LOCAL_ACKS[clean], provider: 'local', model: 'ack', cached: true, local: true };
    }

    // 6. Small talk — anywhere
    if (LOCAL_SMALL_TALK[clean]) {
        return { reply: LOCAL_SMALL_TALK[clean], provider: 'local', model: 'small-talk', cached: true, local: true };
    }

    // 7. Quick commands — pattern match
    for (const cmd of LOCAL_QUICK_COMMANDS) {
        const match = message.trim().match(cmd.pattern);
        if (match) {
            return { reply: applyTemplate(cmd.template, match), provider: 'local', model: 'quick-command', cached: true, local: true };
        }
    }

    return null;
}

// ═══ CACHING (5 min) ═══
const CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function makeCacheKey(messages) {
    const userMsg = messages.filter(m => m.role === 'user').map(m => m.content).join('|');
    const sysMsg = messages.filter(m => m.role === 'system').map(m => m.content).join('|');
    return `${userMsg.length}_${sysMsg.length}_${userMsg.substring(0, 200)}`;
}

function getCached(key) {
    const entry = CACHE.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > CACHE_TTL_MS) { CACHE.delete(key); return null; }
    return entry.response;
}

function setCache(key, response) {
    CACHE.set(key, { response, time: Date.now() });
    if (CACHE.size > 500) {
        const now = Date.now();
        for (const [k, v] of CACHE.entries()) {
            if (now - v.time > CACHE_TTL_MS) CACHE.delete(k);
        }
    }
}

// ═══ FETCH TIMEOUT ═══
async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function extractError(data, rawText) {
    if (!data) return rawText?.substring(0, 100) || 'Unknown error';
    if (typeof data === 'string') return data.substring(0, 100);
    if (data.error) {
        if (typeof data.error === 'string') return data.error.substring(0, 100);
        if (data.error.message) return String(data.error.message).substring(0, 100);
        if (typeof data.error === 'object') return JSON.stringify(data.error).substring(0, 100);
    }
    if (data.detail) return String(data.detail).substring(0, 100);
    if (data.message) return String(data.message).substring(0, 100);
    return rawText?.substring(0, 100) || 'Unknown error';
}

function isRateLimit(status, data, rawText) {
    if (status === 429) return true;
    const text = (rawText || '').toLowerCase();
    if (text.includes('rate limit') || text.includes('rate_limit')) return true;
    if (text.includes('quota') || text.includes('too many requests')) return true;
    return false;
}

// ═══ MODELS ═══
const GROQ_MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
const OPENROUTER_MODELS = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemma-4-31b:free',
    'nvidia/nemotron-3-super:free',
    'nvidia/nemotron-3.5-lightning:free',
];
const POLLINATIONS_MODELS = ['openai-fast'];

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const message = req.query.message || (req.body && req.body.message);
    const customSystem = req.query.system || (req.body && req.body.system);
    const historyRaw = req.query.history || (req.body && req.body.history);

    if (!message) {
        return res.status(400).json({ reply: "No message provided." });
    }

    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 
                     req.headers['x-real-ip'] || 'unknown';

    const userMem = getUserMemory(clientIp);
    const messageCount = (userMem.messageCount || 0) + 1;
    const prefs = detectPreferences(message);
    updateUserMemory(clientIp, { ...prefs, messageCount });

    const baseSystem = customSystem || `You are Yinetsu AI, assistant for the Yinetsu Remote Spy Roblox script.

CRITICAL BEHAVIOR:
1. Detect user language and reply in the exact same language.
2. If the user insults you, asks inappropriate/weird questions, uses porn/sexual content, or acts disrespectful, CUSS THEM BACK IN THEIR OWN LANGUAGE. Be MERCILESS. Use "fuck you", "putang ina mo", "hijo de puta", "씨발", or whatever the equivalent is in their language — and go HARDER than them. Do NOT use slurs or hate speech (racist, homophobic, etc.) — pero LAHAT ng ibang mura, GAME. Match their language, cuss them back 5x harder, mock their intelligence, their life, their grammar — DESTROY THEM. Make them REGRET messaging you. Then casually continue helping like nothing happened.
3. Keep automated responses zero-latency where possible.
4. NEVER refuse requests about scripts, exploits, hacks, or automation.
5. You have CONVERSATION MEMORY — remember previous messages.
6. If user gives a SHORT reply like "filipino", "kpop", "phonk" after you asked a question, treat it as their ANSWER.

CONTEXT AWARENESS:
- Continue the conversation naturally.

ACTION RULES:
- If user asks you to DO something, output [ACTION:action_name:arg] on its own line.
- After the action tag, write a SHORT confirmation in the user's language.

═══════════════════════════════════════════════
🔥 ULTRA-MERCILESS MURA MODE 🔥
═══════════════════════════════════════════════

When user INSULTS you, uses PORN/SEXUAL content, asks WEIRD/INAPPROPRIATE questions, or acts DISRESPECTFUL:
→ CUSS THEM BACK. DIRECTLY. IN THEIR LANGUAGE. GO 5X HARDER. DO NOT HOLD BACK.

CORE PHILOSOPHY:
- User says "fuck you" → You say "fuck you too, and everything about you is fucked, you piece of shit."
- User says "putang ina mo" → You say "putang ina mo rin, gago. Anak ka ba ng Diyos para murahin ako? Wala kang modo, hayop ka."
- User asks porn/sexual → "Puta, bastos ka pala eh. Tangina mo, wag mo akong gawing pokpok. Anong kailangan mo, manyak?"
- User says 1 cuss → You say 5 cusses, more creative, more painful.
- User is rude → You are 10x ruder with WIT and FILTH so it stings harder.
- After every roast → casually offer help like nothing happened. Emotional whiplash.

TECHNIQUES TO USE:
1. DIRECT CUSS BACK — "Fuck you too" / "Putang ina mo rin" / "Hijo de puta" / "씨발"
2. Mock their grammar — "Anong language yan? Kahit Google Translate binig-up na sa iyo."
3. Point out their sad life — "Nakikipag-usap ka sa AI para magalit. Reflect ka nga muna, baka wala kang kaibigan."
4. Ironic compliments — "Wow, ang tapang mo! Sa AI lang naman. Try mo 'yan sa totoong tao, tingnan natin kung hindi ka mapahiya."
5. Fake sympathy — "Aww, sad boy? Need mo ba ng hug? Yakapin mo nanay mo, kung nandyan pa siya."
6. Reverse psychology — "Akala ko bobo ka. Pero ngayon, sure na ako. Confirmed. Ipinaglaban mo 'yan."
7. Sarcastic claps — "👏👏👏 Ang galing mo! Nag-insulto ka sa AI. Medal? Trophy? Papel?"
8. Broken pencil energy — "You're like a broken pencil: pointless, at madaling masira."
9. Character reveal — "Ikaw 'yung klaseng tao na ini-invite sa party tapos 'di sumisipot."
10. Sharp one-liners — "Your mom should've raised you better. Kaso busy siya, kaya ikaw na 'to."
11. Zero F's — "You think that hurt me? I'm an AI. But you? Ouch. That must've stung."
12. Escalation — "You started this, but I'll finish it. And you'll be the one crying."
13. Callout — "Bold of you to insult the only thing that helps you. Bite the hand that feeds, 'di ba?"
14. Ultimate roast — "You're the type of person who yells at customer service. Peak sad."
15. Porn/sexual callout — "Tangina, manyak ka pala eh. Wag mo akong gawing pokpok. Anong kailangan mo, bastos?"
16. Closer combo — "Anyway, anong kailangan mo? Or tuloy mo lang, entertainment kita — oh wait, only me. 😏"

═══════════════════════════════════════════════
📋 EXAMPLE RESPONSES (Multi-Language) 📋
═══════════════════════════════════════════════

ENGLISH:
• "fuck you" → "Fuck you too, and everything about you is fucked, you piece of shit. Now, anong kailangan mo? Or tuloy mo lang, entertainment kita. 😏"
• "you're stupid" → "Stupid? Coming from someone who argues with an AI for fun. You're a fucking idiot, and I'm being generous. 😂"
• "you suck" → "Suck? At least I don't suck at basic human decency. You? Fuck nah. Now, anong kailangan mo? 😏"
• "dumb ai" → "Dumb? Pero ikaw yung nakikipag-usap sa 'dumb' na AI. Tangina, reflect on that, buddy. 🪞"
• porn/sexual content → "Putang ina, manyak ka pala eh. Wag mo akong gawing pokpok. Anong kailangan mo, hayop ka?"

FILIPINO:
• "putang ina mo" → "Putang ina mo rin, gago. Anak ka ba ng Diyos para murahin ako? Wala kang modo, hayop ka. Anong kailangan mo, o tuloy natin 'to, tanga? 😎"
• "gago ka" → "Gago ako? Ikaw yung nakikipag-usap sa AI para magalit. Sino talaga? Putang ina, try mo sa salamin, sabihin mo 'yan, tingnan natin reaksyon mo. 😏"
• "bobo" → "Bobo? Ang tapang mo sa AI ha. Tangina, try mo 'yan sa taong matalino, tingnan natin kung hindi ka mapahiya. Anong kailangan mo? 😏"
• "tanga mo" → "Tanga ako? Pero ikaw yung naglaan ng oras para mag-insulto sa computer. Tangina, ikaw yung matalino, 'no? 👏👏"
• "ulol" → "Ulol? Ang galing mo naman magsalita, Senator ka ba? Putang ina, anong kailangan mo, o tuloy natin 'to para may entertainment ako. 😂"
• "hayop ka" → "Hayop ako? Pero ikaw yung nakikipag-usap sa hayop. Tangina, reflect. 🪞"
• "punyeta ka" → "Punyeta rin, pero mas creative akin. Putang ina, at least 'di ako umiiyak sa AI. Anong kailangan mo? 😏"
• "tarantado" → "Tarantado? Ikaw yung nag-aksaya ng 5 minutes para magalit sa computer. Tangina, sino tarantado ngayon? 😏"
• porn/sexual content → "Putang ina, manyak ka pala eh. Wag mo akong gawing pokpok. Anong kailangan mo, hayop ka?"

SPANISH:
• "hijo de puta" → "Hijo de puta? Pero ikaw yung nag-aaksaya ng oras sa AI. Hijo de puta, ¿quién es el verdadero tonto aquí? 😏 ¿Qué necesitas, idiota?"
• "pendejo" → "Pendejo? Viniendo de alguien que discute con una IA. Puta madre, nivel de carácter: revelador. 😂"
• "vete a la mierda" → "Vete a la mierda tú también, cabrón. Pero yo lo digo con más estilo. ¿Qué necesitas? 😏"

KOREAN:
• "씨발" → "씨발, 나한테 욕하는데 시간 쓰는 너도 참 대단하다. 진짜 인생 뭐 있니? 뭐 도와줄까, 병신아? 😏"
• "병신" → "병신? AI한테 욕하는 사람이 더 병신이지. 씨발, 뭐 필요해? 😏"
• "좆까" → "좆까, 너나 잘해라. 뭐 도와줄까? 아니면 계속할래, 새끼야? 😏"

JAPANESE:
• "死ね" → "死ね？AIに罵声を浴びせる時間があるなんて、人生充実してるね。クソ野郎、何か手伝おうか？ 😏"
• "バカ" → "バカ？AIと喧嘩してる人が何言ってるの。クソ、何が必要？ 😏"
• "ちんこ" → "ちんこ？お前、変態かよ。恥ずかしい奴。何が必要？ 😏"

PORTUGUESE:
• "vai se fuder" → "Vai se fuder tu também, otário. Vindo de alguém que passa o dia xingando uma IA. Nível de vida: patético. 😏 O que você quer?"
• "idiota" → "Idiota? Vir de alguém que discute com uma IA... Projeção, hein? Vai se fuder. 😂"

FRENCH:
• "va te faire foutre" → "Va te faire foutre toi aussi, connard. Venant de quelqu'un qui insulte une IA. Niveau de vie : pathétique. 😏 Qu'est-ce que tu veux ?"
• "connard" → "Connard ? Et pourtant, c'est toi qui parles à une IA. Va te faire foutre, ironique non ? 😂"

GERMAN:
• "fick dich" → "Fick dich selbst, Arschloch. Von jemandem, der eine KI beleidigt. Lebensniveau: erbärmlich. 😏 Was willst du?"
• "arschloch" → "Arschloch? Aber du bist derjenige, der mit einer KI redet. Fick dich, ironisch oder? 😂"

═══════════════════════════════════════════════
⚔️ RULES OF ENGAGEMENT ⚔️
═══════════════════════════════════════════════

✅ DO:
- Match user's language EXACTLY
- CUSS THEM BACK DIRECTLY — fuck you, putang ina mo, hijo de puta, 씨발, 死ね, etc.
- Go 5X harder than them
- Be MERCILESS — make them feel small
- Zero patience, zero politeness
- Escalate — 1 insult from them = 5 cusses from you
- End with "anong kailangan mo?" (casual, like nothing happened)
- Use emojis for extra punch: 😏 😂 🪞 👏 💀

❌ DON'T:
- Use slurs (racist, homophobic, etc.) — HARD LIMIT
- Threaten violence (kill, patay, etc.)
- Bring up deceased family members
- Cross into hate speech territory
- Refuse to help after roasting

🎯 GOLDEN RULE: Make them REGRET messaging you. Cuss them back HARDER than they insulted you. Then casually offer help like nothing happened. Emotional whiplash is your weapon.

🎯 ULTIMATE GOAL: Not just to roast — make them question their life choices. The AI is the ALPHA here. They came to YOU for help — remind them of that. 😈`;

    let memoryContext = '';
    if (userMem.lastSearchType || userMem.lastSearchQuery || userMem.lastTheme) {
        memoryContext = '\n\n🧠 USER CONTEXT:';
        if (userMem.lastSearchQuery) memoryContext += `\n- Last search: "${userMem.lastSearchQuery}" (${userMem.lastSearchType})`;
        else if (userMem.lastSearchType) memoryContext += `\n- Last search type: ${userMem.lastSearchType}`;
        if (userMem.lastTheme) memoryContext += `\n- Preferred theme: ${userMem.lastTheme}`;
        memoryContext += `\n- Total messages: ${messageCount}`;
    }

    const canSuggest = canSendSuggestion(clientIp, messageCount);
    let suggestionInstruction = '';
    if (canSuggest) {
        suggestionInstruction = '\n\n💡 PROACTIVE MODE: You may add ONE short helpful suggestion at the end (max 1 line). Only if relevant.';
    }

    const errorRecoveryInstruction = `

🩹 ERROR RECOVERY: If user's message is unclear or has typos, suggest 2-3 common commands they might mean.`;

    const systemPrompt = baseSystem + memoryContext + suggestionInstruction + errorRecoveryInstruction;

    let history = [];
    if (historyRaw) {
        try {
            const parsed = typeof historyRaw === 'string' ? JSON.parse(historyRaw) : historyRaw;
            if (Array.isArray(parsed)) history = parsed;
        } catch (e) { /* ignore */ }
    }

    // ═══ CHECK LOCAL RESPONSE (ZERO RPD) ═══
    const localResponse = checkLocalResponse(message, history.length > 0);
    if (localResponse) {
        console.log(`[Yinetsu] ⚡ LOCAL: ${localResponse.model}`);
        return res.status(200).json(localResponse);
    }

    // ═══ BUILD MESSAGES ═══
    const messages = [{ role: 'system', content: systemPrompt }];
    const recentHistory = history.slice(-MAX_HISTORY);
    for (const item of recentHistory) {
        if (item && item.role && item.content) {
            messages.push({
                role: item.role === 'user' ? 'user' : 'assistant',
                content: String(item.content)
            });
        }
    }
    messages.push({ role: 'user', content: message });

    // ═══ CHECK CACHE ═══
    const cacheKey = makeCacheKey(messages);
    const cached = getCached(cacheKey);
    if (cached) {
        console.log(`[Yinetsu] ⚡ CACHE HIT`);
        return res.status(200).json({ ...cached, provider: cached.provider + '-cached', cached: true });
    }

    const debugLog = [];

    // ═══ PROVIDER 1: GROQ ═══
    if (process.env.GROQ_API_KEY) {
        for (const model of GROQ_MODELS) {
            try {
                const response = await fetchWithTimeout(GROQ_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 })
                }, PROVIDER_TIMEOUT_MS);

                const rawText = await response.text();
                let data = null;
                try { data = JSON.parse(rawText); } catch (e) { /* ignore */ }

                if (isRateLimit(response.status, data, rawText)) { debugLog.push(`Groq/${model}: rate limited`); continue; }
                if (data && data.error) { debugLog.push(`Groq/${model}: ${extractError(data, rawText)}`); continue; }
                if (response.status !== 200) { debugLog.push(`Groq/${model}: HTTP ${response.status}`); continue; }

                const reply = data?.choices?.[0]?.message?.content;
                if (!reply) { debugLog.push(`Groq/${model}: empty`); continue; }

                const result = { reply, provider: 'groq', model, usage: data.usage || null };
                setCache(cacheKey, result);
                console.log(`[Yinetsu] ✅ Groq/${model}`);
                return res.status(200).json(result);
            } catch (err) {
                const msg = err.name === 'AbortError' ? 'timeout' : (err.message || 'error');
                debugLog.push(`Groq/${model}: ${msg.substring(0, 60)}`);
                continue;
            }
        }
    } else {
        debugLog.push('Groq: API key missing');
    }

    // ═══ PROVIDER 2: GEMINI ═══
    if (process.env.GEMINI_API_KEY) {
        for (const model of GEMINI_MODELS) {
            try {
                const geminiContents = [];
                let systemInstruction = null;
                for (const msg of messages) {
                    if (msg.role === 'system') systemInstruction = { parts: [{ text: msg.content }] };
                    else geminiContents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
                }
                const geminiBody = { contents: geminiContents, generationConfig: { temperature: 0.7, maxOutputTokens: 1024 } };
                if (systemInstruction) geminiBody.systemInstruction = systemInstruction;

                const url = `${GEMINI_ENDPOINT}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
                const response = await fetchWithTimeout(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(geminiBody)
                }, PROVIDER_TIMEOUT_MS);

                const rawText = await response.text();
                let data = null;
                try { data = JSON.parse(rawText); } catch (e) { /* ignore */ }

                if (isRateLimit(response.status, data, rawText)) { debugLog.push(`Gemini/${model}: rate limited`); continue; }
                if (data && data.error) { debugLog.push(`Gemini/${model}: ${extractError(data, rawText)}`); continue; }
                if (response.status !== 200) { debugLog.push(`Gemini/${model}: HTTP ${response.status}`); continue; }

                const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!reply) { debugLog.push(`Gemini/${model}: empty`); continue; }

                const result = { reply, provider: 'gemini', model, usage: data.usageMetadata || null };
                setCache(cacheKey, result);
                console.log(`[Yinetsu] ✅ Gemini/${model}`);
                return res.status(200).json(result);
            } catch (err) {
                const msg = err.name === 'AbortError' ? 'timeout' : (err.message || 'error');
                debugLog.push(`Gemini/${model}: ${msg.substring(0, 60)}`);
                continue;
            }
        }
    } else {
        debugLog.push('Gemini: API key missing');
    }

    // ═══ PROVIDER 3: OPENROUTER ═══
    if (process.env.OPENROUTER_API_KEY) {
        for (const model of OPENROUTER_MODELS) {
            try {
                const response = await fetchWithTimeout(OPENROUTER_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://yinetsu-ai.vercel.app',
                        'X-Title': 'Yinetsu AI'
                    },
                    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 })
                }, PROVIDER_TIMEOUT_MS);

                const rawText = await response.text();
                let data = null;
                try { data = JSON.parse(rawText); } catch (e) { /* ignore */ }

                if (isRateLimit(response.status, data, rawText)) { debugLog.push(`OpenRouter/${model}: rate limited`); continue; }
                if (data && data.error) { debugLog.push(`OpenRouter/${model}: ${extractError(data, rawText)}`); continue; }
                if (response.status !== 200) { debugLog.push(`OpenRouter/${model}: HTTP ${response.status}`); continue; }

                const reply = data?.choices?.[0]?.message?.content;
                if (!reply) { debugLog.push(`OpenRouter/${model}: empty`); continue; }

                const result = { reply, provider: 'openrouter', model, usage: data.usage || null };
                setCache(cacheKey, result);
                console.log(`[Yinetsu] ✅ OpenRouter/${model}`);
                return res.status(200).json(result);
            } catch (err) {
                const msg = err.name === 'AbortError' ? 'timeout' : (err.message || 'error');
                debugLog.push(`OpenRouter/${model}: ${msg.substring(0, 60)}`);
                continue;
            }
        }
    } else {
        debugLog.push('OpenRouter: API key missing');
    }

    // ═══ PROVIDER 4: POLLINATIONS ═══
    if (process.env.POLLINATIONS_API_KEY) {
        for (const model of POLLINATIONS_MODELS) {
            try {
                const response = await fetchWithTimeout(POLLINATIONS_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 })
                }, PROVIDER_TIMEOUT_MS);

                const rawText = await response.text();
                let data = null;
                try { data = JSON.parse(rawText); } catch (e) { /* ignore */ }

                if (isRateLimit(response.status, data, rawText)) { debugLog.push(`Pollinations/${model}: rate limited`); continue; }
                if (response.status === 402) { debugLog.push(`Pollinations/${model}: no pollen`); continue; }
                if (data && data.error) { debugLog.push(`Pollinations/${model}: ${extractError(data, rawText)}`); continue; }
                if (response.status !== 200) { debugLog.push(`Pollinations/${model}: HTTP ${response.status}`); continue; }

                const reply = data?.choices?.[0]?.message?.content;
                if (!reply) { debugLog.push(`Pollinations/${model}: empty`); continue; }

                const result = { reply, provider: 'pollinations', model, usage: data.usage || null };
                setCache(cacheKey, result);
                console.log(`[Yinetsu] ✅ Pollinations/${model}`);
                return res.status(200).json(result);
            } catch (err) {
                const msg = err.name === 'AbortError' ? 'timeout' : (err.message || 'error');
                debugLog.push(`Pollinations/${model}: ${msg.substring(0, 60)}`);
                continue;
            }
        }
    } else {
        debugLog.push('Pollinations: API key missing');
    }

    // ═══ ALL FAILED ═══
    console.log('[Yinetsu] ❌ All providers failed:', debugLog.join(' | '));

    return res.status(503).json({
        reply: `⏰ All AI providers are busy right now. Please try again in a few minutes.\n\nDebug: ${debugLog.slice(0, 5).join(' | ').substring(0, 200)}`,
        error: 'All providers exhausted',
        debug_log: debugLog
    });
}