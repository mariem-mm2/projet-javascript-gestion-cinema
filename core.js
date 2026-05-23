const CONFIG = {
    // API 100% GRATUITE SANS CLÉ
    SAMPLE_API: 'https://api.sampleapis.com/movies/animation',
    
    // TMDB images (fonctionne sans clé pour les posters publics)
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p/w500',
    
    PRIX_PLACE: 12,
    NB_RANGES: 5,
    NB_SIEGES_PAR_RANGE: 8,
    DB_NAME: 'CinemaDB',
    DB_VERSION: 1
};

// Fallback local si l'API est indisponible
const FALLBACK_MOVIES = [
    { id: 1, title: "Dune: Partie 2", poster_path: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg", vote_average: 8.2, release_date: "2024-02-28", overview: "Paul Atreides s'unit à Chani et aux Fremen." },
    { id: 2, title: "Godzilla x Kong", poster_path: "/tMefBSflR6PGQLv7WvFPpKLZkyk.jpg", vote_average: 7.5, release_date: "2024-03-27", overview: "Deux titans légendaires s'affrontent." },
    { id: 3, title: "Kung Fu Panda 4", poster_path: "/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg", vote_average: 7.1, release_date: "2024-03-27", overview: "Po doit trouver un nouveau Dragon Warrior." },
    { id: 4, title: "Civil War", poster_path: "/sh7Rg8Er3tFcN9BpKIPOMvALgZd.jpg", vote_average: 7.3, release_date: "2024-04-10", overview: "Une guerre civile éclate aux États-Unis." },
    { id: 5, title: "Monkey Man", poster_path: "/4lhR4L2v8r8LfNdj9z8y8v0j1vF.jpg", vote_average: 7.0, release_date: "2024-04-03", overview: "Un homme en quête de vengeance." },
    { id: 6, title: "Ghostbusters", poster_path: "/6fa0p5K9E9h3x8Y5v9Yh3x8Y5v9.jpg", vote_average: 6.8, release_date: "2024-03-22", overview: "L'équipe de chasseurs de fantômes est de retour." }
];

const Utils = {
    formaterDate(dateStr) {
        if (!dateStr || isNaN(new Date(dateStr).getTime())) return 'Date inconnue';
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    },
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    validerCarte(numero) {
        return /^\d{16}$/.test(numero.replace(/\s/g, ''));
    },
    validerDateExpiration(dateExp) {
        if (!/^\d{2}\/\d{2}$/.test(dateExp)) return false;
        const [mois, annee] = dateExp.split('/').map(Number);
        const dateExpiration = new Date(2000 + annee, mois - 1);
        const now = new Date(); now.setDate(1);
        return dateExpiration >= now && mois >= 1 && mois <= 12;
    },
    validerCVV(cvv) {
        return /^\d{3}$/.test(cvv);
    },
    formaterCarte(input) {
        let valeur = input.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
        let formate = '';
        for (let i = 0; i < valeur.length; i++) {
            if (i > 0 && i % 4 === 0) formate += ' ';
            formate += valeur[i];
        }
        input.value = formate;
    },
    formaterDateExp(input) {
        let valeur = input.value.replace(/[^0-9]/g, '');
        if (valeur.length >= 2) valeur = valeur.substring(0, 2) + '/' + valeur.substring(2, 4);
        input.value = valeur;
    },
    createElement(tag, options = {}) {
        const el = document.createElement(tag);
        if (options.className) el.className = options.className;
        if (options.textContent) el.textContent = options.textContent;
        if (options.innerHTML) el.innerHTML = options.innerHTML;
        if (options.attributes) Object.entries(options.attributes).forEach(([k, v]) => el.setAttribute(k, v));
        if (options.style) Object.assign(el.style, options.style);
        if (options.onClick) el.addEventListener('click', options.onClick);
        return el;
    },
    getImageUrl(film) {
        if (film.poster_path) {
            if (film.poster_path.startsWith('http')) return film.poster_path;
            return CONFIG.TMDB_IMAGE_BASE + film.poster_path;
        }
        return this.createMoviePoster(film.title, 200, 300);
    },
    createMoviePoster(title, width, height) {
        const colors = [['#1a1a2e', '#16213e', '#e94560'], ['#0f3460', '#533483', '#e94560'], ['#1b1b2f', '#4a4e69', '#9a8c98']];
        const colorSet = colors[title.length % colors.length];
        const initial = title.charAt(0).toUpperCase();
        const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colorSet[0]}"/><stop offset="100%" style="stop-color:${colorSet[2]}"/></linearGradient></defs>
            <rect width="100%" height="100%" fill="url(#g)" rx="8"/>
            <text x="50%" y="40%" font-family="Georgia" font-size="${width/3}" fill="rgba(255,255,255,0.9)" text-anchor="middle" font-weight="bold">${initial}</text>
            <text x="50%" y="65%" font-family="Arial" font-size="${width/10}" fill="rgba(255,255,255,0.7)" text-anchor="middle">${title.length > 15 ? title.substring(0,12)+'...' : title}</text>
            <text x="50%" y="80%" font-family="Arial" font-size="${width/14}" fill="rgba(255,255,255,0.5)" text-anchor="middle">🎬 Cinéma</text>
        </svg>`;
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }
};

class StorageManager {
    constructor() { this.db = null; this.initDB(); }
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => { this.db = request.result; resolve(this.db); };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('reservations')) {
                    const store = db.createObjectStore('reservations', { keyPath: 'id' });
                    store.createIndex('filmId', 'filmId', { unique: false });
                }
            };
        });
    }
    async getReservations() {
        if (!this.db) await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['reservations'], 'readonly');
            const store = tx.objectStore('reservations');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }
    async saveReservation(reservation) {
        if (!this.db) await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['reservations'], 'readwrite');
            const store = tx.objectStore('reservations');
            const req = store.put(reservation);
            req.onsuccess = () => resolve(reservation);
            req.onerror = () => reject(req.error);
        });
    }
    async deleteReservation(id) {
        if (!this.db) await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['reservations'], 'readwrite');
            const store = tx.objectStore('reservations');
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
    static session = {
        get(key) { try { const d = sessionStorage.getItem(key); return d ? JSON.parse(d) : null; } catch { return null; } },
        set(key, value) { sessionStorage.setItem(key, JSON.stringify(value)); },
        remove(key) { sessionStorage.removeItem(key); },
        clear() { sessionStorage.clear(); }
    };
}

const storage = new StorageManager();


class ApiService {
    static async fetchFilmsNowPlaying() {
        try {
            const response = await fetch(CONFIG.SAMPLE_API);
            if (!response.ok) throw new Error('Sample API error');
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                return data.slice(0, 6).map((m, index) => ({
                    id: m.id || index + 1,
                    title: m.title || m.name || 'Film sans titre',
                    poster_path: m.posterURL || m.image || null,
                    vote_average: m.rating ? parseFloat(m.rating) / 2 : 7.0, // Convertir /10 en /5
                    release_date: m.year ? `${m.year}-01-01` : '2024-01-01',
                    overview: m.plot || m.description || 'Synopsis non disponible.'
                }));
            }
        } catch (error) {
            console.warn('API externe indisponible (CORS ou erreur), utilisation fallback local:', error);
        }
        
        console.log('Utilisation des données fallback locales');
        return [...FALLBACK_MOVIES];
    }
}