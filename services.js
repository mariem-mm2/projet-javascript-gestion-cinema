class SiegeManager {
    constructor() { this.reservations = []; }
    async chargerReservations() { this.reservations = await storage.getReservations(); }
    getSiegesReservesPourFilm(filmId, exclureId = null) {
        return this.reservations.filter(r => r.filmId === filmId && r.id !== exclureId).flatMap(r => r.sieges);
    }
    genererPlanSalle(containerId, filmId, siegesSelectionnes = [], options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        const siegesReserves = this.getSiegesReservesPourFilm(filmId, options.exclureId);
        for (let r = 0; r < CONFIG.NB_RANGES; r++) {
            const rangee = Utils.createElement('div', { className: 'rangee' });
            const label = Utils.createElement('div', { className: 'rangee-label', textContent: String.fromCharCode(65 + r) });
            rangee.appendChild(label);
            for (let s = 1; s <= CONFIG.NB_SIEGES_PAR_RANGE; s++) {
                const siegeId = String.fromCharCode(65 + r) + s;
                const siege = this.creerSiegeElement(siegeId, siegesReserves, siegesSelectionnes, options);
                rangee.appendChild(siege);
            }
            container.appendChild(rangee);
        }
        const ecran = Utils.createElement('div', {
            style: { width: '80%', height: '10px', background: 'linear-gradient(90deg, transparent, #fff, transparent)', marginTop: '20px', borderRadius: '5px', opacity: '0.5' },
            innerHTML: '<div style="text-align:center; color:#666; font-size:0.8em; margin-top:15px;">ÉCRAN</div>'
        });
        container.appendChild(ecran);
    }
    creerSiegeElement(siegeId, siegesReserves, siegesSelectionnes, options = {}) {
        const { onClick, modeModification = false, siegesOriginaux = [], siegesModifies = [] } = options;
        const siege = Utils.createElement('div', { className: 'place', textContent: siegeId.slice(1), attributes: { 'data-siege': siegeId } });
        if (siegesReserves.includes(siegeId)) {
            siege.classList.add('reservee');
        } else if (modeModification) {
            this.appliquerStyleModification(siege, siegeId, siegesOriginaux, siegesModifies, onClick);
        } else {
            const estSelectionne = siegesSelectionnes.includes(siegeId);
            siege.classList.add(estSelectionne ? 'selectionnee' : 'dispo');
            if (onClick) siege.addEventListener('click', () => onClick(siegeId));
        }
        return siege;
    }
    appliquerStyleModification(siege, siegeId, originaux, modifies, onClick) {
        if (originaux.includes(siegeId) && modifies.includes(siegeId)) siege.classList.add('garde');
        else if (originaux.includes(siegeId) && !modifies.includes(siegeId)) siege.classList.add('retiree');
        else if (!originaux.includes(siegeId) && modifies.includes(siegeId)) siege.classList.add('nouvelle');
        else siege.classList.add('dispo');
        if (onClick) siege.addEventListener('click', () => onClick(siegeId));
    }
}

class ReservationService {
    constructor() { this.reservations = []; }
    async chargerReservations() { this.reservations = await storage.getReservations(); return this.reservations; }
    async creerReservation(film, sieges, paiementInfo) {
        const reservation = {
            id: Utils.generateId(), filmId: film.id, filmTitre: film.title, sieges: [...sieges],
            total: sieges.length * CONFIG.PRIX_PLACE, date: new Date().toLocaleString('fr-FR'), paye: true,
            paiement: { nom: paiementInfo.nom, carteFin: paiementInfo.carteFin, datePaiement: new Date().toLocaleString('fr-FR'), montant: (sieges.length * CONFIG.PRIX_PLACE) + '€' }
        };
        await storage.saveReservation(reservation);
        return reservation;
    }
    async annulerReservation(id) {
        await storage.deleteReservation(id);
        this.reservations = this.reservations.filter(r => r.id !== id);
    }
    async modifierSieges(id, nouveauxSieges) {
        const index = this.reservations.findIndex(r => r.id === id);
        if (index === -1) throw new Error('Réservation non trouvée');
        this.reservations[index].sieges = [...nouveauxSieges];
        this.reservations[index].total = nouveauxSieges.length * CONFIG.PRIX_PLACE;
        this.reservations[index].date = new Date().toLocaleString('fr-FR') + ' (modifiée)';
        await storage.saveReservation(this.reservations[index]);
        return this.reservations[index];
    }
    getReservationById(id) { return this.reservations.find(r => r.id === id); }
}