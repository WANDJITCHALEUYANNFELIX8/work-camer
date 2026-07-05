// UI.JS - Gestion des mises à jour de l'interface et du DOM

const UI = {
    // Formater les montants en FCFA Camerounais (XAF)
    formatFCFA: (val) => {
        return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(val);
    },

    // Remplir le tableau d'aperçu de données (Onglet 1)
    renderRawTable: (tbodyId, data) => {
        const tbody = document.querySelector(`#${tbodyId} tbody`);
        tbody.innerHTML = '';
        
        data.slice(0, 20).forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${row.Freelance_ID}</strong></td>
                <td>${row.Performance}</td>
                <td>${UI.formatFCFA(row.TJM_FCFA)}</td>
                <td><span class="badge badge-${row.Statut.toLowerCase()}">${row.Statut}</span></td>
            `;
            tbody.appendChild(tr);
        });
        
        if (data.length > 20) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" style="text-align: center; color: var(--text-muted); font-style: italic;">... Affichage des 20 premières lignes sur ${data.length} ...</td>`;
            tbody.appendChild(tr);
        }
    },

    // Q1 : Remplir la ligne de statistiques (Moyenne, Médiane, etc.)
    renderQ1Stats: (containerId, summary) => {
        const row = document.getElementById(containerId);
        row.innerHTML = `
            <div class="stat-card">
                <span class="stat-label">Moyenne</span>
                <span class="stat-value">${summary.mean}</span>
                <span class="stat-desc">Satisfaction moyenne / 100</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Médiane</span>
                <span class="stat-value">${summary.median}</span>
                <span class="stat-desc">50% sont au-dessus de cette note</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Écart-Type</span>
                <span class="stat-value">${summary.std_dev}</span>
                <span class="stat-desc">Dispersion des performances</span>
            </div>
            <div class="stat-card" style="${summary.outliers_count > 0 ? 'border-color: rgba(244,63,94,0.4);' : ''}">
                <span class="stat-label" style="${summary.outliers_count > 0 ? 'color: var(--danger);' : ''}">Valeurs Atypiques</span>
                <span class="stat-value" style="${summary.outliers_count > 0 ? 'color: var(--danger);' : ''}">${summary.outliers_count}</span>
                <span class="stat-desc">${summary.outliers_percentage}% des freelances</span>
            </div>
        `;
    },

    // Q1 : Dessiner la boîte à moustaches personnalisée en SVG
    renderSVGBoxplot: (containerId, boxplot, outliers) => {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        const width = 500;
        const height = 120;
        const padding = 40;
        
        const scaleX = (val) => padding + ((val - 20) / (100 - 20)) * (width - 2 * padding);
        
        const xMin = scaleX(boxplot.min);
        const xQ1 = scaleX(boxplot.q1);
        const xMedian = scaleX(boxplot.median);
        const xQ3 = scaleX(boxplot.q3);
        const xMax = scaleX(boxplot.max);
        
        let svg = `
            <svg width="${width}" height="${height}" style="background:transparent;">
                <!-- Règle graduée de 20 à 100 -->
                <line x1="${padding}" y1="90" x2="${width - padding}" y2="90" stroke="#475569" stroke-width="1" />
                <text x="${padding}" y="105" fill="#64748b" font-size="10" text-anchor="middle">20</text>
                <text x="${scaleX(40)}" y="105" fill="#64748b" font-size="10" text-anchor="middle">40</text>
                <text x="${scaleX(60)}" y="105" fill="#64748b" font-size="10" text-anchor="middle">60</text>
                <text x="${scaleX(80)}" y="105" fill="#64748b" font-size="10" text-anchor="middle">80</text>
                <text x="${width - padding}" y="105" fill="#64748b" font-size="10" text-anchor="middle">100</text>
                
                <!-- Moustaches pointillées -->
                <line x1="${xMin}" y1="50" x2="${xQ1}" y2="50" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4" />
                <line x1="${xQ3}" y1="50" x2="${xMax}" y2="50" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4" />
                
                <!-- Bornes Min/Max -->
                <line x1="${xMin}" y1="35" x2="${xMin}" y2="65" stroke="#94a3b8" stroke-width="2" />
                <line x1="${xMax}" y1="35" x2="${xMax}" y2="65" stroke="#94a3b8" stroke-width="2" />
                
                <!-- Boîte IQR -->
                <rect x="${xQ1}" y="30" width="${xQ3 - xQ1}" height="40" fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" stroke-width="2.5" />
                
                <!-- Médiane (Verte) -->
                <line x1="${xMedian}" y1="30" x2="${xMedian}" y2="70" stroke="#10b981" stroke-width="3" />
                
                <!-- Valeurs Textes -->
                <text x="${xMin}" y="22" fill="#94a3b8" font-size="9" text-anchor="middle">${boxplot.min.toFixed(1)}</text>
                <text x="${xQ1}" y="22" fill="#6366f1" font-size="9" text-anchor="middle">${boxplot.q1.toFixed(1)}</text>
                <text x="${xMedian}" y="82" fill="#10b981" font-size="10" font-weight="bold" text-anchor="middle">${boxplot.median.toFixed(1)}</text>
                <text x="${xQ3}" y="22" fill="#6366f1" font-size="9" text-anchor="middle">${boxplot.q3.toFixed(1)}</text>
                <text x="${xMax}" y="22" fill="#94a3b8" font-size="9" text-anchor="middle">${boxplot.max.toFixed(1)}</text>
        `;
        
        // Outliers
        outliers.forEach(out => {
            svg += `<circle cx="${scaleX(out.Performance)}" cy="50" r="5" fill="#f43f5e" stroke="#090d16" stroke-width="1.5" />`;
        });
        
        svg += `</svg>`;
        container.innerHTML = svg;
    },

    // Q1 : Remplir le tableau des outliers
    renderQ1OutliersTable: (tableId, boundsId, outliers, summary) => {
        document.getElementById(boundsId).textContent = `[${summary.lower_bound} - ${summary.upper_bound}]`;
        const tbody = document.querySelector(`#${tableId} tbody`);
        tbody.innerHTML = '';
        
        if (outliers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Aucune valeur atypique.</td></tr>';
            return;
        }
        
        outliers.forEach(out => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color: var(--danger);">${out.Freelance_ID}</strong></td>
                <td>${out.Performance}</td>
                <td>${UI.formatFCFA(out.TJM_FCFA)}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    // Q1 : Générer le texte de synthèse univariée
    renderQ1SummaryText: (containerId, summary, outliers) => {
        const container = document.getElementById(containerId);
        let outliersSentence = "aucune valeur aberrante n'est présente dans nos données.";
        if (outliers.length > 0) {
            outliersSentence = `nous identifions <strong>${outliers.length} profils marginaux</strong> avec une performance inférieure à ${summary.lower_bound}.`;
        }
        
        container.innerHTML = `
            <p>La note moyenne de satisfaction s'élève à <strong>${summary.mean}/100</strong> avec un écart-type de <strong>${summary.std_dev}</strong>. La médiane est de <strong>${summary.median}</strong>, ce qui démontre qu'une majorité de freelances délivre des projets de grande qualité.</p>
            <p>Par la méthode de l'IQR (Écart Interquartile), ${outliersSentence}</p>
            <p><strong>Phrase clé pour les investisseurs :</strong><br>
            <span style="color: var(--primary); font-size: 1.05rem; font-weight: 600; display: block; margin-top: 0.5rem; border-left: 3px solid var(--primary); padding-left: 0.75rem;">
                « Notre communauté présente un profil de compétences excellent et stable avec une note médiane de ${summary.median}/100, et seulement ${summary.outliers_percentage}% de contre-performances marginales. »
            </span></p>
        `;
    },

    // Q2 : Remplir la ligne de statistiques (Régression)
    renderQ2Stats: (containerId, data) => {
        const row = document.getElementById(containerId);
        row.innerHTML = `
            <div class="stat-card">
                <span class="stat-label">Pearson (r)</span>
                <span class="stat-value">${data.correlation}</span>
                <span class="stat-desc">Force de la relation linéaire</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Détermination (R²)</span>
                <span class="stat-value">${data.r2}</span>
                <span class="stat-desc">${(data.r2 * 100).toFixed(1)}% expliqués</span>
            </div>
            <div class="stat-card" style="grid-column: span 2;">
                <span class="stat-label">Modèle de Prédiction</span>
                <span class="stat-value" style="font-size: 1.25rem; font-family: monospace; color: var(--primary); padding-top:0.35rem;">${data.equation}</span>
                <span class="stat-desc">Performance estimée à partir du TJM</span>
            </div>
        `;
    },

    // Q2 : Synthèse des limites
    renderQ2Limits: (containerId, data) => {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <p>Le TJM et la performance sont liés de façon modérée ($r = ${data.correlation}$). Néanmoins, le coefficient $R^2 = ${data.r2}$ nous montre que le tarif n'explique que <strong>${(data.r2 * 100).toFixed(1)}%</strong> de la note finale.</p>
            <p><strong>Limites d'anticipation :</strong><br>
            1. <strong>Extrapolation :</strong> L'équation n'est pas fiable pour des tarifs extrêmes (ex: > 500 000 FCFA).<br>
            2. <strong>Résidus importants :</strong> Les prédictions peuvent différer de la réalité de plus de 15 points (voir le nuage de résidus).<br>
            3. <strong>Absence de causalité :</strong> Augmenter le TJM d'un freelance standard n'augmentera pas artificiellement sa performance.</p>
        `;
    },

    // Q3 : Remplir le tableau des clusters K-Means
    renderQ3Table: (tableId, descId, clusters) => {
        const tbody = document.querySelector(`#${tableId} tbody`);
        tbody.innerHTML = '';
        
        const colors = ['#6366f1', '#10b981', '#f43f5e'];
        const names = ["Juniors / Standards", "Pépites sous-évaluées", "Experts Premium"];
        
        clusters.forEach((c, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="badge" style="background:${colors[idx]}22; border:1px solid ${colors[idx]}; color:${colors[idx]}; font-weight:bold;">Groupe ${c.cluster_id + 1} : ${names[idx]}</span></td>
                <td>${c.size} (${c.percentage}%)</td>
                <td><strong>${c.mean_performance}/100</strong></td>
                <td><strong>${UI.formatFCFA(c.mean_tjm)}</strong></td>
            `;
            tbody.appendChild(tr);
        });

        // Générer les descriptions métiers
        const descContainer = document.getElementById(descId);
        descContainer.innerHTML = '';
        const details = [
            "<strong>Les Juniors/Standards :</strong> Freelances avec une satisfaction en retrait et des tarifs plus modestes. Profils en cours d'apprentissage, nécessitant un suivi.",
            "<strong>Les Pépites sous-évaluées :</strong> Excellent rapport qualité/prix. Satisfaction élevée pour des tarifs modérés. C'est le cœur de rentabilité de la plateforme.",
            "<strong>Les Experts Premium :</strong> L'élite technique. Note de satisfaction irréprochable et tarifs élevés, justifiés par leur haut niveau d'expertise."
        ];
        
        clusters.forEach((c, idx) => {
            const card = document.createElement('div');
            card.className = 'cluster-desc-card';
            card.style.borderLeftColor = colors[idx];
            card.innerHTML = `
                <h5>Groupe ${c.cluster_id + 1} : ${names[idx]}</h5>
                <p>${details[idx]}</p>
            `;
            descContainer.appendChild(card);
        });
    },

    // Q4 : Remplir le tableau comparatif des modèles de classification
    renderQ4Table: (tableId, data) => {
        const tbody = document.querySelector(`#${tableId} tbody`);
        tbody.innerHTML = `
            <tr>
                <td>Exactitude (Accuracy)</td>
                <td style="font-weight:bold; color:var(--success);">${(data.logistic_regression.accuracy * 100).toFixed(1)}%</td>
                <td>${(data.decision_tree.accuracy * 100).toFixed(1)}%</td>
            </tr>
            <tr>
                <td>Précision</td>
                <td style="font-weight:bold; color:var(--success);">${(data.logistic_regression.precision * 100).toFixed(1)}%</td>
                <td>${(data.decision_tree.precision * 100).toFixed(1)}%</td>
            </tr>
            <tr>
                <td>Rappel (Recall)</td>
                <td style="font-weight:bold; color:var(--success);">${(data.logistic_regression.recall * 100).toFixed(1)}%</td>
                <td>${(data.decision_tree.recall * 100).toFixed(1)}%</td>
            </tr>
            <tr>
                <td>F1-Score</td>
                <td style="font-weight:bold; color:var(--success);">${(data.logistic_regression.f1_score * 100).toFixed(1)}%</td>
                <td>${(data.decision_tree.f1_score * 100).toFixed(1)}%</td>
            </tr>
        `;
    },

    // Q4 : Remplir le visuel de la matrice de confusion
    renderConfusionMatrix: (containerId, cm) => {
        const container = document.getElementById(containerId);
        const total = cm.tn + cm.fp + cm.fn + cm.tp;
        container.innerHTML = `
            <div class="cm-cell correct" title="Standard bien classé">
                <span class="cm-cell-label">Vrais Std (TN)</span>
                <span class="cm-cell-val">${cm.tn}</span>
                <span class="cm-cell-label">${((cm.tn/total)*100).toFixed(1)}%</span>
            </div>
            <div class="cm-cell incorrect" title="Erreur : Classé Premium alors qu'il est Standard">
                <span class="cm-cell-label">Faux Prem (FP)</span>
                <span class="cm-cell-val" style="color:var(--danger);">${cm.fp}</span>
                <span class="cm-cell-label">${((cm.fp/total)*100).toFixed(1)}%</span>
            </div>
            <div class="cm-cell incorrect" title="Erreur : Classé Standard alors qu'il est Premium">
                <span class="cm-cell-label">Faux Std (FN)</span>
                <span class="cm-cell-val" style="color:var(--danger);">${cm.fn}</span>
                <span class="cm-cell-label">${((cm.fn/total)*100).toFixed(1)}%</span>
            </div>
            <div class="cm-cell correct" title="Premium bien classé">
                <span class="cm-cell-label">Vrais Prem (TP)</span>
                <span class="cm-cell-val">${cm.tp}</span>
                <span class="cm-cell-label">${((cm.tp/total)*100).toFixed(1)}%</span>
            </div>
        `;
    },

    // Q4 : Synthèse des risques
    renderQ4RisksText: (containerId, data) => {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <p>La <strong>Régression Logistique</strong> est notre meilleur modèle avec **${(data.logistic_regression.accuracy * 100).toFixed(1)}%** d'exactitude.</p>
            <p><strong>Analyse des risques commerciaux :</strong><br>
            * <strong>Faux Positifs (FP) :</strong> Un freelance standard est qualifié "Premium". Cela risque de décevoir les clients finaux et d'abîmer le sérieux de notre label.<br>
            * <strong>Faux Négatifs (FN) :</strong> Un freelance excellent est ignoré et reste standard. Risque de frustration pour le freelance et fuite vers la concurrence.</p>
            <p><strong>Recommandation :</strong> Utiliser le modèle probabiliste de la Régression Logistique en exigeant un **seuil minimum de 70%** (au lieu de 50%) de confiance pour attribuer le statut Premium.</p>
        `;
    }
};
