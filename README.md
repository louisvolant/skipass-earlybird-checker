# Weather App

Ce projet est une application de permettant de visualiser la météo en courbes.

---

## Configuration

### Backend

Dans le dossier `/backend`, créez un fichier `.env` contenant les variables suivantes (les valeurs doivent être des exemples) :

```
OPENWEATHER_API_KEY=sdmfsdjhflskdjfhsdfsdfsd
```

## Installation
Pour installer les dépendances du projet, exécutez les commandes suivantes :


### Backend
```
cd backend
npm install
```

### Frontend
```
cd ../frontend
npm install
```

## Lancement

### Backend
Pour lancer le backend, exécutez :

```
cd backend
npm start
```

### Frontend
Pour lancer le frontend, exécutez :

```
cd frontend
npm run dev
```

### Before pushing, confirm no problem with compilation

```bash
npm run build
# then
npx tsc --noEmit
# or
node --no-warnings node_modules/.bin/tsc --noEmit
# or 
npx --no-warnings tsc --noEmit

```
