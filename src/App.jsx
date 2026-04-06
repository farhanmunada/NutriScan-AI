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
    <div className="container animate-fade-in">
      <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
          NutriScan AI
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Foto makananmu, cek nutrisinya seketika.</p>
      </header>

      <main>
        <section className="glass" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
          {!preview ? (
            <div
              className="upload-area"
              onClick={() => document.getElementById('fileInput').click()}
              style={{ padding: '3rem', border: '2px dashed var(--glass-border)', borderRadius: '15px', cursor: 'pointer' }}
            >
              <Upload size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <p style={{ fontWeight: '600' }}>Ketuk untuk unggah atau ambil foto</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mendukung JPG, PNG, atau WEBP</p>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <img
                src={preview}
                alt="Pratinjau"
                style={{ width: '100%', borderRadius: '15px', objectFit: 'cover', maxHeight: '300px' }}
              />
              <button
                onClick={() => { setPreview(null); setImage(null); setItems([]); setTotals(null); }}
                className="glass"
                style={{ position: 'absolute', top: '10px', right: '10px', padding: '8px', border: 'none', cursor: 'pointer', borderRadius: '50%' }}
              >
                <Trash2 size={20} color="#ef4444" />
              </button>
            </div>
          )}
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
        </section>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ margin: '0 auto 10px' }} />
            <p>Menganalisis makanan Anda...</p>
          </div>
        )}

        {error && (
          <div className="glass" style={{ padding: '1rem', borderLeft: '4px solid #ef4444', marginBottom: '2rem' }}>
            <p style={{ color: '#ef4444', fontWeight: '500' }}>{error}</p>
          </div>
        )}

        {items.length > 0 && !loading && (
          <AnimatePresence>
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass"
              style={{ padding: '1.5rem', marginBottom: '2rem' }}
            >
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Makanan Terdeteksi</h2>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--surface)', borderRadius: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: '700' }}>{item.name}</span>
                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: getConfidenceColor(item.confidence) + '22', color: getConfidenceColor(item.confidence), borderRadius: '4px', fontWeight: 'bold' }}>
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Masukkan berat (gram)</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        value={item.gram}
                        onChange={(e) => handleGramChange(item.id, e.target.value)}
                        min="1"
                      />
                      <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>g</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          </AnimatePresence>
        )}

        {totals && (
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass"
            style={{ padding: '1.5rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Ringkasan Nutrisi</h2>
              {calculating && <Loader2 className="animate-spin" size={16} color="var(--primary)" />}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="glass nutrition-card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #ff8e8e 100%)', color: 'white' }}>
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

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--surface)', padding: '1rem', borderRadius: '12px' }}>
              <Info size={20} color="var(--text-muted)" />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Data nutrisi adalah estimasi berdasarkan berat yang dimasukkan.
              </p>
            </div>
          </motion.section>
        )}
      </main>

      <footer style={{ marginTop: '3rem', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        &copy; 2026 NutriScan AI. Didukung oleh YOLOv8.
      </footer>
    </div>
  );
}

export default App;
