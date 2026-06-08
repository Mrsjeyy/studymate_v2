/** Step definitions for the guided tour, keyed by view name. */
export const TOUR_STEPS = {
  dashboard: [
    { target: 'h2', title: 'Willkommen! 👋', text: 'Dies ist dein Studien-Hub. Hier siehst du öffentliche Sets und deine eigenen. Drücke jederzeit das ? oben rechts, um diese Tour erneut zu starten.' },
    { target: '.discover-tab-btn', title: 'Entdecken', text: 'Stöbere durch öffentliche Sets von anderen Nutzern.' },
    { target: '.mine-tab-btn', title: 'Meine Sets', text: 'Deine eigenen erstellten Sets findest du hier.' },
    { target: '.sm-create-btn', title: 'Set erstellen', text: 'Klicke hier, um ein neues Flashcard-Set zu erstellen.' },
  ],
  discover: [
    { target: '.sm-card', title: 'Öffentliche Sets', text: 'Hier siehst du Sets von anderen Nutzern. Du kannst sie forken um deine eigene Kopie zu erstellen.' },
    { target: '.fork-btn', title: 'Set forken', text: 'Mit diesem Button kopierst du ein öffentliches Set in dein Konto.' },
    { target: '.sm-fav-btn', title: 'Favoriten', text: 'Markiere Sets als Favorit, um sie schnell zu finden.' },
  ],
  mine: [
    { target: '.sm-card', title: 'Deine Sets', text: 'Dies sind all deine erstellten Flashcard-Sets.' },
    { target: '.sm-create-btn', title: 'Neues Set', text: 'Erstelle ein neues Set mit eigenen Karten.' },
  ],
  detail: [
    { target: 'h1', title: 'Set Details', text: 'Hier sind alle Karten deines Sets aufgelistet.' },
    { target: '.learn-btn', title: 'Lernen', text: 'Aktiviere den Lernmodus, um die Karten als Karteikarten durchzugehen.' },
    { target: '.quiz-btn', title: 'Quiz', text: 'Teste dein Wissen mit einem Quiz oder lass dir eines per KI generieren.' },
  ],
  createSet: [
    { target: 'input[placeholder*="Titel"]', title: 'Set Name', text: 'Gib einen aussagekräftigen Namen für dein Set ein.' },
    { target: 'textarea', title: 'Beschreibung', text: 'Beschreibe worum es in diesem Set geht.' },
  ],
  learn: [
    { target: '.sm-progress-bar', title: 'Fortschritt', text: 'Der Balken zeigt, wie weit du im Set bist.' },
    { target: '.sm-flip-card', title: 'Karteikarte', text: 'Klicke auf die Karte, um sie umzudrehen und die Antwort zu sehen.' },
    { target: '.learn-unknown-btn', title: 'Nicht gewusst', text: 'Wenn du die Antwort nicht wusstest, markiere die Karte so – sie kommt zur Wiederholung.' },
    { target: '.learn-known-btn', title: 'Gewusst!', text: 'Wenn du die Antwort kanntest, markiere die Karte als gewusst.' },
  ],
  quiz: [
    { target: '.quiz-intro-panel', title: 'Quiz-Modus', text: 'Hier kannst du dein Wissen mit Multiple-Choice-Fragen testen.' },
    { target: '.quiz-ai-btn', title: 'KI-Quiz', text: 'Die KI erstellt neue Fragen auf Basis deiner Karten – mit Erklärungen nach jeder Antwort.' },
    { target: '.quiz-start-btn', title: 'Standard-Quiz starten', text: 'Starte ein Quiz mit den Karten aus deinem Set ohne KI.' },
  ],
  favorites: [
    { target: '.sm-input', title: 'Suche', text: 'Durchsuche deine gespeicherten Favoriten nach Titel.' },
    { target: '.sm-fav-btn', title: 'Favorit entfernen', text: 'Mit dem Stern-Button kannst du ein Set aus deinen Favoriten entfernen.' },
    { target: '.sm-card', title: 'Favorisiertes Set', text: 'Klicke auf "Öffnen", um direkt in ein Set einzusteigen.' },
  ],
  friends: [
    { target: '.sm-tab', title: 'Freunde-Tabs', text: 'Wechsle zwischen deinen Freunden, offenen Anfragen und der Nutzersuche.' },
    { target: '.sm-input', title: 'Nutzername suchen', text: 'Gib einen Nutzernamen ein, um jemanden zu suchen und eine Freundschaftsanfrage zu schicken.' },
  ],
  profile: [
    { target: '.sm-stat', title: 'Deine Statistiken', text: 'Hier siehst du auf einen Blick deine Karteikarten, Sets und deinen Lern-Streak.' },
    { target: '.sm-btn-primary', title: 'Profil bearbeiten', text: 'Ändere deinen Anzeigenamen, dein Profilbild und deine Bio.' },
  ],
};
