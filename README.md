# Home Energy - Application de Gestion d'Énergie

Application web pour visualiser les données de Solisart et Hoymiles

## 🚀 Stack Technique

### Backend

- **Symfony 7.0** - Framework PHP pour l'API REST
- **MySQL 8.0** - Base de données
- **JWT Authentication** - Authentification sécurisée
- **Doctrine ORM** - Gestion des entités

### Frontend

- **React 18** - Bibliothèque UI
- **Vite** - Build tool moderne et rapide
- **Tailwind CSS** - Framework CSS utility-first
- **Headless UI** - Composants accessibles
- **Recharts** - Graphiques interactifs
- **React Router** - Navigation

### DevOps

- **Docker & Docker Compose** - Environnement de développement
- **Nginx** - Serveur web
- **phpMyAdmin** - Gestion de la base de données

## 📋 Prérequis

- **Docker** et **Docker Compose** installés
- **Node.js** 18+ et **npm** (pour le développement frontend)
- **Git**

## 🛠️ Installation

### 1. Cloner le repository

```bash
git clone <votre-repo-url>
cd home-energy
```

### 2. Configuration Backend

```bash
cd backend

# Copier le fichier d'environnement
cp .env.example .env

# Modifier .env si nécessaire (les valeurs par défaut fonctionnent avec Docker)
```

### 3. Démarrer Docker

Depuis la racine du projet :

```bash
docker-compose up -d
```

Cela démarre :

- MySQL sur le port **3306**
- Nginx sur le port **8080**
- phpMyAdmin sur le port **8081**

### 4. Installer les dépendances Symfony

```bash
# Entrer dans le container PHP
docker exec -it home_energy_php bash

# Installer les dépendances
composer install

# Générer les clés JWT
php bin/console lexik:jwt:generate-keypair

# Créer la base de données
php bin/console doctrine:database:create

# Exécuter les migrations
php bin/console doctrine:migrations:migrate

# Quitter le container
exit
```

### 5. Configuration Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

Le frontend sera accessible sur **http://localhost:5173**

## 🎯 Utilisation

### Accéder à l'application

- **Frontend (dev)** : http://localhost:5173
- **API Backend** : http://localhost:8080/api
- **phpMyAdmin** : http://localhost:8081

### Créer un compte

1. Ouvrez http://localhost:5173
2. Cliquez sur "créer un nouveau compte"
3. Remplissez le formulaire d'inscription
4. Connectez-vous avec vos identifiants

### Importer des données

1. Connectez-vous à votre compte
2. Allez dans "Importer des données"
3. Préparez un fichier CSV avec ce format :

```csv
timestamp,category,value,unit,notes
2024-01-01 10:00:00,electricity,150.5,kWh,Consommation journalière
2024-01-02 10:00:00,electricity,145.2,kWh,
2024-01-03 10:00:00,gas,75.2,m³,Chauffage
```

4. Glissez-déposez ou sélectionnez votre fichier
5. Cliquez sur "Importer"

### Visualiser les données

1. Allez dans "Tableau de bord"
2. Utilisez les filtres pour :
   - Sélectionner une catégorie spécifique
   - Définir une période (date de début/fin)
3. Changez le type de graphique (courbe ou barres)
4. Consultez les statistiques en bas de page

## 📁 Structure du Projet

```
home-energy/
├── backend/                 # API Symfony
│   ├── config/             # Configuration Symfony
│   ├── public/             # Point d'entrée web
│   ├── src/
│   │   ├── Controller/     # Controllers API
│   │   ├── Entity/         # Entités Doctrine
│   │   └── Kernel.php
│   ├── composer.json
│   └── .env.example
│
├── frontend/               # Application React
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── contexts/      # Contextes React
│   │   ├── pages/         # Pages de l'application
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── docker/                 # Configuration Docker
│   ├── nginx/
│   └── php/
│
├── docker-compose.yml
└── README.md
```

## 🔌 API Endpoints

### Authentification

- `POST /api/register` - Créer un compte
- `POST /api/login` - Se connecter (retourne un JWT)
- `GET /api/me` - Récupérer les infos de l'utilisateur connecté

### Données

- `GET /api/data` - Lister les données (avec filtres optionnels)
  - Paramètres query : `category`, `startDate`, `endDate`
- `POST /api/data` - Créer un point de données
- `POST /api/data/upload` - Importer un CSV
- `DELETE /api/data/{id}` - Supprimer un point de données

## 🚢 Déploiement en Production (OVH Mutualisé)

### Prérequis

- Accès FTP ou SSH à votre hébergement OVH
- Base de données MySQL créée via cPanel
- PHP 8.2+ activé

### Étapes de déploiement

#### 1. Préparer le Backend

```bash
cd backend

# Mode production dans .env
APP_ENV=prod
APP_DEBUG=0

# Générer les clés JWT
php bin/console lexik:jwt:generate-keypair

# Optimiser l'autoloader
composer install --no-dev --optimize-autoloader

# Vider le cache
php bin/console cache:clear --env=prod
```

#### 2. Builder le Frontend

```bash
cd frontend

# Modifier vite.config.js si nécessaire pour le chemin de l'API en prod
# Build pour production
npm run build

# Les fichiers sont générés dans backend/public/app/
```

#### 3. Configurer la Base de Données

Modifiez `backend/.env` avec vos identifiants MySQL OVH :

```env
DATABASE_URL="mysql://username:password@host:3306/database_name?serverVersion=8.0&charset=utf8mb4"
```

#### 4. Exécuter les Migrations

```bash
cd backend
php bin/console doctrine:migrations:migrate --no-interaction
```

#### 5. Upload via FTP

Uploadez le contenu de `backend/` vers votre dossier web (généralement `/www/` ou `/public_html/`)

#### 6. Configuration Nginx/Apache

**Pour Apache** (`.htaccess` déjà inclus dans Symfony)

Assurez-vous que le DocumentRoot pointe vers `public/`

**Pour Nginx**, ajoutez cette configuration :

```nginx
server {
    root /chemin/vers/votre/projet/public;

    location / {
        try_files $uri /index.php$is_args$args;
    }

    location ~ ^/index\.php(/|$) {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_split_path_info ^(.+\.php)(/.*)$;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $realpath_root;
        internal;
    }
}
```

### Tâches Cron

Pour automatiser la récupération de données, ajoutez un cron job via cPanel :

```bash
# Exemple : exécuter tous les jours à 2h du matin
0 2 * * * cd /chemin/vers/backend && php bin/console app:import-data
```

## 🧪 Commandes Utiles

### Backend

```bash
# Créer une nouvelle entité
docker exec -it home_energy_php php bin/console make:entity

# Créer une migration
docker exec -it home_energy_php php bin/console make:migration

# Exécuter les migrations
docker exec -it home_energy_php php bin/console doctrine:migrations:migrate

# Créer un controller
docker exec -it home_energy_php php bin/console make:controller

# Vider le cache
docker exec -it home_energy_php php bin/console cache:clear
```

### Frontend

```bash
# Lancer en mode développement
npm run dev

# Builder pour la production
npm run build

# Prévisualiser le build
npm run preview
```

### Docker

```bash
# Démarrer les containers
docker-compose up -d

# Arrêter les containers
docker-compose down

# Voir les logs
docker-compose logs -f

# Reconstruire les images
docker-compose build --no-cache

# Voir les containers actifs
docker ps
```

## 🔒 Sécurité

- ✅ Authentification JWT
- ✅ Validation des données côté backend
- ✅ Protection CSRF
- ✅ Headers de sécurité configurés
- ✅ Passwords hashés avec Bcrypt
- ✅ Paramètres préparés pour les requêtes SQL

## 📝 TODO / Améliorations Futures

- [ ] Ajout de tests unitaires et d'intégration
- [ ] Export des données en PDF/Excel
- [ ] Notifications par email
- [ ] Dashboard avec plusieurs types de graphiques
- [ ] Comparaison de périodes
- [ ] Prévisions basées sur l'historique
- [ ] API REST complète avec documentation (OpenAPI/Swagger)
- [ ] Mode sombre

## 🐛 Dépannage

### Problème : Le frontend ne se connecte pas au backend

**Solution** : Vérifiez la configuration CORS dans `backend/config/packages/nelmio_cors.yaml`

### Problème : Erreur JWT

**Solution** : Régénérez les clés JWT

```bash
docker exec -it home_energy_php php bin/console lexik:jwt:generate-keypair
```

### Problème : Erreur de connexion à la base de données

**Solution** : Vérifiez que MySQL est démarré et que les credentials dans `.env` sont corrects

### Problème : L'upload CSV ne fonctionne pas

**Solution** : Vérifiez les permissions sur le dossier et la limite de taille dans `php.ini`

## 📞 Support

Pour toute question ou problème :

- Créez une issue sur GitHub
- Consultez la documentation Symfony : https://symfony.com/doc
- Documentation React : https://react.dev

## 📄 Licence

Ce projet est sous licence MIT.
