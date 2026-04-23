# Insta-Private-Monitor — Guide d'implémentation

Ce guide explique étape par étape comment rendre l'application pleinement fonctionnelle, du déploiement à la première alerte Telegram.

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Récupérer le Session ID Instagram](#2-récupérer-le-session-id-instagram)
3. [Configurer Upstash Redis](#3-configurer-upstash-redis)
4. [Configurer le Bot Telegram](#4-configurer-le-bot-telegram)
5. [Déployer sur Vercel](#5-déployer-sur-vercel)
6. [Configurer les variables d'environnement sur Vercel](#6-configurer-les-variables-denvironnement-sur-vercel)
7. [Premier lancement et initialisation de la base](#7-premier-lancement-et-initialisation-de-la-base)
8. [Fonctionnement du cron job](#8-fonctionnement-du-cron-job)
9. [Tester en local](#9-tester-en-local)
10. [Renouveler le Session ID](#10-renouveler-le-session-id)
11. [Dépannage](#11-dépannage)

---

## 1. Prérequis

- Un compte GitHub (pour le dépôt)
- Un compte [Vercel](https://vercel.com) (plan Hobby suffit, mais le cron exige un plan Pro pour une fréquence < 1 heure — voir section 8)
- Un compte [Upstash](https://upstash.com) (gratuit)
- Un compte Instagram avec accès au compte cible
- Un Bot Telegram (création gratuite via @BotFather)
- Node.js ≥ 18 installé en local (pour les tests)

---

## 2. Récupérer le Session ID Instagram

Le `IG_SESSION_ID` est le cookie `sessionid` de votre session Instagram. Voici comment l'obtenir :

1. Ouvrez **Chrome** ou **Firefox** et connectez-vous à [instagram.com](https://www.instagram.com).
2. Ouvrez les **DevTools** (`F12`) → onglet **Application** (Chrome) ou **Stockage** (Firefox).
3. Dans le panneau gauche : **Cookies** → `https://www.instagram.com`.
4. Cherchez le cookie nommé `sessionid` et copiez sa valeur (une longue chaîne alphanumérique).

> ⚠️ **Ce cookie est sensible** : ne le partagez jamais et ne le commitez pas dans le dépôt.
> Il expire généralement après quelques semaines d'inactivité ou si vous vous déconnectez.

---

## 3. Configurer Upstash Redis

1. Allez sur [console.upstash.com](https://console.upstash.com) et créez un compte.
2. Cliquez sur **Create Database** → choisissez la région la plus proche de votre déploiement Vercel.
3. Une fois la base créée, allez dans l'onglet **REST API**.
4. Copiez :
   - **UPSTASH_REDIS_REST_URL** (ex. `https://xyz.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN** (le token `readonly` ou `readwrite` — utilisez `readwrite`)

---

## 4. Configurer le Bot Telegram

### Créer le bot

1. Ouvrez Telegram et cherchez **@BotFather**.
2. Envoyez `/newbot` et suivez les instructions (nom + username).
3. BotFather vous donne un **token** (ex. `123456:ABC-DEF...`). C'est votre `TELEGRAM_BOT_TOKEN`.

### Récupérer votre Chat ID

1. Envoyez un message quelconque à votre nouveau bot.
2. Ouvrez cette URL dans votre navigateur (remplacez `<TOKEN>`) :
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
3. Dans la réponse JSON, repérez `"chat": {"id": XXXXXXXXX}`. Ce nombre est votre `TELEGRAM_CHAT_ID`.

> 💡 Pour recevoir les alertes dans un groupe, ajoutez le bot au groupe et récupérez le chat ID du groupe (il est négatif, ex. `-100xxxxxxxxxx`).

---

## 5. Déployer sur Vercel

1. Poussez ce dépôt sur GitHub si ce n'est pas déjà fait.
2. Allez sur [vercel.com/new](https://vercel.com/new) et importez votre dépôt GitHub.
3. Vercel détecte automatiquement Next.js — laissez les paramètres par défaut.
4. Cliquez sur **Deploy** (vous configurerez les variables d'environnement à l'étape suivante).

---

## 6. Configurer les variables d'environnement sur Vercel

Dans le dashboard Vercel → votre projet → **Settings** → **Environment Variables**, ajoutez :

| Variable | Valeur |
|---|---|
| `IG_SESSION_ID` | La valeur du cookie `sessionid` Instagram |
| `TARGET_USERNAME` | Le nom d'utilisateur Instagram du compte à surveiller (sans @) |
| `UPSTASH_REDIS_REST_URL` | L'URL REST Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Le token REST Upstash |
| `TELEGRAM_BOT_TOKEN` | Le token fourni par @BotFather |
| `TELEGRAM_CHAT_ID` | Votre Chat ID Telegram |

Appliquez ces variables aux environnements **Production**, **Preview** et **Development** selon vos besoins, puis **redéployez** le projet.

---

## 7. Premier lancement et initialisation de la base

Lors du tout premier appel à `/api/check`, Redis ne contient pas encore la liste `followers:target:previous`. L'application va :

1. Récupérer la liste actuelle des followers.
2. Ne détecter **aucun changement** (la liste précédente est vide).
3. Stocker la liste actuelle comme référence dans Redis.

Vous ne recevrez donc **pas d'alerte** au premier appel — c'est le comportement attendu. Les alertes se déclencheront à partir du deuxième appel si des changements sont détectés.

**Pour déclencher le premier appel manuellement :**
- Via l'interface web : ouvrez l'URL de votre projet Vercel et cliquez sur le bouton **Lancer une vérification**.
- Via l'URL directe : `https://<votre-projet>.vercel.app/api/check`

---

## 8. Fonctionnement du cron job

Le fichier `vercel.json` configure un cron job Vercel qui appelle `/api/check` toutes les 30 minutes :

```json
{
  "crons": [
    {
      "path": "/api/check",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

> ⚠️ **Important :** Les cron jobs Vercel avec une fréquence inférieure à 1 jour nécessitent un **plan Pro** (14 $/mois). Sur le plan Hobby, vous pouvez utiliser la fréquence quotidienne `"0 8 * * *"` (tous les jours à 8h UTC) ou déclencher `/api/check` manuellement.
>
> Alternative gratuite : utilisez [cron-job.org](https://cron-job.org) ou [GitHub Actions](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule) pour appeler l'URL `/api/check` à la fréquence souhaitée.

---

## 9. Tester en local

1. Copiez `.env.example` en `.env.local` et remplissez toutes les valeurs :
   ```bash
   cp .env.example .env.local
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

4. Appelez la route de vérification :
   ```bash
   curl http://localhost:3000/api/check
   ```

5. Réponse attendue (premier appel) :
   ```json
   { "checked": true, "new": [], "lost": [] }
   ```

---

## 10. Renouveler le Session ID

Quand la session expire, vous recevrez une notification Telegram :
> 🔑 Session Instagram expirée. Merci de mettre à jour IG_SESSION_ID.

Pour la renouveler :

1. Connectez-vous à Instagram dans votre navigateur.
2. Récupérez le nouveau cookie `sessionid` (voir étape 2).
3. Dans Vercel → **Settings** → **Environment Variables**, mettez à jour `IG_SESSION_ID`.
4. Supprimez également la session en cache dans Redis en appelant depuis la console Upstash :
   ```
   DEL ig:session
   ```
5. Redéployez le projet (ou attendez le prochain déploiement automatique).

---

## 11. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `Session expired` (401) | Cookie `sessionid` expiré | Voir étape 10 |
| `TARGET_USERNAME not set` | Variable d'env manquante | Vérifier les env vars Vercel |
| Pas de message Telegram | Chat ID incorrect ou bot non démarré | Envoyer `/start` au bot, vérifier `TELEGRAM_CHAT_ID` |
| `login_required` ou `checkpoint` | Instagram a détecté une activité suspecte | Connectez-vous manuellement sur instagram.com, validez le checkpoint, puis régénérez le session ID |
| Liste de followers vide | Compte cible privé et non suivi | Vérifier que votre compte suit bien le compte cible |
| Erreur 429 / rate limit | Trop d'appels fréquents | Augmenter l'intervalle du cron ou les délais aléatoires dans `lib/instagram.ts` |
