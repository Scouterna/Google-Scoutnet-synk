/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Testfunktion för att testa anrop med olika
 * användarnamn/lösenord
 */
function testaDoGet() {
  const e = {
    parameters : {
      username: ["en e-postadress"],
      password: ["lösenord"],
      version: ["2.0.0"],
      forceupdate: ["true"]
    }
  }
  doGet(e);
}


/**
 * Körs vid GET-anrop till webbappen
 * 
 * @param {Object} e - Query-parametrar vid GET-anrop till webbappen
 *
 * @returns {Object} - Ett objekt av typen TextOutput
 */
function doGet(e) {
  return ScoutnetSynkLib.synkroniseraKontakter(KONFIG_OBJECT, e);
}


/**
 * En testfunktion för att själv kunna få fram oformaterad brödtext för e-brev
 * samt html-formaterad brödtext för e-brev.
 * 
 * Skapa ett utkast i din Gmail med ämne satt till Kontaktgrupper och kör sen
 * denna funktion så skrivs brödtexten ut i körningsloggen. 
 */
function testGetHtmlEmailBody() {
  
  const subject = "Kontaktgrupper";

  ScoutnetSynkLib.testGetHtmlEmailBody(KONFIG_OBJECT, subject);
}


/**
 * Uppdatera kalkylbladet med de användare som ska ha behörigheter
 */
function updateContactGroupsAuthnSheetUsers() {
  ScoutnetSynkLib.updateContactGroupsAuthnSheetUsers(KONFIG_OBJECT);
}


/**
 * Skapa kolumnrubriker i kalkylarket för konfiguration av Kontakter
 */
function skapaRubrikerKontakter() {
  ScoutnetSynkLib.skapaRubrikerKontakter(KONFIG_OBJECT);
}
