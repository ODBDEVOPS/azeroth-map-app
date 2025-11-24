/**
 * Classe principale pour l'Application de Cartographie d'Azeroth Antique
 * Encapsule toutes les fonctionnalités (Pan, Zoom, Swipe, Filtrage, Recherche)
 */
class MapApp {
    constructor() {
        // --- Éléments du DOM ---
        this.mapWrapper = document.getElementById('map-wrapper');
        this.mapContainer = document.getElementById('map-container');
        this.baseMap = document.getElementById('base-map');
        this.overlayWrapper = document.getElementById('overlay-wrapper');
        this.overlayMap = document.getElementById('overlay-map');
        this.separator = document.getElementById('overlay-separator');
        this.markersContainer = document.getElementById('markers-container');
        this.tooltip = document.getElementById('tooltip');
        this.filterControls = document.getElementById('filter-controls');
        this.searchInput = document.getElementById('search-input');
        this.searchResults = document.getElementById('search-results');
        
        // --- État de la Carte ---
        this.scale = 1.0;
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        this.markersData = [];
        this.activeMarker = null;

        this.init();
    }

    /**
     * Initialise l'application : chargement des données et écouteurs d'événements.
     */
    async init() {
        await this.loadMarkersData();
        this.setupEventListeners();
        this.renderMap();
        this.createFilterButtons();
    }

    // --- Gestion des Données et du Rendu ---

    /**
     * Charge les données des marqueurs depuis le fichier JSON.
     */
    async loadMarkersData() {
        try {
            const response = await fetch('data/markers_data.json');
            this.markersData = await response.json();
            console.log('Données des marqueurs chargées :', this.markersData.length);
        } catch (error) {
            console.error('Erreur lors du chargement des données des marqueurs :', error);
        }
    }

    /**
     * Applique la transformation de Pan et Zoom au conteneur de la carte.
     */
    renderMap() {
        this.mapContainer.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    }

    /**
     * Crée et positionne les marqueurs sur la carte.
     * @param {string} filterCategory - Catégorie à afficher, ou 'all' pour tout afficher.
     */
    renderMarkers(filterCategory = 'all') {
        this.markersContainer.innerHTML = ''; // Nettoyage
        
        this.markersData.forEach(markerData => {
            const isVisible = filterCategory === 'all' || markerData.categorie === filterCategory;

            if (isVisible) {
                const marker = document.createElement('div');
                marker.className = `map-marker cat-${markerData.categorie.replace(/\s/g, '')}`;
                marker.style.top = `${markerData.top}%`;
                marker.style.left = `${markerData.left}%`;
                marker.dataset.name = markerData.nom;
                marker.dataset.category = markerData.categorie;

                // Ajout des écouteurs pour la Tooltip
                marker.addEventListener('click', () => this.showTooltip(markerData, marker));

                // Si c'est le marqueur actif (recherche/centrage), lui ajouter la classe
                if (this.activeMarker && this.activeMarker.nom === markerData.nom) {
                    marker.classList.add('active');
                }
                
                this.markersContainer.appendChild(marker);
            }
        });
    }

    // --- Fonctionnalités (Pan & Zoom) ---

    /**
     * Gère l'événement de Pan (déplacement) de la carte.
     */
    handlePanStart(e) {
        if (e.target.id === 'overlay-separator') return; // Ne pas pan si on swipe
        this.isDragging = true;
        this.lastX = e.clientX || e.touches[0].clientX;
        this.lastY = e.clientY || e.touches[0].clientY;
        this.mapContainer.classList.add('grabbing');
    }

    handlePanMove(e) {
        if (!this.isDragging) return;
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        const dx = clientX - this.lastX;
        const dy = clientY - this.lastY;

        this.translateX += dx;
        this.translateY += dy;

        this.lastX = clientX;
        this.lastY = clientY;

        this.renderMap();
        this.hideTooltip(); // Cacher la tooltip pendant le pan
    }

    handlePanEnd() {
        this.isDragging = false;
        this.mapContainer.classList.remove('grabbing');
    }

    /**
     * Gère l'événement de Zoom (molette).
     */
    handleZoom(e) {
        e.preventDefault();

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9; // 10% de zoom

        // Limiter le zoom min/max
        const newScale = Math.max(1.0, Math.min(4.0, this.scale * zoomFactor));

        if (newScale === this.scale) return; // Si la limite est atteinte, on ne change rien

        const rect = this.mapContainer.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        // Calcul de la translation pour centrer le zoom sur le curseur
        this.translateX -= cursorX * (newScale - this.scale) / newScale;
        this.translateY -= cursorY * (newScale - this.scale) / newScale;

        this.scale = newScale;
        
        // S'assurer qu'on ne sort pas des limites après le zoom (minimaliste)
        this.clampTranslations();

        this.renderMap();
    }

    /**
     * Gère les boutons + / -
     */
    zoom(direction) {
        const factor = direction === 'in' ? 1.25 : 0.8;
        const newScale = Math.max(1.0, Math.min(4.0, this.scale * factor));

        if (newScale === this.scale) return;

        // Simuler le zoom au centre de la map pour les boutons
        const rect = this.mapWrapper.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        this.translateX -= centerX * (newScale - this.scale) / newScale;
        this.translateY -= centerY * (newScale - this.scale) / newScale;

        this.scale = newScale;
        this.clampTranslations();
        this.renderMap();
    }

    /**
     * Réinitialise l'affichage à l'état initial.
     */
    resetView() {
        this.scale = 1.0;
        this.translateX = 0;
        this.translateY = 0;
        this.activeMarker = null; // Désactiver le marqueur
        this.hideTooltip();
        this.renderMap();
        this.renderMarkers(this.getActiveFilter());
    }

    /**
     * S'assure que la carte ne sort pas du cadre visible (simplifié).
     * Empêche de trop s'éloigner des bords à un niveau de zoom élevé.
     */
    clampTranslations() {
        const mapWidth = this.mapWrapper.clientWidth * this.scale;
        const mapHeight = this.mapWrapper.clientHeight * this.scale;
        const viewWidth = this.mapWrapper.clientWidth;
        const viewHeight = this.mapWrapper.clientHeight;
        
        const maxX = mapWidth - viewWidth;
        const maxY = mapHeight - viewHeight;

        // Si la carte est plus grande que la vue
        if (this.scale > 1) {
            this.translateX = Math.max(Math.min(this.translateX, 0), -maxX);
            this.translateY = Math.max(Math.min(this.translateY, 0), -maxY);
        } else {
             // Si la carte est plus petite ou égale (scale=1), on centre
            this.translateX = 0;
            this.translateY = 0;
        }
    }


    // --- Fonctionnalité de Recherche et Centrage (Jump) ---

    /**
     * Gère l'input de recherche pour filtrer les marqueurs par nom ou position_approx.
     */
    handleSearchInput() {
        const query = this.searchInput.value.toLowerCase().trim();
        this.searchResults.innerHTML = '';

        if (query.length < 2) return;

        const results = this.markersData.filter(marker =>
            marker.nom.toLowerCase().includes(query) || 
            marker.position_approx.toLowerCase().includes(query)
        );

        results.forEach(marker => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.textContent = `${marker.nom} (${marker.position_approx})`;
            item.addEventListener('click', () => this.jumpToMarker(marker));
            this.searchResults.appendChild(item);
        });
    }

    /**
     * Centre et zoome sur le marqueur sélectionné.
     * @param {Object} markerData - Les données du marqueur à cibler.
     */
    jumpToMarker(markerData) {
        // 1. Définir le marqueur comme actif et mettre à jour l'affichage
        this.activeMarker = markerData;
        this.renderMarkers(markerData.categorie); // Filtrer et marquer l'actif
        this.showTooltip(markerData, document.querySelector(`[data-name="${markerData.nom}"]`));

        // 2. Calcul des nouvelles valeurs Pan/Zoom
        const targetScale = 2.0; // Zoom agréable (ex: 2x)
        const mapRect = this.mapWrapper.getBoundingClientRect();

        // Calculer les coordonnées absolues du centre de la vue (Wrapper)
        const viewCenterX = mapRect.width / 2;
        const viewCenterY = mapRect.height / 2;

        // Calculer les coordonnées du marqueur sur la carte (en pixels à scale=1)
        const markerX_norm = markerData.left / 100 * this.mapWrapper.clientWidth;
        const markerY_norm = markerData.top / 100 * this.mapWrapper.clientHeight;
        
        // Calculer la translation nécessaire pour amener le marqueur au centre de la vue au nouveau scale
        // NewX = ViewCenterX - (MarkerX_norm * NewScale)
        const newTranslateX = viewCenterX - (markerX_norm * targetScale);
        const newTranslateY = viewCenterY - (markerY_norm * targetScale);
        
        // 3. Appliquer les transformations
        this.scale = targetScale;
        this.translateX = newTranslateX;
        this.translateY = newTranslateY;

        // On réinitialise la recherche et les résultats
        this.searchInput.value = '';
        this.searchResults.innerHTML = '';
        
        // 4. Rendre la carte
        this.renderMap();
        // Optionnel: On pourrait animer cela avec requestAnimationFrame pour un effet plus doux.
    }

    // --- Fonctionnalité de Filtrage Dynamique ---
    
    /**
     * Crée les boutons de filtre à partir des catégories uniques des marqueurs.
     */
    createFilterButtons() {
        const categories = [...new Set(this.markersData.map(m => m.categorie))].sort();

        // Bouton 'Tout'
        const allBtn = this.createFilterButton('Tout', 'all');
        allBtn.classList.add('active-filter');
        this.filterControls.appendChild(allBtn);

        // Boutons par catégorie
        categories.forEach(cat => {
            this.filterControls.appendChild(this.createFilterButton(cat, cat));
        });
    }

    /**
     * Crée un bouton de filtre.
     */
    createFilterButton(text, category) {
        const button = document.createElement('button');
        button.textContent = text;
        button.dataset.filter = category;
        button.addEventListener('click', (e) => this.handleFilterClick(e.currentTarget, category));
        return button;
    }

    /**
     * Gère le clic sur un bouton de filtre.
     */
    handleFilterClick(clickedButton, category) {
        // Mettre à jour la classe 'active-filter'
        this.filterControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active-filter'));
        clickedButton.classList.add('active-filter');

        // Rendre les marqueurs filtrés
        this.activeMarker = null; // Supprimer l'état actif lors du filtrage
        this.hideTooltip();
        this.renderMarkers(category);
    }
    
    /**
     * Récupère la catégorie actuellement filtrée.
     */
    getActiveFilter() {
        const activeBtn = this.filterControls.querySelector('.active-filter');
        return activeBtn ? activeBtn.dataset.filter : 'all';
    }

    // --- Fonctionnalité Tooltip (Détail du Marqueur) ---

    /**
     * Affiche la tooltip d'information.
     */
    showTooltip(data, markerElement) {
        const rect = markerElement.getBoundingClientRect();
        const mapRect = this.mapWrapper.getBoundingClientRect();
        
        document.getElementById('tooltip-title').textContent = data.nom;
        document.getElementById('tooltip-desc').textContent = data.lore_desc;
        document.getElementById('tooltip-img').src = data.image_url;
        
        // Positionner la tooltip près du marqueur, décalée vers la droite/bas
        let topPos = rect.top - mapRect.top + rect.height + 10;
        let leftPos = rect.left - mapRect.left + rect.width + 10;

        // Gestion simplifiée des bords (ajuster si le tooltip sort à droite)
        if (leftPos + 300 > mapRect.width) {
             leftPos = rect.left - mapRect.left - 300 - 10;
        }

        this.tooltip.style.top = `${topPos}px`;
        this.tooltip.style.left = `${leftPos}px`;
        this.tooltip.classList.remove('hidden');
    }

    /**
     * Cache la tooltip.
     */
    hideTooltip() {
        this.tooltip.classList.add('hidden');
    }

    // --- Fonctionnalité de Calque (Overlay/Swipe) et Overlay Dynamique ---

    setupOverlayControls() {
        const opacitySlider = document.getElementById('opacity-slider');
        const scaleSlider = document.getElementById('scale-slider');
        const offsetXSlider = document.getElementById('offset-x-slider');
        const offsetYSlider = document.getElementById('offset-y-slider');
        
        const opacityValue = document.getElementById('opacity-value');
        const scaleValue = document.getElementById('scale-value');
        const offsetXValue = document.getElementById('offset-x-value');
        const offsetYValue = document.getElementById('offset-y-value');
        
        const updateOverlay = () => {
            const opacity = opacitySlider.value;
            const scale = scaleSlider.value;
            const offsetX = offsetXSlider.value;
            const offsetY = offsetYSlider.value;

            this.overlayMap.style.opacity = opacity;
            this.overlayMap.style.transform = `translate(${offsetX}%, ${offsetY}%) scale(${scale})`;
            
            opacityValue.textContent = opacity;
            scaleValue.textContent = scale;
            offsetXValue.textContent = `${offsetX}%`;
            offsetYValue.textContent = `${offsetY}%`;
        };

        [opacitySlider, scaleSlider, offsetXSlider, offsetYSlider].forEach(slider => {
            slider.addEventListener('input', updateOverlay);
        });
        
        // Initialiser l'état de l'overlay
        updateOverlay();
    }
    
    setupSwipe() {
        let isSwiping = false;
        
        const startSwipe = (e) => {
            isSwiping = true;
            this.separator.style.background = var('--color-accent-hover');
            this.mapContainer.classList.remove('grabbing'); // Désactiver le Pan
        };

        const onSwipe = (e) => {
            if (!isSwiping) return;
            const clientX = e.clientX || e.touches[0].clientX;
            const mapRect = this.mapWrapper.getBoundingClientRect();
            
            // Calcul de la position du séparateur par rapport à la carte
            let newX = clientX - mapRect.left; 
            
            // Limiter la position (0 à 100% de la largeur du wrapper)
            newX = Math.max(0, Math.min(mapRect.width, newX));
            
            const percent = (newX / mapRect.width) * 100;

            // Appliquer la coupe (clip) au wrapper de l'overlay
            this.overlayWrapper.style.clipPath = `inset(0 0 0 ${percent}%)`;
            this.separator.style.left = `${percent}%`;
        };

        const endSwipe = () => {
            isSwiping = false;
            this.separator.style.background = var('--color-accent');
        };

        this.separator.addEventListener('mousedown', startSwipe);
        document.addEventListener('mousemove', onSwipe);
        document.addEventListener('mouseup', endSwipe);

        // Support tactile
        this.separator.addEventListener('touchstart', (e) => { e.preventDefault(); startSwipe(e); }, { passive: false });
        document.addEventListener('touchmove', (e) => { e.preventDefault(); onSwipe(e); }, { passive: false });
        document.addEventListener('touchend', endSwipe);
    }

    // --- Configuration des Écouteurs d'Événements ---

    setupEventListeners() {
        // Pan & Zoom
        this.mapContainer.addEventListener('mousedown', (e) => this.handlePanStart(e));
        this.mapContainer.addEventListener('touchstart', (e) => this.handlePanStart(e), { passive: false });
        document.addEventListener('mousemove', (e) => this.handlePanMove(e));
        document.addEventListener('touchmove', (e) => this.handlePanMove(e), { passive: false });
        document.addEventListener('mouseup', () => this.handlePanEnd());
        document.addEventListener('touchend', () => this.handlePanEnd());
        this.mapWrapper.addEventListener('wheel', (e) => this.handleZoom(e), { passive: false });

        document.getElementById('zoom-in').addEventListener('click', () => this.zoom('in'));
        document.getElementById('zoom-out').addEventListener('click', () => this.zoom('out'));
        document.getElementById('reset-view').addEventListener('click', () => this.resetView());

        // Tooltip
        document.getElementById('tooltip-close').addEventListener('click', () => this.hideTooltip());

        // Recherche
        this.searchInput.addEventListener('input', () => this.handleSearchInput());

        // Overlay & Swipe
        this.setupOverlayControls();
        this.setupSwipe();
    }
}

// Lancement de l'application
document.addEventListener('DOMContentLoaded', () => {
    new MapApp();
});
