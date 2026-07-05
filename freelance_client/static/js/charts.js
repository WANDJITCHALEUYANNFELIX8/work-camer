// CHARTS.JS - Gestion et dessin des graphiques Chart.js

const Charts = {
    instances: {},

    // Détruire un graphique s'il existe déjà pour éviter les superpositions au survol
    destroy: (id) => {
        if (Charts.instances[id]) {
            Charts.instances[id].destroy();
            delete Charts.instances[id];
        }
    },

    // Q1 : Histogramme de distribution de la performance
    renderHistogram: (canvasId, histData) => {
        Charts.destroy(canvasId);
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        Charts.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: histData.labels,
                datasets: [{
                    label: 'Effectif',
                    data: histData.values,
                    backgroundColor: 'rgba(99, 102, 241, 0.4)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                    y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    },

    // Q2 : Nuage de points + droite de régression linéaire
    renderRegression: (canvasId, regData) => {
        Charts.destroy(canvasId);
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        Charts.instances[canvasId] = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Freelances Réels',
                        data: regData.scatter,
                        backgroundColor: 'rgba(148, 163, 184, 0.4)',
                        borderColor: '#94a3b8',
                        borderWidth: 1,
                        pointRadius: 4
                    },
                    {
                        label: 'Modèle Linéaire',
                        data: regData.line,
                        type: 'line',
                        fill: false,
                        borderColor: '#6366f1',
                        borderWidth: 3,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#f8fafc' } } },
                scales: {
                    x: { title: { display: true, text: 'TJM (FCFA)', color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                    y: { title: { display: true, text: 'Performance (/100)', color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    },

    // Q2 : Nuage de points des résidus (erreurs de prédiction)
    renderResiduals: (canvasId, residuals) => {
        Charts.destroy(canvasId);
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        Charts.instances[canvasId] = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Résidu',
                        data: residuals,
                        backgroundColor: 'rgba(244, 63, 94, 0.4)',
                        borderColor: '#f43f5e',
                        borderWidth: 1,
                        pointRadius: 3
                    },
                    {
                        label: 'Ligne Zéro',
                        data: [
                            { x: Math.min(...residuals.map(r => r.x)), y: 0 },
                            { x: Math.max(...residuals.map(r => r.x)), y: 0 }
                        ],
                        type: 'line',
                        fill: false,
                        borderColor: '#10b981',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { title: { display: true, text: 'TJM (FCFA)', color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                    y: { title: { display: true, text: 'Erreur (Résidu)', color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    },

    // Q3 : Nuage de points K-Means avec couleurs distinctes et Centroïdes
    renderKMeans: (canvasId, kmeansData) => {
        Charts.destroy(canvasId);
        const ctx = document.getElementById(canvasId).getContext('2d');
        const datasets = [];
        
        // Un jeu de données par groupe (0, 1, 2)
        const colors = ['#6366f1', '#10b981', '#f43f5e']; // Indigo, Vert, Rouge
        const names = ["Juniors / Standards", "Pépites sous-évaluées", "Experts Premium"];
        
        for (let i = 0; i < 3; i++) {
            const clusterPoints = kmeansData.points.filter(p => p.cluster === i).map(p => ({ x: p.x, y: p.y }));
            
            datasets.push({
                label: `Groupe ${i+1} : ${names[i]}`,
                data: clusterPoints,
                backgroundColor: colors[i] + '66', // 40% opacité
                borderColor: colors[i],
                borderWidth: 1,
                pointRadius: 4
            });
        }
        
        // Centroïdes (centres des groupes)
        datasets.push({
            label: 'Centres de groupe (Centroïdes)',
            data: kmeansData.centroids.map(c => ({ x: c.x, y: c.y })),
            backgroundColor: '#ffffff',
            borderColor: '#f59e0b', // Orange
            borderWidth: 2,
            pointStyle: 'rectRot',
            pointRadius: 9,
            pointHoverRadius: 11
        });
        
        Charts.instances[canvasId] = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#f8fafc', boxWidth: 12 } } },
                scales: {
                    x: { title: { display: true, text: 'TJM (FCFA)', color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
                    y: { title: { display: true, text: 'Performance (/100)', color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }
};
