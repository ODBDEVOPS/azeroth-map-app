## 🗺️ (azeroth-map-app) Azeroth Antique - Application de Cartographie Interactive

https://odbdevops.github.io/azeroth-map-app/

Ceci est une **Single Page Application (SPA)** de cartographie d'Azeroth Antique, construite en HTML, CSS et JavaScript natif. Elle est conçue pour être modulaire, performante et offrir une expérience utilisateur riche (Pan & Zoom, Calques dynamiques, Filtrage, et Recherche rapide avec Centrage).

## 🚀 Démarrage Rapide

1.  **Structure des Dossiers:** Assurez-vous d'avoir la structure de dossiers suivante :

    ```
    azeroth-map-app/
    ├── index.html
    ├── data/
    │   └── markers_data.json  <-- Données des points d'intérêt
    ├── css/
    │   └── style.css          <-- Styles (Dark Mode 'Chronicles')
    ├── js/
    │   └── app.js             <-- Logique Métier (Pan, Zoom, Filtre, Recherche, Swipe)
    └── assets/
        ├── 1200px-Ordered_Azeroth.jpg
        └── WoWChronicleSample-12.jpg
    ```

2.  **Lancer l'Application:** Pour des raisons de sécurité liées au chargement du fichier `markers_data.json` via `fetch`, vous devez lancer `index.html` via un **serveur web local**.

    * **Méthode la plus simple:** Utiliser l'extension "Live Server" de VS Code.
    * **Alternative Python:** Ouvrez votre terminal dans le dossier `azeroth-map-app/` et exécutez :
        ```bash
        python3 -m http.server 8000
        ```
    * Ouvrez ensuite votre navigateur à l'adresse `http://localhost:8000`.

## ⚙️ Fonctionnalités Implémentées

* **Pan & Zoom (Drag & Molette) :** Navigation fluide dans la carte.
* **Filtrage Dynamique :** Afficher/Masquer les marqueurs par catégorie.
* **Recherche Rapide :** Filtrage des résultats par `nom` ou `position_approx`.
* **Centrage/Jump :** Au clic sur un résultat de recherche, la carte centre et zoome automatiquement sur le marqueur cible (Zoom 2x). Le marqueur actif est mis en évidence (effet `pulse`).
* **Overlay Dynamique :** Utilisation de curseurs pour contrôler l'Opacité, l'Échelle (Zoom), et le Décalage (Offset X/Y) du calque superposé (`overlay-map`).
* **Contrôle de Calque (Swipe) :** Le séparateur vertical (`overlay-separator`) permet de faire glisser le calque pour comparer la carte de base et le calque superposé.
* **Tooltips :** Affichage des détails (lore et image) au clic sur un marqueur.
