from flask import Flask, jsonify, request, send_from_directory
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support, accuracy_score
import os

app = Flask(__name__, static_folder='static', static_url_path='')

DATA_PATH = "/home/uranium_yann/Github/freelance_client/freelance_data.csv"

# --- ENTRAÎNEMENT GLOBAL DES MODÈLES AU DÉMARRAGE (SIMPLIFICATION) ---
# On charge les données une fois et on entraîne les modèles globaux
if os.path.exists(DATA_PATH):
    df_global = pd.read_csv(DATA_PATH)
    X_global = df_global[['Performance', 'TJM_FCFA']].values
    y_global = np.where(df_global['Statut'] == 'Premium', 1, 0)
    
    # Modèles entraînés sur tout le jeu de données pour le simulateur en temps réel
    log_reg_global = LogisticRegression(random_state=42).fit(X_global, y_global)
    tree_clf_global = DecisionTreeClassifier(max_depth=3, random_state=42).fit(X_global, y_global)
else:
    log_reg_global = None
    tree_clf_global = None


# Route pour servir l'interface HTML
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')


# Endpoint : Données brutes
@app.route('/api/data', methods=['GET'])
def get_raw_data():
    df = pd.read_csv(DATA_PATH)
    return jsonify(df.to_dict(orient='records'))


# Q1 : Analyse Univariée (Performance)
@app.route('/api/q1', methods=['GET'])
def get_q1_stats():
    df = pd.read_csv(DATA_PATH)
    perf = df['Performance']
    
    # Indicateurs clés
    mean, median, std_dev = perf.mean(), perf.median(), perf.std()
    q1, q3 = perf.quantile(0.25), perf.quantile(0.75)
    iqr = q3 - q1
    
    # Outliers par méthode IQR
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    outliers_df = df[(df['Performance'] < lower_bound) | (df['Performance'] > upper_bound)]
    
    # Histogramme (10 classes/bins)
    counts, bin_edges = np.histogram(perf, bins=10)
    bin_labels = [f"[{bin_edges[i]:.1f} - {bin_edges[i+1]:.1f}]" for i in range(10)]
    
    return jsonify({
        "summary": {
            "n": len(perf),
            "mean": round(mean, 2),
            "median": round(median, 2),
            "std_dev": round(std_dev, 2),
            "variance": round(perf.var(), 2),
            "min": round(perf.min(), 2),
            "max": round(perf.max(), 2),
            "q1": round(q1, 2),
            "q3": round(q3, 2),
            "iqr": round(iqr, 2),
            "lower_bound": round(lower_bound, 2),
            "upper_bound": round(upper_bound, 2),
            "outliers_count": len(outliers_df),
            "outliers_percentage": round((len(outliers_df) / len(perf)) * 100, 2)
        },
        "outliers": outliers_df.to_dict(orient='records'),
        "histogram": {
            "labels": bin_labels,
            "values": counts.tolist()
        },
        "boxplot": {
            "min": float(perf.min()),
            "q1": float(q1),
            "median": float(median),
            "q3": float(q3),
            "max": float(perf.max())
        }
    })


# Q2 : Analyse Bivariée & Régression Linéaire
@app.route('/api/q2', methods=['GET'])
def get_q2_stats():
    df = pd.read_csv(DATA_PATH)
    X = df[['TJM_FCFA']].values
    Y = df['Performance'].values
    
    # Droite de régression
    model = LinearRegression().fit(X, Y)
    slope = model.coef_[0]
    intercept = model.intercept_
    
    # Résidus (erreurs)
    y_pred = model.predict(X)
    residuals = Y - y_pred
    
    return jsonify({
        "correlation": round(df['TJM_FCFA'].corr(df['Performance']), 4),
        "equation": f"Performance = {slope:.6f} * TJM + {intercept:.2f}",
        "slope": float(slope),
        "intercept": float(intercept),
        "r2": round(model.score(X, Y), 4),
        "scatter": [{"x": int(x), "y": round(float(y), 2)} for x, y in zip(df['TJM_FCFA'], df['Performance'])],
        "line": [
            {"x": int(df['TJM_FCFA'].min()), "y": round(float(slope * df['TJM_FCFA'].min() + intercept), 2)},
            {"x": int(df['TJM_FCFA'].max()), "y": round(float(slope * df['TJM_FCFA'].max() + intercept), 2)}
        ],
        "residuals": [{"x": int(x), "y": round(float(r), 2)} for x, r in zip(df['TJM_FCFA'], residuals)]
    })


# Q3 : Classification Non Supervisée (K-Means K=3)
@app.route('/api/q3', methods=['GET'])
def get_q3_stats():
    df = pd.read_csv(DATA_PATH)
    X = df[['Performance', 'TJM_FCFA']].values
    
    # Standardisation et clustering
    X_scaled = StandardScaler().fit_transform(X)
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    df['Cluster'] = kmeans.fit_predict(X_scaled)
    
    # Calcul des centroïdes
    centroids = StandardScaler().fit(X).inverse_transform(kmeans.cluster_centers_)
    
    cluster_summary = []
    for i in range(3):
        c_data = df[df['Cluster'] == i]
        cluster_summary.append({
            "cluster_id": i,
            "size": len(c_data),
            "percentage": round((len(c_data) / len(df)) * 100, 2),
            "mean_performance": round(c_data['Performance'].mean(), 2),
            "mean_tjm": round(c_data['TJM_FCFA'].mean(), 0)
        })
        
    return jsonify({
        "clusters": cluster_summary,
        "centroids": [{"x": round(float(c[1]), 0), "y": round(float(c[0]), 2), "cluster_id": idx} for idx, c in enumerate(centroids)],
        "points": [{"id": r['Freelance_ID'], "x": int(r['TJM_FCFA']), "y": float(r['Performance']), "cluster": int(r['Cluster'])} for _, r in df.iterrows()]
    })


# Q4 : Modèles de Classification Supervisée
@app.route('/api/q4', methods=['GET'])
def get_q4_stats():
    df = pd.read_csv(DATA_PATH)
    X = df[['Performance', 'TJM_FCFA']].values
    y = np.where(df['Statut'] == 'Premium', 1, 0)
    
    # Séparation Entraînement (80%) / Test (20%)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Entraînement et prédictions
    lr = LogisticRegression(random_state=42).fit(X_train, y_train)
    dt = DecisionTreeClassifier(max_depth=3, random_state=42).fit(X_train, y_train)
    
    y_pred_lr = lr.predict(X_test)
    y_pred_dt = dt.predict(X_test)
    
    # Matrices de confusion
    cm_lr = confusion_matrix(y_test, y_pred_lr)
    cm_dt = confusion_matrix(y_test, y_pred_dt)
    
    # Calcul des métriques
    p_lr, r_lr, f_lr, _ = precision_recall_fscore_support(y_test, y_pred_lr, average='binary')
    p_dt, r_dt, f_dt, _ = precision_recall_fscore_support(y_test, y_pred_dt, average='binary')
    
    return jsonify({
        "logistic_regression": {
            "accuracy": round(accuracy_score(y_test, y_pred_lr), 4),
            "precision": round(p_lr, 4),
            "recall": round(r_lr, 4),
            "f1_score": round(f_lr, 4),
            "confusion_matrix": {"tn": int(cm_lr[0,0]), "fp": int(cm_lr[0,1]), "fn": int(cm_lr[1,0]), "tp": int(cm_lr[1,1])}
        },
        "decision_tree": {
            "accuracy": round(accuracy_score(y_test, y_pred_dt), 4),
            "precision": round(p_dt, 4),
            "recall": round(r_dt, 4),
            "f1_score": round(f_dt, 4),
            "confusion_matrix": {"tn": int(cm_dt[0,0]), "fp": int(cm_dt[0,1]), "fn": int(cm_dt[1,0]), "tp": int(cm_dt[1,1])}
        }
    })


# Route de prédiction interactive pour le simulateur
@app.route('/api/predict', methods=['POST'])
def predict_freelance():
    data = request.get_json()
    perf = float(data.get('performance', 70))
    tjm = float(data.get('tjm', 200000))
    
    input_data = np.array([[perf, tjm]])
    
    prob_lr = log_reg_global.predict_proba(input_data)[0][1]
    prob_dt = tree_clf_global.predict_proba(input_data)[0][1]
    
    return jsonify({
        "logistic_regression": {
            "class": "Premium" if prob_lr >= 0.5 else "Standard",
            "probability": round(float(prob_lr), 4)
        },
        "decision_tree": {
            "class": "Premium" if prob_dt >= 0.5 else "Standard",
            "probability": round(float(prob_dt), 4)
        }
    })


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
