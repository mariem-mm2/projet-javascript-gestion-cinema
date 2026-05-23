// ============================================
// CINEMA GESTION - Architecture orientee ACTIONS CLIENT
// Actions: CONSULTER, RESERVER, PAYER, CONFIRMER, MODIFIER, ANNULER
// ============================================

const API_KEY = 'demo_key';
const API_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const PRIX_PLACE = 12;

let films = [];
let filmSelectionne = null;
let siegesSelectionnes = [];
let reservations = [];
let reservationEnModification = null;
let siegesOriginaux = [];
let siegesModifies = [];

const NB_RANGES = 5;
const NB_SIEGES_PAR_RANGE = 8;

// ============================================
// INITIALISATION - Detection de la page par action
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    chargerReservations();

    // Detecter la page actuelle
    const page = window.location.pathname.split('/').pop() || 'index.html';

    // Nouvelle architecture orientee actions
    if (page === 'index.html' || page === '') {
        initConsulterFilms();      // ACTION: CONSULTER les films
    } else if (page === 'reserver.html') {
        initReserver();             // ACTION: RESERVER (choisir sieges)
    } else if (page === 'payer.html') {
        initPayer();                // ACTION: PAYER
    } else if (page === 'confirmer.html') {
        initConfirmer();            // ACTION: CONFIRMER
    } else if (page === 'consulter.html') {
        initConsulterReservations(); // ACTION: CONSULTER + MODIFIER + ANNULER
    }
});

// ============================================
// ACTION: CONSULTER - Page index.html
// Affiche la grille de films disponibles
// ============================================
function initConsulterFilms() {
    chargerFilms();
}

function chargerFilms() {
    const xhr = new XMLHttpRequest();
    const url = API_BASE + '/movie/now_playing?api_key=' + API_KEY + '&language=fr-FR&page=1&region=FR';

    const fallbackFilms = [
        { id: 1, title: "Dune: Partie 2", poster_path: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg", vote_average: 8.2, release_date: "2024-02-28", overview: "Paul Atreides s'unit a Chani et aux Fremen pour mener la revolte." },
        { id: 2, title: "Godzilla x Kong", poster_path: "/tMefBSflR6PGQLv7WvFPpKLZkyk.jpg", vote_average: 7.5, release_date: "2024-03-27", overview: "Deux titans legendaires s'affrontent dans une bataille epique." },
        { id: 3, title: "Kung Fu Panda 4", poster_path: "/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg", vote_average: 7.1, release_date: "2024-03-27", overview: "Po doit trouver et former un nouveau Dragon Warrior." },
        { id: 4, title: "Civil War", poster_path: "/sh7Rg8Er3tFcN9BpKIPOMvALgZd.jpg", vote_average: 7.3, release_date: "2024-04-10", overview: "Une guerre civile eclate aux Etats-Unis d'Amerique." },
        { id: 5, title: "Monkey Man", poster_path: "/4lhR4L2v8r8LfNdj9z8y8v0j1vF.jpg", vote_average: 7.0, release_date: "2024-04-03", overview: "Un homme en quete de vengeance contre ceux qui l'ont blesse." },
        { id: 6, title: "Ghostbusters", poster_path: "/6fa0p5K9E9h3x8Y5v9Yh3x8Y5v9.jpg", vote_average: 6.8, release_date: "2024-03-22", overview: "L'equipe de chasseurs de fantomes est de retour." }
    ];

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    films = data.results.slice(0, 6);
                    afficherFilms();
                } catch (e) {
                    utiliserFallback(fallbackFilms);
                }
            } else {
                utiliserFallback(fallbackFilms);
            }
        }
    };

    xhr.onerror = function() {
        utiliserFallback(fallbackFilms);
    };

    xhr.open('GET', url, true);
    xhr.send();
}

function utiliserFallback(data) {
    films = data;
    afficherFilms();
}

function afficherFilms() {
    const container = document.getElementById('films-container');
    if (!container) return;

    container.innerHTML = '';

    films.forEach(function(film) {
        const card = document.createElement('div');
        card.className = 'film-card';
        card.style.cursor = 'pointer';

        // CONSULTER -> RESERVER: Stocker film puis aller a reserver.html
        card.onclick = function() {
            sessionStorage.setItem('filmSelectionne', JSON.stringify(film));
            sessionStorage.removeItem('siegesSelectionnes');
            window.location.href = 'reserver.html';
        };

        const imageUrl = film.poster_path 
            ? (film.poster_path.startsWith('http') ? film.poster_path : IMAGE_BASE + film.poster_path)
            : 'https://via.placeholder.com/200x300?text=Pas+d\'affiche';

        card.innerHTML = '<img src="' + imageUrl + '" alt="' + film.title + '" onerror="this.src=\'https://via.placeholder.com/200x300?text=Image+indisponible\'">' +
            '<div class="film-info">' +
            '<h3>' + film.title + '</h3>' +
            '<div class="note">⭐ ' + (film.vote_average ? film.vote_average.toFixed(1) : 'N/A') + '/10</div>' +
            '<div class="date">' + formaterDate(film.release_date) + '</div>' +
            '</div>';

        container.appendChild(card);
    });
}

function formaterDate(dateStr) {
    if (!dateStr) return 'Date inconnue';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ============================================
// ACTION: RESERVER - Page reserver.html
// Choisir les sieges pour le film selectionne
// ============================================
function initReserver() {
    const filmData = sessionStorage.getItem('filmSelectionne');
    if (filmData) {
        filmSelectionne = JSON.parse(filmData);
        afficherDetailFilmReserver();
        genererPlanSalleReserver();

        const siegesData = sessionStorage.getItem('siegesSelectionnes');
        if (siegesData) {
            siegesSelectionnes = JSON.parse(siegesData);
            setTimeout(function() {
                siegesSelectionnes.forEach(function(siegeId) {
                    const el = document.querySelector('#plan-salle [data-siege="' + siegeId + '"]');
                    if (el && !el.classList.contains('reservee')) {
                        el.classList.remove('dispo');
                        el.classList.add('selectionnee');
                    }
                });
                mettreAJourPanierReserver();
            }, 100);
        }
    } else {
        window.location.href = 'index.html';
    }
}

function afficherDetailFilmReserver() {
    const container = document.getElementById('film-info');
    if (!container || !filmSelectionne) return;

    document.getElementById('selected-film-title').textContent = filmSelectionne.title;

    const imageUrl = filmSelectionne.poster_path
        ? (filmSelectionne.poster_path.startsWith('http') ? filmSelectionne.poster_path : IMAGE_BASE + filmSelectionne.poster_path)
        : 'https://via.placeholder.com/150x225?text=Pas+d\'affiche';

    container.innerHTML = '<img src="' + imageUrl + '" alt="' + filmSelectionne.title + '" onerror="this.src=\'https://via.placeholder.com/150x225?text=Image+indisponible\'">' +
        '<div class="details">' +
        '<p><strong>Note:</strong> ⭐ ' + (filmSelectionne.vote_average ? filmSelectionne.vote_average.toFixed(1) : 'N/A') + '/10</p>' +
        '<p><strong>Date de sortie:</strong> ' + formaterDate(filmSelectionne.release_date) + '</p>' +
        '<p class="synopsis">' + (filmSelectionne.overview || 'Synopsis non disponible.') + '</p>' +
        '</div>';
}

function genererPlanSalleReserver() {
    const container = document.getElementById('plan-salle');
    if (!container || !filmSelectionne) return;

    container.innerHTML = '';

    const siegesReserves = getSiegesReservesPourFilm(filmSelectionne.id);

    for (let r = 0; r < NB_RANGES; r++) {
        const rangee = document.createElement('div');
        rangee.className = 'rangee';

        const label = document.createElement('div');
        label.className = 'rangee-label';
        label.textContent = String.fromCharCode(65 + r);
        rangee.appendChild(label);

        for (let s = 1; s <= NB_SIEGES_PAR_RANGE; s++) {
            const siegeId = String.fromCharCode(65 + r) + s;
            const siege = document.createElement('div');
            siege.className = 'place';
            siege.textContent = s;
            siege.setAttribute('data-siege', siegeId);

            if (siegesReserves.includes(siegeId)) {
                siege.classList.add('reservee');
            } else {
                siege.classList.add('dispo');
                siege.onclick = function() { toggleSiegeReserver(siegeId); };
            }

            rangee.appendChild(siege);
        }

        container.appendChild(rangee);
    }

    const ecran = document.createElement('div');
    ecran.style.cssText = 'width: 80%; height: 10px; background: linear-gradient(90deg, transparent, #fff, transparent); margin-top: 20px; border-radius: 5px; opacity: 0.5;';
    ecran.innerHTML = '<div style="text-align:center; color:#666; font-size:0.8em; margin-top:15px;">ECRAN</div>';
    container.appendChild(ecran);
}

function getSiegesReservesPourFilm(filmId, exclureReservationId) {
    const reserves = [];
    reservations.forEach(function(resa) {
        if (resa.filmId === filmId && resa.id !== exclureReservationId) {
            reserves.push.apply(reserves, resa.sieges);
        }
    });
    return reserves;
}

function toggleSiegeReserver(siegeId) {
    const siegeElement = document.querySelector('#plan-salle [data-siege="' + siegeId + '"]');
    if (!siegeElement) return;

    if (siegesSelectionnes.includes(siegeId)) {
        siegesSelectionnes = siegesSelectionnes.filter(function(s) { return s !== siegeId; });
        siegeElement.classList.remove('selectionnee');
        siegeElement.classList.add('dispo');
    } else {
        siegesSelectionnes.push(siegeId);
        siegeElement.classList.remove('dispo');
        siegeElement.classList.add('selectionnee');
    }

    sessionStorage.setItem('siegesSelectionnes', JSON.stringify(siegesSelectionnes));
    mettreAJourPanierReserver();
}

function mettreAJourPanierReserver() {
    const vide = document.getElementById('panier-vide');
    const details = document.getElementById('panier-details');
    if (!vide || !details) return;

    if (siegesSelectionnes.length === 0) {
        vide.classList.remove('hidden');
        details.classList.add('hidden');
    } else {
        vide.classList.add('hidden');
        details.classList.remove('hidden');

        document.getElementById('panier-film').textContent = filmSelectionne.title;
        document.getElementById('panier-sieges').textContent = siegesSelectionnes.join(', ');
        document.getElementById('panier-total').textContent = (siegesSelectionnes.length * PRIX_PLACE);
    }
}

function annulerReservation() {
    siegesSelectionnes = [];
    sessionStorage.removeItem('siegesSelectionnes');
    sessionStorage.removeItem('filmSelectionne');
    window.location.href = 'index.html';
}

// RESERVER -> PAYER
function allerPayer() {
    if (siegesSelectionnes.length === 0 || !filmSelectionne) return;
    sessionStorage.setItem('enPaiement', 'true');
    window.location.href = 'payer.html';
}

function retourReserver() {
    sessionStorage.removeItem('enPaiement');
    window.location.href = 'reserver.html';
}

// ============================================
// ACTION: PAYER - Page payer.html
// Formulaire de paiement securise
// ============================================
function initPayer() {
    const filmData = sessionStorage.getItem('filmSelectionne');
    const siegesData = sessionStorage.getItem('siegesSelectionnes');

    if (!filmData || !siegesData) {
        window.location.href = 'index.html';
        return;
    }

    filmSelectionne = JSON.parse(filmData);
    siegesSelectionnes = JSON.parse(siegesData);

    document.getElementById('pay-film').textContent = filmSelectionne.title;
    document.getElementById('pay-sieges').textContent = siegesSelectionnes.join(', ');
    document.getElementById('pay-nb-places').textContent = siegesSelectionnes.length;
    document.getElementById('pay-total').textContent = (siegesSelectionnes.length * PRIX_PLACE);
    
    // Mettre a jour le bouton avec le montant
    const btnPayer = document.getElementById('btn-payer');
    if (btnPayer) {
        btnPayer.textContent = '✅ Payer maintenant (' + (siegesSelectionnes.length * PRIX_PLACE) + '€)';
    }
}

function formaterCarte(input) {
    let valeur = input.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
    let formate = '';
    for (let i = 0; i < valeur.length; i++) {
        if (i > 0 && i % 4 === 0) formate += ' ';
        formate += valeur[i];
    }
    input.value = formate;
}

function formaterDateExp(input) {
    let valeur = input.value.replace(/[^0-9]/g, '');
    if (valeur.length >= 2) {
        valeur = valeur.substring(0, 2) + '/' + valeur.substring(2, 4);
    }
    input.value = valeur;
}

function effectuerPaiement() {
    const nom = document.getElementById('pay-nom').value.trim();
    const numero = document.getElementById('pay-numero').value.replace(/\s/g, '');
    const dateExp = document.getElementById('pay-date').value;
    const cvv = document.getElementById('pay-cvv').value;

    // Validation
    if (!nom) {
        alert('⚠️ Veuillez entrer le nom sur la carte.');
        return;
    }
    if (numero.length < 16) {
        alert('⚠️ Le numero de carte doit contenir 16 chiffres.');
        return;
    }
    if (!/^\d{2}\/\d{2}$/.test(dateExp)) {
        alert('⚠️ Veuillez entrer une date d\'expiration valide (MM/AA).');
        return;
    }
    if (cvv.length < 3) {
        alert('⚠️ Le CVV doit contenir 3 chiffres.');
        return;
    }

    // Verifier que la date n'est pas expiree
    const [mois, annee] = dateExp.split('/');
    const dateExpiration = new Date(2000 + parseInt(annee), parseInt(mois));
    if (dateExpiration < new Date()) {
        alert('⚠️ Votre carte a expiree.');
        return;
    }

    const btnPayer = document.getElementById('btn-payer');
    btnPayer.textContent = '⏳ Traitement du paiement...';
    btnPayer.disabled = true;

    // Simuler le traitement du paiement
    setTimeout(function() {
        finaliserPaiement(nom, numero.slice(-4));
    }, 2000);
}

function finaliserPaiement(nomCarte, derniersChiffres) {
    const reservation = {
        id: Date.now(),
        filmId: filmSelectionne.id,
        filmTitre: filmSelectionne.title,
        sieges: siegesSelectionnes.slice(),
        total: siegesSelectionnes.length * PRIX_PLACE,
        date: new Date().toLocaleString('fr-FR'),
        paye: true,
        paiement: {
            nom: nomCarte,
            carteFin: derniersChiffres,
            datePaiement: new Date().toLocaleString('fr-FR'),
            montant: siegesSelectionnes.length * PRIX_PLACE + '€'
        }
    };

    reservations.push(reservation);
    localStorage.setItem('reservations', JSON.stringify(reservations));

    sessionStorage.setItem('confirmationData', JSON.stringify(reservation));

    // PAYER -> CONFIRMER
    window.location.href = 'confirmer.html';
}

// ============================================
// ACTION: CONFIRMER - Page confirmer.html
// Affiche le recapitulatif de la reservation payee
// ============================================
function initConfirmer() {
    const confirmationData = sessionStorage.getItem('confirmationData');
    if (confirmationData) {
        const data = JSON.parse(confirmationData);
        document.getElementById('confirm-details').innerHTML = 
            '<p><strong>🎬 Film :</strong> <span>' + data.filmTitre + '</span></p>' +
            '<p><strong>🪑 Sieges :</strong> <span>' + data.sieges.join(', ') + '</span></p>' +
            '<p><strong>💰 Total paye :</strong> <span>' + data.total + ' €</span></p>' +
            '<p><strong>💳 Carte :</strong> <span>**** **** **** ' + data.paiement.carteFin + '</span></p>' +
            '<p><strong>📅 Date :</strong> <span>' + data.paiement.datePaiement + '</span></p>';

        sessionStorage.removeItem('confirmationData');
        sessionStorage.removeItem('filmSelectionne');
        sessionStorage.removeItem('siegesSelectionnes');
        sessionStorage.removeItem('enPaiement');
    } else {
        window.location.href = 'index.html';
    }
}

// ============================================
// ACTION: CONSULTER RESERVATIONS - Page consulter.html
// Affiche, modifie et annule les reservations
// ============================================
function initConsulterReservations() {
    afficherReservationsConsulter();
}

function chargerReservations() {
    const data = localStorage.getItem('reservations');
    if (data) {
        try {
            reservations = JSON.parse(data);
        } catch (e) {
            reservations = [];
        }
    }
}

function afficherReservationsConsulter() {
    const container = document.getElementById('liste-reservations');
    if (!container) return;

    if (reservations.length === 0) {
        container.innerHTML = '<p class="loading">Aucune reservation enregistree. <a href="index.html">Reservez maintenant !</a></p>';
        return;
    }

    container.innerHTML = '';
    const resasRecentes = reservations.slice().reverse();

    resasRecentes.forEach(function(resa) {
        const item = document.createElement('div');
        item.className = 'reservation-item' + (resa.paye ? ' payee' : '');
        item.setAttribute('data-resa-id', resa.id);

        const statutHtml = resa.paye 
            ? '<span class="statut-paiement statut-paye">✅ Payee</span>'
            : '<span class="statut-paiement statut-en-attente">⏳ En attente</span>';

        const paiementHtml = resa.paye 
            ? '<p><strong>💳 Paiement :</strong> **** **** **** ' + resa.paiement.carteFin + '</p>'
            : '';

        item.innerHTML = 
            '<h4>' + resa.filmTitre + '</h4>' +
            '<p><strong>Sieges:</strong> ' + resa.sieges.join(', ') + '</p>' +
            '<p><strong>Total:</strong> ' + resa.total + ' €</p>' +
            paiementHtml +
            '<p class="date-resa">' + resa.date + '</p>' +
            statutHtml +
            '<div class="reservation-actions">' +
            '<button class="btn-modifier" onclick="ouvrirModification(' + resa.id + ')">✏️ Modifier</button>' +
            '<button class="btn-supprimer" onclick="annulerReservationClient(' + resa.id + ')">🗑️ Annuler</button>' +
            '</div>';

        container.appendChild(item);
    });
}

// ============================================
// ACTION: ANNULER - Supprimer une reservation
// ============================================
function annulerReservationClient(id) {
    const resa = reservations.find(function(r) { return r.id === id; });
    if (!resa) return;

    const confirmation = confirm(
        '🗑️ ANNULER cette reservation ?\\n\\n' +
        'Film: ' + resa.filmTitre + '\\n' +
        'Sieges: ' + resa.sieges.join(', ') + '\\n' +
        'Total: ' + resa.total + ' €' + (resa.paye ? '\\n\\n⚠️ Un remboursement sera effectue.' : '')
    );

    if (confirmation) {
        reservations = reservations.filter(function(r) { return r.id !== id; });
        localStorage.setItem('reservations', JSON.stringify(reservations));

        afficherReservationsConsulter();
        alert('✅ Reservation ANNULEE avec succes !');
    }
}

// ============================================
// ACTION: MODIFIER - Modifier les sieges d'une reservation
// ============================================
function ouvrirModification(id) {
    reservationEnModification = reservations.find(function(r) { return r.id === id; });
    if (!reservationEnModification) return;

    siegesOriginaux = reservationEnModification.sieges.slice();
    siegesModifies = reservationEnModification.sieges.slice();

    const modal = document.getElementById('modal-modif');
    modal.classList.remove('hidden');

    document.getElementById('modif-info').innerHTML = 
        '<p><strong>Film:</strong> ' + reservationEnModification.filmTitre + '</p>' +
        '<p><strong>Sieges actuels:</strong> ' + siegesOriginaux.join(', ') + '</p>' +
        '<p><strong>Total actuel:</strong> ' + reservationEnModification.total + ' €</p>';

    genererPlanSalleModification();
    mettreAJourRecapModification();
}

function genererPlanSalleModification() {
    const container = document.getElementById('modif-plan-salle');
    container.innerHTML = '';

    const siegesAutresResas = getSiegesReservesPourFilm(
        reservationEnModification.filmId, 
        reservationEnModification.id
    );

    for (let r = 0; r < NB_RANGES; r++) {
        const rangee = document.createElement('div');
        rangee.className = 'rangee';

        const label = document.createElement('div');
        label.className = 'rangee-label';
        label.textContent = String.fromCharCode(65 + r);
        rangee.appendChild(label);

        for (let s = 1; s <= NB_SIEGES_PAR_RANGE; s++) {
            const siegeId = String.fromCharCode(65 + r) + s;
            const siege = document.createElement('div');
            siege.className = 'place';
            siege.textContent = s;
            siege.setAttribute('data-siege-modif', siegeId);

            if (siegesAutresResas.includes(siegeId)) {
                siege.classList.add('reservee');
            } else if (siegesOriginaux.includes(siegeId) && siegesModifies.includes(siegeId)) {
                siege.classList.add('garde');
                siege.onclick = function() { toggleSiegeModification(siegeId); };
            } else if (siegesOriginaux.includes(siegeId) && !siegesModifies.includes(siegeId)) {
                siege.classList.add('retiree');
                siege.onclick = function() { toggleSiegeModification(siegeId); };
            } else if (!siegesOriginaux.includes(siegeId) && siegesModifies.includes(siegeId)) {
                siege.classList.add('nouvelle');
                siege.onclick = function() { toggleSiegeModification(siegeId); };
            } else {
                siege.classList.add('dispo');
                siege.onclick = function() { toggleSiegeModification(siegeId); };
            }

            rangee.appendChild(siege);
        }

        container.appendChild(rangee);
    }

    const ecran = document.createElement('div');
    ecran.style.cssText = 'width: 80%; height: 10px; background: linear-gradient(90deg, transparent, #fff, transparent); margin-top: 20px; border-radius: 5px; opacity: 0.5;';
    ecran.innerHTML = '<div style="text-align:center; color:#666; font-size:0.8em; margin-top:15px;">ECRAN</div>';
    container.appendChild(ecran);
}

function toggleSiegeModification(siegeId) {
    const siegeElement = document.querySelector('[data-siege-modif="' + siegeId + '"]');
    if (!siegeElement) return;

    if (siegesModifies.includes(siegeId)) {
        siegesModifies = siegesModifies.filter(function(s) { return s !== siegeId; });

        if (siegesOriginaux.includes(siegeId)) {
            siegeElement.classList.remove('garde');
            siegeElement.classList.add('retiree');
        } else {
            siegeElement.classList.remove('nouvelle');
            siegeElement.classList.add('dispo');
        }
    } else {
        siegesModifies.push(siegeId);

        if (siegesOriginaux.includes(siegeId)) {
            siegeElement.classList.remove('retiree');
            siegeElement.classList.add('garde');
        } else {
            siegeElement.classList.remove('dispo');
            siegeElement.classList.add('nouvelle');
        }
    }

    mettreAJourRecapModification();
}

function mettreAJourRecapModification() {
    document.getElementById('modif-sieges-actuels').textContent = siegesModifies.join(', ') || 'Aucun';
    document.getElementById('modif-total').textContent = (siegesModifies.length * PRIX_PLACE);
}

function confirmerModification() {
    if (siegesModifies.length === 0) {
        alert('⚠️ Vous devez garder au moins un siege ! Utilisez \"Annuler\" pour supprimer la reservation.');
        return;
    }

    const index = reservations.findIndex(function(r) { return r.id === reservationEnModification.id; });
    if (index !== -1) {
        reservations[index].sieges = siegesModifies.slice();
        reservations[index].total = siegesModifies.length * PRIX_PLACE;
        reservations[index].date = new Date().toLocaleString('fr-FR') + ' (modifiee)';

        localStorage.setItem('reservations', JSON.stringify(reservations));

        afficherReservationsConsulter();
        fermerModal();

        const ajoutes = siegesModifies.filter(function(s) { return !siegesOriginaux.includes(s); });
        const retires = siegesOriginaux.filter(function(s) { return !siegesModifies.includes(s); });

        let message = '✅ MODIFICATION enregistree !\\n\\n';
        if (ajoutes.length > 0) message += '➕ Ajoutes: ' + ajoutes.join(', ') + '\\n';
        if (retires.length > 0) message += '➖ Retires: ' + retires.join(', ') + '\\n';
        message += '💰 Nouveau total: ' + reservations[index].total + ' €';

        alert(message);
    }
}

function fermerModal() {
    document.getElementById('modal-modif').classList.add('hidden');
    reservationEnModification = null;
    siegesOriginaux = [];
    siegesModifies = [];
}