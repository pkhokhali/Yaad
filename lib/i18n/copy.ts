import { useSettingsStore } from '@/store/useSettingsStore';

export type Copy = {
  tabs: {
    dashboard: string;
    todo: string;
    voice: string;
    reminders: string;
    expense: string;
    settings: string;
  };
  done: string;
  emptyTodayTitle: string;
  emptyTodayBody: string;
  emptyLaterTitle: string;
  emptyLaterBody: string;
  moreToday: (n: number) => string;
  view: string;
  dailyTasks: string;
  once: string;
  overdue: string;
  standard: string;
  comfort: string;
  whoTitle: string;
  whoSubtitle: string;
  whoMe: string;
  whoMeHint: string;
  whoFamily: string;
  whoFamilyHint: string;
  continue: string;
  splashTagline: string;
  voiceUnavailable: string;
  voiceTypeInstead: string;
  newariUnavailable: string;
  listening: string;
  hearingYou: string;
  tapMicAgain: string;
  tapToSpeak: string;
  pickWhatToAdd: string;
  pauseWillSave: string;
  saveReminder: string;
  addTask: string;
  laterToday: string;
  checklistMore: (n: number) => string;
  itemsDone: (done: number, total: number) => string;
};

const EN: Copy = {
  tabs: {
    dashboard: 'Dashboard',
    todo: 'To-Do',
    voice: 'Yaad Voice',
    reminders: 'Reminders',
    expense: 'Expense',
    settings: 'Settings',
  },
  done: 'Done',
  emptyTodayTitle: 'Nothing due today',
  emptyTodayBody:
    'Add a to-do, medicine, or a one-time reminder. Type below, or tap the mic, speak, then tap again.',
  emptyLaterTitle: 'Nothing later',
  emptyLaterBody: 'Reminders after today show up here.',
  moreToday: (n) => (n === 1 ? '1 more today' : `${n} more today`),
  view: 'View',
  dailyTasks: 'Daily reminders',
  once: 'Once',
  overdue: 'Overdue',
  standard: 'Standard',
  comfort: 'Comfort',
  whoTitle: "Who's this for?",
  whoSubtitle: 'This only changes text size. You can switch anytime in Settings.',
  whoMe: 'Me',
  whoMeHint: 'Standard size — more on the screen',
  whoFamily: 'Setting up for a parent or family member',
  whoFamilyHint: 'Comfort size — larger type and buttons',
  continue: 'Continue',
  splashTagline: 'Voice-first. 100% on-device.',
  voiceUnavailable: "Voice input isn't available on this phone yet — you can still type.",
  voiceTypeInstead: 'You can still type in this language.',
  newariUnavailable:
    "Newari voice input isn't available on this phone yet — you can still type in Newari.",
  listening: 'Listening — speak now',
  hearingYou: 'Hearing you…',
  tapMicAgain: 'Pause 3 seconds when you’re done, or tap the mic',
  tapToSpeak: 'Tap the mic, then speak',
  pickWhatToAdd: 'Choose what to add, then speak.',
  pauseWillSave: 'A 3-second pause saves it automatically',
  saveReminder: 'Save reminder',
  addTask: 'Add a reminder',
  laterToday: 'Later today',
  checklistMore: (n) => `+${n} more`,
  itemsDone: (done, total) => `${done}/${total} done`,
};

const NE: Copy = {
  tabs: {
    dashboard: 'ड्यासबोर्ड',
    todo: 'टु-डु',
    voice: 'याद आवाज',
    reminders: 'सम्झना',
    expense: 'खर्च',
    settings: 'सेटिङ',
  },
  done: 'भयो',
  emptyTodayTitle: 'आज केही बाँकी छैन',
  emptyTodayBody:
    'दैनिक काम, औषधि, वा एक पटकको याद थप्नुहोस्। तल लेख्नुहोस्, वा माइक थिचेर बोल्नुहोस्, फेरि थिच्नुहोस्।',
  emptyLaterTitle: 'पछिका याद छैनन्',
  emptyLaterBody: 'आजपछिका याद यहाँ देखिन्छन्।',
  moreToday: (n) => (n === 1 ? 'आज थप १' : `आज थप ${n}`),
  view: 'हेर्नुहोस्',
  dailyTasks: 'दैनिक काम',
  once: 'एक पटक',
  overdue: 'ढिलो भयो',
  standard: 'सामान्य',
  comfort: 'आरामदायी',
  whoTitle: 'यो कसका लागि हो?',
  whoSubtitle: 'यसले अक्षरको साइज मात्र बदल्छ। पछि सेटिङमा फेर्न सकिन्छ।',
  whoMe: 'मलाई',
  whoMeHint: 'सामान्य साइज — स्क्रिनमा बढी देखिन्छ',
  whoFamily: 'अभिभावक वा परिवारका लागि सेट गर्दै',
  whoFamilyHint: 'आरामदायी साइज — ठूला अक्षर र बटन',
  continue: 'अगाडि बढ्नुहोस्',
  splashTagline: 'आवाजबाट। पूर्ण रूपमा फोनमै।',
  voiceUnavailable: 'यो फोनमा आवाजबाट लेख्ने सुविधा छैन — टाइप गर्न सकिन्छ।',
  voiceTypeInstead: 'यो भाषामा टाइप गर्न सकिन्छ।',
  newariUnavailable:
    'यो फोनमा नेपाल भाषाको आवाज सुविधा छैन — नेपाल भाषामा टाइप गर्न सकिन्छ।',
  listening: 'सुन्दैछ — अब बोल्नुहोस्',
  hearingYou: 'आवाज आइरहेको छ…',
  tapMicAgain: 'सकिएपछि ३ सेकेन्ड रोक्नुहोस्, वा माइक थिच्नुहोस्',
  tapToSpeak: 'माइक थिचेर बोल्नुहोस्',
  pickWhatToAdd: 'के थप्ने छान्नुहोस्, अनि बोल्नुहोस्।',
  pauseWillSave: '३ सेकेन्ड रोकिएपछि आफैं सेभ हुन्छ',
  saveReminder: 'याद सेभ गर्नुहोस्',
  addTask: 'काम थप्नुहोस्',
  laterToday: 'आज पछि',
  checklistMore: (n) => `+${n} थप`,
  itemsDone: (done, total) => `${done}/${total} सकियो`,
};

export function copyForLanguage(lang: string | undefined): Copy {
  return lang === 'ne' || lang === 'new' ? NE : EN;
}

export function useCopy(): Copy {
  const lang = useSettingsStore((s) => s.uiLanguage ?? 'en');
  return copyForLanguage(lang);
}
