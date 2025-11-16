# Home Energy - Application de Suivi du Chauffage Solaire

Application Next.js simple et moderne pour récupérer et afficher les données de chauffage solaire depuis my.solisart.fr.

## 🚀 Stack Technique

- **Next.js 14+** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Shadcn UI** - Composants UI modernes
- **Tailwind CSS** - Framework CSS utility-first
- **Playwright** - Scraping web automatisé

## 📋 Prérequis

- **Node.js** 18+ et **Yarn**
- **Git**

## 🛠️ Installation

### 1. Cloner le repository

```bash
git clone <votre-repo-url>
cd home-energy
```

### 2. Installer les dépendances

```bash
yarn install
```

### 3. Installer les navigateurs Playwright

```bash
yarn playwright install chromium
```

### 4. Configuration des variables d'environnement

1. Copiez le fichier d'exemple :

   ```bash
   cp .env.example .env.local
   ```

2. Modifiez `.env.local` avec vos identifiants :
   ```
   SOLISTAR_ID=votre-email@example.com
   SOLISTAR_PASSWORD=votre-mot-de-passe
   ```

### 5. Démarrer l'application en développement

```bash
yarn dev
```

L'application sera accessible sur **http://localhost:3000**

## 📁 Structure du Projet

```
home-energy/
├── app/
│   ├── api/
│   │   └── heating/
│   │       └── route.ts          # API route pour récupérer les données
│   ├── globals.css               # Styles globaux Tailwind
│   ├── layout.tsx                # Layout principal
│   └── page.tsx                  # Page principale
├── components/
│   └── ui/                       # Composants Shadcn UI
│       ├── card.tsx
│       └── badge.tsx
├── lib/
│   └── utils.ts                  # Utilitaires (cn function)
├── scripts/
│   └── scrape-heating.ts         # Script Playwright pour le scraping
├── data/                         # Dossier pour les données (non versionné)
├── .env.local                    # Variables d'environnement (non versionné)
├── .env.example                  # Exemple de variables d'environnement
└── package.json
```

## 🎯 Fonctionnalités

### Récupération automatique des données

L'application récupère automatiquement les données suivantes depuis my.solisart.fr :

- **Panneaux solaires** : Capteurs chaud/froid
- **Ballon** : Température solaire, appoint, origine, min, confort
- **Chaudière** : Température
- **Radiateur** : Entrée, sortie, origine, min, confort
- **Thermomètres** : Extérieur, intérieur

### Affichage des données

- Interface moderne avec Shadcn UI
- Cartes organisées par catégorie
- Badges pour les origines (Solaire, Solaire + appoint, Arrêt)
- Affichage automatique au chargement de la page

## 🔌 API Endpoints

### GET `/api/heating`

Récupère les données actuelles en exécutant le scraping Playwright.

**Réponse :**

```json
{
  "date": "2024-01-01T12:00:00.000Z",
  "data": {
    "panels": {
      "hotSensor": 45.5,
      "coldSensor": 20.3
    },
    "tank": {
      "solar": 55.2,
      "additional": 50.1,
      "origin": "solar",
      "min": 40,
      "confort": 55
    },
    "boiler": 60.5,
    "radiator": {
      "inlet": 45.2,
      "outlet": 42.1,
      "origin": "solar",
      "min": 18,
      "confort": 20
    },
    "thermometer": {
      "outdoor": 15.3,
      "indoor": 20.5
    }
  }
}
```

## 🚢 Déploiement en Production

### Build pour la production

```bash
yarn build
yarn start
```

### Déploiement sur Synology NAS

Consultez le fichier [SYNOLOGY.md](./SYNOLOGY.md) pour les instructions détaillées.

## 🔒 Sécurité

- ✅ Variables d'environnement pour les identifiants
- ✅ Fichiers `.env*` exclus du versionnement
- ✅ Dossier `data/` non versionné
- ✅ Gestion d'erreurs appropriée

## 📝 Scripts disponibles

- `yarn dev` - Démarrer le serveur de développement
- `yarn build` - Construire l'application pour la production
- `yarn start` - Démarrer le serveur de production
- `yarn lint` - Lancer le linter

## 🐛 Dépannage

### L'application ne récupère pas les données

1. Vérifiez que les identifiants dans `.env.local` sont corrects
2. Vérifiez que Playwright est installé : `yarn playwright install chromium`
3. Consultez les logs de la console pour plus de détails

### Erreurs de permissions

Si vous rencontrez des erreurs de permissions sur le dossier `data/` :

```bash
chmod -R 755 data
```

### Playwright ne fonctionne pas

Assurez-vous que les navigateurs sont installés :

```bash
yarn playwright install chromium
```

## 📄 Licence

Ce projet est sous licence MIT.
