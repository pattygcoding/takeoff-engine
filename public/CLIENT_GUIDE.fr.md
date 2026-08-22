# Guide d'Utilisation de Takeoff Engine — Guide Client

Ce guide explique comment préparer votre fichier de métré (takeoff) et comment le pipeline d'ingestion de Takeoff Engine traite vos feuilles de calcul.

---

## 1. Quels types de fichiers sont acceptés ?

Takeoff Engine prend en charge les fichiers provenant de tous les principaux logiciels de métré et d'estimation (Bluebeam Revu, PlanSwift, HeavyBid, Trimble/Agtek, Excel, etc.) :

- **CSV** (`.csv`) — Fichiers texte simples séparés par des virgules.
- **Excel** (`.xlsx`, `.xls`, `.xlsm`, `.xlsb`) — Classeurs Excel standards et avec macros activées.

### Prise en charge des classeurs Excel multi-onglets
Si votre classeur Excel contient plusieurs onglets, le moteur évalue et sélectionne automatiquement l'onglet de métré actif (ex. `Takeoff`, `Civil Estimate`, `Quantities`). Vous pouvez également basculer d'un onglet à l'autre directement dans la vue de mappage des colonnes si vous avez plusieurs feuilles à vérifier.

Des modèles prêts à l'emploi et des exemples de fournisseurs peuvent être téléchargés sur l'écran d'importation :
- **Modèle CSV** (`takeoff_sample_template.csv`)
- **Modèle Excel** (`takeoff_sample_template.xlsx`)
- **Exemple d'export Bluebeam Revu**
- **Exemple d'export PlanSwift**
- **Exemple d'export Trimble / Agtek**

---

## 2. Champs d'Estimation Standards et Mappage Automatique Intelligent

Takeoff Engine utilise la **correspondance floue d'alias (distance de Levenshtein)**. Vous **n'avez pas** besoin de renommer les en-têtes pour correspondre à des libellés rigides.

| Champ Standard | Requis ? | Exemples Canoniques / Alias Logiciels | Description |
|---|---|---|---|
| `system` | Oui | `Trade`, `Phase`, `Division`, `Category`, `Discipline`, `Utility Type`, `Section`, `Classification` | Le corps d'état ou regroupement (ex. `Sanitary`, `Storm`, `Domestic Water`, `Earthwork`) |
| `item_description` | Oui | `Item Description`, `Item Name`, `Description`, `Scope`, `Takeoff Item`, `Line Item`, `Activity` | La désignation de l'article ou de la ligne (ex. `Mainline Pipe`, `Precast Manhole`, `Gate Valve`) |
| `size_spec` | Oui | `Size / Spec`, `Pipe Size`, `Dimension`, `Material Class`, `Specification`, `Diameter`, `Rating` | Diamètre de tuyau ou spécification du matériau (ex. `8" PVC SDR-35`, `48" Precast`, `6" C900`) |
| `quantity` | Oui | `Quantity`, `Qty`, `Takeoff Qty`, `Total Qty`, `Linear Feet`, `Amount`, `Count`, `Volume`, `Footage` | Quantité numérique ou mesure (ex. `275`, `1,250`, `45.5`) |
| `unit` | Oui | `Unit`, `UOM`, `Unit of Measure`, `Measure`, `Units`, `Unit Type` | Unité de mesure professionnelle (`LF`, `EA`, `CY`, `SF`, `TON`, `LS`, `HR`) |
| `avg_depth_ft` | Non | `Avg Trench Depth`, `Avg Depth (FT)`, `Depth (ft)`, `Trench Depth`, `Cut Depth`, `Invert Depth` | Profondeur moyenne optionnelle de tranchée en pieds (pour les calculs de terrassement et de remblai) |

*Remarque : L'ordre des colonnes et la sensibilité à la casse n'ont pas d'importance.*

---

## 3. Capacités d'Analyse Résilientes

Le pipeline d'ingestion gère les exports bruts sans nécessiter de nettoyage manuel :

✅ **Détection d'En-têtes 2D et Tolérance de Décalage :**
- Si votre feuille de calcul contient des titres d'entreprise, des noms de projets ou des lignes vides en haut (lignes 1 à 30), le moteur localise la ligne d'en-tête réelle.
- Prend en charge les en-têtes superposés sur 2 lignes (ex. Haut : `Trench Dimensions`, Bas : `Depth (FT)` $\rightarrow$ `Trench Dimensions - Depth (FT)`).

✅ **Défusion des Cellules Fusionnées et Remplissage Automatique (Forward-Fill) :**
- Lorsqu'une feuille Excel utilise des cellules fusionnées pour des catégories ou des en-têtes de section, le libellé parent du système/de la phase est propagé vers le bas sur tous les éléments enfants.

✅ **Filtrage des Sous-totaux et Bannières de Section :**
- Les formules (`=SUM(...)`, `SUBTOTAL`), les lignes de résumé (`Sub-Total`, `Grand Total`), les métadonnées et les bannières décoratives de phase (`--- PHASE 1 ---`) sont identifiées et filtrées afin de ne pas dupliquer vos quantités.
- Des sommes de contrôle (checksums) sont calculées pour vérifier que les lignes analysées correspondent au sous-total récapitulatif d'origine de votre feuille de calcul.

✅ **Nettoyage des Unités et Quantités Composites :**
- Les valeurs formatées comme `$1,250.00`, les nombres négatifs comptables `(150.00)` ou les chaînes incluant l'unité comme `"275 LF"` ou `"12 EA"` sont séparées en une valeur numérique propre et son unité.

✅ **Normalisation des Unités Métier :**
- Les variantes d'unités sont harmonisées :
  - `lin ft`, `linear feet`, `l.f.`, `ft` $\rightarrow$ `LF`
  - `each`, `pcs`, `e.a.`, `item` $\rightarrow$ `EA`
  - `cu yd`, `c.y.`, `cubic yard`, `m3` $\rightarrow$ `CY`
  - `sq ft`, `s.f.`, `sqft`, `m2` $\rightarrow$ `SF`
  - `tn`, `tons`, `tonne` $\rightarrow$ `TON`
  - `ls`, `lump`, `global` $\rightarrow$ `LS`

✅ **Déconstruction des Dimensions Composites :**
- Si un logiciel de métré fusionne la description et la dimension (ex. `"8\" PVC SDR-35 Mainline"` dans la colonne de description), le moteur extrait la dimension du tuyau du libellé de la ligne.

---

## 4. Mappage Interactif des Colonnes et Préréglages Fournisseurs

Si un fichier présente des colonnes ambiguës ou un formatage personnalisé (score de confiance < 90 %) :

- **Fenêtre Modale de Mappage Interactif :** Une boîte de dialogue de confirmation s'affiche avec des scores de confiance pour chaque champ détecté.
- **Aperçu en Direct sur 5 Lignes :** Visualisez la transformation de vos données en temps réel à mesure que vous sélectionnez les colonnes.
- **Enregistrement des Préréglages Fournisseur / Sous-traitant :** Enregistrez des configurations de colonnes personnalisées sous le nom d'un modèle fournisseur (ex. `ABC Earthwork Subcontractor`). Le moteur mémorisera ce mappage et le réappliquera lors de l'importation future de fichiers de ce fournisseur.

---

## 5. Que se Passe-t-il Après l'Importation ?

- Le fichier est analysé et validé en quelques millisecondes selon des règles déterministes.
- En cas de quantités non valides, des messages d'erreur détaillés avec numéros de lignes sont affichés pour vérification.
- Les éléments valides alimentent la grille d'estimation interactive, où vous pouvez ajuster les quantités, appliquer des grilles tarifaires, configurer les coupes transversales de tranchée et générer des propositions clients ou des dossiers d'appel d'offres en Word/PDF.
