import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Brain, CheckCircle, ChevronRight, 
  MessageCircle, Calendar, Settings, User, Globe, 
  ArrowRight, Sparkles, Send, Plus, Trash2, Smile, 
  Activity, Lightbulb, LogOut, Lock, Mail, UserCircle,
  PenTool, ShieldCheck, Cloud, RefreshCw, MailCheck, Bell,
  Menu, X, Edit3, AlertTriangle, Wifi, WifiOff
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc,
  updateDoc,
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  orderBy
} from 'firebase/firestore';

// --- CONFIGURATION ---

// 1. GEMINI API KEY
// NOTE: import.meta.env causes errors in this preview. 
// For Vercel, uncomment the line below:
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// 2. FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyAu3Mwy1E82hS_8n9nfmaxl_ji7XWb5KoM",
  authDomain: "syntra-9e959.firebaseapp.com",
  projectId: "syntra-9e959",
  storageBucket: "syntra-9e959.firebasestorage.app",
  messagingSenderId: "858952912964",
  appId: "1:858952912964:web:eef39b1b848a0090af2c11",
  measurementId: "G-P3G12J3TTE"
};

// --- INITIALIZATION ---
let app, auth, db;
let isDemoMode = false;

try {
  // Check if config appears valid
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("PASTE")) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Use experimentalForceLongPolling to bypass some network restrictions
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } else {
    console.warn("Invalid Firebase Config. Switching to Demo Mode.");
    isDemoMode = true;
  }
} catch (e) {
  console.warn("Firebase Init Error (Running in Demo Mode):", e);
  isDemoMode = true;
}

const appId = 'syntra-web-v1';

// --- GEMINI API HELPER (ROBUST) ---
const callGemini = async (prompt, systemInstruction = "") => {
  if (!apiKey) return "System: API Key missing. Please check code configuration.";
  
  // Try standard model first, then fallback
  const models = ["gemini-1.5-flash", "gemini-pro"];
  
  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              role: "user",
              parts: [{ text: `${systemInstruction}\n\nUser Message: ${prompt}` }] 
            }]
          })
        }
      );

      if (!response.ok) {
         console.warn(`Model ${model} failed: ${response.status}`);
         continue; // Try next model
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "AI Error: Empty response.";
    } catch (error) {
      console.error(`Connection error with ${model}`, error);
    }
  }
  return "Connection Error. Please check your internet.";
};

// --- DATA: 40 SJT SCENARIOS ---
const FULL_SJT = [
    { id: 1, trait: 'C', text_ar: "وراك واجبات كتير لبكره بس صحابك عزموك تخرج.", options_ar: ["أعتذر وأخلص اللي ورايا.", "أنزل ساعة وأرجع أكمل.", "آخد كتبي معايا.", "أنزل وأنقل الواجب بعدين."] },
    { id: 2, trait: 'C', text_ar: "مكتبك مكركب جداً.", options_ar: ["أنضفه فوراً.", "أوسع مكان وأقعد.", "أشتغل وسط الكركبة.", "أنضفه الأسبوع الجاي."] },
    { id: 3, trait: 'C', text_ar: "خططت تصحى ٦ الصبح تذاكر.", options_ar: ["أصحى ٥:٥٥.", "أغفل ٥ دقايق وأقوم.", "أراحت عليا نومة.", "أذاكر بالليل وخلاص."] },
    { id: 4, trait: 'C', text_ar: "لقيت غلطة في التصحيح زودتك درجات.", options_ar: ["أقول للمدرس.", "أسكت.", "أقول لصحابي بس.", "أطنش."] },
    { id: 5, trait: 'C', text_ar: "عندك مشروع يتسلم بعد شهرين.", options_ar: ["أخطط من النهاردة.", "أبدأ كمان شهر.", "أبدأ الأسبوع الجاي.", "أعمله ليلة التسليم."] },
    { id: 6, trait: 'C', text_ar: "عملت قائمة مهام لليوم.", options_ar: ["أخلص كله بالمسطرة.", "أخلص المعظم.", "أنسى القائمة.", "أعمل حاجات تانية."] },
    { id: 7, trait: 'C', text_ar: "استلفت كتاب من صاحبك.", options_ar: ["أرجعه بدري.", "أرجعه في ميعاده.", "أرجعه لما يطلبه.", "أنسى إنه معايا."] },
    { id: 8, trait: 'C', text_ar: "بتعمل مشروع جماعي.", options_ar: ["أنظم مهام الكل.", "أعمل جزئي بس.", "أستنى التعليمات.", "أسيبهم يشتغلوا هما."] },
    { id: 9, trait: 'C', text_ar: "حصة مهمة بس مملة.", options_ar: ["أكتب كل كلمة.", "أسمع وخلاص.", "أشخبط.", "أنام."] },
    { id: 10, trait: 'C', text_ar: "وعدت تكلم جدتك.", options_ar: ["أكلمها في الميعاد بالظبط.", "أتأخر شوية.", "أبعت رسالة.", "أنسى."] },
    { id: 11, trait: 'C', text_ar: "هتشتري موبايل جديد.", options_ar: ["أبحث أسابيع.", "أسأل صاحبي.", "أجيب اللي شكله حلو.", "أشتري أي حاجة."] },
    { id: 12, trait: 'C', text_ar: "جالك إيميل محتاج رد.", options_ar: ["أرد فوراً.", "أرد في نفس اليوم.", "أرد الأسبوع الجاي.", "أنسى أرد."] },
    { id: 13, trait: 'C', text_ar: "ماشي على نظام غذائي.", options_ar: ["ألتزم ١٠٠٪.", "ألخبط مرة في الأسبوع.", "ألخبط كتير.", "أبطل بعد يومين."] },
    { id: 14, trait: 'C', text_ar: "نظافة أوضتك.", options_ar: ["دايماً بتلمع.", "نضيفة نوعاً ما.", "مكركبة.", "منطقة كوارث."] },
    { id: 15, trait: 'C', text_ar: "مواعيدك.", options_ar: ["دايماً بدري ١٠ دقايق.", "على الميعاد بالظبط.", "متأخر ٥ دقايق.", "دايماً متأخر."] },
    { id: 16, trait: 'C', text_ar: "مراجعة شغلك.", options_ar: ["أراجع ٣ مرات.", "أراجع مرة.", "بصة سريعة.", "أسلم من غير مراجعة."] },
    { id: 17, trait: 'C', text_ar: "التركيز في التفاصيل.", options_ar: ["باخد بالي من كل فسفوسة.", "بركز في المهم.", "بتفوتني حاجات صغيرة.", "أنا ضايع في التفاصيل."] },
    { id: 18, trait: 'C', text_ar: "أهداف السنة الجديدة.", options_ar: ["أكتب خطة مفصلة.", "فكرة عامة.", "حسب التساهيل.", "مفيش أهداف."] },
    { id: 19, trait: 'C', text_ar: "تنظيم ملفات الكمبيوتر.", options_ar: ["فولدرات جوه فولدرات.", "فولدر واحد مجمع.", "كله على سطح المكتب.", "مش لاقي حاجة."] },
    { id: 20, trait: 'C', text_ar: "مهمة صعبة.", options_ar: ["أقسمها وأبدأ.", "أسوف شوية وأبدأ.", "أخلي حد يعملها.", "أهرب منها."] },
    { id: 21, trait: 'O', text_ar: "شفت لوحة فن تجريدي غريبة.", options_ar: ["أحلل معناها.", "شكلها مثير.", "ملخبطة.", "تضييع ألوان."] },
    { id: 22, trait: 'O', text_ar: "أكلة غريبة أول مرة تشوفها.", options_ar: ["آكلها فوراً.", "أسأل دي إيه الأول.", "أشمها بحذر.", "أرفض آكلها."] },
    { id: 23, trait: 'O', text_ar: "تتعلم لغة جديدة.", options_ar: ["متحمس للتحدي.", "ماشي لو مطلوب.", "شكلها صعب.", "ملهاش لازمة."] },
    { id: 24, trait: 'O', text_ar: "المدرس بيتكلم في فلسفة عميقة.", options_ar: ["أسأل عشان أفهم أكتر.", "أسمع بس.", "أسرح.", "أسأله ده في الامتحان؟"] },
    { id: 25, trait: 'O', text_ar: "نشاط في وقت الفراغ.", options_ar: ["أزور متحف.", "أقرا رواية.", "ألعب فيديو جيمز.", "أنام."] },
    { id: 26, trait: 'O', text_ar: "أغنية بلغة مش عارفها.", options_ar: ["أدور على ترجمتها.", "أستمتع باللحن.", "أقلبها.", "مزعجة."] },
    { id: 27, trait: 'O', text_ar: "تفضيلات السفر.", options_ar: ["أستكشف مدينة مجهولة.", "رحلة منظمة.", "منتجع عالبحر.", "أقعد في البيت."] },
    { id: 28, trait: 'O', text_ar: "حل لغز.", options_ar: ["بموت في التفكير.", "أحاول شوية.", "أجيب الحل من جوجل.", "أطنش."] },
    { id: 29, trait: 'O', text_ar: "أحلام اليقظة.", options_ar: ["عايش جوه دماغي.", "غالباً.", "أحياناً.", "أبداً."] },
    { id: 30, trait: 'O', text_ar: "فيلم وثائقي.", options_ar: ["مذهل.", "ماشي الحال.", "ممل.", "أغير القناة."] },
    { id: 31, trait: 'O', text_ar: "تغيير طريقك اليومي.", options_ar: ["أغير عشان التجديد.", "لو فيه زحمة بس.", "نادراً.", "مغيرش طريقي أبداً."] },
    { id: 32, trait: 'O', text_ar: "قراءة الشعر.", options_ar: ["بعشق التشبيهات.", "حلو.", "صعب الفهم.", "ممل."] },
    { id: 33, trait: 'O', text_ar: "ناس أفكارهم عكسك.", options_ar: ["أناقشهم عشان أفهم.", "أسمع بأدب.", "أتجنب الموضوع.", "أتخانق."] },
    { id: 34, trait: 'O', text_ar: "الفضول عن كيفية عمل الأشياء.", options_ar: ["أفكك الحاجة.", "أتفرج على فيديو.", "مش مهتم.", "أستخدمها وخلاص."] },
    { id: 35, trait: 'O', text_ar: "الأفكار المجردة.", options_ar: ["بحب الكلام النظري.", "فضل الأمثلة الواقعية.", "ملخبطة جداً.", "تضييع وقت."] },
    { id: 36, trait: 'O', text_ar: "تجربة هواية جديدة.", options_ar: ["بجرب كتير.", "أجرب لو حد عزم.", "أخليك في القديم.", "معنديش هوايات."] },
    { id: 37, trait: 'O', text_ar: "الجمال في الطبيعة.", options_ar: ["أقف أتأمل.", "آخد بالي.", "أمشي عادي.", "مش باخد بالي."] },
    { id: 38, trait: 'O', text_ar: "التنوع في الحياة.", options_ar: ["محتاجه عشان أعيش.", "بحبه.", "بفضل الروتين.", "بكره التغيير."] },
    { id: 39, trait: 'O', text_ar: "العمق العاطفي في الأفلام.", options_ar: ["أعيط وأحلل.", "أتأثر.", "مجرد تسلية.", "بفضل الأكشن."] },
    { id: 40, trait: 'O', text_ar: "التعقيد.", options_ar: ["أدور عليه.", "أتعامل معاه.", "أبسطه.", "أتجنبه."] }
];

// --- APP COMPONENT ---
export default function SyntraApp() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [view, setView] = useState('auth'); 
  const [isOffline, setIsOffline] = useState(false);
  const [lang, setLang] = useState('ar'); // Default to Arabic

  // Auth Effect
  useEffect(() => {
    if (isDemoMode) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const docRef = doc(db, 'artifacts', appId, 'users', u.uid, 'data', 'profile');
        try {
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setUserProfile(snap.data());
            setView('dashboard');
          } else {
            setView('onboarding');
          }
        } catch(e) { 
          console.warn("Offline or New");
          setView('onboarding');
        }
      } else {
        setUser(null);
        setView('auth');
      }
    });
    return () => unsub();
  }, []);

  // Handlers
  const handleLogin = (email) => {
    if (isDemoMode) {
      // Mock Login
      setUser({ uid: 'demo-user', email });
      const savedProfile = localStorage.getItem('syntra_demo_profile');
      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
        setView('dashboard');
      } else {
        setView('onboarding');
      }
    }
  };

  const handleProfileComplete = async (data) => {
    setUserProfile(data);
    if (isDemoMode) {
      localStorage.setItem('syntra_demo_profile', JSON.stringify(data));
    } else if (user) {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'profile'), {
        ...data, createdAt: serverTimestamp()
      });
    }
    setView('dashboard');
  };

  const handleLogout = async () => {
    if (isDemoMode) {
      setUser(null);
      setUserProfile(null);
      setView('auth');
    } else {
      await signOut(auth);
    }
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`min-h-screen font-sans bg-slate-50 text-slate-900 ${lang === 'ar' ? 'font-arabic' : ''}`}>
       <NavBar user={user} onLogout={handleLogout} isOffline={isOffline || isDemoMode} lang={lang} setLang={setLang} />
       <main className="pt-24 px-4 h-screen overflow-hidden">
         {view === 'auth' && <AuthScreen onLogin={handleLogin} isDemo={isDemoMode} lang={lang} />}
         {view === 'onboarding' && <OnboardingFlow onComplete={handleProfileComplete} lang={lang} />}
         {view === 'dashboard' && <Dashboard user={user} profile={userProfile} isDemo={isDemoMode} lang={lang} />}
       </main>
    </div>
  );
}

// --- COMPONENTS ---

const NavBar = ({ user, onLogout, isOffline, lang, setLang }) => (
  <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 z-50 px-6 py-4 flex justify-between items-center">
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 bg-gradient-to-tr from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
        <Brain size={24} />
      </div>
      <span className="text-2xl font-bold text-slate-800">Syntra</span>
    </div>
    <div className="flex gap-4 items-center">
        <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')} className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-sm font-bold transition-all">
            <Globe size={14} /> {lang === 'ar' ? 'English' : 'العربية'}
        </button>
      {user && (
        <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full border ${isOffline ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-teal-600 bg-teal-50 border-teal-100'}`}>
          {isOffline ? <Cloud size={12} className="opacity-50"/> : <Cloud size={12} />} 
          {isOffline ? (lang === 'ar' ? "تجريبي" : "Demo") : (lang === 'ar' ? "متصل" : "Online")}
        </div>
      )}
      {user && (
        <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium transition-all">
          <LogOut size={16} /> {lang === 'ar' ? "خروج" : "Logout"}
        </button>
      )}
    </div>
  </nav>
);

const AuthScreen = ({ onLogin, isDemo, lang }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async () => {
    if (isDemo) {
        onLogin(email);
        return;
    }
    try {
        if(isLogin) await signInWithEmailAndPassword(auth, email, password);
        else await createUserWithEmailAndPassword(auth, email, password);
    } catch(e) {
        setError(e.message);
    }
  };

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl border border-white/50 text-center">
         <ShieldCheck size={40} className="text-teal-600 mx-auto mb-4" />
         <h2 className="text-3xl font-bold mb-2 text-slate-800">{lang === 'ar' ? (isLogin ? "تسجيل الدخول" : "إنشاء حساب") : (isLogin ? "Login" : "Sign Up")}</h2>
         <p className="text-slate-400 mb-8">{lang === 'ar' ? "سجل دخولك عشان تبدأ رحلة اكتشاف شخصيتك" : "Login to start your discovery journey"}</p>
         
         <div className="space-y-4">
             <input value={email} onChange={e=>setEmail(e.target.value)} placeholder={lang === 'ar' ? "البريد الإلكتروني" : "Email Address"} className="w-full bg-slate-50 p-4 rounded-xl text-center" />
             <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={lang === 'ar' ? "كلمة المرور" : "Password"} className="w-full bg-slate-50 p-4 rounded-xl text-center" />
             <button onClick={handleAuth} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all">
               {isDemo ? (lang === 'ar' ? "دخول (تجريبي)" : "Enter (Demo)") : (lang === 'ar' ? (isLogin ? "دخول" : "تسجيل") : (isLogin ? "Login" : "Sign Up"))}
             </button>
         </div>

         {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
         
         <button onClick={() => setIsLogin(!isLogin)} className="mt-4 text-sm text-teal-600 hover:underline">
            {lang === 'ar' ? (isLogin ? "ليس لديك حساب؟ سجل الآن" : "لديك حساب؟ سجل دخول") : (isLogin ? "Need an account? Sign Up" : "Have an account? Login")}
         </button>
         
         {isDemo && <p className="text-xs text-amber-600 mt-4">⚠️ {lang === 'ar' ? "يعمل في الوضع التجريبي (بدون قاعدة بيانات)" : "Running in Demo Mode (Local Storage)"}</p>}
      </div>
    </div>
  );
};

const OnboardingFlow = ({ onComplete, lang }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: '', age: '', c_score: 50, o_score: 50 });

  const handleSJTComplete = (scores) => {
    setData(prev => ({ ...prev, c_score: scores.c, o_score: scores.o }));
    setStep(2);
  };

  const handleEssayComplete = (essays) => {
    onComplete({ ...data, ...essays });
  };

  return (
    <div className="h-full flex flex-col justify-center max-w-4xl mx-auto">
      {step === 0 && (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl text-center">
           <h2 className="text-2xl font-bold mb-6">{lang === 'ar' ? "أهلاً بيك في سينترا!" : "Welcome to Syntra!"}</h2>
           <input placeholder={lang === 'ar' ? "اسمك" : "Name"} className="w-full bg-slate-50 p-4 rounded-xl mb-4 text-center" onChange={e => setData({...data, name: e.target.value})} />
           <input placeholder={lang === 'ar' ? "سنك" : "Age"} type="number" className="w-full bg-slate-50 p-4 rounded-xl mb-6 text-center" onChange={e => setData({...data, age: e.target.value})} />
           <button onClick={() => setStep(1)} className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold">{lang === 'ar' ? "ابدأ الاختبار" : "Start Assessment"}</button>
        </div>
      )}
      {step === 1 && <SJTTest onComplete={handleSJTComplete} lang={lang} />}
      {step === 2 && <EssayTest onComplete={handleEssayComplete} lang={lang} />}
    </div>
  );
};

const SJTTest = ({ onComplete, lang }) => {
  const [index, setIndex] = useState(0);
  
  const handleAnswer = () => {
    if (index < FULL_SJT.length - 1) setIndex(i => i + 1);
    else onComplete({ c: 75, o: 65 }); 
  };

  const q = FULL_SJT[index];
  const questionText = lang === 'ar' ? q.text_ar : q.text_en; // Fallback to English only for demo
  const options = lang === 'ar' ? q.options_ar : q.options_en; // Fallback to English options

  return (
    <div className="w-full bg-white p-8 rounded-[2.5rem] shadow-xl relative">
       <span className="absolute top-8 left-8 text-teal-600 font-bold">{index + 1} / 40</span>
       <h3 className="text-2xl font-bold mb-8 mt-4 text-center leading-relaxed">{questionText}</h3>
       <div className="grid gap-3">
         {options && options.map((opt, i) => (
           <button key={i} onClick={handleAnswer} className="w-full text-start p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all font-medium">
             {opt}
           </button>
         ))}
       </div>
    </div>
  );
};

const EssayTest = ({ onComplete, lang }) => {
  const [part, setPart] = useState(0);
  const [text, setText] = useState('');
  const [answers, setAnswers] = useState({});
  
  const prompts_ar = [
    { title: "الجزء ١: تحليل السلوك", q: "افتكر موقف كان عندك فيه هدف صعب جداً. اتصرفت ازاي مع الضغط والتخطيط؟" },
    { title: "الجزء ٢: تحليل الخيال", q: "لو تقدر تخترع مادة جديدة تدرس في المدارس مش موجودة دلوقتي، هتكون إيه وليه؟" },
    { title: "الجزء ٣: مساحة حرة", q: "مساحة حرة (٢٠ دقيقة): اكتب عن أي حاجة في دماغك دلوقتي." }
  ];
  const prompts_en = [
    { title: "Part 1: Behavior", q: "Describe a time you had a difficult goal. How did you handle the pressure and planning?" },
    { title: "Part 2: Imagination", q: "If you could invent a new school subject, what would it be and why?" },
    { title: "Part 3: Free Space", q: "Free writing (20 mins): Write whatever is on your mind." }
  ];

  const prompts = lang === 'ar' ? prompts_ar : prompts_en;

  const next = () => {
    const keys = ['c_essay', 'o_essay', 'free_essay'];
    const newAns = { ...answers, [keys[part]]: text };
    if (part < 2) { setAnswers(newAns); setPart(p => p+1); setText(''); }
    else onComplete(newAns);
  };

  return (
    <div className="w-full bg-white p-8 rounded-[2.5rem] shadow-xl">
       <h3 className="text-xl font-bold text-teal-600 mb-2">{prompts[part].title}</h3>
       <p className="text-xl font-bold mb-6">{prompts[part].q}</p>
       <textarea value={text} onChange={e => setText(e.target.value)} className="w-full h-40 p-4 border border-slate-200 rounded-xl mb-4" placeholder={lang === 'ar' ? "اكتب هنا..." : "Type here..."} />
       <button onClick={next} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold float-end">{lang === 'ar' ? "التالي" : "Next"}</button>
    </div>
  );
};

const Dashboard = ({ user, profile, isDemo, lang }) => {
  const [tab, setTab] = useState('chat');
  const [tasks, setTasks] = useState([]);
  
  // Shared state function to add tasks from Chat
  const addTask = async (text) => {
    const newTask = { id: Date.now(), text, done: false, type: 'ai', createdAt: serverTimestamp() };
    
    // Optimistic Update
    setTasks(prev => [newTask, ...prev]);
    
    // Save to Firestore if not demo
    if (!isDemo && user) {
       try {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), {
            text, done: false, type: 'ai', createdAt: serverTimestamp()
         });
       } catch(e) { console.error("Task save failed", e); }
    }
  };

  // Fetch tasks on load (Non-Demo)
  useEffect(() => {
    if (!isDemo && user) {
        // Sorting in client to avoid index issues for now
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'));
        const unsub = onSnapshot(q, (snap) => {
            const fetched = snap.docs.map(d => ({id: d.id, ...d.data()}));
            // Client-side sort
            fetched.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setTasks(fetched);
        });
        return () => unsub();
    }
  }, [user, isDemo]);

  return (
    <div className="h-full flex gap-6 pb-6 pt-4">
       <div className="w-24 bg-white rounded-[2.5rem] shadow-xl flex flex-col items-center py-8 gap-6">
          <NavBtn icon={<MessageCircle/>} active={tab==='chat'} onClick={()=>setTab('chat')} />
          <NavBtn icon={<Calendar/>} active={tab==='plan'} onClick={()=>setTab('plan')} />
          <NavBtn icon={<BookOpen/>} active={tab==='journal'} onClick={()=>setTab('journal')} />
       </div>
       <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl overflow-hidden relative">
          {tab === 'chat' && <Chat profile={profile} onAddTask={addTask} lang={lang} />}
          {tab === 'plan' && <Planner tasks={tasks} setTasks={setTasks} lang={lang} isDemo={isDemo} user={user} />}
          {tab === 'journal' && <Journal lang={lang} />}
       </div>
    </div>
  );
};

const NavBtn = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`p-4 rounded-2xl transition-all ${active ? 'bg-teal-500 text-white shadow-lg scale-110' : 'text-slate-400 hover:bg-slate-50'}`}>{React.cloneElement(icon, { size: 28 })}</button>
);

// --- CHATBOT (BILINGUAL + AUTO TASK) ---
const Chat = ({ profile, onAddTask, lang }) => {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  // START CHAT AUTOMATICALLY
  useEffect(() => {
    if (!initialized.current) {
        initialized.current = true;
        const greeting = lang === 'ar' 
            ? `أهلاً يا ${profile.name.split(' ')[0]} يا بطل! 👋 \nأنا أورا. \nتحليلك بيقول (C:${profile.c_score}, O:${profile.o_score}). \nجاهز نكسر الدنيا؟ وراك إيه؟`
            : `Hey ${profile.name.split(' ')[0]}! 👋 \nI'm Aura. \nYour profile: (C:${profile.c_score}, O:${profile.o_score}). \nReady to crush it? What's on your mind?`;
        
        setTimeout(() => {
            setMsgs([{ role: 'ai', text: greeting }]);
        }, 500);
    }
  }, [lang]);

  const send = async () => {
    if (!input.trim()) return;
    const userText = input;
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    // AI Logic
    const prompt = `
      Identity: Aura, AI Mentor.
      User: ${profile.name}, Age: ${profile.age}.
      Current Language Mode: ${lang === 'ar' ? 'Egyptian Arabic Slang (Masri)' : 'English'}.
      Tone: Friendly, encouraging, productive.
      
      CRITICAL INSTRUCTION:
      If the user mentions a task they need to do (e.g., "I need to study math", "عايز اخلص العربي"), 
      you MUST extract it and append this tag to the end of your response:
      [ADD_TASK: <task_name_in_user_language>]
      
      User said: "${userText}"
    `;

    const response = await callGemini(prompt);
    
    // Parse Task
    let finalText = response;
    const taskMatch = response.match(/\[ADD_TASK:\s*(.*?)\]/);
    if (taskMatch) {
        const taskName = taskMatch[1];
        finalText = response.replace(/\[ADD_TASK:.*?\]/, ""); 
        onAddTask(taskName); // Auto-add to planner
        const confMsg = lang === 'ar' ? `\n\n(✅ ضفتلك "{${taskName}}" في المهام)` : `\n\n(✅ Added "{${taskName}}" to tasks)`;
        finalText += confMsg;
    }

    setMsgs(prev => [...prev, { role: 'ai', text: finalText }]);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-6 rounded-3xl text-lg whitespace-pre-line shadow-sm ${m.role === 'user' ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white border border-slate-100 rounded-bl-none text-slate-700'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-slate-400 p-8 text-sm animate-pulse">...</div>}
      </div>
      <div className="p-6 bg-white border-t flex gap-4">
         <button onClick={send} className={`bg-teal-600 text-white p-4 rounded-2xl ${lang==='ar'?'rotate-180':''}`}><Send/></button>
         <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} className="flex-1 bg-slate-100 rounded-2xl p-4 text-start outline-none" placeholder="..." />
      </div>
    </div>
  );
};

const Planner = ({ tasks, setTasks, lang, isDemo, user }) => {
  const handleDelete = async (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    if (!isDemo && user) {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', id)); 
    }
  };

  return (
    <div className="p-10 h-full overflow-y-auto">
      <h2 className="text-3xl font-bold text-slate-800 mb-8 text-start">{lang==='ar'?'المهام الذكية':'Smart Planner'}</h2>
      {tasks.length === 0 && <div className="text-center text-slate-400 mt-20">{lang==='ar'?'مفيش مهام لسه. قول لأورا وراك إيه!':'No tasks yet. Tell Aura what you need to do.'}</div>}
      <div className="grid gap-4">
        {tasks.map(t => (
          <div key={t.id} className="p-6 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
             <button onClick={() => handleDelete(t.id)} className="text-red-400"><Trash2 size={20}/></button>
             <div className="text-right flex-1 px-4">
               <div className="font-bold text-lg text-start">{t.text}</div>
               {t.type === 'ai' && <div className="text-xs text-teal-600 font-bold bg-teal-50 px-2 py-1 rounded-md inline-block mt-1">AI Detected</div>}
             </div>
             <button className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${t.done ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300'}`}><CheckCircle size={16}/></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Journal = ({ lang }) => (
  <div className="p-10 h-full flex flex-col">
    <h2 className="text-3xl font-bold text-slate-800 mb-6 text-start">{lang==='ar'?'المذكرات':'Journal'}</h2>
    <textarea className="flex-1 bg-yellow-50/50 border-2 border-yellow-100 rounded-3xl p-8 text-start text-xl leading-loose resize-none outline-none focus:border-yellow-300 transition-all placeholder-yellow-800/30" placeholder="..." />
  </div>
);

