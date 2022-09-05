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

  const konfigObject = makeKonfigObject();
  return ScoutnetSynkLib.synkroniseraKontakter(konfigObject, e);
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

  const draft = getDraft_(subject);

  if (!draft) { //Kolla om ämnesraden är korrekt
    console.error("Finns ej ett utkast i Gmail med korrekt ämnesrad");
    return;
  }

  const plainBody = draft.getPlainBody();
  const body = draft.getBody();

  console.info("plainBody");
  console.info(plainBody);

  console.info("body");
  console.info(body);
}


/**
 * Uppdatera kalkylbladet med de användare som ska ha behörigheter
 */
function updateContactGroupsAuthnSheetUsers() {
  const konfigObject = makeKonfigObject();
  ScoutnetSynkLib.updateContactGroupsAuthnSheetUsers(konfigObject);
}
