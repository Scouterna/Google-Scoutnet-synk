/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Anropa denna funktion om du vill synkronisera både användare och
 * grupper direkt efter varandra
 */
function AnvandareOchGrupper() {  
  Anvandare();
  Grupper();
}


/***Grupper***/
/**
 * Anropar funktion för att skapa kolumnrubriker för kalkylarket
 * för grupper
 */
function skapaRubrikerGrupper() {
  createHeaders_Grupper();
}
/**
 * Funktion för att alla rader i kalkylarket för grupper
 * ska synkroniseras och e-brev skickas ut
 */
function GrupperAllaRader() {
  Grupper();
}

/**
 * Funktioner för att ange att enbart vissa radintervall i kalkylarket
 * ska synkroniseras
 *
 * Exempelvis rad 0 till 10. Helt fritt att ändra själv
 */
function GrupperVissaRader1() {
  Grupper(0, 10);
}

function GrupperVissaRader2() {
  Grupper(11, 20);
}

function GrupperVissaRader3() {
  Grupper(21, 30);
}
/***Grupper - Slut***/


/***Medlemslistor***/
/**
 * Anropar funktion för att skapa kolumnrubriker för kalkylarket
 * för medlemslistor konfig
 */
function skapaRubrikerMedlemslistor() {
  skapaRubrikerML();
}
/**
 * Funktion för att alla rader i kalkylarket för medlemslistor
 * ska synkroniseras och e-brev skickas ut
 */
function MedlemslistorAllaRader() {
  Medlemslistor();
}

/**
 * Funktioner för att ange att enbart vissa radintervall i kalkylarket
 * för medlemslistor ska synkroniseras och e-brev skickas ut.
 * Samt ställa in om medlemslistor enbart ska uppdateras alternativt om
 * gällande om e-brev ska skickas ut till listan
 *
 * Exempelvis rad 0 till 10. Helt fritt att ändra själv
 */
function MedlemslistorVissaRaderUppdateraOchSkicka1() {
  Medlemslistor(0, 10, true, true);
}

function MedlemslistorVissaRaderUppdateraOchSkicka2() {
  Medlemslistor(11, 20, true, true);
}

function MedlemslistorVissaRaderUppdateraOchSkicka3() {
  Medlemslistor(21, 30, true, true);
}

function MedlemslistorVissaRaderUppdateraEnbart1() {
  Medlemslistor(0, 10, true, false);
}

function MedlemslistorVissaRaderSkickaEnbart1() {
  Medlemslistor(0, 10, false, true);
}


/**
 * Kolla om ett objekt är inkluderat i en lista
 * 
 * @param {String[] | Number[] | Object[]} a - Lista
 * @param {String | Number | Object} obj - Ett objekt
 * 
 * @returns {Boolean} - True eller false gällande om objektet finns i listan
 */
function contains(a, obj) {
  for (var i = 0; i < a.length; i++) {
    if (a[i] === obj) {
      return true;
    }
  }
  return false;
}
