# Guide de Déploiement - OVH Hébergement Mutualisé

Ce guide vous explique comment déployer l'application sur un hébergement mutualisé OVH.

## 📋 Prérequis

- Hébergement mutualisé OVH avec :
  - PHP 8.2+
  - MySQL
  - Accès FTP ou SSH (si disponible)
  - Cron jobs
- Base de données MySQL créée via cPanel
- Accès à cPanel

## 🚀 Étapes de Déploiement

### 1. Préparer l'Environnement Local

#### Backend

```bash
cd backend

# Copier et modifier .env pour la production
cp .env .env.prod

# Éditer .env.prod
APP_ENV=prod
APP_DEBUG=0
DATABASE_URL="mysql://votre_user:votre_password@votre_host:3306/votre_db?serverVersion=8.0"
```

#### Générer les clés JWT

```bash
# Sur votre machine locale
php bin/console lexik:jwt:generate-keypair

# Les clés sont dans config/jwt/
# Elles seront uploadées avec le reste du code
```

#### Optimiser pour la production

```bash
# Installer uniquement les dépendances de production
composer install --no-dev --optimize-autoloader

# Vider et réchauffer le cache
php bin/console cache:clear --env=prod
php bin/console cache:warmup --env=prod
```

### 2. Builder le Frontend

```bash
cd frontend

# Vérifier la configuration de l'API
# Dans vite.config.js, le build va dans backend/public/app/

# Builder
npm run build
```

Les fichiers compilés sont maintenant dans `backend/public/app/`

### 3. Préparer la Base de Données

#### Via cPanel

1. Créez une base de données MySQL
2. Créez un utilisateur MySQL
3. Associez l'utilisateur à la base
4. Notez les informations de connexion

#### Exécuter les Migrations

Sur votre machine locale (avec les infos de la DB de production) :

```bash
cd backend

# Utiliser l'env de prod
export DATABASE_URL="mysql://user:pass@host:3306/db"

# Créer les tables
php bin/console doctrine:migrations:migrate --no-interaction
```

### 4. Upload des Fichiers

#### Structure à uploader

Uploadez tout le contenu de `backend/` dans votre dossier web OVH :

```
/www/ (ou /public_html/)
├── bin/
├── config/
├── migrations/
├── public/          ← DocumentRoot doit pointer ici
│   ├── app/        ← Frontend buildé
│   └── index.php
├── src/
├── var/
├── vendor/
├── .env
└── composer.json
```

#### Via FTP (FileZilla)

1. Connectez-vous avec vos identifiants FTP
2. Uploadez le contenu de `backend/` vers `/www/`
3. Assurez-vous que les permissions sont correctes :
   - `var/` : 755
   - `var/cache/` : 777
   - `var/log/` : 777
   - `config/jwt/` : 700

#### Via SSH (si disponible)

```bash
# Depuis votre machine locale
scp -r backend/* user@yourserver.ovh:/www/

# Ou avec rsync
rsync -avz --exclude 'var/cache/*' backend/ user@yourserver.ovh:/www/
```

### 5. Configuration du Serveur Web

#### Apache (.htaccess)

Le fichier `.htaccess` est déjà présent dans `public/`. Vérifiez qu'il contient :

```apache
DirectoryIndex index.php

<IfModule mod_negotiation.c>
    Options -MultiViews
</IfModule>

<IfModule mod_rewrite.c>
    RewriteEngine On

    RewriteCond %{REQUEST_URI}::$0 ^(/.+)/(.*)::\2$
    RewriteRule .* - [E=BASE:%1]

    RewriteCond %{HTTP:Authorization} .+
    RewriteRule ^ - [E=HTTP_AUTHORIZATION:%0]

    RewriteCond %{ENV:REDIRECT_STATUS} =""
    RewriteRule ^index\.php(?:/(.*)|$) %{ENV:BASE}/$1 [R=301,L]

    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ %{ENV:BASE}/index.php [L]
</IfModule>

<IfModule !mod_rewrite.c>
    <IfModule mod_alias.c>
        RedirectMatch 307 ^/$ /index.php/
    </IfModule>
</IfModule>
```

#### Configuration cPanel

1. Allez dans cPanel
2. **Domaines** > **Domaines**
3. Modifiez le Document Root pour qu'il pointe vers `/www/public/`

### 6. Vérification Post-Déploiement

#### Tester l'API

```bash
# Test de health check
curl https://votredomaine.com/api/health

# Test de login (avec un compte existant)
curl -X POST https://votredomaine.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}'
```

#### Vérifier les logs

Connectez-vous en SSH et vérifiez :

```bash
tail -f /www/var/log/prod.log
```

### 7. Configuration des Tâches Cron

#### Via cPanel

1. Allez dans **Cron Jobs**
2. Ajoutez une nouvelle tâche :

```bash
# Exemple : import automatique tous les jours à 2h
0 2 * * * cd /www && php bin/console app:import-data --env=prod >> var/log/cron.log 2>&1
```

3. Vous pouvez créer une commande personnalisée :

**src/Command/ImportDataCommand.php**

```php
<?php

namespace App\Command;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class ImportDataCommand extends Command
{
    protected static $defaultName = 'app:import-data';

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        // Votre logique d'import automatique
        $output->writeln('Import terminé !');
        return Command::SUCCESS;
    }
}
```

## 🔧 Configuration Avancée

### Variables d'Environnement en Production

Dans `backend/.env` :

```env
APP_ENV=prod
APP_SECRET=CHANGEZ_CETTE_CLE_SECRETE_LONGUE_ET_ALEATOIRE
DATABASE_URL="mysql://user:pass@host:3306/db?serverVersion=8.0"
JWT_PASSPHRASE=CHANGEZ_CETTE_PASSPHRASE_SECRETE
CORS_ALLOW_ORIGIN='^https://votredomaine\.com$'
```

### Optimisations PHP

Si vous avez accès à `php.ini` ou `.user.ini` :

```ini
memory_limit = 256M
max_execution_time = 60
upload_max_filesize = 50M
post_max_size = 50M
opcache.enable = 1
opcache.memory_consumption = 128
opcache.max_accelerated_files = 10000
opcache.revalidate_freq = 2
```

### Sécurité

1. **Changez les secrets** dans `.env`
2. **Protégez les dossiers sensibles** avec `.htaccess` :

```apache
# Dans /www/.htaccess
<FilesMatch "^\.env">
    Order allow,deny
    Deny from all
</FilesMatch>
```

3. **HTTPS** : Activez le SSL via cPanel (Let's Encrypt gratuit)

## 📊 Monitoring et Maintenance

### Logs

```bash
# Logs applicatifs
tail -f var/log/prod.log

# Logs d'erreurs PHP
tail -f /www/error_log
```

### Nettoyage du Cache

```bash
cd /www
php bin/console cache:clear --env=prod
```

### Mise à Jour

```bash
# Sur votre machine locale
git pull
composer install --no-dev --optimize-autoloader
cd ../frontend && npm run build

# Uploader via FTP ou rsync
```

## 🐛 Dépannage

### Erreur 500

- Vérifiez les logs : `var/log/prod.log`
- Vérifiez les permissions des dossiers `var/`
- Vérifiez que le `.env` est correctement configuré

### Base de données inaccessible

- Vérifiez les credentials dans `.env`
- Vérifiez que l'IP du serveur est autorisée (si DB externe)
- Testez la connexion MySQL via phpMyAdmin

### JWT invalide

- Régénérez les clés :
  ```bash
  php bin/console lexik:jwt:generate-keypair
  ```
- Uploadez les nouvelles clés `config/jwt/`

### Frontend ne charge pas

- Vérifiez que le build est dans `public/app/`
- Vérifiez que le DocumentRoot pointe vers `public/`
- Vérifiez la configuration Apache/Nginx

## 📞 Support OVH

- Documentation : https://docs.ovh.com
- Support : https://www.ovh.com/fr/support/

## ✅ Checklist de Déploiement

- [ ] Base de données créée et configurée
- [ ] `.env` modifié pour la production
- [ ] Clés JWT générées
- [ ] Dépendances installées (sans dev)
- [ ] Frontend buildé
- [ ] Migrations exécutées
- [ ] Fichiers uploadés
- [ ] Permissions vérifiées
- [ ] Document Root configuré
- [ ] HTTPS activé
- [ ] Tests API effectués
- [ ] Cron jobs configurés (si nécessaire)
- [ ] Logs vérifiés

## 🎉 Félicitations !

Votre application est maintenant déployée en production ! 🚀
