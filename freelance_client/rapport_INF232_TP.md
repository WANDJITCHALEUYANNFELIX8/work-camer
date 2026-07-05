# RAPPORT DE TRAVAUX PRATIQUES — STATISTIQUES ET ANALYSE DE DONNÉES (INF232)
**Thème B : Plateforme de mise en relation freelance/client**

* **Chef de groupe :** WANDJI TCHALEU Yann Felix
* **Graine numérique du groupe (Seed) :** 42265903
* **Taille de l'échantillon :** 300 freelances
* **Date de rendu :** Dimanche 5 juillet 2026

---

## 1. Annexe : Génération des Données Personnalisées

Conformément aux modalités du TP, l'échantillon de données a été généré de manière déterministe et reproductible à partir du nom du chef de groupe.

### Algorithme de Génération
1. **Normalisation du nom :** Le nom complet `"WANDJI TCHALEU Yann Felix"` a été nettoyé de ses espaces et accents, puis converti en majuscules pour obtenir la chaîne unique :
   `"WANDJITCHALEUYANNFELIX"`
2. **Création de la graine (Seed) :** Nous avons appliqué une fonction de hachage **SHA-256** sur cette chaîne. Pour obtenir une valeur entière reproductible et manipulable par les bibliothèques aléatoires standard de Python (`numpy`), nous avons extrait le modulo $10^8$ de la valeur hexadécimale du hachage.
   $$\text{Seed} = \text{SHA256}(\text{"WANDJITCHALEUYANNFELIX"}) \pmod{10^8} = 42265903$$
3. **Simulation des Variables ($N=300$) :**
   * **Performance ($X_1$) :** Représente l'indice de satisfaction client sur 100. Modélisé par une loi normale $\mathcal{N}(70, 12)$, bornée par sécurité entre $20$ et $100$.
   * **Tarif Journalier Moyen ($X_2$) :** Modélisé en FCFA. Pour simuler la réalité du marché, nous l'avons corrélé positivement à la performance avec un bruit résiduel :
     $$TJM = 60\,000 + 2\,000 \times Performance + \epsilon \quad \text{avec } \epsilon \sim \mathcal{N}(0, 35\,000)$$
     Les valeurs ont ensuite été arrondies à la tranche de $5\,000$ FCFA la plus proche et bornées entre $50\,000$ et $450\,000$ FCFA.
   * **Label historique de statut ($Y$) :** Représente la qualification "Premium" ou "Standard" décidée historiquement "au feeling" par l'équipe commerciale. Nous avons simulé cette décision via une probabilité logistique bruitée :
     $$P(\text{Premium}) = \frac{1}{1 + e^{-z}} \quad \text{avec } z = 0.15 \times (Performance - 74) + 0.00001 \times (TJM - 220\,000)$$

---

## 2. Question 1 : Distribution de la Performance et Valeurs Extrêmes

Le commanditaire souhaite comprendre la répartition du premier indicateur (Performance) et identifier d'éventuels profils marginaux.

### Résultats Numériques (Statistique Univariée)
* **Taille de l'échantillon ($N$) :** 300 freelances
* **Moyenne :** $71.07 / 100$
* **Médiane :** $70.95 / 100$
* **Écart-type ($\sigma$) :** $11.87$
* **Minimum / Maximum :** $41.50 / 99.20$
* **Premier Quartile ($Q_1$) :** $62.70$
* **Troisième Quartile ($Q_3$) :** $79.60$
* **Écart Interquartile ($IQR$) :** $Q_3 - Q_1 = 16.90$

### Détection des Valeurs Atypiques (Outliers)
Nous utilisons la méthode de **l'Écart Interquartile (IQR)**. Une valeur est jugée atypique si elle se situe en dehors des bornes :
$$\text{Borne Inférieure} = Q_1 - 1.5 \times IQR = 62.70 - (1.5 \times 16.90) = 37.35$$
$$\text{Borne Supérieure} = Q_3 + 1.5 \times IQR = 79.60 + (1.5 \times 16.90) = 104.95$$

* **Nombre d'outliers détectés :** $0$ (aucun freelance n'a une performance inférieure à $37.35$ ou supérieure à $104.95$). Le minimum de notre échantillon étant à $41.50$, toutes les données se situent dans l'intervalle de distribution normale.

### Discussion des Limites de la Méthode
La méthode de l'IQR est excellente car elle ne suppose pas une distribution symétrique. Cependant, le seuil de $1.5$ est une convention académique. Si nous avions utilisé le critère des 3 écarts-types (Z-score), les seuils auraient été différents. De plus, ne regarder qu'une variable à la fois empêche de repérer un freelance qui aurait un tarif disproportionné par rapport à sa note (aberration bivariée).

### Synthèse pour les Investisseurs (Non-Statisticiens)
> « Notre plateforme bénéficie d'une communauté de freelances très performante avec une note médiane solide de $71/100$. La distribution est équilibrée et nous ne constatons aucune dérive ou profil anormalement mauvais au sein de notre échantillon de 300 prestataires. »

---

## 3. Question 2 : Relation Performance / Tarification et Anticipation

Le commanditaire veut vérifier le lien entre le tarif (TJM) et la performance pour anticiper la note d'un freelance dès son inscription.

### Résultats de la Régression Linéaire
* **Coefficient de corrélation linéaire de Pearson ($r$) :** $0.5589$. Il s'agit d'une corrélation positive modérée à forte. Plus le TJM d'un freelance est élevé, plus son score de performance tend à être élevé.
* **Équation de la droite de régression :**
  $$Performance = 0.000159 \times TJM\_FCFA + 38.67$$
* **Coefficient de détermination ($R^2$) :** $0.3124$. 

### Interprétation et Discussion des Limites
1. **Fiabilité de la prédiction ($R^2$) :** Le $R^2$ de $31.24\%$ indique que près de **$68\%$ de la variance de la performance reste inexpliquée** par le modèle simple. D'autres variables comme l'expérience ou le domaine d'activité jouent un rôle prépondérant.
2. **Danger d'extrapolation :** Le modèle a été calibré pour des tarifs compris entre $50\,000$ et $450\,000$ FCFA. Si un freelance demande un TJM de $1\,000\,000$ FCFA, l'équation lui prédirait une performance aberrante de $197 / 100$. Le modèle ne doit pas être utilisé en dehors des bornes.
3. **Non-causalité :** Ce modèle montre une association statistique et non un lien de cause à effet. Forcer un freelance à augmenter son TJM n'améliorera pas sa note de satisfaction client.

---

## 4. Question 3 : Identification des Profils Naturels (Clustering K-Means)

Indépendamment de l'étiquette historique de l'équipe, nous cherchons à découvrir les groupes naturels de freelances à l'aide de l'algorithme **K-Means** (avec $K = 3$).

### Pourquoi Standardiser ?
Les échelles des deux variables sont très différentes : la Performance va de $0$ à $100$ alors que le TJM va de $50\,000$ à $450\,000$. Sans standardisation (calcul du Z-score), l'algorithme K-Means, qui utilise la distance euclidienne, ignorerait totalement la Performance au profit du TJM.

### Résultats du Clustering ($K=3$)
Après standardisation, les 3 groupes se répartissent ainsi :

| Profil / Cluster | Effectif ($N$) | Proportion (%) | Performance Moyenne | TJM Moyen (FCFA) | Caractérisation Métier |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **Groupe 1** | 84 | $28.00\%$ | $58.19 / 100$ | $161\,726$ FCFA | **Les Juniors / Standards** (faible note, tarif bas) |
| **Groupe 2** | 133 | $44.33\%$ | $71.26 / 100$ | $202\,444$ FCFA | **Les Pépites sous-évaluées** (bonne performance, tarif modéré) |
| **Groupe 3** | 83 | $27.67\%$ | $83.81 / 100$ | $249\,398$ FCFA | **Les Experts Premium** (excellence client, tarif élevé) |

### Description des Profils
* **Groupe 3 (Experts Premium) :** Représente le haut du panier. Ils sont caractérisés par une excellente performance et des tarifs élevés.
* **Groupe 2 (Pépites sous-évaluées) :** Groupe majoritaire. Ils réalisent de très bonnes prestations à des prix raisonnables. Ce sont les profils les plus rentables et attractifs à mettre en avant pour les clients.
* **Groupe 1 (Juniors / Standards) :** Profils en cours d'apprentissage ou rencontrant des difficultés de livraison. Leurs tarifs bas reflètent ce niveau de service.

---

## 5. Question 4 : Classification Supervisée et Risques Métiers

Pour automatiser la qualification "Premium" vs "Standard" à l'inscription, nous comparons deux modèles de Machine Learning sur l'échantillon de test (20% des données).

### Performance des Modèles sur l'Échantillon Test

| Métrique | Régression Logistique | Arbre de Décision (Profondeur = 3) |
| :---: | :---: | :---: |
| **Exactitude (Accuracy)** | **$73.33\%$** | $68.33\%$ |
| **Précision** | **$76.47\%$** | $71.43\%$ |
| **Rappel (Recall)** | **$52.00\%$** | $40.00\%$ |
| **F1-Score** | **$61.90\%$** | $51.28\%$ |

#### Matrice de Confusion (Régression Logistique)
* **Vrais Négatifs (TN - Standard bien classés) :** 31
* **Faux Positifs (FP - Standard qualifiés Premium par erreur) :** 4
* **Faux Négatifs (FN - Premium qualifiés Standard par erreur) :** 12
* **Vrais Positifs (TP - Premium bien classés) :** 13

### Analyse des Risques Commerciaux
1. **Risque des Faux Positifs (FP) :** Un profil Standard est promu Premium. 
   * *Conséquence :* Le client paie un supplément pour un service Premium et se retrouve face à un freelance moyen. Cela dégrade la confiance dans la marque et la réputation de la plateforme.
2. **Risque des Faux Négatifs (FN) :** Un excellent freelance (Premium) est classé standard par le système automatique.
   * *Conséquence :* Frustration du freelance qui voit son niveau de compétence dévalorisé. Il risque de quitter notre plateforme pour des concurrents. De plus, la plateforme perd des opportunités de commissions plus élevées.

### Recommandation Décisionnelle
Nous recommandons l'utilisation de la **Régression Logistique** (qui affiche une exactitude de $73.33\%$). Cependant, pour minimiser le risque commercial majeur des Faux Positifs, il est conseillé de ne pas utiliser le seuil automatique de $50\%$ de probabilité. 

Nous suggérons de configurer le système avec un **seuil de décision à $70\%$**. Ainsi, le système n'attribuera le statut Premium de façon automatique que s'il est très confiant, limitant drastiquement les erreurs qualitatives vis-à-vis des clients finaux.
