class PageConsulter {
    constructor() { this.films = []; this.container = document.getElementById('films-container'); }
    async init() {
        try { this.films = await ApiService.fetchFilmsNowPlaying(); this.afficherFilms(); }
        catch (error) { console.error('Erreur chargement films:', error); }
    }
    afficherFilms() {
        if (!this.container) return;
        this.container.innerHTML = '';
        this.films.forEach(film => this.container.appendChild(this.creerCarteFilm(film)));
    }
    creerCarteFilm(film) {
        const posterUrl = Utils.getImageUrl(film);
        const img = Utils.createElement('img', { attributes: { src: posterUrl, alt: film.title } });
        img.onerror = () => { img.src = Utils.createMoviePoster(film.title, 200, 300); };
        const info = Utils.createElement('div', {
            className: 'film-info',
            innerHTML: `<h3>${film.title}</h3><div class="note">⭐ ${film.vote_average ? film.vote_average.toFixed(1) : 'N/A'}/10</div><div class="date">${Utils.formaterDate(film.release_date)}</div>`
        });
        const card = Utils.createElement('div', { className: 'film-card', style: { cursor: 'pointer' }, onClick: () => this.selectionnerFilm(film) });
        card.appendChild(img); card.appendChild(info);
        return card;
    }
    selectionnerFilm(film) {
        StorageManager.session.set('filmSelectionne', film);
        StorageManager.session.remove('siegesSelectionnes');
        window.location.href = 'reserver.html';
    }
}

class PageReserver {
    constructor() { this.filmSelectionne = null; this.siegesSelectionnes = []; this.siegeManager = new SiegeManager(); }
    async init() {
        this.filmSelectionne = StorageManager.session.get('filmSelectionne');
        if (!this.filmSelectionne) { window.location.href = 'index.html'; return; }
        await this.siegeManager.chargerReservations();
        this.afficherDetailFilm(); this.genererPlanSalle(); this.restaurerSelection();
    }
    afficherDetailFilm() {
        const container = document.getElementById('film-info');
        const titleEl = document.getElementById('selected-film-title');
        if (titleEl) titleEl.textContent = this.filmSelectionne.title;
        if (!container) return;
        const posterUrl = Utils.getImageUrl(this.filmSelectionne);
        const img = Utils.createElement('img', { attributes: { src: posterUrl, alt: this.filmSelectionne.title } });
        img.onerror = () => { img.src = Utils.createMoviePoster(this.filmSelectionne.title, 150, 225); };
        const details = Utils.createElement('div', {
            className: 'details',
            innerHTML: `<p><strong>Note:</strong> ⭐ ${this.filmSelectionne.vote_average ? this.filmSelectionne.vote_average.toFixed(1) : 'N/A'}/10</p><p><strong>Date:</strong> ${Utils.formaterDate(this.filmSelectionne.release_date)}</p><p class="synopsis">${this.filmSelectionne.overview || 'Synopsis non disponible.'}</p>`
        });
        container.innerHTML = ''; container.appendChild(img); container.appendChild(details);
    }
    genererPlanSalle() {
        this.siegeManager.genererPlanSalle('plan-salle', this.filmSelectionne.id, this.siegesSelectionnes, { onClick: (siegeId) => this.toggleSiege(siegeId) });
    }
    restaurerSelection() {
        const sauvegarde = StorageManager.session.get('siegesSelectionnes');
        if (sauvegarde) {
            this.siegesSelectionnes = sauvegarde;
            requestAnimationFrame(() => {
                this.siegesSelectionnes.forEach(siegeId => {
                    const el = document.querySelector(`#plan-salle [data-siege="${siegeId}"]`);
                    if (el && !el.classList.contains('reservee')) { el.classList.remove('dispo'); el.classList.add('selectionnee'); }
                });
                this.mettreAJourPanier();
            });
        }
    }
    toggleSiege(siegeId) {
        const index = this.siegesSelectionnes.indexOf(siegeId);
        const el = document.querySelector(`#plan-salle [data-siege="${siegeId}"]`);
        if (!el) return;
        if (index > -1) { this.siegesSelectionnes.splice(index, 1); el.classList.remove('selectionnee'); el.classList.add('dispo'); }
        else { this.siegesSelectionnes.push(siegeId); el.classList.remove('dispo'); el.classList.add('selectionnee'); }
        StorageManager.session.set('siegesSelectionnes', this.siegesSelectionnes);
        this.mettreAJourPanier();
    }
    mettreAJourPanier() {
        const vide = document.getElementById('panier-vide');
        const details = document.getElementById('panier-details');
        if (!vide || !details) return;
        const aDesSieges = this.siegesSelectionnes.length > 0;
        vide.classList.toggle('hidden', aDesSieges); details.classList.toggle('hidden', !aDesSieges);
        if (aDesSieges) {
            document.getElementById('panier-film').textContent = this.filmSelectionne.title;
            document.getElementById('panier-sieges').textContent = this.siegesSelectionnes.join(', ');
            document.getElementById('panier-total').textContent = this.siegesSelectionnes.length * CONFIG.PRIX_PLACE;
        }
    }
    annuler() {
        this.siegesSelectionnes = [];
        StorageManager.session.remove('siegesSelectionnes');
        StorageManager.session.remove('filmSelectionne');
        window.location.href = 'index.html';
    }
    allerPayer() {
        if (this.siegesSelectionnes.length === 0 || !this.filmSelectionne) { alert('Veuillez sélectionner au moins un siège.'); return; }
        StorageManager.session.set('enPaiement', true);
        window.location.href = 'payer.html';
    }
}

class PagePayer {
    constructor() {
        this.filmSelectionne = null;
        this.siegesSelectionnes = [];
        this.reservationService = new ReservationService();
    }
    init() {
        this.filmSelectionne = StorageManager.session.get('filmSelectionne');
        this.siegesSelectionnes = StorageManager.session.get('siegesSelectionnes');
        if (!this.filmSelectionne || !this.siegesSelectionnes) { window.location.href = 'index.html'; return; }
        this.afficherRecap(); this.configurerFormulaire();
    }
    afficherRecap() {
        const total = this.siegesSelectionnes.length * CONFIG.PRIX_PLACE;
        document.getElementById('pay-film').textContent = this.filmSelectionne.title;
        document.getElementById('pay-sieges').textContent = this.siegesSelectionnes.join(', ');
        document.getElementById('pay-nb-places').textContent = this.siegesSelectionnes.length;
        document.getElementById('pay-total').textContent = total;
        const btnPayer = document.getElementById('btn-payer');
        if (btnPayer) btnPayer.textContent = `✅ Payer maintenant (${total}€)`;
    }
    configurerFormulaire() {
        const carteInput = document.getElementById('pay-numero');
        const dateInput = document.getElementById('pay-date');
        if (carteInput) carteInput.addEventListener('input', () => Utils.formaterCarte(carteInput));
        if (dateInput) dateInput.addEventListener('input', () => Utils.formaterDateExp(dateInput));
        document.getElementById('btn-payer')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.effectuerPaiement();
        });
        document.getElementById('btn-retour')?.addEventListener('click', () => this.retourReserver());
    }
    async effectuerPaiement() {
        const nom = document.getElementById('pay-nom').value.trim();
        const numero = document.getElementById('pay-numero').value.replace(/\s/g, '');
        const dateExp = document.getElementById('pay-date').value;
        const cvv = document.getElementById('pay-cvv').value;

        const erreurs = [];
        if (!nom) erreurs.push('Veuillez entrer le nom sur la carte.');
        if (!Utils.validerCarte(numero)) erreurs.push('Le numéro de carte doit contenir 16 chiffres.');
        if (!Utils.validerDateExpiration(dateExp)) erreurs.push('Veuillez entrer une date d\'expiration valide (MM/AA) non expirée.');
        if (!Utils.validerCVV(cvv)) erreurs.push('Le CVV doit contenir 3 chiffres.');

        if (erreurs.length > 0) { alert('⚠️ ' + erreurs.join('\n')); return; }

        const btnPayer = document.getElementById('btn-payer');
        btnPayer.textContent = '⏳ Traitement du paiement...';
        btnPayer.disabled = true;

        try {
            await this.simulerPaiement();
            const reservation = await this.reservationService.creerReservation(
                this.filmSelectionne, this.siegesSelectionnes, { nom, carteFin: numero.slice(-4) }
            );

            alert('✅ PAIEMENT EFFECTUÉ AVEC SUCCÈS !\n\n' +
                  '🎬 Film : ' + reservation.filmTitre + '\n' +
                  '🪑 Sièges : ' + reservation.sieges.join(', ') + '\n' +
                  '💰 Total payé : ' + reservation.total + ' €\n' +
                  '💳 Carte : **** **** **** ' + reservation.paiement.carteFin + '\n\n' +
                  'Votre réservation est enregistrée !');

            // Nettoyer la session
            StorageManager.session.remove('filmSelectionne');
            StorageManager.session.remove('siegesSelectionnes');
            StorageManager.session.remove('enPaiement');

            // 🔴 Redirection directe vers l'accueil (pas de confirmer.html)
            window.location.href = 'index.html';

        } catch (error) {
            alert('❌ Erreur lors du paiement. Veuillez réessayer.');
            btnPayer.textContent = '✅ Payer maintenant';
            btnPayer.disabled = false;
        }
    }
    simulerPaiement() { return new Promise(resolve => setTimeout(resolve, 2000)); }
    retourReserver() {
        StorageManager.session.remove('enPaiement');
        window.location.href = 'reserver.html';
    }
}

// ❌ PageConfirmer SUPPRIMÉE - plus besoin

class PageConsulterReservations {
    constructor() {
        this.reservationService = new ReservationService();
        this.siegeManager = new SiegeManager();
        this.reservationEnModification = null;
        this.siegesOriginaux = [];
        this.siegesModifies = [];
    }
    async init() {
        await this.reservationService.chargerReservations();
        this.siegeManager.reservations = this.reservationService.reservations;
        this.afficherReservations();
    }
    afficherReservations() {
        const container = document.getElementById('liste-reservations');
        if (!container) return;
        const reservations = this.reservationService.reservations;
        if (reservations.length === 0) {
            container.innerHTML = '<p class="loading">Aucune réservation enregistrée. <a href="index.html">Réservez maintenant !</a></p>';
            return;
        }
        container.innerHTML = '';
        [...reservations].reverse().forEach(resa => container.appendChild(this.creerElementReservation(resa)));
    }
    creerElementReservation(resa) {
        const statutHtml = resa.paye ? '<span class="statut-paiement statut-paye">✅ Payée</span>' : '<span class="statut-paiement statut-en-attente">⏳ En attente</span>';
        const paiementHtml = resa.paye ? `<p><strong>💳 Paiement :</strong> **** **** **** ${resa.paiement.carteFin}</p>` : '';
        return Utils.createElement('div', {
            className: `reservation-item${resa.paye ? ' payee' : ''}`,
            attributes: { 'data-resa-id': resa.id },
            innerHTML: `<h4>${resa.filmTitre}</h4><p><strong>Sièges:</strong> ${resa.sieges.join(', ')}</p><p><strong>Total:</strong> ${resa.total} €</p>${paiementHtml}<p class="date-resa">${resa.date}</p>${statutHtml}<div class="reservation-actions"><button class="btn-modifier" data-action="modifier" data-id="${resa.id}">✏️ Modifier</button><button class="btn-supprimer" data-action="annuler" data-id="${resa.id}">🗑️ Annuler</button></div>`
        });
    }
    async annulerReservation(id) {
        const resa = this.reservationService.getReservationById(id);
        if (!resa) return;
        const confirmation = confirm(`🗑️ ANNULER cette réservation ?\n\nFilm: ${resa.filmTitre}\nSièges: ${resa.sieges.join(', ')}\nTotal: ${resa.total} €${resa.paye ? '\n\n⚠️ Un remboursement sera effectué.' : ''}`);
        if (confirmation) {
            await this.reservationService.annulerReservation(id);
            this.afficherReservations();
            alert('✅ Réservation ANNULÉE avec succès !');
        }
    }
    async ouvrirModification(id) {
        this.reservationEnModification = this.reservationService.getReservationById(id);
        if (!this.reservationEnModification) return;
        this.siegesOriginaux = [...this.reservationEnModification.sieges];
        this.siegesModifies = [...this.reservationEnModification.sieges];
        document.getElementById('modal-modif').classList.remove('hidden');
        document.getElementById('modif-info').innerHTML = `<p><strong>Film:</strong> ${this.reservationEnModification.filmTitre}</p><p><strong>Sièges actuels:</strong> ${this.siegesOriginaux.join(', ')}</p><p><strong>Total actuel:</strong> ${this.reservationEnModification.total} €</p>`;
        this.genererPlanModification(); this.mettreAJourRecapModification();
    }
    genererPlanModification() {
        this.siegeManager.genererPlanSalle('modif-plan-salle', this.reservationEnModification.filmId, this.siegesModifies, {
            modeModification: true, exclureId: this.reservationEnModification.id,
            siegesOriginaux: this.siegesOriginaux, siegesModifies: this.siegesModifies,
            onClick: (siegeId) => this.toggleSiegeModification(siegeId)
        });
    }
    toggleSiegeModification(siegeId) {
        const index = this.siegesModifies.indexOf(siegeId);
        const el = document.querySelector(`[data-siege-modif="${siegeId}"]`);
        if (!el) return;
        if (index > -1) {
            this.siegesModifies.splice(index, 1);
            if (this.siegesOriginaux.includes(siegeId)) el.classList.replace('garde', 'retiree');
            else el.classList.replace('nouvelle', 'dispo');
        } else {
            this.siegesModifies.push(siegeId);
            if (this.siegesOriginaux.includes(siegeId)) el.classList.replace('retiree', 'garde');
            else el.classList.replace('dispo', 'nouvelle');
        }
        this.mettreAJourRecapModification();
    }
    mettreAJourRecapModification() {
        document.getElementById('modif-sieges-actuels').textContent = this.siegesModifies.join(', ') || 'Aucun';
        document.getElementById('modif-total').textContent = this.siegesModifies.length * CONFIG.PRIX_PLACE;
    }
    async confirmerModification() {
        if (this.siegesModifies.length === 0) { alert('⚠️ Vous devez garder au moins un siège !'); return; }
        try {
            await this.reservationService.modifierSieges(this.reservationEnModification.id, this.siegesModifies);
            await this.reservationService.chargerReservations();
            this.siegeManager.reservations = this.reservationService.reservations;
            this.afficherReservations(); this.fermerModal();
            const ajoutes = this.siegesModifies.filter(s => !this.siegesOriginaux.includes(s));
            const retires = this.siegesOriginaux.filter(s => !this.siegesModifies.includes(s));
            let message = '✅ MODIFICATION enregistrée !\n\n';
            if (ajoutes.length > 0) message += `➕ Ajoutés: ${ajoutes.join(', ')}\n`;
            if (retires.length > 0) message += `➖ Retirés: ${retires.join(', ')}\n`;
            message += `💰 Nouveau total: ${this.siegesModifies.length * CONFIG.PRIX_PLACE} €`;
            alert(message);
        } catch (error) { alert('❌ Erreur: ' + error.message); }
    }
    fermerModal() {
        document.getElementById('modal-modif').classList.add('hidden');
        this.reservationEnModification = null; this.siegesOriginaux = []; this.siegesModifies = [];
    }
}

class AppRouter {
    constructor() {
        this.pages = {
            'index.html': PageConsulter, '': PageConsulter,
            'reserver.html': PageReserver, 'payer.html': PagePayer,
            // ❌ 'confirmer.html': PageConfirmer SUPPRIMÉ
            'consulter.html': PageConsulterReservations
        };
    }
    async init() {
        const page = window.location.pathname.split('/').pop() || 'index.html';
        const PageClass = this.pages[page];
        if (PageClass) {
            const instance = new PageClass();
            this.configurerDelegationEvenements(instance);
            if (instance.init) await instance.init();
        }
    }
    configurerDelegationEvenements(instance) {
        document.addEventListener('click', async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action; const id = target.dataset.id;
            if (action === 'annuler') { e.preventDefault(); await instance.annulerReservation?.(id); }
            else if (action === 'modifier') { e.preventDefault(); await instance.ouvrirModification?.(id); }
        });
        document.getElementById('btn-annuler-reservation')?.addEventListener('click', () => instance.annuler?.());
        document.getElementById('btn-payer')?.addEventListener('click', (e) => { e.preventDefault(); instance.allerPayer?.(); });
        document.getElementById('btn-retour')?.addEventListener('click', () => instance.retourReserver?.());
        document.getElementById('btn-confirmer-modif')?.addEventListener('click', () => instance.confirmerModification?.());
        document.getElementById('btn-fermer-modal')?.addEventListener('click', () => instance.fermerModal?.());
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const router = new AppRouter();
    await router.init();
});git 