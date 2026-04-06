import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, Upload, Trash2, Calculator, Info, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const API_BASE_URL = 'https://shiny-eagles-watch.loca.lt';

const getConfidenceColor = (conf) => {
  if (conf > 0.8) return '#10b981';
  if (conf > 0.5) return '#f59e0b';
  return '#ef4444';
};

function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setItems([]);
      setTotals(null);
      setError(null);
      detectFood(file);
    }
  };

  const detectFood = async (file) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/detect`, formData);
      
      // Filter hasil deteksi: ambil yang > 40% dan unik berdasarkan nama (ambil skor tertinggi)
      const filteredItems = response.data.items
        .filter(item => item.confidence > 0.4)
        .reduce((acc, current) => {
          const x = acc.find(item => item.name === current.name);
          if (!x) {
            return acc.concat([current]);
          } else if (current.confidence > x.confidence) {
            return acc.map(item => item.name === current.name ? current : item);
          } else {
            return acc;
          }
        }, []);

      const detectedItems = filteredItems.map(item => ({
        ...item,
        gram: 100
      }));
      setItems(detectedItems);
    } catch (err) {
      console.error('Detection error details:', err.response?.data || err.message);
      setError(`Deteksi Gagal (${err.response?.status || 'Network Error'}). Silakan cek console untuk detail.`);
    } finally {
      setLoading(false);
    }
  };

  const handleGramChange = (id, gram) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, gram: parseInt(gram) || 0 } : item
    ));
  };

  const calculateNutrition = async () => {
    if (items.length === 0) return;
    setCalculating(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/calculate`, {
        items: items.map(({ name, gram }) => ({ name, gram }))
      });
      setTotals(response.data.total_nutrition);
    } catch (err) {
      console.error('Calculation error details:', err.response?.data || err.message);
      setError(`Gagal menghitung nutrisi (${err.response?.status || 'Error'}). Cek log di Colab.`);
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (items.length > 0) {
      const timer = setTimeout(() => {
        calculateNutrition();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [items]);

  return (
    <div className="app-wrapper animate-fade-in">
      <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--primary)', lineHeight: '1' }}>
            NutriScan AI
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Foto makananmu, cek nutrisinya seketika.</p>
        </div>
        {preview && (
          <button
            onClick={() => { setPreview(null); setImage(null); setItems([]); setTotals(null); }}
            className="btn-primary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
          >
            <Trash2 size={18} />
            Hapus Foto
          </button>
        )}
      </header>

      <main className="main-container">
        {/* Left Panel: Image Input/Preview */}
        <section className="panel-left">
          <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!preview ? (
              <div
                className="upload-area"
                onClick={() => document.getElementById('fileInput').click()}
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  padding: '2rem'
                }}
              >
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  background: 'rgba(255, 107, 107, 0.1)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <Upload size={32} color="var(--primary)" />
                </div>
                <p style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Unggah Foto Makanan</p>
                <p style={{ color: 'var(--text-muted)' }}>Klik atau seret gambar ke sini</p>
              </div>
            ) : (
              <div style={{ position: 'relative', height: '100%', width: '100%' }}>
                <img
                  src={preview}
                  alt="Pratinjau"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {loading && (
                  <div style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    background: 'rgba(0,0,0,0.4)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'white',
                    backdropFilter: 'blur(4px)'
                  }}>
                    <Loader2 className="animate-spin" size={48} style={{ marginBottom: '1rem' }} />
                    <p style={{ fontWeight: '600' }}>Menganalisis...</p>
                  </div>
                )}
              </div>
            )}
            <input
              id="fileInput"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          </div>
        </section>

        {/* Right Panel: Results */}
        <section className="panel-right">
          {error && (
            <div className="glass" style={{ padding: '1rem', borderLeft: '4px solid #ef4444' }}>
              <p style={{ color: '#ef4444', fontWeight: '500' }}>{error}</p>
            </div>
          )}

          {!preview && !loading && (
            <div className="glass" style={{ padding: '3rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Calculator size={48} color="var(--text-muted)" style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} />
              <h3 style={{ color: 'var(--text-muted)' }}>Mulai dengan mengunggah foto</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Hasil analisis akan muncul di sini</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {items.length > 0 && !loading && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
              >
                {/* Detected Items */}
                <div className="glass" style={{ padding: '1.5rem' }}>
                  <h2 style={{ marginBottom: '1.25rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Makanan Terdeteksi
                  </h2>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {items.map((item) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--surface)', borderRadius: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: '700' }}>{item.name}</span>
                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: getConfidenceColor(item.confidence) + '22', color: getConfidenceColor(item.confidence), borderRadius: '100px', fontWeight: '800' }}>
                              {Math.round(item.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <input
                            type="number"
                            value={item.gram}
                            onChange={(e) => handleGramChange(item.id, e.target.value)}
                            min="1"
                          />
                          <span style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.9rem' }}>gram</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nutrition Summary */}
                {totals && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass"
                    style={{ padding: '1.5rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <h2 style={{ fontSize: '1.25rem' }}>Ringkasan Nutrisi</h2>
                      {calculating && <Loader2 className="animate-spin" size={18} color="var(--primary)" />}
                    </div>

                    <div className="nutrition-grid">
                      <div className="glass nutrition-card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #ff8e8e 100%)', border: 'none' }}>
                        <span className="card-value" style={{ color: 'white' }}>{Math.round(totals.calories || 0)}</span>
                        <span className="card-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Kalori (kkal)</span>
                      </div>
                      <div className="glass nutrition-card">
                        <span className="card-value" style={{ color: '#10b981' }}>{totals.protein?.toFixed(1) || 0}g</span>
                        <span className="card-label">Protein</span>
                      </div>
                      <div className="glass nutrition-card">
                        <span className="card-value" style={{ color: '#f59e0b' }}>{totals.fat?.toFixed(1) || 0}g</span>
                        <span className="card-label">Lemak</span>
                      </div>
                      <div className="glass nutrition-card">
                        <span className="card-value" style={{ color: '#3b82f6' }}>{totals.carbs?.toFixed(1) || 0}g</span>
                        <span className="card-label">Karbohidrat</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--surface)', padding: '0.85rem', borderRadius: '12px' }}>
                      <Info size={18} color="var(--text-muted)" />
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        Data nutrisi adalah estimasi berdasarkan berat yang dimasukkan.
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <footer style={{ marginTop: 'auto', textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        &copy; 2026 NutriScan AI. Powered by YOLOv8.
      </footer>
    </div>
  );
}

export default App;
