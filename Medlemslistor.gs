/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Funktion att använda för att enbart uppdatera en specifik
 * medlemslista på en specifik rad
 */
function MedlemslistorVissaRaderUppdateraEnbartTmp() {
  medlemslistorEnRad_(1, true, false);
}


/**
 * Funktion att använda för att enbart skicka ut e-brev till
 * en specifik medlemslista på en specifik rad
 */
function MedlemslistorVissaRaderSkickaEnbartTmp() {
  medlemslistorEnRad_(1, false, true);
}


/**
 * Funktion att använda för att uppdatera samtliga medlemslistor
 */
function MedlemslistorUppdateraEnbart() {
  synkroniseraMedlemslistor_(0, 100, true, false);
}


/**
 * Funktion att använda för att ställa in att start- och slutrad
 * är lika
 * 
 * @param {number} radNummer - Rad att synkronisera
 * @param {boolean} shouldUpdate - Om medlemslistan ska uppdateras
 * @param {boolean} shouldSend - Om e-brev ska skickas ut till medlemlemslistan
 */
function medlemslistorEnRad_(radNummer, shouldUpdate, shouldSend) {
  const konfigObject = makeKonfigObject();
  ScoutnetSynkLib.synkroniseraMedlemslistor(konfigObject, radNummer, radNummer, shouldUpdate, shouldSend);
}


/**
 * Skapa kolumnrubriker i kalkylarket för medlemslistor konfig
 */
function skapaRubrikerML() {
  const konfigObject = makeKonfigObject();
  ScoutnetSynkLib.skapaRubrikerML(konfigObject);
}
