# Baromètre Hit Lokal — Site de la data musicale d'Outremer

Site web qui affiche, explore et commercialise les données du **Baromètre Hit Lokal de la
Musique d'Outremer** (clips d'artistes ultramarins sur YouTube, 2021 → 2025).

## Lancer le site

Le site est 100 % statique mais charge des fichiers JSON : il faut donc un petit serveur
local (l'ouvrir en double-clic ne suffit pas à cause des règles de sécurité du navigateur).

```bash
python3 serve.py
# puis ouvrir http://127.0.0.1:8765 dans le navigateur
```

(ou depuis le dossier `site/` : `python3 -m http.server 8000`)

## Ce que contient le site (`site/`)

| Section | Contenu |
|---|---|
| **Accueil** | Chiffres clés + courbes d'évolution 2021→2025 (vues, clips) |
| **Explorer** | Tableau de bord par année : vues/clips par style, rythme mensuel, distribution des vues, origines, **Top 20** des clips |
| **Recherche** | Moteur sur **2 780 clips** (2021-2025) : filtres artiste, titre, style, origine, année + tri |
| **Offre data** | 3 formules commerciales (Rapport · Dataset & licence · API) + indicateurs de confiance |
| **Contact** | Formulaire de capture de leads (enregistré en `localStorage` + ouverture mail pré-rempli) |

## Données

- `site/data/dashboard.json` — agrégats par année (calculés depuis les BDD brutes).
- `site/data/clips.json` — index de recherche (tous les clips).
- `dataset/*.csv` — **exports vendables** (CSV combiné + 1 par année) : le « produit » de l'offre.

Les chiffres sont extraits des PDF d'origine et recoupés avec les tableaux croisés officiels
(2022 : 230,7 M vues ; 2024 : 257,4 M ; 2025 : 413,2 M — totaux identiques aux PDF source).
2021 n'a pas de base clip par clip : la page affiche les chiffres publiés du rapport.

## Passer en production / brancher les leads

Le formulaire fonctionne sans backend (mailto + stockage local). Pour recevoir les leads par
e-mail/CRM sans serveur, remplacer dans `site/js/app.js` la logique `mailto` par un endpoint
type **Formspree**, **Getform** ou une **Google Sheet** (un seul `fetch` POST à ajouter).
Pensez aussi à remplacer `contact@hit-lokal.com` par votre adresse réelle.

## Régénérer les données

```bash
python3 _extract/parse.py        # PDF → _extract/clips.json (données brutes unifiées)
python3 _extract/build_data.py   # → site/data/*.json (agrégats + index)
```
