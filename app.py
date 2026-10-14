"""
Türkçe Duygu Analizi Web Uygulaması (Flask + Hugging Face Transformers)
Model: savasy/bert-base-turkish-sentiment-cased
Geliştirici: AI Studio / Render Uyumlu Üretim Standardı
"""

import os
import time
import logging
from flask import Flask, render_template, request, jsonify
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
import torch

# Loglama yapılandırması
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TurkishSentimentApp")

app = Flask(__name__, template_folder="templates", static_folder="static")

# Model adı
MODEL_NAME = "savasy/bert-base-turkish-sentiment-cased"

# Global pipeline değişkeni
sentiment_pipeline = None

def load_sentiment_model():
    """
    Hugging Face Transformers modelini ve tokenizer'ını yükler.
    Model belleğe bir kez yüklenir ve isteklerde yeniden kullanılır.
    """
    global sentiment_pipeline
    logger.info("BERT Türkçe Duygu Analizi modeli yükleniyor: %s", MODEL_NAME)
    
    device = 0 if torch.cuda.is_available() else -1
    device_name = "CUDA (GPU)" if device == 0 else "CPU"
    logger.info("Kullanılan donanım hızlandırma: %s", device_name)

    try:
        sentiment_pipeline = pipeline(
            task="sentiment-analysis",
            model=MODEL_NAME,
            tokenizer=MODEL_NAME,
            return_all_scores=True,
            device=device
        )
        logger.info("Model başarıyla belleğe yüklendi ve kullanıma hazır!")
        return True
    except Exception as exc:
        logger.error("Model yüklenirken bir hata oluştu: %s", str(exc), exc_info=True)
        sentiment_pipeline = None
        return False

# Uygulama başlatılırken modeli yükle
load_sentiment_model()

def generate_turkish_explanation(text: str, sentiment: str, pos_keywords_found: list, neg_keywords_found: list) -> str:
    """Metnin neden bu duygu sınıfına ait olduğunu açıklayan akıcı Türkçe açıklama metni oluşturur."""
    if sentiment == "Pozitif":
        if pos_keywords_found:
            kw_str = ", ".join([f"'{w}'" for w in pos_keywords_found[:3]])
            return f"Metinde yer alan {kw_str} gibi ifadeler, kullanıcının yüksek memnuniyet, beğeni ve olumlu ürün/hizmet deneyimini açıkça ortaya koymaktadır."
        return "Metnin genel ifadesi ve cümle yapısı olumlu bir deneyim, tatmin ve yapıcı bir değerlendirme yansıtmaktadır."
    elif sentiment == "Negatif":
        if neg_keywords_found:
            kw_str = ", ".join([f"'{w}'" for w in neg_keywords_found[:3]])
            return f"Metinde tespit edilen {kw_str} gibi ifadeler, kullanıcının beklentilerinin karşılanmadığını, memnuniyetsizlik ve olumsuz deneyim yaşadığını belirtmektedir."
        return "Metindeki tonlama ve dil yapısı memnuniyetsizlik, eleştiri ve olumsuz bir değerlendirme içermektedir."
    else:
        return "Metin tarafsız ve dengeli bir dille yazılmış olup belirgin bir olumlu ya da olumsuz duygu ağırlığı içermemektedir."

@app.route("/")
def index():
    """Ana sayfa - Modern Türkçe Duygu Analizi web arayüzünü sunar."""
    return render_template("index.html")

@app.route("/api/health", methods=["GET"])
def health():
    """Sağlık kontrolü uç noktası (Render ve izleme servisleri için)."""
    is_ready = sentiment_pipeline is not None
    return jsonify({
        "status": "healthy" if is_ready else "degraded",
        "model_loaded": is_ready,
        "model_name": MODEL_NAME,
        "device": "GPU (CUDA)" if torch.cuda.is_available() else "CPU"
    }), 200 if is_ready else 503

@app.route("/predict", methods=["POST"])
@app.route("/api/analyze", methods=["POST"])
def predict():
    """
    Türkçe metnin duygu durumunu (Pozitif / Negatif / Nötr), güven oranını ve açıklamasını döndürür.
    Hatalar nesne olarak değil, açık ve anlaşılır metinler halinde döndürülür.
    """
    global sentiment_pipeline
    
    # Model yüklü değilse yeniden yüklemeyi dene
    if sentiment_pipeline is None:
        if not load_sentiment_model():
            return jsonify({
                "success": False,
                "error": "Model henüz yüklenemedi veya hazır değil. Lütfen birkaç saniye sonra tekrar deneyin."
            }), 503

    # Gelen veriyi parse et (JSON veya Form)
    data = request.get_json(silent=True) or {}
    text = data.get("text")
    if text is None and request.form:
        text = request.form.get("text")

    # Boş metin kontrolü
    if not text or not str(text).strip():
        return jsonify({
            "success": False,
            "error": "Lütfen analiz edilecek geçerli bir Türkçe metin veya yorum girin."
        }), 400

    clean_text = str(text).strip()

    # Maksimum uzunluk sınırı
    if len(clean_text) > 3000:
        clean_text = clean_text[:3000]

    start_time = time.time()

    try:
        # Model tahmini çalıştır
        raw_results = sentiment_pipeline(clean_text)
        scores = raw_results[0] if isinstance(raw_results[0], list) else raw_results

        positive_prob = 0.0
        negative_prob = 0.0

        for item in scores:
            lbl = str(item.get("label", "")).lower()
            score_val = float(item.get("score", 0.0))
            if "positive" in lbl or lbl == "label_1" or lbl == "olumlu" or lbl == "pozitif":
                positive_prob = score_val
            elif "negative" in lbl or lbl == "label_0" or lbl == "olumsuz" or lbl == "negatif":
                negative_prob = score_val

        # Skorları normalize et (toplam = 1.0)
        total_score = positive_prob + negative_prob
        if total_score > 0:
            positive_prob = positive_prob / total_score
            negative_prob = negative_prob / total_score

        # Anahtar kelime tespiti
        lower_t = clean_text.lower()
        pos_words = ["memnun", "harika", "mükemmel", "süper", "güzel", "hızlı", "beğendim", "tavsiye", "başyapıt", "kaliteli", "başarılı", "teşekkür", "kusursuz", "sevdim", "iyi", "enfes", "şahane"]
        neg_words = ["berbat", "kötü", "bozuk", "kırık", "çöp", "yavaş", "gecikti", "iade", "rezalet", "şikayet", "pişman", "beğenmedim", "almayın", "ezik", "hasarlı", "fiyasko", "hüsran", "pahalı"]
        
        found_pos = [w for w in pos_words if w in lower_t]
        found_neg = [w for w in neg_words if w in lower_t]

        # Nötr / Kararsız metin kontrolü
        diff = abs(positive_prob - negative_prob)
        if diff < 0.12 and not found_pos and not found_neg:
            sentiment = "Nötr"
            sentiment_code = "neutral"
            confidence = round((1.0 - diff) * 100, 2)
            explanation = generate_turkish_explanation(clean_text, "Nötr", found_pos, found_neg)
        elif positive_prob >= negative_prob:
            sentiment = "Pozitif"
            sentiment_code = "positive"
            confidence = round(positive_prob * 100, 2)
            explanation = generate_turkish_explanation(clean_text, "Pozitif", found_pos, found_neg)
        else:
            sentiment = "Negatif"
            sentiment_code = "negative"
            confidence = round(negative_prob * 100, 2)
            explanation = generate_turkish_explanation(clean_text, "Negatif", found_pos, found_neg)

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        words = clean_text.split()

        response_payload = {
            "success": True,
            "sentiment": sentiment,
            "sentiment_label": sentiment,
            "sentiment_code": sentiment_code,
            "confidence": confidence,
            "explanation": explanation,
            "scores": {
                "olumlu": round(positive_prob * 100, 2),
                "olumsuz": round(negative_prob * 100, 2)
            },
            "meta": {
                "character_count": len(clean_text),
                "word_count": len(words),
                "duration_ms": elapsed_ms,
                "model": MODEL_NAME
            }
        }

        return jsonify(response_payload), 200

    except Exception as exc:
        err_msg = str(exc) if str(exc) else "Bilinmeyen model çalışma hatası"
        logger.error("Tahmin sırasında hata: %s", err_msg, exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Analiz gerçekleştirilemedi: {err_msg}"
        }), 500

if __name__ == "__main__":
    env_port = os.environ.get("PORT")
    if os.environ.get("FLASK_PORT"):
        port = int(os.environ.get("FLASK_PORT"))
    elif env_port and env_port != "8080" and env_port != "3000":
        port = int(env_port)
    else:
        port = 5001

    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    logger.info("Uygulama başlatılıyor (Port: %d, Debug: %s)...", port, debug_mode)
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
