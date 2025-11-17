# Déploiement sur Synology NAS

Ce guide vous explique comment déployer l'application Home Energy sur un NAS Synology.

## Prérequis

- NAS Synology avec DSM 7.0 ou supérieur
- Accès SSH activé sur le NAS
- Package Node.js v18 ou supérieur installé via Package Center

## Installation

### 1. Installation de Node.js

1. Ouvrez **Package Center** sur votre NAS Synology
2. Recherchez et installez **Node.js v18** (ou version supérieure)
3. Notez le chemin d'installation (généralement `/volume1/@appstore/nodejs_v18/`)

### 2. Préparation du projet

1. Connectez-vous en SSH à votre NAS :
   ```bash
   ssh admin@votre-nas-ip
   ```

2. Créez un dossier pour l'application :
   ```bash
   sudo mkdir -p /volume1/web/home-energy
   cd /volume1/web/home-energy
   ```

3. Clonez ou transférez votre projet dans ce dossier

### 3. Installation des dépendances

1. Assurez-vous que Node.js est dans votre PATH :
   ```bash
   export PATH=/volume1/@appstore/nodejs_v18/bin:$PATH
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Installez les navigateurs Playwright :
   ```bash
   npx playwright install chromium
   ```

### 4. Configuration des variables d'environnement

1. Créez le fichier `.env` :
   ```bash
   nano .env
   ```

2. Ajoutez vos identifiants et coordonnées :
   ```
   # Coordonnées GPS pour l'application météo
   WEATHER_LATITUDE=48.8566
   WEATHER_LONGITUDE=2.3522

   # Identifiants SOLISTAR
   SOLISTAR_ID=votre-email@example.com
   SOLISTAR_PASSWORD=votre-mot-de-passe
   ```

3. Créez le dossier `data` :
   ```bash
   mkdir -p data
   ```

### 5. Build de l'application

1. Construisez l'application pour la production :
   ```bash
   npm run build
   ```

### 6. Configuration PM2 (Gestionnaire de processus)

1. Installez PM2 globalement :
   ```bash
   npm install -g pm2
   ```

2. Créez un fichier de configuration PM2 `ecosystem.config.js` :
   ```javascript
   module.exports = {
     apps: [{
       name: 'home-energy',
       script: 'node_modules/next/dist/bin/next',
       args: 'start',
       cwd: '/volume1/web/home-energy',
       env: {
         NODE_ENV: 'production',
         PORT: 3000,
         PATH: '/volume1/@appstore/nodejs_v18/bin:/usr/local/bin:/usr/bin:/bin'
       }
     }]
   }
   ```

3. Démarrez l'application avec PM2 :
   ```bash
   pm2 start ecosystem.config.js
   ```

4. Sauvegardez la configuration PM2 :
   ```bash
   pm2 save
   ```

5. Configurez PM2 pour démarrer au boot :
   ```bash
   pm2 startup
   ```
   Suivez les instructions affichées.

### 7. Configuration du Reverse Proxy (Optionnel)

Si vous souhaitez accéder à l'application via un sous-domaine :

1. Ouvrez **Control Panel** > **Login Portal** > **Advanced** > **Reverse Proxy**
2. Cliquez sur **Create**
3. Configurez :
   - **Description** : Home Energy
   - **Source** :
     - Protocol : HTTPS
     - Hostname : home-energy.votre-domaine.com
     - Port : 443
   - **Destination** :
     - Protocol : HTTP
     - Hostname : localhost
     - Port : 3000

### 8. Configuration du Firewall

Si nécessaire, ouvrez le port 3000 dans **Control Panel** > **Security** > **Firewall**.

## Maintenance

### Vérifier le statut de l'application

```bash
pm2 status
```

### Voir les logs

```bash
pm2 logs home-energy
```

### Redémarrer l'application

```bash
pm2 restart home-energy
```

### Arrêter l'application

```bash
pm2 stop home-energy
```

### Mettre à jour l'application

1. Arrêtez l'application :
   ```bash
   pm2 stop home-energy
   ```

2. Mettez à jour le code (git pull ou transfert de fichiers)

3. Réinstallez les dépendances si nécessaire :
   ```bash
   npm install
   ```

4. Rebuild :
   ```bash
   npm run build
   ```

5. Redémarrez :
   ```bash
   pm2 restart home-energy
   ```

## Dépannage

### L'application ne démarre pas

1. Vérifiez les logs : `pm2 logs home-energy`
2. Vérifiez que Node.js est bien dans le PATH
3. Vérifiez que le port 3000 n'est pas déjà utilisé : `netstat -tuln | grep 3000`

### Playwright ne fonctionne pas

1. Vérifiez que les navigateurs sont installés : `npx playwright install chromium`
2. Vérifiez les permissions sur le dossier `data/`

### Erreurs de permissions

Si vous rencontrez des erreurs de permissions, ajustez les droits :
```bash
sudo chown -R admin:users /volume1/web/home-energy
chmod -R 755 /volume1/web/home-energy
```

## Notes importantes

- Le dossier `data/` contient les fichiers JSON historiques et ne doit pas être versionné
- Le fichier `.env` contient des informations sensibles et ne doit jamais être commité
- Assurez-vous que le NAS a suffisamment d'espace disque pour stocker l'historique
- Pour des performances optimales, utilisez un SSD si possible
