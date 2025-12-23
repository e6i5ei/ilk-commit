import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WaterLog, UserSettings, AIAdvice } from './types';
import { DEFAULT_WEIGHT, ML_PER_KG, SUGGESTED_QUICK_AMOUNTS } from './constants';
import CircularProgress from './components/CircularProgress';
import { getHydrationAdvice } from './services/geminiService';
import { Droplets, Settings, History, Plus, Bell, Info, X, Check, Award, Flame } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('aqua_settings');
    if (saved) return JSON.parse(saved);
    return {
      name: 'Kullanıcı',
      weight: DEFAULT_WEIGHT,
      dailyGoal: DEFAULT_WEIGHT * ML_PER_KG,
      reminderInterval: 60
    };
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<AIAdvice | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');

  // Refs for timers
  // Fix: Use ReturnType<typeof setInterval> to avoid NodeJS namespace issues in browser environments
  const reminderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived state
  const totalIntake = logs.reduce((acc, log) => acc + log.amount, 0);
  const progressPercentage = (totalIntake / settings.dailyGoal) * 100;

  // Persist data
  useEffect(() => {
    localStorage.setItem('aqua_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const savedLogs = localStorage.getItem('aqua_logs_today');
    const today = new Date().toDateString();
    const lastSavedDate = localStorage.getItem('aqua_logs_date');
    
    if (lastSavedDate === today && savedLogs) {
      setLogs(JSON.parse(savedLogs));
    } else {
      setLogs([]);
      localStorage.setItem('aqua_logs_date', today);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('aqua_logs_today', JSON.stringify(logs));
  }, [logs]);

  // Notifications logic
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
    }
  };

  const sendNotification = useCallback((title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/3105/3105807.png'
      });
    }
  }, []);

  // AI Advice trigger
  const fetchAdvice = useCallback(async () => {
    setIsAiLoading(true);
    const advice = await getHydrationAdvice(settings, totalIntake);
    setAiAdvice(advice);
    setIsAiLoading(false);
  }, [settings, totalIntake]);

  useEffect(() => {
    if (logs.length === 0) {
      fetchAdvice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reminder interval
  useEffect(() => {
    if (reminderTimerRef.current) clearInterval(reminderTimerRef.current);

    reminderTimerRef.current = setInterval(() => {
      sendNotification("💧 Su Zamanı!", `Selam ${settings.name}, biraz su içip tazelenmeye ne dersin?`);
      fetchAdvice();
    }, settings.reminderInterval * 60 * 1000);

    return () => {
      if (reminderTimerRef.current) clearInterval(reminderTimerRef.current);
    };
  }, [settings.reminderInterval, settings.name, sendNotification, fetchAdvice]);

  // Handlers
  const addWater = (amount: number) => {
    const newLog: WaterLog = {
      id: Date.now().toString(),
      amount,
      timestamp: Date.now()
    };
    setLogs(prev => [...prev, newLog]);
    
    // Random AI feedback occasionally
    if (Math.random() > 0.7) {
      fetchAdvice();
    }
  };

  const removeLog = (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const handleSettingsUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const weight = Number(formData.get('weight'));
    const newSettings: UserSettings = {
      name: formData.get('name') as string,
      weight,
      dailyGoal: weight * ML_PER_KG,
      reminderInterval: Number(formData.get('interval'))
    };
    setSettings(newSettings);
    setShowSettings(false);
    fetchAdvice();
  };

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-sky-100 p-2 rounded-xl text-sky-600">
            <Droplets size={24} />
          </div>
          <h1 className="text-xl font-bold text-sky-900 tracking-tight">AquaMind</h1>
        </div>
        <div className="flex gap-2">
          {notificationStatus !== 'granted' && (
            <button 
              onClick={requestNotificationPermission}
              className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
              title="Bildirimleri Aç"
            >
              <Bell size={20} />
            </button>
          )}
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
        {/* Progress Card */}
        <section className="bg-white rounded-3xl p-8 shadow-sm flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-sky-100">
            <div 
              className="h-full bg-sky-500 transition-all duration-1000" 
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          
          <CircularProgress 
            percentage={progressPercentage} 
            current={totalIntake} 
            goal={settings.dailyGoal} 
          />

          <div className="mt-8 grid grid-cols-2 gap-4 w-full">
            <div className="bg-sky-50 rounded-2xl p-4 flex flex-col items-center justify-center">
              <span className="text-sky-600 text-sm font-medium">Kalan</span>
              <span className="text-xl font-bold text-sky-900">
                {Math.max(0, settings.dailyGoal - totalIntake)} ml
              </span>
            </div>
            <div className="bg-orange-50 rounded-2xl p-4 flex flex-col items-center justify-center">
              <span className="text-orange-600 text-sm font-medium">Seri</span>
              <div className="flex items-center gap-1">
                <Flame size={18} className="text-orange-500" />
                <span className="text-xl font-bold text-orange-900">3 Gün</span>
              </div>
            </div>
          </div>
        </section>

        {/* AI Advice Card */}
        <section className="bg-gradient-to-br from-sky-500 to-sky-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Award size={20} className="text-sky-100" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-wider text-sky-100">AI Koçunuz</span>
            </div>
            {isAiLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-white/20 rounded w-3/4"></div>
                <div className="h-4 bg-white/20 rounded w-1/2"></div>
              </div>
            ) : (
              <p className="text-lg font-medium leading-relaxed">
                "{aiAdvice?.message || "Her yudumda taze bir başlangıç yap!"}"
              </p>
            )}
            <button 
              onClick={fetchAdvice}
              className="mt-4 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-2"
            >
              Yenile
            </button>
          </div>
          {/* Decorative background elements */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-8 -top-8 w-24 h-24 bg-sky-400/20 rounded-full blur-2xl" />
        </section>

        {/* Quick Add Buttons */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SUGGESTED_QUICK_AMOUNTS.map(amount => (
            <button
              key={amount}
              onClick={() => addWater(amount)}
              className="bg-white hover:bg-sky-50 p-4 rounded-2xl shadow-sm border border-transparent hover:border-sky-200 transition-all group flex flex-col items-center gap-1 active:scale-95"
            >
              <div className="text-sky-500 group-hover:scale-110 transition-transform">
                <Plus size={24} strokeWidth={3} />
              </div>
              <span className="font-bold text-sky-900">{amount} ml</span>
            </button>
          ))}
        </section>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={() => setShowHistory(true)}
            className="flex-1 bg-white p-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sky-700 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <History size={20} />
            Geçmiş
          </button>
          <button 
             onClick={() => {
              const amount = prompt("Eklenecek miktarı girin (ml):");
              if (amount && !isNaN(Number(amount))) addWater(Number(amount));
             }}
            className="flex-1 bg-sky-100 p-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sky-800 shadow-sm hover:shadow-md transition-all active:scale-95 border border-sky-200"
          >
            <Info size={20} />
            Özel Ekle
          </button>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-sky-900/40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="bg-white rounded-3xl w-full max-w-md p-8 relative z-10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-sky-900">Ayarlar</h2>
              <button onClick={() => setShowSettings(false)} className="text-sky-400 hover:text-sky-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSettingsUpdate} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-sky-900 mb-2">İsminiz</label>
                <input 
                  name="name"
                  type="text" 
                  defaultValue={settings.name}
                  className="w-full bg-sky-50 border-0 rounded-2xl p-4 text-sky-900 focus:ring-2 focus:ring-sky-500 outline-none" 
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-sky-900 mb-2">Kilo (kg)</label>
                  <input 
                    name="weight"
                    type="number" 
                    defaultValue={settings.weight}
                    className="w-full bg-sky-50 border-0 rounded-2xl p-4 text-sky-900 focus:ring-2 focus:ring-sky-500 outline-none" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-sky-900 mb-2">Hatırlatıcı (dk)</label>
                  <input 
                    name="interval"
                    type="number" 
                    defaultValue={settings.reminderInterval}
                    className="w-full bg-sky-50 border-0 rounded-2xl p-4 text-sky-900 focus:ring-2 focus:ring-sky-500 outline-none" 
                    required
                  />
                </div>
              </div>
              
              <div className="bg-sky-50 rounded-2xl p-4">
                <p className="text-xs text-sky-600 font-medium leading-relaxed">
                  * Günlük hedefiniz kilonuza göre otomatik hesaplanır (Kilo x 35ml).
                </p>
              </div>

              <button 
                type="submit"
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold p-4 rounded-2xl shadow-lg shadow-sky-200 transition-all flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-sky-900/40 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md h-[80vh] sm:h-auto sm:max-h-[80vh] flex flex-col p-8 relative z-10 shadow-2xl">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-2xl font-bold text-sky-900">Bugünkü Kayıtlar</h2>
              <button onClick={() => setShowHistory(false)} className="text-sky-400 hover:text-sky-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-sky-400 py-12">
                  <Droplets size={48} className="mb-4 opacity-20" />
                  <p className="font-medium text-center">Henüz bir kayıt yok.<br/>Su içmeye başla!</p>
                </div>
              ) : (
                logs.slice().reverse().map(log => (
                  <div key={log.id} className="bg-sky-50 p-4 rounded-2xl flex justify-between items-center group">
                    <div>
                      <div className="font-bold text-sky-900">{log.amount} ml</div>
                      <div className="text-xs text-sky-500">
                        {new Date(log.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button 
                      onClick={() => removeLog(log.id)}
                      className="text-red-300 hover:text-red-500 p-2 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-sky-100 flex justify-between items-center shrink-0">
              <span className="text-sky-600 font-medium">Toplam Tüketim:</span>
              <span className="text-xl font-bold text-sky-900">{totalIntake} ml</span>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Call-to-Action for Mobile */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-sky-100 p-4 grid grid-cols-4 gap-2 md:hidden">
        <button onClick={() => addWater(100)} className="flex flex-col items-center p-2 rounded-xl active:bg-sky-50">
          <span className="text-xs font-bold text-sky-600">100ml</span>
        </button>
        <button onClick={() => addWater(200)} className="flex flex-col items-center p-2 rounded-xl active:bg-sky-50">
          <span className="text-xs font-bold text-sky-600">200ml</span>
        </button>
        <button onClick={() => addWater(300)} className="flex flex-col items-center p-2 rounded-xl active:bg-sky-50">
          <span className="text-xs font-bold text-sky-600">300ml</span>
        </button>
        <button onClick={() => addWater(500)} className="flex flex-col items-center p-2 rounded-xl active:bg-sky-50">
          <span className="text-xs font-bold text-sky-600">500ml</span>
        </button>
      </div>
    </div>
  );
};

export default App;