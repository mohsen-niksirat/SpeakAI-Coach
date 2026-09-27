export const en = {
  // Header / actions
  'header.roleLine': 'Role: {role} • Voice: {voice}',
  'roles.ielts_examiner': 'IELTS Examiner',
  'roles.friendly_chat': 'Friendly Speaker',
  'roles.job_interview': 'Job Interviewer',
  'roles.debate_partner': 'Debate Partner',
  'actions.start': 'Start Voice Practice',
  'actions.connecting': 'Connecting…',
  'actions.end': 'End Call & View Report',
  'caption.live': 'Interrupt freely anytime — SpeakAI automatically yields.',
  'caption.idle': 'Low latency • Gemini Live & OpenAI Realtime • BYOK multi-provider',
  'footer': 'SpeakAI Coach • Client-First Architecture • Ready for Telegram Mini Apps',
  'dismiss': 'Click to dismiss',

  // Settings
  'settings.title': 'Settings',
  'settings.persona': 'Coach Persona',
  'settings.role.ielts': 'IELTS Speaking Examiner (Strict & Analytical)',
  'settings.role.friendly': 'Friendly Native Speaker (Casual & Supportive)',
  'settings.role.job': 'Tech / Corporate Interviewer',
  'settings.role.debate': 'Debate Sparring Partner',
  'settings.voiceProvider': 'Voice Provider',
  'settings.reportProvider': 'Report Provider',
  'settings.none': '— none —',
  'settings.noVoiceProvider': 'Add a voice-capable provider below first.',
  'settings.voiceProfile': 'Voice Profile',
  'settings.voiceProfileBrowser': ' (browser)',
  'settings.addVoiceFirst': 'Add a voice provider first',
  'settings.browserVoice': 'Browser default voice',
  'settings.browserHint':
    'Chat providers speak through your browser (speech recognition + TTS) — Chrome or Edge recommended. Slightly slower than realtime voice.',
  'settings.providers': 'Providers ({n})',
  'settings.add': 'Add',
  'settings.empty':
    'No providers yet. Add Google, OpenAI, OpenRouter or any compatible gateway — your keys stay in this browser only.',
  'settings.oneKey': '1 key',
  'settings.nKeys': '{n} keys',
  'settings.edit': 'Edit',
  'settings.delete': 'Delete',
  'settings.name': 'Name',
  'settings.type': 'Type',
  'settings.baseUrl': 'Base URL',
  'settings.model': 'Voice / Chat Model',
  'settings.reportModel': 'Report Model (optional)',
  'settings.keysLabel': 'API Keys — one per line (rotation uses them in order on failures)',
  'settings.save': 'Save Provider',
  'settings.cancel': 'Cancel',
  'settings.done': 'Done',
  'settings.addName': 'My OpenRouter',

  // Provider kinds
  'kind.gemini-live': 'Gemini Live (realtime voice)',
  'kind.openai-realtime': 'OpenAI Realtime (realtime voice)',
  'kind.openai-chat': 'OpenAI-compatible (chat + browser voice)',

  // Session summary
  'summary.title': 'Session Report',
  'summary.subtitle': 'Here is how you performed in your speaking session',
  'summary.band': 'Estimated IELTS Band',
  'summary.analyzing': 'Analyzing your transcript with Gemini…',
  'summary.aiEvaluated': 'AI-evaluated from your session transcript',
  'summary.heuristic': 'Heuristic estimate — AI report unavailable',
  'summary.disclaimer':
    'This is an AI-based practice estimate, not an official IELTS score.',
  'summary.pronunciationNote':
    'Pronunciation is inferred from the transcript only and has limited accuracy — true pronunciation needs audio analysis (stress, intonation, phonemes).',
  'criteria.fluency': 'Fluency & Coherence',
  'criteria.lexical': 'Lexical Resource',
  'criteria.grammar': 'Grammatical Range & Accuracy',
  'criteria.pronunciation': 'Pronunciation',
  'summary.strengths': 'Strengths',
  'summary.focus': 'Focus Next',
  'summary.duration': 'Duration',
  'summary.vocab': 'Vocab',
  'summary.alerts': 'Alerts',
  'summary.words': '{n} words',
  'summary.flaws': '{n} flaws',

  // Visualizer orb
  'orb.ready': 'Ready',
  'orb.speaking': 'Speaking',
  'orb.listening': 'Listening',

  // Feedback panel
  'feedback.title': 'Live Corrections ({n})',
  'feedback.empty': 'Speak naturally. Any grammar or phrasing flaws will be gently noted here.',

  // Vocab panel
  'vocab.title': 'Captured Vocab ({n})',
  'vocab.empty': 'Advanced words discovered during chat will appear here and stay saved on this device.',
  'vocab.clear': 'Clear deck',
  'vocab.exportCsv': 'Export CSV',
  'vocab.exportJson': 'Export JSON',
  'vocab.exportAnki': 'Export Anki',

  // Transcript
  'transcript.title': 'Live Transcript',
  'transcript.you': 'You',
  'transcript.coach': 'Coach',
  'transcript.empty': 'Your conversation will be transcribed here in real time.',

  // Errors (thrown at runtime, shown as-is)
  'err.noVoiceProvider': 'Add a voice provider with at least one API key in Settings first.',
  'err.mic': 'Could not access the microphone. Check browser permissions.',
  'err.audioPlayer': 'Audio playback is not available in this browser.',
  'err.startFailed': 'Could not start the session.',
  'err.wsGeneric': 'WebSocket connection error. Check your API key, base URL and network.',
  'err.realtimeOpen': 'Could not open WebSocket to the Realtime endpoint.',
  'err.cannotReach': 'Cannot reach {base} — the network or VPN is blocking this endpoint. Try another VPN.',
  'err.keyRejected': 'API key rejected: {msg}',
  'err.http': 'HTTP {status} from {base}',
  'err.stallHandshake':
    "WebSocket handshake stalled — the network or VPN is blocking Google's live WebSocket (the regular API worked, this connection did not). Try a different VPN server.",
  'err.stallSetup':
    "Connected to the live endpoint but setup never completed — Google's server did not respond in time. Try again, or another VPN server.",
  'err.connClosed': 'Connection closed by server.',
  'err.connFailed': 'Connection failed (code {code}{reason}). Check your API key and base URL.',
  'err.connTimeout': 'Connection timed out. The endpoint did not respond in 25s — check your VPN connection.',
  'err.connLost': 'Connection lost: {msg}. Restart the session to try another key.',
  'err.triedAll': ' (tried all {n} keys)',
  'err.unknown': 'Something went wrong.',
  'err.noSr': 'This browser does not support speech recognition for chat providers. Use Chrome or Edge.',
  'err.noTts': 'This browser does not support speech synthesis.',
  'err.srStart': 'Could not start speech recognition.',
  'err.micDenied': 'Microphone permission denied. Allow the microphone and restart.',
  'err.chatTimeout': 'The provider did not respond in 30s — check your network or VPN.',
  'err.providerError':
    'Provider error ({status}) — the key may be invalid, rate-limited, or the model unavailable.',
  'err.emptyResponse': 'Provider returned an empty response.',

  // Notices (green chip)
  'notice.modelFallback': 'Model "{old}" is unavailable — using "{new}" instead. You can update it in Settings.',
  'notice.stage1': 'Connected without live transcription.',
  'notice.stage2': 'Connected without live transcription and tools.',
  'notice.stage3': 'Connected in basic mode (no transcription, tools or voice profile).',
} as const;

export type TranslationKey = keyof typeof en;

export const fa: Record<TranslationKey, string> = {
  // Header / actions
  'header.roleLine': 'نقش: {role} • صدا: {voice}',
  'roles.ielts_examiner': 'مصحح آیلتس',
  'roles.friendly_chat': 'همصحبت صمیمی',
  'roles.job_interview': 'مصاحبه‌گر کاری',
  'roles.debate_partner': 'هم‌بحث',
  'actions.start': 'شروع مکالمه صوتی',
  'actions.connecting': 'در حال اتصال…',
  'actions.end': 'پایان تماس و مشاهده گزارش',
  'caption.live': 'هر لحظه وسط حرف بپر — SpeakAI خودش کنار می‌رود.',
  'caption.idle': 'تأخیر کم • Gemini Live و OpenAI Realtime • کلید مال خودت',
  'footer': 'SpeakAI Coach • معماری کلاینت‌محور • آماده برای مینی‌اپ تلگرام',
  'dismiss': 'برای بستن کلیک کن',

  // Settings
  'settings.title': 'تنظیمات',
  'settings.persona': 'نقش مربی',
  'settings.role.ielts': 'مصحح مکالمه آیلتس (سخت‌گیر و تحلیلی)',
  'settings.role.friendly': 'همصحبت بومی صمیمی (راحت و حمایتی)',
  'settings.role.job': 'مصاحبه‌گر فنی/سازمانی',
  'settings.role.debate': 'هم‌بحث مناظره‌ای',
  'settings.voiceProvider': 'ارائه‌دهنده صدا',
  'settings.reportProvider': 'ارائه‌دهنده گزارش',
  'settings.none': '— هیچ —',
  'settings.noVoiceProvider': 'اول یک ارائه‌دهنده دارای صدا اضافه کن.',
  'settings.voiceProfile': 'پروفایل صدا',
  'settings.voiceProfileBrowser': ' (مرورگر)',
  'settings.addVoiceFirst': 'اول ارائه‌دهنده صدا اضافه کن',
  'settings.browserVoice': 'صدای پیش‌فرض مرورگر',
  'settings.browserHint':
    'ارائه‌دهنده‌های چتی از طریق مرورگر صحبت می‌کنند (تشخیص گفتار + تبدیل متن به صدا) — کروم یا اِج توصیه می‌شود. کمی کندتر از صدای بلادرنگ.',
  'settings.providers': 'ارائه‌دهندگان ({n})',
  'settings.add': 'افزودن',
  'settings.empty':
    'هنوز ارائه‌دهنده‌ای نیست. گوگل، OpenAI، OpenRouter یا هر دروازه سازگاری اضافه کن — کلیدها فقط در همین مرورگر می‌مانند.',
  'settings.oneKey': '۱ کلید',
  'settings.nKeys': '{n} کلید',
  'settings.edit': 'ویرایش',
  'settings.delete': 'حذف',
  'settings.name': 'نام',
  'settings.type': 'نوع',
  'settings.baseUrl': 'آدرس پایه',
  'settings.model': 'مدل صدا / چت',
  'settings.reportModel': 'مدل گزارش (اختیاری)',
  'settings.keysLabel': 'کلیدهای API — هر خط یک کلید (در صورت خطا به‌ترتیب جایگزین می‌شوند)',
  'settings.save': 'ذخیره ارائه‌دهنده',
  'settings.cancel': 'انصراف',
  'settings.done': 'تمام',
  'settings.addName': 'مثلاً OpenRouter من',

  // Provider kinds
  'kind.gemini-live': 'Gemini Live (صدای بلادرنگ)',
  'kind.openai-realtime': 'OpenAI Realtime (صدای بلادرنگ)',
  'kind.openai-chat': 'سازگار با OpenAI (چت + صدای مرورگر)',

  // Session summary
  'summary.title': 'گزارش جلسه',
  'summary.subtitle': 'عملکرد تو در جلسه مکالمه این‌طور بود',
  'summary.band': 'نمره تخمینی آیلتس',
  'summary.analyzing': 'در حال تحلیل متن گفتگو با Gemini…',
  'summary.aiEvaluated': 'ارزیابی شده با هوش مصنوعی از روی متن جلسه',
  'summary.heuristic': 'تخمین آزمایشی — گزارش هوش مصنوعی در دسترس نبود',
  'summary.disclaimer': 'این یک برآورد تمرینی مبتنی بر هوش مصنوعی است، نه نمره رسمی آیلتس.',
  'summary.pronunciationNote':
    'تلفظ فقط از روی متن استنباط شده و دقت محدودی دارد — تلفظ واقعی نیازمند تحلیل صوتی (stress، intonation و فونِم‌ها) است.',
  'criteria.fluency': 'روانی و انسجام',
  'criteria.lexical': 'منابع واژگانی',
  'criteria.grammar': 'دامنه و دقت دستوری',
  'criteria.pronunciation': 'تلفظ',
  'summary.strengths': 'نقاط قوت',
  'summary.focus': 'تمرکز بعدی',
  'summary.duration': 'مدت',
  'summary.vocab': 'واژگان',
  'summary.alerts': 'خطاها',
  'summary.words': '{n} واژه',
  'summary.flaws': '{n} خطا',

  // Orb
  'orb.ready': 'آماده',
  'orb.speaking': 'در حال صحبت',
  'orb.listening': 'در حال گوش دادن',

  // Feedback panel
  'feedback.title': 'تصحیح‌های زنده ({n})',
  'feedback.empty': 'طبیعی صحبت کن؛ هر اشتباه دستوری یا اصطلاحی همین‌جا با ملایمت ثبت می‌شود.',

  // Vocab panel
  'vocab.title': 'واژگان ثبت‌شده ({n})',
  'vocab.empty': 'واژه‌های پیشرفته‌ای که در گفتگو پیدا شود اینجا می‌آیند و روی همین دستگاه می‌مانند.',
  'vocab.clear': 'پاک کردن دک',
  'vocab.exportCsv': 'خروجی CSV',
  'vocab.exportJson': 'خروجی JSON',
  'vocab.exportAnki': 'خروجی Anki',

  // Transcript
  'transcript.title': 'متن زنده گفتگو',
  'transcript.you': 'تو',
  'transcript.coach': 'مربی',
  'transcript.empty': 'متن گفتگویتان همین‌جا و به‌صورت زنده نوشته می‌شود.',

  // Errors
  'err.noVoiceProvider': 'اول در تنظیمات یک ارائه‌دهنده صدا با حداقل یک کلید API اضافه کن.',
  'err.mic': 'دسترسی به میکروفون ممکن نشد. مجوز مرورگر را بررسی کن.',
  'err.audioPlayer': 'پخش صدا در این مرورگر در دسترس نیست.',
  'err.startFailed': 'شروع جلسه ممکن نشد.',
  'err.wsGeneric': 'خطای اتصال WebSocket. کلید، آدرس پایه و شبکه را بررسی کن.',
  'err.realtimeOpen': 'باز کردن WebSocket به اتصال Realtime ممکن نشد.',
  'err.cannotReach': 'به {base} دسترسی نیست — شبکه یا فیلترشکن این آدرس را مسدود می‌کند. فیلترشکن دیگری امتحان کن.',
  'err.keyRejected': 'کلید API رد شد: {msg}',
  'err.http': 'HTTP {status} از {base}',
  'err.stallHandshake':
    'دست‌دادن WebSocket گیر کرد — شبکه یا فیلترشکن دارد WebSocket زنده گوگل را مسدود می‌کند (API معمولی کار کرد، این اتصال نه). سرور فیلترشکن دیگری را امتحان کن.',
  'err.stallSetup':
    'به اتصال زنده وصل شدی ولی تنظیمات اولیه کامل نشد — پاسخی از سرور گوگل نرسید. دوباره تلاش کن یا سرور فیلترشکن دیگری را بزن.',
  'err.connClosed': 'اتصال توسط سرور بسته شد.',
  'err.connFailed': 'اتصال ناموفق بود (کد {code}{reason}). کلید و آدرس پایه را بررسی کن.',
  'err.connTimeout': 'اتصال timeout شد. ظرف ۲۵ ثانیه جوابی نیامد — اتصال فیلترشکنت را چک کن.',
  'err.connLost': 'اتصال قطع شد: {msg}. برای امتحان کلید دیگر، جلسه را دوباره شروع کن.',
  'err.triedAll': ' (همه {n} کلید امتحان شد)',
  'err.unknown': 'مشکلی پیش آمد.',
  'err.noSr': 'این مرورگر تشخیص گفتار برای ارائه‌دهنده‌های چتی را ندارد. از کروم یا اِج استفاده کن.',
  'err.noTts': 'این مرورگر تبدیل متن به صدا ندارد.',
  'err.srStart': 'شروع تشخیص گفتار ممکن نشد.',
  'err.micDenied': 'مجوز میکروفون رد شد. میکروفون را مجاز کن و دوباره شروع کن.',
  'err.chatTimeout': 'ارائه‌دهنده در ۳۰ ثانیه جواب نداد — شبکه یا فیلترشکن را چک کن.',
  'err.providerError': 'خطای ارائه‌دهنده ({status}) — شاید کلید نامعتبر است، به سقف رسیده یا مدل در دسترس نیست.',
  'err.emptyResponse': 'پاسخ ارائه‌دهنده خالی بود.',

  // Notices
  'notice.modelFallback': 'مدل "{old}" در دسترس نیست — به‌جایش از "{new}" استفاده شد. می‌توانی در تنظیمات عوضش کنی.',
  'notice.stage1': 'بدون ترنکریپشن زنده وصل شد.',
  'notice.stage2': 'بدون ترنکریپشن زنده و ابزارها وصل شد.',
  'notice.stage3': 'در حالت پایه وصل شد (بدون ترنکریپشن، ابزار و پروفایل صدا).',
};
