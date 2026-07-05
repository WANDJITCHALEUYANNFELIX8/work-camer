import numpy as np
import pandas as pd
import hashlib

def generate_data(chef_de_groupe_name="WANDJI TCHALEU Yann Felix"):
    # 1. Nettoyage du nom pour créer la chaîne de caractères
    clean_name = "".join(chef_de_groupe_name.split()).upper()
    # Suppression d'éventuels accents (ici il n'y en a pas, mais c'est une bonne pratique)
    import unicodedata
    clean_name = "".join(
        c for c in unicodedata.normalize('NFD', clean_name)
        if unicodedata.category(c) != 'Mn'
    )
    
    # 2. Génération de la graine numérique (seed) unique
    # On utilise SHA-256 pour avoir un hachage fort, puis on prend le modulo pour avoir un entier à 8 chiffres
    sha_hash = hashlib.sha256(clean_name.encode('utf-8')).hexdigest()
    seed = int(sha_hash, 16) % (10**8)
    
    print(f"Chaîne générée : '{clean_name}'")
    print(f"Graine numérique obtenue (Seed) : {seed}")
    
    # 3. Initialisation du générateur aléatoire avec la graine
    rng = np.random.default_rng(seed)
    
    # Nombre d'individus (freelances)
    n_samples = 300
    
    # 4. Simulation de la Performance (note de 0 à 100)
    # On utilise une distribution normale centrée sur 70 avec un écart-type de 12
    performance = rng.normal(70, 12, n_samples)
    performance = np.clip(performance, 20, 100)  # On limite entre 20 et 100
    
    # 5. Simulation du TJM (Tarif Journalier Moyen) en FCFA
    # Il est positivement corrélé à la performance + un bruit aléatoire
    # TJM moyen autour de 180 000 FCFA
    tjm_base = 60000 + performance * 2000
    noise = rng.normal(0, 35000, n_samples)
    tjm = tjm_base + noise
    tjm = np.clip(tjm, 50000, 450000)  # Limites réalistes
    
    # Arrondir le TJM aux 5 000 FCFA les plus proches pour faire réaliste
    tjm = np.round(tjm / 5000) * 5000
    tjm = tjm.astype(int)
    
    # 6. Simulation du Label historique ("Premium" ou "Standard")
    # L'équipe commerciale a classé comme "Premium" les freelances qui ont :
    # de bonnes performances ET des tarifs élevés, mais avec des erreurs humaines (bruit)
    # Modélisation par une probabilité logistique (parfait pour la régression logistique du TP)
    z = 0.15 * (performance - 74) + 0.00001 * (tjm - 220000)
    prob_premium = 1 / (1 + np.exp(-z))
    
    # Tirage de Bernoulli pour chaque freelance
    random_draws = rng.random(n_samples)
    labels = np.where(random_draws < prob_premium, "Premium", "Standard")
    
    # 7. Création du DataFrame et sauvegarde
    df = pd.DataFrame({
        'Freelance_ID': [f"FL-{i:03d}" for i in range(1, n_samples + 1)],
        'Performance': np.round(performance, 1),
        'TJM_FCFA': tjm,
        'Statut': labels
    })
    
    # Sauvegarde en CSV
    output_path = "/home/uranium_yann/Github/freelance_client/freelance_data.csv"
    df.to_csv(output_path, index=False)
    print(f"Jeu de données sauvegardé avec succès ({n_samples} lignes) dans : {output_path}")
    print("\nAperçu des données :")
    print(df.head())
    print("\nStatistiques descriptives par statut :")
    print(df.groupby('Statut')[['Performance', 'TJM_FCFA']].mean())

if __name__ == "__main__":
    generate_data()
