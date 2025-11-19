# Guide d'Installation Rapide

## Installation en 5 minutes ⚡

### 1. Démarrer Docker

```bash
docker-compose up -d
```

### 2. Configurer Backend

```bash
# Copier .env
cp backend/.env.example backend/.env

# Entrer dans le container
docker exec -it my_solisart_php bash

# Installer & configurer
composer install
php bin/console lexik:jwt:generate-keypair
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
exit
```

### 3. Démarrer Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Ouvrir l'application

🎉 Rendez-vous sur **http://localhost:5173**

## Accès Rapide

- **Application** : http://localhost:5173
- **API** : http://localhost:8080/api
- **phpMyAdmin** : http://localhost:8081
  - User: `root`
  - Password: `root`

## Créer votre premier compte

1. Cliquez sur "Créer un nouveau compte"
2. Remplissez le formulaire
3. Connectez-vous
4. Importez vos premières données CSV !

## Besoin d'aide ?

Consultez le [README.md](README.md) complet pour plus de détails.
