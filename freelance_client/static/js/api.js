// API.JS - Gestion des requêtes vers le backend Flask

const API = {
    // Récupérer le jeu de données brutes
    getRawData: async () => {
        const res = await fetch('/api/data');
        return res.json();
    },

    // Récupérer les analyses de la Question 1 (Univariée)
    getQ1: async () => {
        const res = await fetch('/api/q1');
        return res.json();
    },

    // Récupérer les analyses de la Question 2 (Bivariée / Régression)
    getQ2: async () => {
        const res = await fetch('/api/q2');
        return res.json();
    },

    // Récupérer les analyses de la Question 3 (Clustering K-Means)
    getQ3: async () => {
        const res = await fetch('/api/q3');
        return res.json();
    },

    // Récupérer les analyses de la Question 4 (Supervisée)
    getQ4: async () => {
        const res = await fetch('/api/q4');
        return res.json();
    },

    // Envoyer des valeurs au simulateur de qualification
    predict: async (performance, tjm) => {
        const res = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ performance, tjm })
        });
        return res.json();
    }
};
