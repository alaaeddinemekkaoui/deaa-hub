# DEAA-Hub — Manuel utilisateur complet

**Plateforme de gestion académique et administrative — IAV Hassan II**

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Connexion](#2-connexion)
3. [Tableau de bord (Dashboard)](#3-tableau-de-bord-dashboard)
4. [Export des statistiques](#4-export-des-statistiques)
5. [Étudiants](#5-étudiants)
6. [Profil étudiant](#6-profil-étudiant)
7. [Enseignants](#7-enseignants)
8. [Profil enseignant](#8-profil-enseignant)
9. [Épreuves et notes](#9-épreuves-et-notes)
10. [Classes](#10-classes)
11. [Cours par classe](#11-cours-par-classe)
12. [Passage de classe (Transferts)](#12-passage-de-classe-transferts)
13. [Modules et éléments académiques](#13-modules-et-éléments-académiques)
14. [Emploi du temps](#14-emploi-du-temps)
15. [Salles](#15-salles)
16. [Réservations de salle](#16-réservations-de-salle)
17. [Départements](#17-départements)
18. [Filières](#18-filières)
19. [Options (spécialités)](#19-options-spécialités)
20. [Cycles académiques](#20-cycles-académiques)
21. [Lauréats et diplômes](#21-lauréats-et-diplômes)
22. [Documents](#22-documents)
23. [Workflows (tâches administratives)](#23-workflows-tâches-administratives)
24. [Journaux d'activité](#24-journaux-dactivité)
25. [Gestion des utilisateurs](#25-gestion-des-utilisateurs)
26. [Rôles et accès](#26-rôles-et-accès)
27. [Navigation et barre latérale](#27-navigation-et-barre-latérale)
28. [Flux de travail quotidien recommandé](#28-flux-de-travail-quotidien-recommandé)

---

## 1. Présentation générale

DEAA-Hub est l'espace de travail central utilisé pour gérer les activités académiques et administratives de l'IAV Hassan II.

La plateforme permet de :

- Suivre les dossiers étudiants du premier jour jusqu'au diplôme
- Gérer les enseignants permanents et vacataires
- Organiser les classes, les modules et les cours
- Planifier l'emploi du temps et les réservations de salles
- Suivre les lauréats et les diplômes
- Gérer les documents administratifs
- Superviser les tâches internes via les workflows
- Contrôler les accès par rôle et par département
- Exporter des statistiques au format CSV

---

## 2. Connexion

La page de connexion est le point d'entrée de la plateforme.

![Page de connexion](./screenshots/01-login.png)

### Ce que vous faites ici

- Saisissez votre identifiant (email)
- Saisissez votre mot de passe
- Cliquez sur **Se connecter**

### Ce qui se passe ensuite

- La plateforme vérifie vos identifiants
- Si valides, vous êtes redirigé vers le **Tableau de bord**
- La barre latérale gauche s'affiche avec les sections accessibles selon votre rôle
- La barre supérieure affiche votre nom et votre rôle

### En cas d'erreur

- Un message d'erreur s'affiche si l'identifiant ou le mot de passe est incorrect
- Contactez un administrateur si vous ne pouvez pas vous connecter

---

## 3. Tableau de bord (Dashboard)

Le tableau de bord est la **page principale** de DEAA-Hub. C'est la première page visible après la connexion.

![Tableau de bord](./screenshots/02-dashboard.png)

### Indicateurs affichés en haut

| Indicateur | Description |
|---|---|
| Étudiants | Nombre total d'apprenants enregistrés |
| Enseignants | Nombre de membres du corps enseignant |
| Départements | Nombre de structures institutionnelles |
| Filières | Nombre de programmes académiques |
| Classes | Nombre de cohortes et groupes actifs |
| Documents | Nombre de fichiers administratifs suivis |

### Graphiques disponibles

**Distribution des étudiants par filière**
- Graphique en barres
- Affiche les 6 filières les plus peuplées
- Permet d'identifier les programmes à fort effectif

**Distribution des étudiants par cycle**
- Graphique en camembert (donut)
- Distingue les cycles : préparatoire, ingénieur, vétérinaire
- Donne un équilibre de haut niveau sur la répartition des parcours

**Lauréats par année de graduation**
- Graphique en barres doré
- Montre l'évolution des promotions diplômées dans le temps

**Activité administrative récente**
- Liste des dernières actions effectuées dans la plateforme
- Affiche : l'action, l'utilisateur, la date et l'heure

### Actions rapides

Le tableau de bord contient une section **Actions rapides** avec des boutons de navigation colorés vers chaque section de la plateforme :

- Étudiants · Enseignants · Lauréats · Passage de classe
- Modules & Éléments · Classes · Cours par classe · Emploi du temps
- Salles · Départements · Filières · Utilisateurs (admin uniquement)

Chaque bouton affiche une icône, un libellé et une description courte. Un clic ouvre directement la section correspondante.

### Bouton Statistiques (export)

En haut à droite du tableau de bord, le bouton **Statistiques** ouvre une fenêtre d'export CSV. Voir la section [Export des statistiques](#4-export-des-statistiques).

---

## 4. Export des statistiques

Le bouton **Statistiques** situé dans l'en-tête du tableau de bord ouvre une fenêtre modale d'exportation.

### Étape 1 — Choisir l'entité

Trois choix sont disponibles :

| Option | Données exportées |
|---|---|
| **Étudiants** | Dossiers de tous les apprenants enregistrés |
| **Enseignants** | Dossiers du personnel enseignant |
| **Départements** | Liste des structures institutionnelles |

### Étape 2 — Sélectionner les champs

Après avoir choisi l'entité, une liste de cases à cocher apparaît.

**Champs disponibles pour les Étudiants :**
- Nom complet
- Code Massar
- CIN
- Email
- Téléphone
- Sexe
- Nationalité
- Date de naissance
- Cycle
- Année académique
- Année d'entrée
- Filière
- Classe

**Champs disponibles pour les Enseignants :**
- Prénom
- Nom
- Email
- Téléphone
- CIN
- Département
- Filière
- Rôle d'enseignant
- Grade d'enseignant
- Date d'ajout

**Champs disponibles pour les Départements :**
- Nom du département
- Code

Des liens **Tout sélectionner** et **Effacer** permettent de gérer rapidement la sélection.

### Étape 3 — Exporter

Cliquez sur **Exporter CSV** pour télécharger un fichier `.csv` nommé automatiquement avec la date du jour.

Le fichier est encodé en UTF-8 avec BOM pour assurer la compatibilité avec Microsoft Excel et LibreOffice.

---

## 5. Étudiants

La section Étudiants est le cœur du suivi académique.

![Page Étudiants](./screenshots/03-students.png)

### Ce que vous pouvez faire

- Voir la liste complète des étudiants avec pagination
- Rechercher un étudiant par nom, code Massar, CIN ou email
- Filtrer par filière, cycle ou classe
- Ajouter un nouvel étudiant via le formulaire ou l'import Excel
- Modifier les informations d'un étudiant existant
- Supprimer un étudiant (administrateurs uniquement)
- Ouvrir le profil détaillé d'un étudiant
- Marquer un étudiant comme lauréat (diplômé)

### Informations d'un dossier étudiant

- Prénom et nom
- Code Massar (identifiant national)
- CIN
- Date de naissance
- Nationalité
- Sexe
- Email et téléphone
- Filière et classe actuelles
- Cycle académique
- Année académique et année d'entrée
- Statut de lauréat (si diplômé)

### Import Excel

Cliquez sur **Importer** pour charger une liste d'étudiants depuis un fichier Excel (.xlsx). Le système traite les données et crée les dossiers automatiquement.

### Rôles et accès

- **Administrateur** : toutes les opérations
- **Utilisateur** : consultation et modification uniquement (pas de suppression)
- Les utilisateurs avec un département attribué ne voient que les étudiants de leurs filières

---

## 6. Profil étudiant

Chaque étudiant dispose d'une page de profil dédiée.

### Ce que vous pouvez voir et faire

- Toutes les informations personnelles et académiques
- Historique des classes successives
- Notes et résultats d'épreuves
- Observations (notes internes liées à l'étudiant)
- Documents téléchargés (fichiers administratifs)
- Statut de lauréat si applicable

### Observations

- Ajouter une observation textuelle liée à l'étudiant
- Consulter les observations précédentes avec date et auteur

### Documents

- Voir la liste des documents liés à cet étudiant
- Télécharger un nouveau document directement depuis le profil
- Identifier les documents manquants selon la liste attendue

---

## 7. Enseignants

La section Enseignants permet de gérer tout le personnel académique.

![Page Enseignants](./screenshots/04-teachers.png)

### Ce que vous pouvez faire

- Voir la liste de tous les enseignants avec filtres et pagination
- Rechercher un enseignant par nom, CIN ou email
- Filtrer par département, filière, rôle ou grade
- Ajouter un enseignant manuellement ou via import Excel
- Modifier les informations d'un enseignant
- Supprimer un enseignant (administrateurs uniquement)
- Ouvrir le profil de l'enseignant

### Informations d'un dossier enseignant

- Prénom et nom
- CIN
- Email et téléphone
- Département et filière d'affectation
- Rôle (enseignant, chef de filière, chef de département…)
- Grade (professeur habilité, maître assistant…)

### Rôles d'enseignants

Les rôles et grades sont configurables par un administrateur depuis la section **Utilisateurs → Paramètres**.

---

## 8. Profil enseignant

Chaque enseignant dispose d'une page de profil dédiée.

### Ce que vous pouvez voir

- Informations personnelles et académiques
- Classes assignées à cet enseignant
- Cours (éléments de modules) confiés
- Documents liés à l'enseignant
- Activité récente de l'enseignant dans le système

---

## 9. Épreuves et notes

La section Épreuves permet de saisir et de suivre les évaluations des étudiants.

### Navigation par filtre

1. Choisissez le département
2. Choisissez la filière
3. Choisissez l'option (si applicable)
4. Choisissez la classe
5. Choisissez le module
6. Choisissez l'élément de module

### Ce que vous pouvez faire

- Définir une épreuve (nom, semestre, enseignant, barème)
- Saisir les notes de chaque étudiant de la classe
- Ajouter un commentaire individuel par étudiant
- Importer les notes depuis un fichier Excel
- Modifier une note existante
- Supprimer une note
- Rechercher et filtrer les notes

### Cas d'usage typiques

- Saisie des notes de contrôle continu
- Saisie des résultats d'examen
- Suivi des performances par matière
- Préparation des délibérations

---

## 10. Classes

La section Classes est la base de l'organisation académique.

![Page Classes](./screenshots/05-classes.png)

### Ce que vous pouvez faire

- Créer une classe (nom, année, filière)
- Modifier les informations d'une classe
- Supprimer une classe (administrateurs uniquement)
- Voir le nombre d'étudiants dans chaque classe
- Consulter les cours affectés à une classe
- Transférer la structure d'une classe vers une nouvelle année académique (clonage)

### Clonage inter-années

Via **Classes → Transfert de classe**, vous pouvez dupliquer la structure d'une classe (sans les étudiants) pour la prochaine année, permettant de réutiliser la configuration de cours et de modules.

---

## 11. Cours par classe

La section **Cours par classe** permet de gérer les affectations pédagogiques.

### Ce que vous pouvez faire

- Choisir une classe
- Assigner des cours (éléments de modules) à cette classe
- Assigner un enseignant à chaque cours
- Voir le plan d'enseignement complet de la classe
- Modifier ou supprimer les affectations

---

## 12. Passage de classe (Transferts)

La section Transferts gère la progression annuelle des étudiants.

### Fonctionnement en 3 étapes

**Étape 1 — Classe source**

Utilisez les filtres Département → Filière → Classe pour sélectionner la classe d'origine.

**Étape 2 — Statut des étudiants**

Pour chaque étudiant de la classe, définissez son statut :

| Statut | Signification |
|---|---|
| **Admis** | L'étudiant passe dans la classe cible |
| **Non admis** | L'étudiant reste dans la même classe |
| **Redoublant** | L'étudiant redouble dans la même classe |

Des boutons **Tout mettre en Admis / Non admis / Redoublant** permettent d'appliquer un statut à tous en un clic.

**Étape 3 — Classe cible et nouvelle année**

- Choisissez la classe de destination pour les étudiants admis
- Saisissez la nouvelle année académique (ex. : 2026/2027)

Cliquez sur **Valider le passage** pour confirmer le traitement.

### Résultat

- Les étudiants admis sont déplacés vers la classe cible avec la nouvelle année académique
- Les étudiants non admis et redoublants restent dans leur classe, avec l'année mise à jour
- L'historique de chaque étudiant est conservé

### Accès filtré par département

Si vous êtes un utilisateur avec un département assigné, les classes affichées sont limitées à vos départements.

---

## 13. Modules et éléments académiques

La section Modules & Éléments définit la structure pédagogique de l'établissement.

![Modules académiques](./screenshots/06-academic-modules-elements.png)

### Modules

Un module regroupe un ensemble d'enseignements d'une discipline.

Ce que vous pouvez faire :
- Créer un module (nom, code, semestre, volume horaire)
- Modifier un module
- Supprimer un module
- Assigner un module à une ou plusieurs classes

### Éléments de module

Un élément est une composante d'un module (ex. : CM, TD, TP).

Ce que vous pouvez faire :
- Ajouter un élément à un module
- Définir le type (CM, TD, TP) et le volume horaire
- Modifier ou supprimer un élément

---

## 14. Emploi du temps

La section Emploi du temps permet de planifier les séances d'enseignement par semaine.

### Ce que vous pouvez faire

- Choisir une classe pour afficher son emploi du temps
- Naviguer d'une semaine à l'autre
- Ajouter une séance (cours, salle, enseignant, créneau)
- Modifier une séance existante
- Supprimer une séance
- Détecter les conflits de salles ou d'enseignants

### Structure d'une séance

- Classe concernée
- Cours (élément de module)
- Enseignant
- Salle
- Jour et créneau horaire

---

## 15. Salles

La section Salles gère les espaces physiques de l'établissement.

![Page Salles](./screenshots/07-rooms.png)

### Ce que vous pouvez faire

- Ajouter une salle
- Définir sa capacité
- Lister les équipements disponibles (projecteur, ordinateurs…)
- Modifier les informations d'une salle
- Supprimer une salle

### Types de salles gérés

- Amphithéâtres
- Salles de cours
- Laboratoires
- Salles de conférence
- Salles informatiques

---

## 16. Réservations de salle

La section Réservations de salle gère l'occupation des espaces.

![Page Réservations](./screenshots/08-room-reservations.png)

### Ce que vous pouvez faire

- Créer une réservation (salle, date, créneau, motif)
- Voir toutes les réservations par semaine sous forme de calendrier
- Consulter les réservations en attente d'approbation
- Approuver ou rejeter une réservation
- Annuler une réservation

### Statuts d'une réservation

| Statut | Description |
|---|---|
| **En attente** | La réservation nécessite une approbation |
| **Approuvée** | La réservation est confirmée |
| **Rejetée** | La réservation a été refusée avec un motif |
| **Annulée** | La réservation a été annulée |

### Règle d'approbation

- Un **administrateur** peut approuver toute réservation
- Un **utilisateur** peut approuver les réservations de salles appartenant à son département
- Les réservations créées par un administrateur sont automatiquement approuvées

---

## 17. Départements

La section Départements gère les unités organisationnelles de l'établissement.

### Ce que vous pouvez faire

- Créer un département
- Modifier son nom ou son code
- Supprimer un département inutilisé
- Consulter les filières et options rattachées

### Rôle dans l'accès

Les utilisateurs avec un département attribué ne voient que les données de leurs départements (étudiants, classes, modules, filières…).

---

## 18. Filières

La section Filières gère les programmes académiques de l'établissement.

### Ce que vous pouvez faire

- Créer une filière
- La rattacher à un département
- Modifier son nom ou ses paramètres
- Suivre le nombre d'étudiants inscrits

### Hiérarchie

```
Département
  └── Filière
        └── Option (spécialité)
              └── Classe
                    └── Étudiant
```

---

## 19. Options (spécialités)

La section Options gère les spécialisations au sein d'une filière.

### Ce que vous pouvez faire

- Créer une option
- La rattacher à une filière
- Modifier ou supprimer une option

### Exemple

- Filière : Génie Rural
  - Option : Irrigation
  - Option : Aménagement du territoire

---

## 20. Cycles académiques

La section Cycles gère les niveaux de formation de haut niveau.

### Ce que vous pouvez faire

- Créer un cycle
- Modifier son nom
- Supprimer un cycle inutilisé

### Exemples de cycles

- Cycle préparatoire
- Cycle ingénieur
- Cycle vétérinaire

---

## 21. Lauréats et diplômes

La section Lauréats gère le suivi post-graduation.

### Ce que vous pouvez faire

- Consulter la liste des diplômés
- Créer un dossier lauréat (depuis un étudiant existant)
- Modifier les informations d'un lauréat
- Supprimer un dossier lauréat
- Suivre le statut de remise du diplôme

### Conversion étudiant → lauréat

Depuis la fiche d'un étudiant, cochez **Lauréat** et saisissez l'année de graduation pour le convertir automatiquement.

### Statuts de diplôme

- Non remis
- Remis

---

## 22. Documents

La section Documents gère les fichiers administratifs.

### Ce que vous pouvez faire

- Télécharger un document
- Le lier à un étudiant ou à un enseignant
- Renommer un document
- Déplacer un document d'un dossier à un autre
- Supprimer un document
- Identifier les documents manquants pour un étudiant

### Types de documents typiques

- Formulaires administratifs
- Justificatifs scannés
- Pièces d'identité
- Documents liés au diplôme
- Attestations de scolarité

---

## 23. Workflows (tâches administratives)

La section Workflows permet de suivre les tâches internes.

### Ce que vous pouvez faire

- Créer une tâche administrative
- Lui assigner un responsable
- La relier à un étudiant si nécessaire
- Mettre à jour son statut
- Marquer une tâche comme terminée
- Suivre les tâches en attente

### Utilisation typique

- Suivi d'une demande de document
- Traitement d'un dossier d'admission
- Relance d'une pièce manquante

> **Accès** : Workflows est réservé aux administrateurs et au personnel.

---

## 24. Journaux d'activité

La section Journaux d'activité affiche l'historique des actions sur la plateforme.

### Ce que vous pouvez voir

- Action effectuée (création, modification, suppression…)
- Utilisateur ayant effectué l'action
- Date et heure précises

### Utilisation typique

- Supervision interne
- Vérification de qui a modifié quoi et quand
- Contrôle des opérations sensibles

> **Accès** : Les journaux sont réservés aux administrateurs et au personnel.

---

## 25. Gestion des utilisateurs

La section Utilisateurs contrôle l'accès à la plateforme.

### Ce que vous pouvez faire

- Créer un compte utilisateur
- Attribuer un rôle (Administrateur ou Utilisateur)
- Attribuer un ou plusieurs départements à un utilisateur
- Modifier les informations d'un utilisateur
- Changer le mot de passe
- Supprimer un utilisateur

### Paramètres d'administration

La même page contient les paramètres système :

- **Statut du serveur** : vérification en temps réel de l'API et de la base de données
- **Rôles d'enseignants** : catalogue des rôles (enseignant, chef de filière…)
- **Grades d'enseignants** : catalogue des grades académiques

> **Accès** : La gestion des utilisateurs est réservée aux administrateurs.

---

## 26. Rôles et accès

DEAA-Hub utilise un système de contrôle d'accès par rôle.

### Rôles disponibles

| Rôle | Description |
|---|---|
| **Administrateur** | Accès complet à toutes les sections et opérations |
| **Utilisateur** | Accès limité aux données de ses départements |

### Ce qu'un Utilisateur peut faire

- Voir les étudiants de ses départements
- Modifier les étudiants (pas supprimer)
- Voir et modifier les enseignants (pas supprimer)
- Voir les modules, classes, filières, emploi du temps, salles
- Réserver des salles et approuver les réservations de ses départements
- Accéder au tableau de bord et aux exports de statistiques

### Ce qu'un Utilisateur ne peut pas faire

- Supprimer des étudiants ou des enseignants
- Accéder aux journaux d'activité
- Accéder aux workflows
- Gérer les comptes utilisateurs

### Affectation de département

Lors de la création d'un compte **Utilisateur**, un ou plusieurs départements peuvent lui être assignés. Il ne verra alors que les données correspondant à ces départements.

Un **Administrateur** n'a pas besoin de département : il voit tout.

---

## 27. Navigation et barre latérale

### Barre latérale

La barre latérale gauche est le moyen principal de navigation.

Elle est organisée par groupes sémantiques :

| Groupe | Sections |
|---|---|
| Accueil | Tableau de bord |
| Étudiants | Étudiants · Lauréats · Transferts |
| Enseignants | Professeurs |
| Structure Académique | Modules & Éléments |
| Classes | Gestion des classes · Cours par classe · Transfert de classe |
| Emploi du temps et salles | Emploi du temps · Salles · Réservations |
| Structure Organisationnelle | Départements · Filières · Options · Cycles |
| Administration | Workflows · Journaux · Utilisateurs |

Les groupes visibles dépendent du rôle de l'utilisateur connecté.

### Barre supérieure (Topbar)

La barre du haut affiche :

- Votre nom complet
- Votre rôle actuel
- Un bouton de **déconnexion**

### Accueil (page racine)

L'ouverture de l'application redirige automatiquement vers le **Tableau de bord** si vous êtes connecté, ou vers la **page de connexion** si ce n'est pas le cas.

---

## 28. Flux de travail quotidien recommandé

### Pour le personnel administratif académique

1. Ouvrir le **Tableau de bord** — vérifier les indicateurs globaux
2. Aller dans **Étudiants** — traiter les nouveaux dossiers ou corrections
3. Aller dans **Épreuves** — saisir ou vérifier les notes du jour
4. Aller dans **Classes** — vérifier la configuration des cohortes
5. Aller dans **Emploi du temps** — contrôler la planification de la semaine
6. Vérifier les **Réservations de salle** en attente
7. Mettre à jour les **Documents** ou les **Lauréats** si nécessaire

### Pour la direction et le management

1. Ouvrir le **Tableau de bord** — vérifier les graphiques et indicateurs
2. Utiliser **Statistiques** (bouton en haut à droite) pour exporter un rapport CSV
3. Consulter l'**Activité récente** visible sur le tableau de bord
4. Vérifier les **Réservations de salle** et les approuver si nécessaire
5. Suivre les **Workflows** en attente

### Pour un Utilisateur avec accès limité (département)

1. Ouvrir le **Tableau de bord** — voir les actions rapides disponibles
2. Aller dans **Étudiants** — consulter et modifier les dossiers de son département
3. Consulter **Modules & Éléments** — structure pédagogique de son département
4. Consulter **l'Emploi du temps** de ses classes
5. Gérer les **Réservations de salle** pour les espaces de son département

---

*DEAA-Hub — IAV Hassan II — Manuel utilisateur v2.0*
