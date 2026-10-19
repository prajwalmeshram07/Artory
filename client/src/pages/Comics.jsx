import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { BookOpen, Heart, Plus, Search, X } from 'lucide-react';
import ImageViewerModal from '../components/ImageViewerModal';
import ReportButton from '../components/ReportButton';
import * as pdfjsLib from 'pdfjs-dist';

// Use a stable CDN for the worker to avoid build/configuration issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const API_BASE = 'http://localhost:5000';

export default function Comics() {
  const [comics, setComics] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', genre: '' });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComic, setSelectedComic] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.get('/comics').then(r => setComics(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    const pdfFile = selectedFiles.find(f => f.type === 'application/pdf');
    
    if (pdfFile) {
      toast.loading('Converting PDF to images...', { id: 'pdf-convert' });
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const images = [];

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: ctx, viewport }).promise;

          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
          const imageFile = new File([blob], `page-${i}.jpg`, { type: 'image/jpeg' });
          images.push(imageFile);
        }
        
        const otherFiles = selectedFiles.filter(f => f !== pdfFile);
        setFiles([...otherFiles, ...images]);
        toast.success('PDF converted successfully!', { id: 'pdf-convert' });
      } catch (err) {
        toast.error('Failed to convert PDF', { id: 'pdf-convert' });
      }
    } else {
      setFiles(selectedFiles);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k,v));
    if (files && files.length > 0) {
      Array.from(files).forEach(f => fd.append('images', f));
    }
    try {
      const r = await api.post('/comics', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
      setComics(prev => [r.data, ...prev]);
      setShowCreate(false);
      setForm({ title: '', description: '', genre: '' });
      setFiles([]);
      toast.success('Comic created!');
    } catch (err) { toast.error('Failed'); }
  };

  const like = async (id, e) => {
    e?.stopPropagation();
    try {
      const r = await api.post(`/comics/${id}/like`);
      setComics(prev => prev.map(c => c._id === id ? { ...c, likes: r.data.liked ? [...(c.likes||[]), 'me'] : (c.likes||[]).slice(0,-1) } : c));
    } catch {}
  };

  const filteredComics = comics.filter(comic =>
    comic.title?.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div><h1 className="text-3xl font-bold text-white">Comics</h1><p className="text-gray-400 mt-1">Read and publish comic series</p></div>
        <button onClick={()=>setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">{showCreate?<><X size={18}/> Cancel</>:<><Plus size={18}/> Publish</>}</button>
      </div>

      <div className="relative mb-8">
        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-surface/30 border border-white/10 rounded-2xl pl-14 pr-5 py-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50"
          placeholder="Search comics by name..."
        />
      </div>

      {showCreate && (
        <form onSubmit={create} className="card mb-8 space-y-4 animate-slide-up">
          <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="input" placeholder="Comic title" required />
          <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="input h-20 resize-none" placeholder="Description" />
          <input value={form.genre} onChange={e=>setForm({...form,genre:e.target.value})} className="input" placeholder="Genre" />
          <input type="file" accept="image/*,application/pdf" multiple onChange={handleFileChange} className="input" />
          <button type="submit" className="btn-primary">Create Comic</button>
        </form>
      )}

      {loading ? <div className="flex justify-center py-20"><div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin"/></div>
      : filteredComics.length===0 ? <div className="text-center py-20 card"><p className="text-5xl mb-3">📚</p><p className="text-gray-400">No comics yet</p></div>
      : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredComics.map(c=>(
            <div key={c._id} className="card group hover:border-accent/40 cursor-pointer" onClick={() => setSelectedComic({ ...c, artist: c.creator, imageUrl: c.coverImage, images: c.images })}>
              <div className="aspect-[3/4] rounded-xl overflow-hidden mb-4 bg-dark-border">
                {c.coverImage ? <img src={c.coverImage.startsWith('http')?c.coverImage:`${API_BASE}${c.coverImage}`} alt={c.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={48} className="text-gray-600"/></div>}
              </div>
              <h3 className="font-bold text-white mb-1">{c.title}</h3>
              <p className="text-xs text-gray-500 mb-2">by {c.creator?.username || 'Unknown'}</p>
              {c.genre && <span className="badge bg-accent/20 text-accent mb-3 inline-block">{c.genre}</span>}
              <div className="flex justify-between items-center pt-3 border-t border-dark-border">
                <button onClick={(e)=>like(c._id, e)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-400 transition-colors"><Heart size={14}/> {c.likes?.length||0}</button>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{c.episodes?.length||0} episodes</span>
                  <ReportButton targetType="comic" targetId={c._id} compact />
                </div>
              </div>
            </div>
          ))}
        </div>}
        
      <ImageViewerModal 
        isOpen={!!selectedComic} 
        onClose={() => setSelectedComic(null)} 
        artwork={selectedComic} 
        reportTargetType="comic" 
        onDeleted={(id) => setComics(prev => prev.filter(c => c._id !== id))}
      />
    </div>
  );
}
