# Home Energy - Application de Suivi du Chauffage Solaire

Application Next.js simple et moderne pour récupérer et afficher les données de chauffage solaire depuis my.solisart.fr.

## 🚀 Stack Technique

- **Next.js 14+** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Shadcn UI** - Composants UI modernes
- **Tailwind CSS** - Framework CSS utility-first
- **Puppeteer Core + @sparticuz/chromium-min** - Scraping web automatisé (optimisé pour Vercel serverless, version minimale)
- **Clerk** - Authentification et gestion des utilisateurs

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

### 3. Configuration du navigateur

- **En production (Vercel)** : Le navigateur Chromium est automatiquement fourni par `@sparticuz/chromium-min` (version minimale optimisée pour les fonctions serverless, ~40MB)
- **En développement local** : Vous devez avoir Google Chrome installé sur votre machine. Le script utilisera automatiquement Chrome local.

### 4. Configuration des variables d'environnement

1. Copiez le fichier d'exemple :

   ```bash
   cp .env.example .env
   ```

2. Modifiez `.env` avec vos identifiants et coordonnées :

   ```
   # Coordonnées GPS pour l'application météo
   WEATHER_LATITUDE=48.8566
   WEATHER_LONGITUDE=2.3522

   # Identifiants SOLISTAR
   SOLISTAR_ID=votre-email@example.com
   SOLISTAR_PASSWORD=votre-mot-de-passe

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

### 4.1. Configuration de Clerk

1. Créez un compte sur [Clerk](https://clerk.com/) (gratuit jusqu'à 10 000 utilisateurs actifs/mois)
2. Créez une nouvelle application dans le dashboard Clerk
3. Récupérez vos clés API :
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` : Clé publique (commence par `pk_test_` ou `pk_live_`)
   - `CLERK_SECRET_KEY` : Clé secrète (commence par `sk_test_` ou `sk_live_`)
4. Ajoutez-les dans votre fichier `.env`
5. Configurez les URLs de redirection dans Clerk :
   - Sign-in redirect URL: `http://localhost:3000` (dev) ou votre domaine de production
   - Sign-up redirect URL: `http://localhost:3000` (dev) ou votre domaine de production

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
│   └── scrape-heating.ts         # Script Puppeteer Core + @sparticuz/chromium-min pour le scraping
├── data/                         # Dossier pour les données (non versionné)
├── .env                           # Variables d'environnement (non versionné)
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

> **Note** : Toutes les routes API nécessitent une authentification. Les requêtes non authentifiées recevront une erreur 401.

### GET `/api/heating`

Récupère les données actuelles en exécutant le scraping avec Puppeteer Core et @sparticuz/chromium-min (version minimale optimisée pour Vercel).

**Authentification requise** : Oui

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

- ✅ **Authentification Clerk** : Toutes les pages et routes API sont protégées
- ✅ **Rate Limiting** : Limitation des requêtes sur les routes d'import (5 requêtes/minute)
- ✅ **Headers de sécurité** : Protection contre les attaques XSS, clickjacking, etc.
- ✅ Variables d'environnement pour les identifiants
- ✅ Fichiers `.env*` exclus du versionnement
- ✅ Dossier `data/` non versionné
- ✅ Gestion d'erreurs appropriée

### Authentification

L'application utilise Clerk pour l'authentification. Toutes les routes sont protégées :

- Les pages redirigent automatiquement vers `/sign-in` si l'utilisateur n'est pas authentifié
- Les routes API retournent une erreur 401 si l'utilisateur n'est pas authentifié
- Le bouton de déconnexion est disponible dans le header

### Rate Limiting

Les routes d'import (`/api/import` et `/api/weather/import`) sont protégées par un rate limiting :

- Maximum 5 requêtes par minute par utilisateur
- Retourne une erreur 429 avec un header `Retry-After` si la limite est dépassée

## 📝 Scripts disponibles

- `yarn dev` - Démarrer le serveur de développement
- `yarn build` - Construire l'application pour la production
- `yarn start` - Démarrer le serveur de production
- `yarn lint` - Lancer le linter

## 🐛 Dépannage

### L'application ne récupère pas les données

1. Vérifiez que les identifiants dans `.env` sont corrects
2. **En développement local** : Assurez-vous que Google Chrome est installé sur votre machine
3. **En production (Vercel)** : Le navigateur est automatiquement fourni par `@sparticuz/chromium-min` (version minimale)
4. Consultez les logs de la console pour plus de détails

### Erreurs de permissions

Si vous rencontrez des erreurs de permissions sur le dossier `data/` :

```bash
chmod -R 755 data
```

### Puppeteer ne fonctionne pas

**En développement local :**
- Assurez-vous que Google Chrome est installé sur votre machine
- Sur macOS : `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Sur Linux : `/usr/bin/google-chrome-stable`
- Sur Windows : `C:\Program Files\Google\Chrome\Application\chrome.exe`

**En production (Vercel) :**
- Le navigateur est automatiquement fourni par `@sparticuz/chromium-min` (version minimale optimisée pour serverless)
- Aucune installation manuelle nécessaire
- Compatible avec le plan gratuit de Vercel (limite de 50MB respectée, version minimale ~40MB)
- Si vous rencontrez des erreurs, vérifiez que la variable d'environnement `VERCEL` est bien définie
- Les packages sont configurés comme `serverExternalPackages` dans `next.config.js` pour une meilleure compatibilité

## 📄 Licence

Ce projet est sous licence MIT.
