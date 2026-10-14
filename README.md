# 🇹🇷 Türkçe Duygu Analizi Web Uygulaması (BERT & Flask)

Hugging Face Transformers kütüphanesi ve **`savasy/bert-base-turkish-sentiment-cased`** modeli kullanılarak geliştirilmiş, Türkçe metinler ve e-ticaret/sosyal medya yorumları için duygu analizi (Sentiment Analysis) yapan modern bir web uygulamasıdır.

Bu proje hem yerel geliştirmede hem de **GitHub** & **Render.com** gibi bulut platformlarında doğrudan yayına alınmaya hazır şekilde mimarilenmiştir.

---

## 🚀 Özellikler

- **Gerçek Derin Öğrenme Modeli:** Önceden eğitilmiş Türkçe BERT modeli (`savasy/bert-base-turkish-sentiment-cased`) ile yüksek doğrulukta tahmin.
- **Python & Flask Backend:** Model belleğe bir kez yüklenir, `/predict` ve `/api/analyze` uç noktaları üzerinden hızlı REST API yanıtı verir.
- **Modern & Sade Türkçe Arayüz:** Tailwind CSS tabanlı, mobil uyumlu, karanlık tema (dark mode) tasarım.
- **Detaylı Analiz Sonuçları:**
  - Baskın Duygu: **Olumlu (Pozitif)** veya **Olumsuz (Negatif)**
  - Model Güven Skoru (%)
  - Olasılık Dağılım Çubukları (Olumlu vs Olumsuz puanı)
  - İşlem Süresi (ms), Karakter ve Kelime Sayacı
- **Tek Tıkla Örnek Yorumlar:** Sık karşılaşılan Türkçe müşteri yorumları ile anında deneme imkanı.
- **Geçmiş Takibi:** Yapılan son 10 analizi yerel hafızada (localStorage) saklama ve tek tıkla yeniden test etme.
- **Sonucu Kopyalama:** Sosyal medya veya raporlama için biçimlendirilmiş metin kopyalama.
- **Hata ve Boşluk Yönetimi:** Boş metinler, aşırı uzun girdiler ve sunucu durumları için kullanıcı dostu hata bildirimleri.
- **Render.com Uyumluluğu:** `Procfile`, `runtime.txt`, `render.yaml` ve `requirements.txt` ile sıfır konfigürasyonlu dağıtım.

---

## 📁 Proje Dosya Yapısı

```
turkce-duygu-analizi/
├── app.py                # Flask backend sunucusu ve Transformers model entegrasyonu
├── templates/
│   └── index.html        # Modern Türkçe frontend arayüzü (HTML5, Tailwind CSS, JS)
├── requirements.txt      # Gerekli Python bağımlılıkları (flask, transformers, torch, gunicorn)
├── Procfile              # Render / Heroku için Gunicorn üretim sunucusu komutu
├── render.yaml           # Render Blueprint (Infrastructure-as-code) yapılandırması
├── runtime.txt           # Python çalışma zamanı sürümü (python-3.10.12)
├── .gitignore            # Git dışı bırakılacak dosyalar (venv, __pycache__, cache vb.)
└── README.md             # Proje dokümantasyonu ve kurulum rehberi
```

---

## 🛠️ Yerel Kurulum ve Çalıştırma (Local Development)

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/<kullanici-adiniz>/turkce-duygu-analizi.git
cd turkce-duygu-analizi
```

### 2. Python Sanal Ortamını (venv) Oluşturun ve Aktive Edin
```bash
# Sanal ortam oluştur
python3 -m venv venv

# Linux / macOS için:
source venv/bin/activate

# Windows PowerShell için:
.\venv\Scripts\Activate.ps1
```

### 3. Bağımlılıkları Yükleyin
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **İpucu:** GPU'nuz yoksa CPU için PyTorch kurulumu otomatik olarak gerçekleştirilir.

### 4. Uygulamayı Başlatın
```bash
python app.py
```

Tarayıcınızı açıp `http://localhost:5000` adresine gidin. Model ilk çalıştırmada Hugging Face Hub üzerinden otomatik olarak indirilir ve önbelleğe alınır.

---

## 🐙 GitHub'a Yükleme Adımları

Projeyi kendi GitHub hesabınıza yüklemek için terminalde sırasıyla şu komutları çalıştırın:

```bash
# Git deposunu başlatın
git init

# Dosyaları ekleyin
git add .

# İlk commit'i oluşturun
git commit -m "feat: Hugging Face BERT Türkçe duygu analizi uygulaması"

# Ana dalı belirleyin
git branch -M main

# GitHub'da oluşturduğunuz yeni deponun adresini ekleyin
git remote add origin https://github.com/<kullanici-adiniz>/<repo-adiniz>.git

# Depoya gönderin
git push -u origin main
```

---

## ☁️ Render.com Üzerinde Canlıya Alma (Deploy to Render)

Render üzerinde ücretsiz olarak yayınlamak son derece kolaydır:

### Yöntem A: Render Dashboard Üzerinden (Önerilen)
1. [Render.com](https://render.com) adresine gidin ve GitHub hesabınızla giriş yapın.
2. **"New +"** butonuna tıklayıp **"Web Service"** seçeneğini seçin.
3. GitHub deponuzu seçip bağlayın.
4. Aşağıdaki ayarları kontrol edin:
   - **Name:** `turkce-duygu-analizi` (veya istediğiniz isim)
   - **Region:** `Frankfurt (EU)` (Türkiye'ye en yakın konum)
   - **Branch:** `main`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --workers 1 --threads 4 --timeout 120`
   - **Instance Type:** `Free`
5. **"Deploy Web Service"** butonuna tıklayın.

### Yöntem B: Blueprint (`render.yaml`) ile Tek Tıkla
Projeye dahil edilen `render.yaml` sayesinde Render paneli üzerinden **"Blueprints"** seçilip depo işaretlendiğinde tüm ayarlar otomatik yapılandırılır.

> ⚠️ **Not:** Render'ın ücretsiz planında ilk model indirmesi 1-2 dakika sürebileceğinden `--timeout 120` bayrağı `Procfile` dosyasına eklenmiştir.

---

## 🔌 API Dokümantasyonu

Uygulama aynı zamanda diğer uygulamalarınızın (mobil, React, Next.js vb.) bağlanabileceği bir REST API sunar:

### 1. Duygu Tahmini
- **URL:** `/predict` veya `/api/analyze`
- **Metot:** `POST`
- **İçerik Türü:** `application/json`

#### İstek Örneği:
```json
{
  "text": "Ürünün kargosu çok hızlı geldi, kalitesini çok beğendim!"
}
```

#### Başarılı Yanıt (200 OK):
```json
{
  "success": true,
  "sentiment": "Olumlu",
  "sentiment_code": "positive",
  "confidence": 98.49,
  "scores": {
    "olumlu": 98.49,
    "olumsuz": 1.51
  },
  "meta": {
    "character_count": 55,
    "word_count": 8,
    "duration_ms": 34.2,
    "model": "savasy/bert-base-turkish-sentiment-cased"
  }
}
```

#### Hata Yanıtı (400 Bad Request):
```json
{
  "success": false,
  "error": "Lütfen analiz edilecek geçerli bir Türkçe metin veya yorum girin."
}
```

### 2. Sağlık Kontrolü
- **URL:** `/api/health`
- **Metot:** `GET`
- **Yanıt:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "savasy/bert-base-turkish-sentiment-cased",
  "device": "CPU"
}
```

---

## 🧠 Model Hakkında Bilgi

- **Model Sahibi:** Savaş Yıldırım ([@savasy](https://huggingface.co/savasy))
- **Hugging Face Adresi:** [savasy/bert-base-turkish-sentiment-cased](https://huggingface.co/savasy/bert-base-turkish-sentiment-cased)
- **Mimari:** `dbmdz/bert-base-turkish-cased` modeli üzerinde Türkçe duygu analizi veri kümeleriyle ince ayar (fine-tuning) yapılmıştır.
- **Sınıflar:** `negative` (0) ve `positive` (1)

---

## 📄 Lisans
Bu proje Apache-2.0 lisansı altında sunulmaktadır.
