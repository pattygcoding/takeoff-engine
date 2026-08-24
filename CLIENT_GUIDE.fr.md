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
- **Méga Échantillon de Cas Limites** (`sample_edge_cases_takeoff.csv`)
- **Exemple d'export Bluebeam Revu**
- **Exemple d'export PlanSwift**
- **Exemple d'export Trimble / Agtek**

---

## 2. Champs d'Estimation Standards et Mappage Automatique Intelligent

Takeoff Engine utilise la **correspondance floue d'alias (distance de Levenshtein)**. Vous **n'avez pas** besoin de renommer les en-têtes pour correspondre à des libellés rigides.

| Champ Standard | Requis ? | Exemples Canoniques / Alias Logiciels | Description |
|---|---|---|---|
| `system` | Oui | `Trade`, `Phase`, `Division`, `Category`, `Discipline`, `Utility Type`, `Section`, `Classification`, Codes CSI (`02-31-00`, `03 21 00`, `26 24 16`) | Le corps d'état ou regroupement (ex. `Sanitary`, `Storm`, `Domestic Water`, `Earthwork`, `02 - Existing Conditions`, `26 - Electrical`) |
| `item_description` | Oui | `Item Description`, `Item Name`, `Description`, `Scope`, `Takeoff Item`, `Line Item`, `Activity` | La désignation de l'article ou de la ligne (ex. `Mainline Pipe`, `Precast Manhole`, `Gate Valve`) |
| `size_spec` | Oui | `Size / Spec`, `Pipe Size`, `Dimension`, `Material Class`, `Specification`, `Diameter`, `Rating` | Diamètre de tuyau ou spécification du matériau (ex. `8" PVC SDR-35`, `48" Precast`, `6" C900`) |
| `quantity` | Oui | `Quantity`, `Qty`, `Takeoff Qty`, `Total Qty`, `Linear Feet`, `Amount`, `Count`, `Volume`, `Footage` | Quantité numérique ou mesure (ex. `275`, `1,250`, `45.5`, déductifs `(350.00)`, `TBD`) |
| `unit` | Oui | `Unit`, `UOM`, `Unit of Measure`, `Measure`, `Units`, `Unit Type` | Unité de mesure professionnelle (`LF`, `EA`, `CY`, `SF`, `SY`, `TON`, `LS`, `HR` ou unités personnalisées) |
| `avg_depth_ft` | Non | `Avg Trench Depth`, `Avg Depth (FT)`, `Depth (ft)`, `Trench Depth`, `Cut Depth`, `Invert Depth` | Profondeur moyenne optionnelle de tranchée en pieds (pour les calculs de terrassement et de remblai) |
| `material_cost_per_unit` | Non | `Material $/Unit`, `Mat $/Unit`, `Material Cost`, `Unit Price`, `Material Rate`, `Unit Cost`, `Cost/Unit` | Prix unitaire des matériaux ou coût par unité (ex. `$42.50`, `$1,350.00`, `$19.0857`) |
| `labor_hours_per_unit` | Non | `Labor Hours/Unit`, `Hrs/Unit`, `Labor $/Unit`, `Labor Rate`, `Crew Hours`, `Unit Labor Cost`, `Labor Extension` | Heures de productivité ou coût unitaire direct de main-d'œuvre par ligne (ex. `0.25 hrs/LF` ou `$15.00/LF`) |

*Remarque : L'ordre des colonnes et la sensibilité à la casse n'ont pas d'importance.*

---

## 3. Modes d'Estimation de la Main-d'Œuvre (Heures vs. Main-d'Œuvre $/Unité)

Takeoff Engine offre un calcul flexible à double mode pour la main-d'œuvre, adapté aux entrepreneurs généraux comme aux sous-traitants spécialisés :

1. **Mode Heures de Main-d'Œuvre (`Heures/Unité`)** :
   - Les lignes précisent la productivité en heures requises par unité métrique (ex. `0.35 hrs/LF` ou `1.50 hrs/EA`).
   - Coût de Main-d'Œuvre de la Ligne = $\text{Quantité} \times \text{Heures/Unité} \times \text{Taux Horaire de Base}$ (configuré dans le volet des Tarifs).
   - Idéal pour le suivi de productivité des équipes et la planification des ressources de chantier.

2. **Mode Coût Unitaire de Main-d'Œuvre (`$/Unité`)** :
   - Les lignes précisent la main-d'œuvre directement sous forme de coût unitaire fixe (ex. `$25.00/LF` ou `$150.00/EA`).
   - Coût de Main-d'Œuvre de la Ligne = $\text{Quantité} \times \text{Main-d'œuvre \$/Unité}$ directement, sans multiplication par le taux horaire de base.
   - Idéal pour les devis de sous-traitance, la tarification à la pièce ou les barèmes de prix forfaitaires.

Vous pouvez basculer entre **Heures/Unité** et **$/Unité** à tout moment directement depuis l'en-tête de la grille de chiffrage ou dans le volet des Tarifs. Le moteur assure une synchronisation bidirectionnelle en temps réel entre heures et montants selon votre taux horaire de base actif.

---

## 4. Capacités d'Analyse Résilientes

Le pipeline d'ingestion gère les exports bruts sans nécessiter de nettoyage manuel :

✅ **Détection d'En-têtes 2D, Ignorer les Bannières Fusionnées et Sélection d'En-têtes :**
- Si votre feuille de calcul contient des titres d'entreprise, des noms de projets, des notes ou des lignes vides en haut (lignes 1 à 30), le moteur localise automatiquement la véritable ligne d'en-tête au-delà des bannières fusionnées.
- Vous pouvez également sélectionner manuellement la ligne d'en-tête à l'aide du sélecteur interactif de Ligne d'En-têtes.
- Prend en charge les en-têtes superposés sur 2 lignes (ex. Haut : `Trench Dimensions`, Bas : `Depth (FT)` $\rightarrow$ `Trench Dimensions - Depth (FT)`).

✅ **Mappage des Corps d'État avec Codes CSI MasterFormat :**
- Reconnaît les codes de division CSI et numéros de section MasterFormat (ex. `02-31-00`, `03 21 00`, `09 22 00`, `26 24 16`, `Division 31`) et les associe automatiquement aux corps d'état standardisés (`02 - Existing Conditions`, `03 - Concrete`, `09 - Finishes`, `26 - Electrical`, `31 - Earthwork`, etc.).

✅ **Ingestion du Coût Unitaire des Matériaux et Formats Monétaires :**
- Prend en charge les champs optionnels de coût unitaire des matériaux (`Material $/Unit`, `Mat $/Unit`, `Material Cost`, `Unit Price`).
- Supprime automatiquement les symboles monétaires (`$`, `€`, `£`, `¥`), virgules de formatage et espaces pour que les prix unitaires (ex. `$1,350.00`, `$42.50`, `$19.0857`) alimentent directement les calculs de coûts.

✅ **Avenants Déductifs et Quantités Négatives Comptables :**
- Conserve les quantités et montants négatifs au format comptable comme `(350.00)` et `-$6,680.00` sans exclure les lignes négatives, permettant des avenants déductifs précis.

✅ **Symboles d'Emplacement Réservé et Badges de Périmètre Manquant :**
- Les cellules contenant des textes d'attente (ex. `TBD`, `N/A`, `HOLD`, `PENDING`, `BY OTHERS`) sont intégrées de manière sécurisée avec une quantité de `0` et signalées par un badge interactif **⚠️ Périmètre Manquant / TBD** dans la grille d'estimation pour vérification sur le terrain.

✅ **Défusion des Cellules Fusionnées et Remplissage Automatique (Forward-Fill) :**
- Lorsqu'une feuille Excel utilise des cellules fusionnées pour des catégories ou des en-têtes de section, le libellé parent du système/de la phase est propagé vers le bas sur tous les éléments enfants.

✅ **Filtrage des Sous-totaux et Bannières de Section :**
- Les formules (`=SUM(...)`, `SUBTOTAL`), les lignes de résumé (`Sub-Total`, `Grand Total`), les métadonnées et les bannières décoratives de phase (`--- PHASE 1 ---`) sont identifiées et filtrées afin de ne pas dupliquer vos quantités.
- Des sommes de contrôle (checksums) sont calculées pour vérifier que les lignes analysées correspondent au sous-total récapitulatif d'origine de votre feuille de calcul.

✅ **Nettoyage des Unités et Quantités Composites :**
- Les valeurs formatées comme `$1,250.00`, les nombres négatifs comptables `(150.00)` ou les chaînes incluant l'unité comme `"275 LF"` ou `"12 EA"` sont séparées en une valeur numérique propre et son unité.

✅ **Normalisation Complète des Unités Métier et Préservation des Unités Personnalisées :**
- Les variantes d'unités sont harmonisées vers les standards du secteur :
  - `lin ft`, `linear feet`, `l.f.`, `ft`, `m`, `meter` $\rightarrow$ `LF`
  - `each`, `pcs`, `e.a.`, `item`, `pza`, `count` $\rightarrow$ `EA`
  - `cu yd`, `c.y.`, `cubic yard`, `m3`, `cu m` $\rightarrow$ `CY`
  - `sq ft`, `s.f.`, `sqft`, `m2`, `m²`, `sq m` $\rightarrow$ `SF`
  - `sq yd`, `s.y.`, `sqyd`, `yd2` $\rightarrow$ `SY`
  - `tn`, `tons`, `tonne`, `t.n.` $\rightarrow$ `TON`
  - `ls`, `lump`, `global`, `lot` $\rightarrow$ `LS`
  - `hr`, `hrs`, `hour`, `man hours` $\rightarrow$ `HR`
- Les unités personnalisées non répertoriées (ex. `ROLLS`, `BUNDLE`, `PALLET`, `TRIP`) sont préservées en majuscules sans être converties de force en pieds linéaires.

✅ **Déconstruction des Dimensions Composites :**
- Si un logiciel de métré fusionne la description et la dimension (ex. `"8\" PVC SDR-35 Mainline"` dans la colonne de description), le moteur extrait la dimension du tuyau du libellé de la ligne.

✅ **Détection des Tableaux Côte à Côte (Multi-Tableaux) :**
- Lorsque les métreurs disposent différents lots horizontalement côte à côte sur le même onglet, séparés par des colonnes vides (ex. Eau Potable dans les colonnes A à F et Assainissement dans les colonnes H à M), le moteur détecte les sous-tableaux et vous permet de choisir la zone à importer dans la boîte de dialogue de mappage.

✅ **Sauts de Ligne Manuels et Textes Multilignes (Alt + Entrée) :**
- Les cellules contenant des retours chariot (`\r\n` ou `\n`) provenant de sauts de ligne manuels ou de notes sont assainies en chaînes propres sur une seule ligne sans casser les lignes du CSV.

✅ **Filtrage des Lignes Masquées et Séparateurs de Section :**
- Les lignes masquées dans Excel (`row.hidden === true` ou hauteur = 0) ainsi que les lignes de séparation visuelles vides sont automatiquement exclues.
- *Remarque sur les suppressions de périmètre :* Le format de texte barré n'est pas pris en charge pour l'élimination de périmètre en XLSX/CSV. Pour exclure des postes supprimés par addenda, supprimez ou masquez la ligne dans Excel, ou indiquez un indicateur de périmètre tel que `HOLD`, `TBD` ou `N/A`.

✅ **Extraction des Valeurs Calculées en Cache et Gestion des Formules Brisées :**
- Évalue les valeurs calculées en cache d'Excel (`.v` / `.w`) plutôt que des chaînes de formules non évaluées. Les erreurs de formules (`#REF!`, `#VALUE!`, `#N/A`) sont converties proprement en `null`/`NaN` avec des avertissements explicites au niveau de la ligne.

---

## 5. Mappage Interactif des Colonnes et Préréglages Fournisseurs

Si un fichier présente des colonnes ambiguës ou un formatage personnalisé (score de confiance < 90 %) :

- **Fenêtre Modale de Mappage Interactif :** Une boîte de dialogue de confirmation s'affiche avec des scores de confiance pour chaque champ détecté.
- **Aperçu en Direct sur 5 Lignes :** Visualisez la transformation de vos données en temps réel à mesure que vous sélectionnez les colonnes.
- **Enregistrement des Préréglages Fournisseur / Sous-traitant :** Enregistrez des configurations de colonnes personnalisées sous le nom d'un modèle fournisseur (ex. `ABC Earthwork Subcontractor`). Le moteur mémorisera ce mappage et le réappliquera lors de l'importation future de fichiers de ce fournisseur.

---

## 6. Que se Passe-t-il Après l'Importation ?

- Le fichier est analysé et validé en quelques millisecondes selon des règles déterministes.
- En cas de quantités non valides, des messages d'erreur détaillés avec numéros de lignes sont affichés pour vérification.
- Les éléments valides alimentent la grille d'estimation interactive, où vous pouvez ajuster les quantités, appliquer des grilles tarifaires, configurer les coupes transversales de tranchée et générer des propositions clients ou des dossiers d'appel d'offres en Word/PDF.
