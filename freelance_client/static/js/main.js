// MAIN.JS - Orchestrateur de l'application frontend

document.addEventListener('DOMContentLoaded', () => {
    // ---- INITIALISATION DE L'APPLICATION ----
    let rawDataGlobal = [];
    
    // Charger l'onglet par défaut (Accueil)
    loadTab('tab-welcome');

    // ---- NAVIGATION PAR ONGLET ----
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    const tabMeta = {
        'tab-welcome': { title: 'Accueil & Données', subtitle: 'Aperçu et structure de l\'échantillon généré.' },
        'tab-q1': { title: 'Question 1 - Univariée', subtitle: 'Dispersion de la performance et détection des valeurs atypiques.' },
        'tab-q2': { title: 'Question 2 - Bivariée', subtitle: 'Analyse linéaire et droite d\'estimation de la performance.' },
        'tab-q3': { title: 'Question 3 - Clustering', subtitle: 'Segmentation naturelle des profils freelances par K-Means (K=3).' },
        'tab-q4': { title: 'Question 4 - Supervisé', subtitle: 'Modélisation prédictive et évaluation des risques commerciaux.' }
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            
            navItems.forEach(i => i.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            pageTitle.textContent = tabMeta[targetTab].title;
            pageSubtitle.textContent = tabMeta[targetTab].subtitle;
            
            loadTab(targetTab);
        });
    });

    // ---- CHARGEMENT À LA DEMANDE DES DONNÉES PAR ONGLET ----
    async function loadTab(tabId) {
        try {
            if (tabId === 'tab-welcome' && rawDataGlobal.length === 0) {
                rawDataGlobal = await API.getRawData();
                UI.renderRawTable('data-preview-table', rawDataGlobal);
            } 
            else if (tabId === 'tab-q1') {
                const data = await API.getQ1();
                UI.renderQ1Stats('q1-stats-row', data.summary);
                Charts.renderHistogram('q1-histogram-chart', data.histogram);
                UI.renderSVGBoxplot('custom-boxplot-svg', data.boxplot, data.outliers);
                UI.renderQ1OutliersTable('q1-outliers-table', 'q1-iqr-bounds', data.outliers, data.summary);
                UI.renderQ1SummaryText('q1-summary-text', data.summary, data.outliers);
            } 
            else if (tabId === 'tab-q2') {
                const data = await API.getQ2();
                UI.renderQ2Stats('q2-stats-row', data);
                Charts.renderRegression('q2-regression-chart', data);
                Charts.renderResiduals('q2-residuals-chart', data.residuals);
                UI.renderQ2Limits('q2-limits-text', data);
            } 
            else if (tabId === 'tab-q3') {
                const data = await API.getQ3();
                UI.renderQ3Table('q3-clusters-table', 'q3-cluster-desc-block', data.clusters);
                Charts.renderKMeans('q3-kmeans-chart', data);
            } 
            else if (tabId === 'tab-q4') {
                const data = await API.getQ4();
                UI.renderQ4Table('q4-comparison-table', data);
                UI.renderConfusionMatrix('q4-cm-lr', data.logistic_regression.confusion_matrix);
                UI.renderConfusionMatrix('q4-cm-dt', data.decision_tree.confusion_matrix);
                UI.renderQ4RisksText('q4-risks-text', data);
            }
        } catch (error) {
            console.error(`Erreur de chargement pour l'onglet ${tabId}:`, error);
        }
    }

    // ---- ACTIONS EXTERNES ----
    // Bouton de téléchargement CSV
    document.getElementById('btn-download').addEventListener('click', () => {
        if (rawDataGlobal.length === 0) return;
        let csvContent = "data:text/csv;charset=utf-8,Freelance_ID,Performance,TJM_FCFA,Statut\n";
        rawDataGlobal.forEach(row => {
            csvContent += `${row.Freelance_ID},${row.Performance},${row.TJM_FCFA},${row.Statut}\n`;
        });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "INF232_TP_WANDJI_freelance_data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // ---- SYNCHRONISATION ET REQUÊTES DU SIMULATEUR (Q4) ----
    const simForm = document.getElementById('simulator-form');
    const inputPerf = document.getElementById('input-perf');
    const rangePerf = document.getElementById('range-perf');
    const inputTjm = document.getElementById('input-tjm');
    const rangeTjm = document.getElementById('range-tjm');
    const simResultCard = document.getElementById('sim-result-card');

    const syncInputs = (num, slider) => {
        num.addEventListener('input', () => { slider.value = num.value; });
        slider.addEventListener('input', () => { num.value = slider.value; });
    };
    syncInputs(inputPerf, rangePerf);
    syncInputs(inputTjm, rangeTjm);

    simForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const perf = parseFloat(inputPerf.value);
        const tjm = parseFloat(inputTjm.value);
        
        try {
            const data = await API.predict(perf, tjm);
            simResultCard.classList.remove('hidden');
            
            // Régression Logistique
            const lrClass = document.getElementById('result-lr-class');
            lrClass.textContent = data.logistic_regression.class;
            lrClass.className = `badge-result ${data.logistic_regression.class}`;
            document.getElementById('result-lr-prob').textContent = `${(data.logistic_regression.probability * 100).toFixed(1)}%`;
            
            // Arbre de Décision
            const dtClass = document.getElementById('result-dt-class');
            dtClass.textContent = data.decision_tree.class;
            dtClass.className = `badge-result ${data.decision_tree.class}`;
            document.getElementById('result-dt-prob').textContent = `${(data.decision_tree.probability * 100).toFixed(1)}%`;
        } catch (error) {
            console.error("Erreur lors de la prédiction:", error);
        }
    });
});
