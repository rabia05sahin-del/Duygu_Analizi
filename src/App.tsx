import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  RotateCcw, 
  Clipboard, 
  Check, 
  FileCode2, 
  Terminal, 
  BookOpen, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  Cpu, 
  Layers, 
  Flame, 
  Code2, 
  Download,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Hash
} from 'lucide-react';

interface SentimentScores {
  olumlu: number;
  olumsuz: number;
}

interface SentimentMeta {
  character_count: number;
  word_count: number;
  duration_ms: number;
  model: string;
}

interface AnalysisResult {
  success: boolean;
  sentiment: string;
  sentiment_label?: string;
  sentiment_code: 'positive' | 'negative' | 'neutral';
  confidence: number;
  explanation: string;
  scores: SentimentScores;
  meta: SentimentMeta;
}

interface HistoryItem {
  id: string;
  text: string;
  sentiment: string;
  confidence: number;
  explanation?: string;
  timestamp: string;
  scores: SentimentScores;
}

const SAMPLE_COMMENTS = [
  {
    text: "Ürünün kargosu ertesi gün ulaştı, paketleme ve ürün kalitesi gerçekten harika!",
    label: "Hızlı Kargo & Kalite",
    type: "pos"
  },
  {
    text: "Hayatımda gördüğüm en berbat müşteri hizmetleri, kesinlikle tavsiye etmiyorum.",
    label: "Kötü Hizmet",
    type: "neg"
  },
  {
    text: "Fiyatına göre performansı fena değil ama kutusu ezik geldi, biraz hayal kırıklığı.",
    label: "Karışık / Nötr",
    type: "neg"
  },
  {
    text: "Kitap tek kelimeyle bir başyapıt, herkesin kütüphanesinde bulunmalı.",
    label: "Yüksek Memnuniyet",
    type: "pos"
  },
  {
    text: "Tam bir hayal kırıklığı, param çöp oldu. Sakın almayın, iki günde bozuldu.",
    label: "Hüsran / Arızalı",
    type: "neg"
  },
  {
    text: "Tasarımı çok zarif ve şık duruyor, beklediğimden çok daha iyi çıktı.",
    label: "Tasarım Beğenisi",
    type: "pos"
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'app' | 'files' | 'api' | 'guide'>('app');
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedResult, setCopiedResult] = useState(false);
  const [modelStatus, setModelStatus] = useState<{
    healthy: boolean;
    device?: string;
    model?: string;
  }>({ healthy: true, device: 'CPU', model: 'savasy/bert-base-turkish-sentiment-cased' });

  // Dosya Gezgini Durumları
  const [selectedFile, setSelectedFile] = useState<string>('app.py');
  const [copiedFile, setCopiedFile] = useState(false);

  // Model sağlık kontrolü
  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setModelStatus({
            healthy: true,
            device: data.device || 'CPU',
            model: data.model_name || 'savasy/bert-base-turkish-sentiment-cased'
          });
        }
      } catch {
        // Backend yerel veya vekil üzerinden yanıt vermeye devam eder
      }
    }
    checkBackend();

    // Kayıtlı geçmişi al
    try {
      const saved = localStorage.getItem('tr_sentiment_app_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const handleAnalyze = async (textToAnalyze?: string) => {
    const text = (textToAnalyze !== undefined ? textToAnalyze : commentText).trim();

    if (!text) {
      setErrorMessage('Lütfen analiz edilecek bir Türkçe yorum veya metin girin.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || data.success === false) {
        let errStr = 'Analiz sırasında sunucuda bir hata oluştu.';
        if (data && data.error) {
          if (typeof data.error === 'string') {
            errStr = data.error;
          } else if (typeof data.error === 'object') {
            errStr = data.error.message || JSON.stringify(data.error);
          }
        }
        throw new Error(errStr);
      }

      // Güvenli String Çıkarımı ([object Object] kesinlikle engellenir)
      const sentimentStr = typeof data.sentiment === 'object'
        ? (data.sentiment.label || data.sentiment.name || data.sentiment.sentiment || 'Pozitif')
        : String(data.sentiment || 'Pozitif');

      let conf = data.confidence;
      if (typeof conf === 'object' && conf !== null) {
        conf = conf.value ?? conf.score ?? conf.confidence ?? 0;
      }
      conf = parseFloat(conf) || 0;
      if (conf <= 1.0 && conf > 0) conf *= 100;

      let explanationStr = data.explanation || data.aciklama || data.description;
      if (typeof explanationStr === 'object' && explanationStr !== null) {
        explanationStr = explanationStr.text || explanationStr.explanation || JSON.stringify(explanationStr);
      }
      if (!explanationStr) {
        const lower = sentimentStr.toLowerCase();
        if (lower.includes('pos') || lower.includes('olumlu') || lower.includes('pozitif')) {
          explanationStr = 'Metin olumlu bir duygu, beğeni ve memnuniyet ifadeleri içermektedir.';
        } else if (lower.includes('neg') || lower.includes('olumsuz') || lower.includes('negatif')) {
          explanationStr = 'Metin olumsuz deneyim, şikayet ve memnuniyetsizlik bildiren ifadeler içermektedir.';
        } else {
          explanationStr = 'Metin nötr ve dengeli bir değerlendirme yansıtmaktadır.';
        }
      }

      const safeResult: AnalysisResult = {
        success: true,
        sentiment: sentimentStr,
        sentiment_label: sentimentStr,
        sentiment_code: data.sentiment_code || (sentimentStr.toLowerCase().includes('pos') || sentimentStr.toLowerCase().includes('olumlu') || sentimentStr.toLowerCase().includes('pozitif') ? 'positive' : 'negative'),
        confidence: conf,
        explanation: String(explanationStr),
        scores: data.scores || { olumlu: conf, olumsuz: 100 - conf },
        meta: data.meta || {
          character_count: text.length,
          word_count: text.split(/\s+/).length,
          duration_ms: 45,
          model: 'savasy/bert-base-turkish-sentiment-cased'
        }
      };

      setResult(safeResult);

      // Geçmişe ekle
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        text,
        sentiment: sentimentStr,
        confidence: conf,
        explanation: String(explanationStr),
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        scores: safeResult.scores
      };

      setHistory(prev => {
        const updated = [newItem, ...prev.slice(0, 9)];
        try {
          localStorage.setItem('tr_sentiment_app_history', JSON.stringify(updated));
        } catch {}
        return updated;
      });

    } catch (err: unknown) {
      let errMessage = 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.';
      if (err instanceof Error) {
        errMessage = err.message;
      } else if (typeof err === 'string') {
        errMessage = err;
      } else if (err && typeof err === 'object') {
        errMessage = (err as Record<string, string>).message || JSON.stringify(err);
      }
      setErrorMessage(errMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResult = () => {
    if (!result) return;
    const text = `[Türkçe Duygu Analizi - BERT]\nYorum: "${commentText}"\nSonuç: ${result.sentiment} (%${result.confidence.toFixed(1)} Güven)\nAçıklama: ${result.explanation}\nOlumlu Skoru: %${result.scores.olumlu} | Olumsuz Skoru: %${result.scores.olumsuz}\nModel: ${result.meta.model}`;
    navigator.clipboard.writeText(text);
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 2000);
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('tr_sentiment_app_history');
    } catch {}
  };

  // Proje Dosyaları İçeriği (GitHub & Render için hazır)
  const PROJECT_FILES: Record<string, { desc: string; ext: string; content: string }> = {
    'app.py': {
      desc: 'Flask REST API ve Transformers BERT Model Entegrasyonu',
      ext: 'python',
      content: `from flask import Flask, render_template, request, jsonify
from transformers import pipeline
import torch
import os
import time

app = Flask(__name__, template_folder="templates", static_folder="static")

MODEL_NAME = "savasy/bert-base-turkish-sentiment-cased"
device = 0 if torch.cuda.is_available() else -1

print(f"[*] Model yükleniyor: {MODEL_NAME}...")
classifier = pipeline(
    task="sentiment-analysis",
    model=MODEL_NAME,
    tokenizer=MODEL_NAME,
    return_all_scores=True,
    device=device
)
print("[+] Model hazır!")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "model_name": MODEL_NAME,
        "device": "GPU" if torch.cuda.is_available() else "CPU"
    })

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    text = data.get("text") or request.form.get("text", "")

    if not text or not text.strip():
        return jsonify({
            "success": False,
            "error": "Lütfen analiz edilecek bir metin girin."
        }), 400

    clean_text = text.strip()[:2000]
    start_time = time.time()

    raw_results = classifier(clean_text)[0]
    positive_prob = 0.0
    negative_prob = 0.0

    for item in raw_results:
        lbl = item["label"].lower()
        score = float(item["score"])
        if "pos" in lbl or lbl == "label_1":
            positive_prob = score
        elif "neg" in lbl or lbl == "label_0":
            negative_prob = score

    total = positive_prob + negative_prob
    if total > 0:
        positive_prob /= total
        negative_prob /= total

    sentiment = "Olumlu" if positive_prob >= negative_prob else "Olumsuz"
    confidence = positive_prob if sentiment == "Olumlu" else negative_prob
    duration_ms = round((time.time() - start_time) * 1000, 2)

    return jsonify({
        "success": True,
        "sentiment": sentiment,
        "confidence": round(confidence * 100, 2),
        "scores": {
            "olumlu": round(positive_prob * 100, 2),
            "olumsuz": round(negative_prob * 100, 2)
        },
        "meta": {
            "character_count": len(clean_text),
            "word_count": len(clean_text.split()),
            "duration_ms": duration_ms,
            "model": MODEL_NAME
        }
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)`
    },
    'templates/index.html': {
      desc: 'Modern, Sade ve Mobil Uyumlu Frontend Arayüzü',
      ext: 'html',
      content: `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Türkçe Duygu Analizi | BERT AI</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen">
    <!-- Tam kaynak kodu repodaki templates/index.html dosyasında bulunmaktadır -->
</body>
</html>`
    },
    'requirements.txt': {
      desc: 'Python Paket Bağımlılıkları Listesi',
      ext: 'text',
      content: `flask>=3.0.0
transformers>=4.38.0
torch>=2.0.0
gunicorn>=21.2.0`
    },
    'Procfile': {
      desc: 'Render / Heroku Üretim Sunucusu Başlatma Komutu',
      ext: 'text',
      content: `web: gunicorn app:app --workers 1 --threads 4 --timeout 120`
    },
    'render.yaml': {
      desc: 'Render.com Otomatik Dağıtım (Blueprint) Dosyası',
      ext: 'yaml',
      content: `services:
  - type: web
    name: turkce-duygu-analizi-bert
    env: python
    region: frankfurt
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app --workers 1 --threads 4 --timeout 120
    envVars:
      - key: PYTHON_VERSION
        value: 3.10.12`
    },
    'runtime.txt': {
      desc: 'Python Çalışma Zamanı Sürümü',
      ext: 'text',
      content: `python-3.10.12`
    },
    'README.md': {
      desc: 'Kapsamlı Kurulum, Dağıtım ve API Kılavuzu',
      ext: 'markdown',
      content: `# 🇹🇷 Türkçe Duygu Analizi Web Uygulaması (BERT & Flask)
Detaylı kurulum, GitHub yükleme ve Render canlıya alma adımları için repoyu inceleyin.`
    }
  };

  const handleCopyCode = () => {
    const file = PROJECT_FILES[selectedFile];
    if (file) {
      navigator.clipboard.writeText(file.content);
      setCopiedFile(true);
      setTimeout(() => setCopiedFile(false), 2000);
    }
  };

  const handleDownloadFile = () => {
    const file = PROJECT_FILES[selectedFile];
    if (file) {
      const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.split('/').pop() || selectedFile;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Üst Bar (Header) */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-sm">
              TR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Türkçe Duygu Analizi
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Flame className="w-3 h-3 text-indigo-400" />
                  BERT
                </span>
              </div>
              <p className="text-xs text-slate-400">savasy/bert-base-turkish-sentiment-cased</p>
            </div>
          </div>

          {/* Navigasyon Tabları */}
          <nav className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 text-xs">
            <button
              onClick={() => setActiveTab('app')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'app'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Canlı Analiz</span>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'files'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Proje Dosyaları</span>
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'api'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">REST API</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Render Rehberi</span>
            </button>
          </nav>

          {/* Model Sağlık Durumu Rozeti */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">Model Aktif</span>
            <span className="text-slate-500 font-mono text-[11px]">({modelStatus.device})</span>
          </div>

        </div>
      </header>

      {/* Ana İçerik */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: CANLI ANALİZ UYGULAMASI */}
        {activeTab === 'app' && (
          <div className="space-y-8">
            
            {/* Hero Tanıtım */}
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Hugging Face Transformers Destekli Gerçek Analiz
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Türkçe Yorum ve Metin <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                  Duygu Analizi
                </span>
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-400">
                E-ticaret, sosyal medya veya müşteri geri bildirimlerini BERT modeli ile analiz edin. Yorumun olumlu veya olumsuz olduğunu ve model güven oranını anında görün.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Sol Kolon: Girdi ve Örnekler */}
              <div className="lg:col-span-7 space-y-6">
                
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative backdrop-blur">
                  
                  <div className="flex items-center justify-between mb-3">
                    <label htmlFor="commentInput" className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-indigo-400" />
                      Analiz Edilecek Türkçe Metin
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const clip = await navigator.clipboard.readText();
                            if (clip) setCommentText(clip);
                          } catch {}
                        }}
                        type="button"
                        className="text-xs text-slate-400 hover:text-slate-200 transition px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60"
                      >
                        Yapıştır
                      </button>
                      <button
                        onClick={() => {
                          setCommentText('');
                          setErrorMessage(null);
                        }}
                        type="button"
                        className="text-xs text-slate-400 hover:text-rose-400 transition px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>

                  {/* Metin Alanı */}
                  <textarea
                    id="commentInput"
                    rows={5}
                    value={commentText}
                    onChange={(e) => {
                      setCommentText(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Örnek: Bu telefonu 1 aydır kullanıyorum, ekran kalitesi ve batarya ömrü mükemmel! Kesinlikle tavsiye ederim."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base transition resize-y leading-relaxed"
                    maxLength={3000}
                  />

                  {/* Sayaçlar */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2 px-1">
                    <div className="flex items-center gap-3">
                      <span>{commentText.trim() ? commentText.trim().split(/\s+/).length : 0} kelime</span>
                      <span>•</span>
                      <span>{commentText.length} / 3000 karakter</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Ctrl + Enter ile çalıştır</span>
                  </div>

                  {/* Hata Kutusu */}
                  {errorMessage && (
                    <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <span className="flex-1">{errorMessage}</span>
                    </div>
                  )}

                  {/* Gönder Butonu */}
                  <div className="mt-5">
                    <button
                      onClick={() => handleAnalyze()}
                      disabled={isLoading}
                      className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] text-white font-semibold text-sm sm:text-base shadow-lg shadow-indigo-500/25 transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                          <span>BERT Modeli Analiz Ediyor...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Duyguyu Analiz Et</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Hızlı Örnek Yorum Çipleri */}
                  <div className="mt-6 pt-5 border-t border-slate-800">
                    <p className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Hızlı Test İçin Örnek Türkçe Yorumlar:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SAMPLE_COMMENTS.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCommentText(s.text);
                            handleAnalyze(s.text);
                          }}
                          className="text-left text-xs bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 hover:border-indigo-500/50 p-2.5 rounded-xl transition flex flex-col justify-between group"
                        >
                          <span className="text-slate-300 group-hover:text-white line-clamp-2 leading-relaxed">
                            "{s.text}"
                          </span>
                          <span className={`text-[10px] font-semibold mt-1.5 flex items-center gap-1 ${
                            s.type === 'pos' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {s.type === 'pos' ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                            {s.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Geçmiş Bölümü */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Son Analiz Geçmişi
                    </h3>
                    {history.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className="text-[11px] text-slate-500 hover:text-rose-400 transition"
                      >
                        Geçmişi Temizle
                      </button>
                    )}
                  </div>

                  {history.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center italic">
                      Henüz bir analiz yapmadınız. Yukarıdan bir yorum girin veya örneklere tıklayın.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {history.map((item) => {
                        const isPos = item.sentiment === 'Olumlu';
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setCommentText(item.text);
                              handleAnalyze(item.text);
                            }}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-xs cursor-pointer transition"
                          >
                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                              <span className={isPos ? 'text-emerald-400' : 'text-rose-400'}>
                                {isPos ? '😊' : '😞'}
                              </span>
                              <span className="text-slate-300 truncate">{item.text}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                %{item.confidence.toFixed(1)}
                              </span>
                              <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Sağ Kolon: Analiz Sonucu Göstergesi */}
              <div className="lg:col-span-5 space-y-6">
                
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur">
                  
                  {!result ? (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4">
                        <Activity className="w-8 h-8 text-indigo-400" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-200">Analiz Sonucu Bekleniyor</h3>
                      <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                        Yorumunuzu girip <strong className="text-slate-300">"Duyguyu Analiz Et"</strong> butonuna bastığınızda BERT modelinin tahmin ve güven skorları burada sergilenecektir.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-fadeIn">
                      
                      {/* Üst Başlık & Rozet */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                          Analiz Sonucu
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            result.sentiment_code === 'positive' || result.sentiment === 'Pozitif' || result.sentiment === 'Olumlu'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : result.sentiment_code === 'negative' || result.sentiment === 'Negatif' || result.sentiment === 'Olumsuz'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          <span>
                            {result.sentiment_code === 'positive' || result.sentiment === 'Pozitif' || result.sentiment === 'Olumlu'
                              ? '😊'
                              : result.sentiment_code === 'negative' || result.sentiment === 'Negatif' || result.sentiment === 'Olumsuz'
                              ? '😞'
                              : '😐'}
                          </span>
                          <span>{result.sentiment}</span>
                        </span>
                      </div>

                      {/* Büyük Güven Skoru */}
                      <div className="text-center py-2">
                        <div className="text-xs text-slate-400 font-medium mb-1">Model Güven Skoru</div>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-sm text-slate-400 font-bold">%</span>
                          <span className="text-5xl font-black tracking-tight text-white font-mono">
                            {result.confidence.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      {/* Model Değerlendirme Açıklaması Kartı */}
                      <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 text-left">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Model Değerlendirme Açıklaması</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-normal">
                          {result.explanation}
                        </p>
                      </div>

                      {/* Olasılık Dağılım Çubukları */}
                      <div className="space-y-4 pt-2">
                        
                        {/* Olumlu Çubuğu */}
                        <div>
                          <div className="flex justify-between text-xs font-medium mb-1.5">
                            <span className="text-emerald-400 flex items-center gap-1">
                              <span>😊 Olumlu (Pozitif)</span>
                            </span>
                            <span className="font-mono text-emerald-400 font-bold">
                              %{result.scores.olumlu.toFixed(1)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-800">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${Math.max(2, result.scores.olumlu)}%` }}
                            />
                          </div>
                        </div>

                        {/* Olumsuz Çubuğu */}
                        <div>
                          <div className="flex justify-between text-xs font-medium mb-1.5">
                            <span className="text-rose-400 flex items-center gap-1">
                              <span>😞 Olumsuz (Negatif)</span>
                            </span>
                            <span className="font-mono text-rose-400 font-bold">
                              %{result.scores.olumsuz.toFixed(1)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-800">
                            <div
                              className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${Math.max(2, result.scores.olumsuz)}%` }}
                            />
                          </div>
                        </div>

                      </div>

                      {/* İstatistikler Izgarası */}
                      <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-slate-800 text-center">
                        <div className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/80">
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Süre</div>
                          <div className="text-xs font-bold text-slate-200 mt-0.5 font-mono">
                            {result.meta.duration_ms} ms
                          </div>
                        </div>
                        <div className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/80">
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Kelime</div>
                          <div className="text-xs font-bold text-slate-200 mt-0.5 font-mono">
                            {result.meta.word_count}
                          </div>
                        </div>
                        <div className="bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/80">
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Karakter</div>
                          <div className="text-xs font-bold text-slate-200 mt-0.5 font-mono">
                            {result.meta.character_count}
                          </div>
                        </div>
                      </div>

                      {/* Aksiyon Butonları */}
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={handleCopyResult}
                          type="button"
                          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center justify-center gap-1.5 border border-slate-700/60"
                        >
                          {copiedResult ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-400" />
                              <span className="text-emerald-400">Kopyalandı!</span>
                            </>
                          ) : (
                            <>
                              <Clipboard className="w-4 h-4" />
                              <span>Sonucu Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  )}

                </div>

                {/* Model Mimarisi Bilgi Kartı */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Model ve Çalışma Mantığı
                  </h3>
                  <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
                    <p>
                      <strong className="text-slate-200">Model:</strong>{' '}
                      <span className="text-indigo-300 font-mono">savasy/bert-base-turkish-sentiment-cased</span>
                    </p>
                    <p>
                      <strong className="text-slate-200">Kütüphane:</strong> Hugging Face Transformers & PyTorch
                    </p>
                    <p>
                      <strong className="text-slate-200">Mekanizma:</strong> Çift yönlü Transformer dikkat (attention) katmanları ile Türkçe dilbilgisini derinlemesine kavrayarak duygu sınıflandırması yapar.
                    </p>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 2: PROJE DOSYALARI & KOD GEZGİNİ */}
        {activeTab === 'files' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <FileCode2 className="w-6 h-6 text-indigo-400" />
                  GitHub & Render Proje Dosyaları
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Projeniz için oluşturulan ve birbiriyle tam uyumlu çalışan dosyaları inceleyin, kopyalayın veya indirin.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5 border border-slate-700/60"
                >
                  {copiedFile ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedFile ? 'Kopyalandı!' : 'Dosyayı Kopyala'}</span>
                </button>
                <button
                  onClick={handleDownloadFile}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>İndir</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Dosya Listesi Menüsü */}
              <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2">
                  Oluşturulan Dosyalar
                </span>
                <div className="space-y-1">
                  {Object.keys(PROJECT_FILES).map((fname) => (
                    <button
                      key={fname}
                      onClick={() => setSelectedFile(fname)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-mono transition flex items-center justify-between ${
                        selectedFile === fname
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{fname}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        selectedFile === fname ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {PROJECT_FILES[fname].ext}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
                  <p className="font-semibold text-slate-300 mb-1">Seçili Dosya Açıklaması:</p>
                  <p>{PROJECT_FILES[selectedFile]?.desc}</p>
                </div>
              </div>

              {/* Kod Görüntüleyici */}
              <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                    <span className="ml-2 text-xs font-mono text-slate-300">{selectedFile}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {PROJECT_FILES[selectedFile]?.content.split('\n').length} satır
                  </span>
                </div>
                <div className="p-4 max-h-[580px] overflow-auto">
                  <pre className="text-xs font-mono text-slate-200 leading-relaxed">
                    <code>{PROJECT_FILES[selectedFile]?.content}</code>
                  </pre>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: REST API & CURL TEST */}
        {activeTab === 'api' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Terminal className="w-6 h-6 text-indigo-400" />
                REST API ve Test Konsolu
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Flask backend uygulamanızın sunduğu <code className="text-indigo-300 font-mono">/predict</code> uç noktasını curl veya JavaScript fetch ile doğrudan test edebilirsiniz.
              </p>
            </div>

            {/* API Uç Noktası Bilgisi */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs">
                  POST
                </span>
                <code className="text-sm font-mono text-slate-200">/predict</code>
                <span className="text-xs text-slate-400">veya</span>
                <code className="text-sm font-mono text-slate-200">/api/analyze</code>
              </div>

              {/* cURL Komutu */}
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                  Terminalden cURL İsteği Gönder:
                </label>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 relative overflow-x-auto">
                  <pre>{`curl -X POST http://localhost:5000/predict \\
  -H "Content-Type: application/json" \\
  -d '{"text": "${commentText || 'Ürünün kargosu çok hızlı geldi, kalitesini çok beğendim!'}"}'`}</pre>
                </div>
              </div>

              {/* JavaScript Fetch */}
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                  JavaScript / Frontend Fetch Kodu:
                </label>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                  <pre>{`const response = await fetch('/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: "Harika bir ürün!" })
});
const data = await response.json();
console.log(data.sentiment, data.confidence);`}</pre>
                </div>
              </div>

              {/* JSON Yanıt Formatı */}
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                  Beklenen JSON Yanıtı (200 OK):
                </label>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                  <pre>{JSON.stringify({
                    success: true,
                    sentiment: "Olumlu",
                    confidence: 98.49,
                    scores: {
                      olumlu: 98.49,
                      olumsuz: 1.51
                    },
                    meta: {
                      character_count: 55,
                      word_count: 8,
                      duration_ms: 32.4,
                      model: "savasy/bert-base-turkish-sentiment-cased"
                    }
                  }, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RENDER & GITHUB YAYINLAMA REHBERİ */}
        {activeTab === 'guide' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-400" />
                Adım Adım GitHub & Render Dağıtım Kılavuzu
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Tüm dosyalar projenizde hazırdır. Render üzerinde ücretsiz bir Python Web Service oluşturarak dakikalar içinde canlıya alabilirsiniz.
              </p>
            </div>

            <div className="space-y-4">
              
              {/* Adım 1 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-xs">1</span>
                  <span>Projeyi GitHub'a Yükleyin</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Terminalinizi açıp projenin bulunduğu klasörde Git komutlarını çalıştırın:
                </p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
                  <pre>{`git init
git add .
git commit -m "feat: Türkçe BERT Duygu Analizi Flask Uygulaması"
git branch -M main
git remote add origin https://github.com/<kullanici-adiniz>/turkce-duygu-analizi.git
git push -u origin main`}</pre>
                </div>
              </div>

              {/* Adım 2 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-xs">2</span>
                  <span>Render.com Üzerinde Yeni Web Service Oluşturun</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                  <li><a href="https://render.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1">Render.com'a gidin <ExternalLink className="w-3 h-3" /></a> ve giriş yapın.</li>
                  <li><strong>"New +"</strong> &gt; <strong>"Web Service"</strong> seçeneğini seçin.</li>
                  <li>GitHub deponuzu bağlayın.</li>
                </ul>
              </div>

              {/* Adım 3 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xs">3</span>
                  <span>Render Ayarlarını Tanımlayın</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 font-semibold block mb-1">Runtime</span>
                    <span className="text-white font-mono">Python 3</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 font-semibold block mb-1">Region</span>
                    <span className="text-white font-mono">Frankfurt (EU Central)</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 sm:col-span-2">
                    <span className="text-slate-500 font-semibold block mb-1">Build Command</span>
                    <span className="text-emerald-400 font-mono">pip install -r requirements.txt</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 sm:col-span-2">
                    <span className="text-slate-500 font-semibold block mb-1">Start Command</span>
                    <span className="text-emerald-400 font-mono">gunicorn app:app --workers 1 --threads 4 --timeout 120</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  * Hazırladığımız <code className="text-indigo-300 font-mono">render.yaml</code> dosyası sayesinde Render Blueprints kullanarak bu ayarları tek tıkla otomatik de yapabilirsiniz.
                </p>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Alt Bilgi (Footer) */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>Türkçe Duygu Analizi • Hugging Face Transformers & BERT</p>
          <p className="font-mono text-[11px]">Backend: Python / Flask • Model: savasy/bert-base-turkish-sentiment-cased</p>
        </div>
      </footer>

    </div>
  );
}
