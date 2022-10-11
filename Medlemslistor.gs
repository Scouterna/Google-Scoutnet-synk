/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Funktion att använda för att enbart uppdatera en specifik
 * medlemslista på en specifik rad
 */
function medlemslistorVissaRaderUppdateraEnbartTmp() {
  ScoutnetSynkLib.synkroniseraMedlemslistorEnRad(KONFIG_OBJECT, 1, true, false);
}


/**
 * Funktion att använda för att enbart skicka ut e-brev till
 * en specifik medlemslista på en specifik rad
 */
function medlemslistorVissaRaderSkickaEnbartTmp() {
  ScoutnetSynkLib.synkroniseraMedlemslistorEnRad(KONFIG_OBJECT, 1, false, true);
}


/**
 * Funktion att använda för att uppdatera samtliga medlemslistor
 */
function medlemslistorUppdateraEnbart() {
  ScoutnetSynkLib.synkroniseraMedlemslistor(KONFIG_OBJECT, 0, 100, true, false);
}


/**
 * Skapa kolumnrubriker i kalkylarket för medlemslistor konfig
 */
function skapaRubrikerML() {
  ScoutnetSynkLib.skapaRubrikerML(KONFIG_OBJECT);
}
