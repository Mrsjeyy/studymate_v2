/** Step definitions for the guided tour, keyed by view name. */
export const TOUR_STEPS = {
  dashboard: [
    { target: 'h2', title: 'Willkommen! 👋', text: 'Dies ist dein Studien-Hub. Hier siehst du öffentliche Sets und deine eigenen.' },
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
    { target: '.learn-btn', title: 'Lernen', text: 'Aktiviere den Lernmodus, um die Karten durchzugehen.' },
    { target: '.quiz-btn', title: 'Quiz', text: 'Teste dein Wissen mit einem KI-generierten Quiz.' },
  ],
  createSet: [
    { target: 'input[placeholder*="Titel"]', title: 'Set Name', text: 'Gib einen aussagekräftigen Namen für dein Set ein.' },
    { target: 'textarea', title: 'Beschreibung', text: 'Beschreibe worum es in diesem Set geht.' },
  ],
};
