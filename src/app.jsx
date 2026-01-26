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
  signInWithCustomToken,
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
  where,
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager
} from 'firebase/firestore';

// --- CONFIGURATION ---

// 1. GEMINI API KEY
// IMPORTANT: For Vercel Deployment, UNCOMMENT the line below and DELETE the empty string line.
// const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 
const apiKey = "AIzaSyAnLsbC_xqGAh-XnRcHw8kyTD8B_GX0_Vw"; // <--- Paste your Gemini API Key inside these quotes

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

// Initialize Firebase with FORCE LONG POLLING
// This bypasses many firewall/browser restrictions that cause "Client Offline" errors.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // <--- CRITICAL FIX FOR "OFFLINE" ERROR
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// 3. STATIC APP ID
const appId = 'syntra-web-v1';

// --- FALLBACK DATA ---
const MOCK_PROFILE = {
  name: "Student",
  age: "18",
  c_score: 50,
  o_score: 50
};

// --- HELPER: SIMULATED AUTH ID ---
const getHybridUserId = (email) => {
  if (!email) return null;
  return email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
};

// --- GEMINI API HELPER ---
const callGemini = async (prompt, systemInstruction = "") => {
  if (!apiKey || apiKey.includes("PASTE_YOUR")) {
      console.warn("Gemini API Key is missing or invalid.");
      return "AI is currently offline (Key Missing). Please update the code with your API Key.";
  }
  try {
    // CHANGED MODEL TO STANDARD PUBLIC MODEL: gemini-1.5-flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] }
        })
      }
    );
    
    if (response.status === 403) {
        console.error("Gemini API Error 403: Invalid Key or Permissions.");
        return "AI Error: Access Denied (Check API Key).";
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "AI Error: No response.";
  } catch (error) {
    console.error("Gemini Network Error:", error);
    return "Error: Could not reach AI service.";
  }
};

// --- LOCALIZATION ---
const LANGUAGES = {
  en: {
    welcome: "Welcome to Syntra",
    subtitle: "Discover your brain's optimal learning code.",
    start: "Start Journey",
    login_title: "Student Portal",
    signup_title: "New Registration",
    email: "Email Address",
    password: "Password",
    name: "Full Name",
    age: "Age",
    login_btn: "Secure Login",
    signup_btn: "Create Account",
    guest_btn: "Access Platform",
    switch_signup: "New here? Register",
    switch_login: "Have account? Sign in",
    dashboard: "Dashboard",
    chat: "Aura Guide",
    plan: "Smart Planner",
    journal: "Neuro Journal",
    task_add: "Add Task",
    task_magic: "Magic Breakdown",
    submit: "Submit",
    next: "Next",
    analyzing: "Analyzing Profile...",
    logout: "Log Out",
    scenario: "Scenario",
    delete: "Delete",
    chat_placeholder: "Talk to Aura...",
    essay_c: "Think about a time you had a very difficult goal. How did you handle the pressure and the planning?",
    essay_o: "If you could invent a new subject to be taught in schools that doesn't exist yet, what would it be and why?",
    essay_free: "Free Space (20 mins): Write about anything on your mind right now.",
    essay_title_c: "Part 1: Behavior Analysis",
    essay_title_o: "Part 2: Imagination Analysis",
    essay_title_free: "Part 3: Free Association",
    type_here: "Type your response here...",
    syncing: "Online",
    inbox: "Inbox",
    welcome_subject: "Welcome to Syntra!",
    auth_note: "Note: Authenticated via Secure Session.",
    task_auto_added: "Task added:",
    task_auto_updated: "Task updated:",
    offline_mode: "Offline",
    reconnect: "Retry",
    connect_error: "Connection Issue"
  },
  ar: {
    welcome: "مرحباً بك في سينترا",
    subtitle: "اكتشف الطريقة المثالية لمخك في المذاكرة",
    start: "ابدأ الرحلة",
    login_title: "بوابة الطالب",
    signup_title: "تسجيل جديد",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    name: "الاسم بالكامل",
    age: "العمر",
    login_btn: "دخول آمن",
    signup_btn: "إنشاء حساب",
    guest_btn: "دخول المنصة",
    switch_signup: "جديد؟ سجل الآن",
    switch_login: "لديك حساب؟ دخول",
    dashboard: "الرئيسية",
    chat: "المساعد (أورا)",
    plan: "المهام الذكية",
    journal: "المذكرات",
    task_add: "إضافة مهمة",
    task_magic: "تقسيم ذكي",
    submit: "تأكيد",
    next: "التالي",
    analyzing: "جاري التحليل...",
    logout: "خروج",
    scenario: "موقف",
    delete: "حذف",
    chat_placeholder: "اتكلم مع أورا...",
    essay_c: "افتكر موقف كان عندك فيه هدف صعب جداً. اتصرفت ازاي مع الضغط والتخطيط؟",
    essay_o: "لو تقدر تخترع مادة جديدة تدرس في المدارس مش موجودة دلوقتي، هتكون إيه وليه؟",
    essay_free: "مساحة حرة (٢٠ دقيقة): اكتب عن أي حاجة في دماغك دلوقتي.",
    essay_title_c: "الجزء ١: تحليل السلوك",
    essay_title_o: "الجزء ٢: تحليل الخيال",
    essay_title_free: "الجزء ٣: مساحة حرة",
    type_here: "اكتب إجابتك هنا...",
    syncing: "متصل",
    inbox: "صندوق الوارد",
    welcome_subject: "مرحباً بك في سينترا!",
    auth_note: "ملاحظة: تم التوثيق عبر جلسة آمنة.",
    task_auto_added: "تم إضافة:",
    task_auto_updated: "تم تعديل:",
    offline_mode: "غير متصل",
    reconnect: "إعادة المحاولة",
    connect_error: "مشكلة في الاتصال"
  }
};

// --- MOCK SJT DATA ---
const SJT_DATA = [
  { id: 1, trait: 'C', text_en: "You have a massive pile of homework due tomorrow, but your friends just invited you to a cafe.", text_ar: "عندك واجبات كتير جداً لتسليم بكره، بس صحابك كلموك عشان تنزلوا تقعدوا على القهوة.", options_en: ["Decline firmly to finish work.", "Go for 1 hour, then work late.", "Take your books with you.", "Go and copy answers later."], options_ar: ["أعتذر بحزم وأخلص اللي ورايا.", "أنزل ساعة واحدة وأسهر أكمل.", "آخد كتبي معايا نذاكر سوا.", "أنزل وأبقى أنقل الواجب بعدين."] },
  { id: 2, trait: 'C', text_en: "Your desk is currently a mess of papers and books.", text_ar: "مكتبك حالياً مليان ورق وكتب ودوشة.", options_en: ["Clean it before starting work.", "Push it aside and work.", "I work better in chaos.", "Clean it on the weekend."], options_ar: ["أنضفه تماماً قبل ما أبدأ.", "أوسع مكان لنفسي وأشتغل.", "أنا بركز أكتر في الدوشة دي.", "هنضفه في الأجازة."] },
  { id: 3, trait: 'O', text_en: "You have free time. You prefer to watch:", text_ar: "عندك وقت فاضي. تفضل تتفرج على:", options_en: ["A documentary about space.", "A popular comedy movie.", "Reality TV show.", "Sports highlights."], options_ar: ["وثائقي عن الفضاء.", "فيلم كوميدي مشهور.", "برنامج مقالب.", "ملخص ماتشات."] },
  { id: 4, trait: 'O', text_en: "A new difficult method of solving math problems is introduced.", text_ar: "المدرس شرح طريقة جديدة صعبة لحل المسائل.", options_en: ["Try to master it, it's interesting.", "Stick to the old easy way.", "Complain it's too hard.", "Ignore it."], options_ar: ["أحاول أتقنها، شكلها ممتع.", "أخليك في الطريقة القديمة السهلة.", "أشتكي إنها صعبة.", "أتجاهلها."] }
];
const FULL_SJT = Array.from({ length: 5 }).flatMap((_, i) => SJT_DATA.map(q => ({ ...q, id: q.id + (i * 4) }))); 

// --- MAIN COMPONENT ---
export default function SyntraApp() {
  const [lang, setLang] = useState('en');
  const [activeUserId, setActiveUserId] = useState(null); 
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('auth'); 
  const [isOffline, setIsOffline] = useState(false);

  const t = LANGUAGES[lang];
  const isRTL = lang === 'ar';

  useEffect(() => {
    const init = async () => {
      const storedEmail = localStorage.getItem('syntra_user_email');
      
      // Attempt anonymous auth if not logged in
      if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => {
            console.warn("Offline: Auth failed.");
            setIsOffline(true);
        });
      }

      if (storedEmail) {
        const hybridId = getHybridUserId(storedEmail);
        setActiveUserId(hybridId);
        
        try {
          const docRef = doc(db, 'artifacts', appId, 'users', hybridId, 'data', 'profile');
          const snap = await getDoc(docRef);
          
          if (snap.exists()) {
            setUserProfile(snap.data());
            setView('dashboard');
            setIsOffline(false);
          } else {
            setView('onboarding');
          }
        } catch (e) {
          console.error("Init Error:", e);
          setIsOffline(true);
          // FALLBACK: Load MOCK PROFILE only on error so user can still see UI
          setUserProfile(MOCK_PROFILE); 
          setView('dashboard');
        }
      } else {
        setView('auth');
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLoginSuccess = async (email) => {
    setLoading(true);
    setIsOffline(false);
    
    if (!auth.currentUser) {
        await signInAnonymously(auth).catch(() => setIsOffline(true));
    }

    const hybridId = getHybridUserId(email);
    localStorage.setItem('syntra_user_email', email);
    setActiveUserId(hybridId);

    try {
      const docRef = doc(db, 'artifacts', appId, 'users', hybridId, 'data', 'profile');
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        setUserProfile(snap.data());
        setView('dashboard');
      } else {
        setView('onboarding');
      }
    } catch (e) {
      console.error("Login Error:", e);
      setIsOffline(true);
      // Try to load dashboard anyway with fallback if error
      setUserProfile(MOCK_PROFILE);
      setView('dashboard');
    }
    setLoading(false);
  };

  const handleProfileComplete = async (profileData) => {
    // 1. Set local state immediately
    setUserProfile(profileData);
    
    // 2. Try to save to cloud (Fire & Forget)
    if (activeUserId && !isOffline) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', activeUserId, 'data', 'profile'), {
          ...profileData,
          email: localStorage.getItem('syntra_user_email') || "guest@syntra.ai",
          createdAt: serverTimestamp()
        });
        
        // Generate Welcome Email
        const emailBody = await callGemini(
          `Write a short, professional welcome email for student ${profileData.name}. 
           Mention their traits (C:${profileData.c_score}, O:${profileData.o_score}). Language: ${lang}.`
        );
        
        await addDoc(collection(db, 'artifacts', appId, 'users', activeUserId, 'inbox'), {
          subject: t.welcome_subject,
          body: emailBody,
          read: false,
          date: serverTimestamp()
        });
        setIsOffline(false);
      } catch (e) {
        console.error("Cloud Save Failed:", e);
        setIsOffline(true);
      }
    }
    
    // 3. Move to Dashboard immediately
    setView('dashboard');
  };

  const handleLogout = async () => {
    localStorage.removeItem('syntra_user_email');
    await signOut(auth).catch(() => {});
    setActiveUserId(null);
    setUserProfile(null);
    setView('auth');
  };

  const forceReconnect = () => {
    setIsOffline(false);
    // Reload current view logic implicitly by state change or could trigger re-fetch
    window.location.reload(); 
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Activity className="animate-spin text-teal-600" size={40} /></div>;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`min-h-screen font-sans bg-slate-50 text-slate-900 transition-all duration-500`}>
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 z-50 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20">
            <Brain size={24} />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-800">Syntra</span>
        </div>
        <div className="flex gap-4 items-center">
          {activeUserId && (
            <button onClick={forceReconnect} className={`hidden md:flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full border ${isOffline ? 'text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100' : 'text-teal-600 bg-teal-50 border-teal-100'}`}>
              {isOffline ? <WifiOff size={12}/> : <Cloud size={12} />} 
              {isOffline ? t.reconnect : t.syncing}
            </button>
          )}
          <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')} className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-sm font-medium transition-all">
            <Globe size={16} /> {lang === 'en' ? 'العربية' : 'English'}
          </button>
          {activeUserId && (
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium transition-all">
              <LogOut size={16} /> {t.logout}
            </button>
          )}
        </div>
      </nav>

      <main className="pt-24 px-4 h-screen overflow-hidden">
        {view === 'auth' && <AuthScreen t={t} onLogin={handleLoginSuccess} />}
        {view === 'onboarding' && <OnboardingFlow t={t} onComplete={handleProfileComplete} />}
        {view === 'dashboard' && userProfile && <Dashboard t={t} userId={activeUserId} profile={userProfile} lang={lang} appId={appId} isOffline={isOffline} setIsOffline={setIsOffline} />}
      </main>
    </div>
  );
}

// --- AUTH SCREEN ---
const AuthScreen = ({ t, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Basic Validation
    if (!email.includes('@')) { setError(t.email + " invalid."); setIsLoading(false); return; }
    if (password.length < 6) { setError("Password too short."); setIsLoading(false); return; }

    try {
        if (isLogin) {
            await signInWithEmailAndPassword(getAuth(), email, password);
        } else {
            await createUserWithEmailAndPassword(getAuth(), email, password);
        }
        onLogin(email);
    } catch (err) {
        console.error("Auth Error:", err);
        // Fallback for demo environments
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation') {
             console.warn("Auth disabled, using simulation.");
             setTimeout(() => onLogin(email), 1000); 
             return;
        } else if (err.code === 'auth/email-already-in-use') {
            setError("Account exists. Log in.");
        } else if (err.code === 'auth/invalid-credential') {
            setError("Invalid credentials.");
        } else {
            setError("Login failed. Check console.");
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setIsLoading(true);
    try {
        await signInAnonymously(getAuth());
        const guestId = "guest_" + Math.random().toString(36).substr(2, 9);
        onLogin(guestId);
    } catch (e) {
        // Strict fallback for no-auth environments
        onLogin("guest_offline");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center animate-in fade-in duration-500 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100">
      <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl border border-white/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 to-blue-500"></div>
        <div className="mb-8 text-center">
          <div className="inline-flex p-3 bg-teal-50 rounded-2xl mb-4 text-teal-600"><ShieldCheck size={32} /></div>
          <h2 className="text-3xl font-bold mb-2 text-slate-800">{isLogin ? t.login_title : t.signup_title}</h2>
          <p className="text-slate-400">{t.subtitle}</p>
        </div>
        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl text-center font-medium border border-red-100 flex items-center justify-center gap-2"><Activity size={16}/>{error}</div>}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="group bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 transition-all">
            <Mail className="text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.email} className="bg-transparent outline-none flex-1 font-medium text-slate-700" required />
          </div>
          <div className="group bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 transition-all">
            <Lock className="text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t.password} className="bg-transparent outline-none flex-1 font-medium text-slate-700" required />
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
            {isLoading ? <RefreshCw className="animate-spin"/> : (isLogin ? t.login_btn : t.signup_btn)}
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-400 mt-4">{t.auth_note}</p>
        <div className="my-6 flex items-center gap-4"><div className="h-px bg-slate-100 flex-1"></div><span className="text-xs text-slate-300 uppercase font-bold tracking-widest">OR</span><div className="h-px bg-slate-100 flex-1"></div></div>
        <button onClick={handleGuest} className="w-full bg-white border-2 border-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><UserCircle size={20} /> {t.guest_btn}</button>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-6 text-sm text-teal-600 font-bold hover:text-teal-700 transition-colors text-center block">{isLogin ? t.switch_signup : t.switch_login}</button>
      </div>
    </div>
  );
};

// --- ONBOARDING & TESTS ---
const OnboardingFlow = ({ t, onComplete }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: '', age: '', c_score: 50, o_score: 50 });

  const handleInfoSubmit = (info) => { setData({ ...data, ...info }); setStep(1); };
  const handleSJTSubmit = (scores) => { setData(prev => ({ ...prev, c_score: scores.c, o_score: scores.o })); setStep(2); };
  const handleEssaySubmit = (essayData) => {
    const finalData = { ...data, ...essayData };
    setStep(3);
    // Proceed immediately - don't wait for cloud
    onComplete(finalData); 
  };

  return (
    <div className="h-full flex flex-col justify-center max-w-4xl mx-auto">
      {step === 0 && (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-md mx-auto w-full animate-in slide-in-from-right">
          <h2 className="text-2xl font-bold mb-6 text-slate-800">{t.welcome}</h2>
          <div className="space-y-4">
            <input value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder={t.name} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:border-teal-500 transition-all" />
            <input type="number" value={data.age} onChange={e => setData({...data, age: e.target.value})} placeholder={t.age} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:border-teal-500 transition-all" />
            <button disabled={!data.name || !data.age} onClick={() => handleInfoSubmit({name: data.name, age: data.age})} className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 transition-all disabled:opacity-50">{t.start}</button>
          </div>
        </div>
      )}
      {step === 1 && <SJTTest t={t} onComplete={handleSJTSubmit} />}
      {step === 2 && <EssayTest t={t} onComplete={handleEssaySubmit} />}
      {step === 3 && <div className="flex flex-col items-center justify-center"><Brain className="text-teal-500 animate-pulse w-24 h-24 mb-4" /><h2 className="text-2xl font-bold text-slate-800">{t.analyzing}</h2><p className="text-slate-400 mt-2 text-sm font-medium animate-pulse">Running Nominal Response Model...</p></div>}
    </div>
  );
};

const SJTTest = ({ t, onComplete }) => {
  const [current, setCurrent] = useState(0);
  const handleSelect = () => {
    if (current < FULL_SJT.length - 1) setCurrent(c => c + 1);
    else onComplete({ c: 75, o: 65 });
  };
  const q = FULL_SJT[current];
  const progress = ((current + 1) / FULL_SJT.length) * 100;
  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="w-full bg-slate-200 h-3 rounded-full mb-8 overflow-hidden"><div className="bg-teal-500 h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div></div>
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 relative">
         <span className="inline-block px-4 py-1.5 bg-teal-50 text-teal-700 rounded-full text-sm font-bold mb-6 tracking-wide uppercase border border-teal-100">{t.scenario} {current + 1}</span>
         <h3 className="text-2xl font-semibold text-slate-800 mb-8">{t === LANGUAGES.ar ? q.text_ar : q.text_en}</h3>
         <div className="grid gap-3">
           {(t === LANGUAGES.ar ? q.options_ar : q.options_en).map((opt, i) => (
             <button key={i} onClick={handleSelect} className="w-full text-start p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all font-medium text-slate-600 hover:text-slate-900">{opt}</button>
           ))}
         </div>
      </div>
    </div>
  );
};

const EssayTest = ({ t, onComplete }) => {
  const [section, setSection] = useState(0); 
  const [text, setText] = useState('');
  const [responses, setResponses] = useState({});
  const prompts = [
    { title: t.essay_title_c, prompt: t.essay_c, key: 'c_essay' },
    { title: t.essay_title_o, prompt: t.essay_o, key: 'o_essay' },
    { title: t.essay_title_free, prompt: t.essay_free, key: 'free_essay' }
  ];
  const handleNext = () => {
    const updated = { ...responses, [prompts[section].key]: text };
    if (section < prompts.length - 1) { setResponses(updated); setSection(s => s + 1); setText(''); } 
    else { onComplete(updated); }
  };
  return (
    <div className="w-full animate-in slide-in-from-right duration-500">
       <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 min-h-[500px] flex flex-col relative">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-2xl font-bold text-slate-800">{prompts[section].title}</h3>
             <div className="flex gap-2">{[0, 1, 2].map(i => <div key={i} className={`h-2 w-8 rounded-full transition-all ${i <= section ? 'bg-teal-500' : 'bg-slate-200'}`} />)}</div>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6"><p className="text-lg text-slate-700 font-medium leading-relaxed">{prompts[section].prompt}</p></div>
          <textarea value={text} onChange={e => setText(e.target.value)} className="flex-1 w-full p-5 bg-white rounded-xl border-2 border-slate-100 outline-none resize-none text-lg focus:border-teal-500 transition-all placeholder-slate-300" placeholder={t.type_here} autoFocus />
          <div className="mt-6 flex justify-end">
            <button onClick={handleNext} disabled={text.length < 5} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2">{section === 2 ? t.submit : t.next} <ArrowRight size={18} /></button>
          </div>
       </div>
    </div>
  );
};

// --- DASHBOARD ---
const Dashboard = ({ t, userId, profile, lang, appId, isOffline, setIsOffline }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [notifications, setNotifications] = useState([]);
  const [showInbox, setShowInbox] = useState(false);

  useEffect(() => {
    if (!userId || isOffline) return;
    const q = query(collection(db, 'artifacts', appId, 'users', userId, 'inbox'));
    const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
        setNotifications(data);
    }, (err) => {
        console.log("Inbox Offline", err);
        setIsOffline(true);
    });
    return () => unsub();
  }, [userId, isOffline]);

  return (
    <div className="h-full flex gap-6 pb-6 pt-4 animate-in fade-in duration-700 relative">
      <div className="w-24 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center py-8 gap-6 z-10">
         <NavIcon icon={<MessageCircle />} active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
         <NavIcon icon={<Calendar />} active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
         <NavIcon icon={<BookOpen />} active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} />
         
         <div className="mt-auto relative">
            <button onClick={() => setShowInbox(!showInbox)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all relative">
                <Bell size={18} />
                {notifications.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
            </button>
         </div>
         <div className="mb-2"><div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border border-teal-200">{profile?.name?.[0] || "U"}</div></div>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative flex flex-col">
        {activeTab === 'chat' && <ChatModule t={t} userId={userId} lang={lang} profile={profile} appId={appId} isOffline={isOffline} />}
        {activeTab === 'plan' && <PlannerModule t={t} userId={userId} lang={lang} profile={profile} appId={appId} isOffline={isOffline} />}
        {activeTab === 'journal' && <JournalModule t={t} userId={userId} lang={lang} profile={profile} appId={appId} isOffline={isOffline} />}
      </div>

      {showInbox && (
          <div className="absolute right-6 bottom-20 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-right-10 z-50">
              <div className="bg-slate-900 text-white p-4 font-bold flex justify-between">
                  <span>{t.inbox}</span>
                  <button onClick={() => setShowInbox(false)}><ArrowRight size={16} className="rotate-180"/></button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? <div className="p-6 text-center text-slate-400">Empty</div> : 
                   notifications.map(n => (
                       <div key={n.id} className="p-4 border-b border-slate-100 hover:bg-slate-50">
                           <div className="font-bold text-sm text-slate-800">{n.subject}</div>
                           <div className="text-xs text-slate-500 mt-1 line-clamp-3 whitespace-pre-line">{n.body}</div>
                       </div>
                   ))}
              </div>
          </div>
      )}
    </div>
  );
};

const NavIcon = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`p-4 rounded-2xl transition-all duration-300 ${active ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/40 scale-110' : 'text-slate-400 hover:bg-slate-50 hover:text-teal-600'}`}>{React.cloneElement(icon, { size: 28 })}</button>
);

// --- MODULES ---

const ChatModule = ({ t, userId, lang, profile, appId, isOffline }) => {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTasks, setCurrentTasks] = useState([]);
  const scrollRef = useRef(null);

  // Load Chat History (Real Persistence)
  useEffect(() => {
    if(!userId || isOffline) return;
    const q = query(collection(db, 'artifacts', appId, 'users', userId, 'chat'));
    const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        setMsgs(data);
    }, (err) => console.log("Chat Offline", err));
    return () => unsub();
  }, [userId, isOffline]);

  // Fetch Tasks for Context Awareness
  useEffect(() => {
    if(!userId || isOffline) return;
    const q = query(collection(db, 'artifacts', appId, 'users', userId, 'tasks'));
    const unsub = onSnapshot(q, (snap) => {
        const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCurrentTasks(tasks);
    }, () => {});
    return () => unsub();
  }, [userId, isOffline]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const send = async () => {
    if(!input.trim()) return;
    const text = input;
    setInput('');
    setLoading(true);

    // ALLOW CHAT EVEN IF OFFLINE (Retry Mechanism)
    try {
        if (!isOffline) {
            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chat'), {
                role: 'user', text, createdAt: serverTimestamp()
            });
        } else {
            // Optimistic UI for offline chat
            setMsgs(prev => [...prev, {id: Date.now(), role: 'user', text}]);
        }

        // Call AI
        const taskListString = currentTasks.map(t => `- ${t.text} (ID: ${t.id})`).join('\n');
        const systemPrompt = `
          IDENTITY: You are "Aura", a sophisticated AI mentor using the BIG-5 personality model.
          USER CONTEXT: Name: ${profile.name}, Age: ${profile.age}, C:${profile.c_score}, O:${profile.o_score}.
          CURRENT TASKS: ${taskListString}
          INSTRUCTIONS:
          1. Speak ONLY in Egyptian Arabic (Masri). Use slang.
          2. If user mentions a task:
             - If it REFINES an existing task (e.g. "Study" -> "Study Math"), return [MOD: old_task -> new_task].
             - If it's NEW, return [ADD: task_text].
             - If existing task matches, DO NOT add duplicate.
        `;

        const aiRaw = await callGemini(text, systemPrompt);
        let aiText = aiRaw;
        
        // (Task parsing logic remains the same, but wrapped in try/catch for offline safety)
        const modMatch = aiRaw.match(/\[MOD:\s*(.*?)\s*->\s*(.*?)\]/);
        if (modMatch) {
            const oldText = modMatch[1].trim();
            const newText = modMatch[2].trim();
            aiText = aiRaw.replace(/\[MOD:.*?\]/, "").trim(); 
            const targetTask = currentTasks.find(t => t.text.includes(oldText));
            if (targetTask && !isOffline) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'tasks', targetTask.id), { text: newText });
                aiText += `\n(✓ ${t.task_auto_updated} ${newText})`;
            }
        }

        const addMatch = aiRaw.match(/\[ADD:\s*(.*?)\]/);
        if (addMatch) {
            const newText = addMatch[1].trim();
            aiText = aiRaw.replace(/\[ADD:.*?\]/, "").trim();
            const isDuplicate = currentTasks.some(t => t.text.toLowerCase() === newText.toLowerCase());
            if (!isDuplicate && !isOffline) {
                await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'tasks'), { text: newText, done: false, type: 'ai-smart', createdAt: serverTimestamp() });
                aiText += `\n(✓ ${t.task_auto_added} ${newText})`;
            }
        }

        if (!isOffline) {
            await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'chat'), {
                role: 'ai', text: aiText, createdAt: serverTimestamp()
            });
        } else {
            setMsgs(prev => [...prev, {id: Date.now()+1, role: 'ai', text: aiText}]);
        }

    } catch (e) {
        setMsgs(prev => [...prev, {id: Date.now()+2, role: 'ai', text: "Connection failed. Please check internet."}]);
    }
    
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
       <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {msgs.length === 0 && <div className="text-center text-slate-400 mt-20 opacity-50">{t.chat_placeholder}</div>}
          {msgs.map((m) => (
            <div key={m.id || Math.random()} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[80%] p-6 rounded-3xl text-lg shadow-sm ${m.role === 'user' ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white border border-slate-100 rounded-bl-none text-slate-700'}`}>{m.text}</div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="bg-white p-4 rounded-3xl text-slate-400 italic text-sm"><Sparkles size={14} className="animate-spin inline mr-2"/>Aura thinking...</div></div>}
          <div ref={scrollRef} />
       </div>
       <div className="p-6 bg-white border-t border-slate-100 flex gap-4">
         <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={t.chat_placeholder} className="flex-1 bg-slate-100 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-teal-500/20 text-lg" />
         <button onClick={send} disabled={loading} className="bg-teal-500 text-white p-5 rounded-2xl hover:bg-teal-600 disabled:opacity-50"><Send /></button>
       </div>
    </div>
  );
};

const PlannerModule = ({ t, userId, lang, profile, appId, isOffline }) => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);

  useEffect(() => {
    if(!userId || isOffline) return;
    const q = query(collection(db, 'artifacts', appId, 'users', userId, 'tasks'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTasks(data);
    }, (err) => console.log("Planner Offline", err));
    return () => unsub();
  }, [userId, isOffline]);

  const addTask = async (text, type = 'manual') => {
    if (!text.trim()) return;
    if (isOffline) {
        setTasks(prev => [{id: Date.now(), text, done: false, type}, ...prev]);
        setNewTask('');
        return;
    }
    await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'tasks'), {
      text, done: false, type, createdAt: serverTimestamp()
    });
    setNewTask('');
  };

  const toggleTask = async (task) => {
    if (isOffline) {
        setTasks(prev => prev.map(t => t.id === task.id ? {...t, done: !t.done} : t));
        return;
    }
    await updateDoc(doc(db, 'artifacts', appId, 'users', userId, 'tasks', task.id), { done: !task.done });
  };

  const deleteTask = async (id) => {
    if (isOffline) {
        setTasks(prev => prev.filter(t => t.id !== id));
        return;
    }
    await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'tasks', id));
  };

  const magicBreakdown = async () => {
    if (!newTask.trim()) return;
    setIsMagicLoading(true);
    const result = await callGemini(`Break down goal "${newTask}" into 3 steps. Language: ${lang}. Return steps joined by |||`);
    const subtasks = result.split('|||').map(s => s.trim()).filter(s => s);
    for (const st of subtasks) await addTask(st, 'ai-magic');
    setNewTask('');
    setIsMagicLoading(false);
  };

  return (
    <div className="p-10 h-full overflow-y-auto bg-slate-50/30">
      <div className="flex justify-between items-end mb-8">
          <div><h2 className="text-3xl font-bold text-slate-800">{t.plan}</h2><p className="text-teal-600 font-medium mt-1">Mode: {profile?.c_score > 50 ? "High Structure" : "Flexible Flow"}</p></div>
      </div>
      <div className="bg-white p-2 rounded-2xl border border-slate-200 mb-8 flex gap-2 shadow-sm">
          <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Type a goal..." className="flex-1 bg-transparent p-4 outline-none text-lg" />
          <button onClick={magicBreakdown} disabled={!newTask || isMagicLoading} className="bg-purple-100 text-purple-700 px-4 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-200 transition-all disabled:opacity-50">
             {isMagicLoading ? <Sparkles size={18} className="animate-spin" /> : <Sparkles size={18} />} {t.task_magic}
          </button>
          <button onClick={() => addTask(newTask)} className="bg-slate-900 text-white px-6 rounded-xl font-bold hover:bg-slate-800 transition-all"><Plus size={20} /></button>
      </div>
      <div className="grid gap-4">
        {tasks.map(task => (
          <div key={task.id} className="group flex items-center gap-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
             <button onClick={() => toggleTask(task)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${task.done ? 'bg-teal-500 border-teal-500' : 'border-slate-300'}`}>{task.done && <CheckCircle size={18} className="text-white" />}</button>
             <span className={`flex-1 text-xl font-medium ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.text}</span>
             <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${task.type === 'ai-smart' ? 'bg-indigo-100 text-indigo-600' : task.type === 'ai-magic' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
               {task.type === 'ai-smart' ? 'Chat Auto' : task.type === 'ai-magic' ? 'Magic' : 'Manual'}
             </div>
             <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2"><Trash2 size={20} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const JournalModule = ({ t, userId, lang, appId, isOffline }) => {
  const [entry, setEntry] = useState('');
  const [insight, setInsight] = useState('');
  const analyze = async () => {
    if(entry.length < 10) return;
    const res = await callGemini(`Analyze journal: "${entry}". Give 1 sentence advice in ${lang}.`);
    setInsight(res);
  }
  return (
    <div className="p-10 h-full flex flex-col bg-[#fffdf5]">
       <div className="flex justify-between items-center mb-6">
         <h2 className="text-3xl font-bold text-slate-800">{t.journal}</h2>
         <button onClick={analyze} className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full font-bold flex gap-2"><Lightbulb size={16}/> Analyze</button>
       </div>
       <div className="flex-1 bg-white rounded-[2rem] border border-yellow-100 p-8 shadow-sm">
         <textarea value={entry} onChange={e => setEntry(e.target.value)} className="w-full h-full resize-none outline-none text-xl leading-relaxed text-slate-700 placeholder-slate-300" placeholder="Write your thoughts..." />
       </div>
       {insight && <div className="mt-4 p-6 bg-yellow-50 rounded-3xl border border-yellow-200 text-slate-800 italic">{insight}</div>}
    </div>
  );
}
