/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Huvudfunktion för att hantera synkronisering av användarkonton med Scoutnet
 */
function Anvandare() {
  
  const konfigObject = makeKonfigObject();

  const defaultOrgUnitPath = "/Scoutnet";
  const suspendedOrgUnitPath = defaultOrgUnitPath + "/" + "Avstängda";
  
  ScoutnetSynkLib.Anvandare(konfigObject, defaultOrgUnitPath, suspendedOrgUnitPath);
}


/**
 * Testfunktion för att lista alla Googlekonton som finns i underorganisationen "Scoutnet"
 */
function listaAllaGooglekonton() {
  const konfigObject = makeKonfigObject();
  ScoutnetSynkLib.listaAllaGooglekonton(konfigObject);
}
