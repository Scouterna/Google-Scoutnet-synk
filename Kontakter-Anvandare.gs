/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 * @version 2022-12-30
 */


/**
 * Funktion för att skapa menyn i kalkylarket
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Scoutnet')
    .addItem('Synkronisera kontakter', 'synkroniseraKontakterVanlig')
    .addItem('Synkronisera kontakter - Tvinga uppdatering om möjligt', 'synkroniseraKontakterTvingad')
    .addItem('Radera alla synkbara kontakter', 'raderaKontakter')
    .addToUi();
}


/**
 * Funktion för att synkronisera kontakter och kontaktgrupper
 */
function synkroniseraKontakterVanlig() {
  synkroniseraKontakter_(false, false);
}


/**
 * Funktion för att synkronisera kontakter och kontaktgrupper
 * och tvinga kårens backend att skicka en uppdaterad och ej lagrad
 * kopia på datan om möjligt.
 * Skapar vid behov tidsinställd utlösare för att köra skriptet för
 * vanlig synkronisering.
 */
function synkroniseraKontakterTvingad() {
  createTriggerIfNeeded_();
  protectSheet_();
  synkroniseraKontakter_(true, false);
}


/**
 * Funktion för att radera alla kontakter och kontaktgrupper som
 * är synkroniseringsbara
 */
function raderaKontakter() {
  synkroniseraKontakter_(false, true);
}


/**
 * Huvudfunktion för att hantera synkronisering av kontakter och kontaktgrupper med Scoutnet
 * 
 * @param {boolean} forceUpdate - Tvinga uppdatering av kontakter om det går. Ej undansparad data.
 * @param {boolean[]} deleteContacts - Om alla synkbara kontakter ska raderas eller ej
 */
function synkroniseraKontakter_(forceUpdate, deleteContacts) {
  
  forceUpdate = forceUpdate.toString();

  console.time("Synkronisera kontakter");
  console.info("Läser data från kalkylbladet");
  const sdk = getSheetDataKontakter_();
  const cells = sdk["cells"];

  const username = sdk["username"];
  const password = sdk["password"];
  const version = sdk["version"];
  const webappUrl = sdk["webappUrl"];
  
  const prefixContactgroups = sdk["prefixContactgroups"];
  const groupName = sdk["groupName"];

  console.log("Kår " + groupName);

  //Kolla om användarfälten är tomma
  const boolIfCellsNonEmpty = colourCellsIfEmpty_(cells, sdk);

  if (!boolIfCellsNonEmpty) {
    console.error("I ett eller flera användarfält måste anges data och som nu är tomma");
    return;
  }

  console.info("Gör anrop till API");

  const userParam = "?username=" + username + "&password=" + password + "&version=" + version + "&forceupdate=" + forceUpdate;
  console.log(userParam);

  let nyaKontaktGrupper;

  if (!deleteContacts) {
    nyaKontaktGrupper = fetchUrl_(webappUrl+userParam, cells.webappUrl);
  }

  if ((typeof nyaKontaktGrupper === 'string') || deleteContacts) {
    console.info("Felmeddelande från kårens backend");
    console.log(nyaKontaktGrupper);

    //Fel version
    if (nyaKontaktGrupper.includes("version")) {
      if ("#ff0000" !== cells.version.getBackground()) {
        cells.version.setBackground("red");
      }
    }
    else { //Fel e-postadress eller lösenord
      if ("#ff0000" !== cells.username.getBackground() || "#ff0000" !== cells.password.getBackground()) {
        cells.username.setBackground("red");
        cells.password.setBackground("red");
      }
    }
    nyaKontaktGrupper = [[]];
  }
  else {
    console.info("Riktig data från backend har hämtats");

    if ("#d3d3d3" !== cells.version.getBackground()) {
      cells.version.setBackground("LightGrey");
    }
    if ("#d3d3d3" !== cells.username.getBackground()) {
      cells.username.setBackground("LightGrey");
    }
    if ("#d3d3d3" !== cells.password.getBackground()) {
      cells.password.setBackground("LightGrey");
    }
  }

  //console.log(nyaKontaktGrupper);

  let kontaktgrupper = getContactGroups_(prefixContactgroups);
  kontaktgrupper = createAndDeleteContactGroups_(kontaktgrupper, nyaKontaktGrupper, prefixContactgroups);
  //console.log("kontaktgrupper");
  //console.log(kontaktgrupper);

  const emptyContactResource = makeContactResource_({});
  const contactResourceKeys = Object.keys(emptyContactResource);
  //console.log("Nycklar som används");
  //console.log(contactResourceKeys);

  const resourceNamesRemovedFromContactGroups = createAndUpdateContacts_(kontaktgrupper, nyaKontaktGrupper, prefixContactgroups, contactResourceKeys);
  
  console.log("Kontakter som är borttagna från kontaktgrupper");
  console.log(resourceNamesRemovedFromContactGroups);
  deleteContacts_(resourceNamesRemovedFromContactGroups, contactResourceKeys);

  console.timeEnd("Synkronisera kontakter");
}


/**
 * Låser de celler i kalkylbladet som inte ska röras av användaren
 */
function protectSheet_() {

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Kontakter");
  if (!sheet) {
    console.error("Bladet Kontakter finns ej i kalkylarket");
  }

  const protection = sheet.protect().setWarningOnly(true);
  
  const unprotected = sheet.getRangeList(["C5:C6", "C9:C13"]).getRanges();
  protection.setUnprotectedRanges(unprotected);
  console.info("Låst de celler i kalkylbladet som ska vara låsta");
}


/**
 * Kollar om något användarfält saknar data och färgmarkerar dem vid behov.
 * Om något fält saknar data som måste ha data returneras falskt och annars sant.
 * 
 * @param {Object} cell - Objekt för flera celler i ett kalkylblad
 * @param {string} sdk - Datan som användaren har angett i kalkylbladet
 * 
 * @returns {boolean} - Ger falskt om bakgrundsfärgen sätts till röd för något användarfält.
 * Annars ger den sant.
 */
function colourCellsIfEmpty_(cells, sdk) {

  //Kolla här om användarfälten är tomma
  const colourCellUsername = colourCellIfEmpty_(cells.username, sdk["username"], "red");
  colourCellIfEmpty_(cells.password, sdk["password"], "yellow");
  const colourCellVersion = colourCellIfEmpty_(cells.version, sdk["version"], "red");
  const colourCellWebappUrl = colourCellIfEmpty_(cells.webappUrl, sdk["webappUrl"], "red");
  const colourCellPrefixContactgroups = colourCellIfEmpty_(cells.prefixContactgroups, sdk["prefixContactgroups"], "red");
  colourCellIfEmpty_(cells.groupName, sdk["groupName"], "yellow");

  if (colourCellUsername &&
      colourCellVersion &&
      colourCellWebappUrl &&
      colourCellPrefixContactgroups) {

    return true;
  }
  return false;
}


/**
 * Ändrar bakgrundsfärg på en cell beroende på om den
 * innehåller någon data eller ej.
 * 
 * @param {Object} cell - En cell i ett kalkylblad
 * @param {string} cellData - Data i en cell i ett kalkylblad
 * @param {string} colour - Namn på färg eller rgb hexadecimalt värde för en färg
 * 
 * @returns {boolean} - Ger falskt om bakgrundsfärgen sätts till röd.
 * Annars ger den sant.
 */
function colourCellIfEmpty_(cell, cellData, colour) {

  if (!cellData) { //Kolla om cellen är tom
    cell.setBackground(colour);
    if ("red" === colour) {
      return false;
    }
  }
  else {
    if ("#d3d3d3" !== cell.getBackground()) {
      cell.setBackground("LightGrey");
    }
  }
  return true;
}


/**
 * Skapar tidsinställd utlösare för skriptet vid behov
 */
function createTriggerIfNeeded_() {

  const triggers = ScriptApp.getProjectTriggers();

  console.info("Antal utlösare som finns " + triggers.length);

  if (0 < triggers.length) {
    console.info("Utlösare finns redan och ska ej skapas");
    return;
  }

  const trigger = ScriptApp.newTrigger('synkroniseraKontakterVanlig')
    .timeBased()
    .atHour(1)
    .everyDays(1)
    .inTimezone("Europe/Stockholm")
    .create();

  console.info("Nedanstående utlösare är nu skapad")
  console.info("Typ av utlösare " + trigger.getEventType());
  console.info("Funktion som ska köras " + trigger.getHandlerFunction());
  console.log("Unikt id för utlösare " + trigger.getUniqueId());
}


/**
 * Ger datan som användaren har angett i kalkylbladet
 *
 * @returns {Object} - Ger datan som användaren har angett i kalkylbladet
 */
function getSheetDataKontakter_() {

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Kontakter");
  if (!sheet) {
    console.error("Bladet Kontakter finns ej i kalkylarket");
  }
  const selection = sheet.getDataRange();
  const data = selection.getValues();
  
  const grd = getKontakterUserInputData_();

  //console.log(data);
  //console.log(grd);

  const userInputData = {};
  userInputData["username"] = data[grd["username"][0]][grd["username"][1]];
  userInputData["password"] = data[grd["password"][0]][grd["password"][1]];

  userInputData["prefixContactgroups"] = data[grd["prefixContactgroups"][0]][grd["prefixContactgroups"][1]];
  userInputData["groupName"] = data[grd["groupName"][0]][grd["groupName"][1]];
  userInputData["webappUrl"] = data[grd["webappUrl"][0]][grd["webappUrl"][1]];
  userInputData["version"] = data[grd["version"][0]][grd["version"][1]];

  userInputData["cells"] = {
    username: selection.getCell(grd["username"][0]+1, grd["username"][1]+1),
    password: selection.getCell(grd["password"][0]+1, grd["password"][1]+1),
    prefixContactgroups: selection.getCell(grd["prefixContactgroups"][0]+1, grd["prefixContactgroups"][1]+1),
    groupName: selection.getCell(grd["groupName"][0]+1, grd["groupName"][1]+1),
    webappUrl: selection.getCell(grd["webappUrl"][0]+1, grd["webappUrl"][1]+1),
    version: selection.getCell(grd["version"][0]+1, grd["version"][1]+1)
  };

  //console.log(userInputData);
  return userInputData;
}


/**
 * Gör ett get-anrop mot en url och ger JSON-tolkad data tillbaka
 * 
 * @param {string} url - Url att hämta data från
 * @param {Object} cellWebappUrl - Cell i kalkylbladet för webappUrl
 * 
 * @returns {Object[][]} - JSON-tolkad data från angiven url
 */
function fetchUrl_(url, cellWebappUrl) {

  console.time("Anropa url");

  console.log("Anropar url " + url);
  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.warn("Funktionen fetchUrl körs " + n);
    }

    try {
      const response = UrlFetchApp.fetch(url);

      const parsedResponse = JSON.parse(response);
      //console.log(parsedResponse);
      
      if ("#d3d3d3" !== cellWebappUrl.getBackground()) {
        console.log("Sätter grey bakgrund");
        cellWebappUrl.setBackground("LightGrey");
      }
      console.timeEnd("Anropa url");
      return parsedResponse;
    }
    catch (e) {
      console.error("Problem med att anropa UrlFetchApp.fetch");
      if (n === 5) {
        if ("#ff0000" !== cellWebappUrl.getBackground()) {
          console.error("Sätter röd bakgrund");
          cellWebappUrl.setBackground("red");
        }
        console.timeEnd("Anropa url");
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Returnerar lista med vilket index som olika användarfält har i kalkylarket
 *
 * @returns {number[][]} - Lista med index för rad och kolumn för olika användarfält
 */
function getKontakterUserInputData_() {
  
  //Kolumn och rad i kalkylarket
  const column = 2;

  const kuid = {};
  kuid["username"] = [4, column];
  kuid["password"] = [5, column];

  kuid["prefixContactgroups"] = [8, column];
  kuid["groupName"] = [9, column];
  kuid["webappUrl"] = [10, column];
  kuid["version"] = [11, column];

  return kuid;
}


/**
 * Raderar kontakter som har tagits bort från någon kontaktgrupp och som inte uppfyller
 * kriterierna för att kunna synkroniseras och kollar också igenom alla kontakter som
 * uppfyller kriterierna för att kunna synkroniseras men som inte är med i någon kontaktgrupp
 * 
 * @param {string[]} resourceNamesRemovedFromContactGroups - Lista med resursnamn för de kontakter
 * som har tagits bort från någon kontaktgrupp
 * @param {string[]} contactResourceKeys - Attribut för en kontakt
 */
function deleteContacts_(resourceNamesRemovedFromContactGroups, contactResourceKeys) {

  /***De som har tagits bort från någon kontaktgrupp***/
  //console.log("Resurser som tagits bort från någon kontaktgrupp");
  //Rensar bort dubletter bland de som tagits bort från flera kontaktgrupper
  resourceNamesRemovedFromContactGroups = removeDublicates_(resourceNamesRemovedFromContactGroups);
  //console.log(resourceNamesRemovedFromContactGroups);
  /***SLUT - De som har tagits bort från någon kontaktgrupp***/

  /***Hitta alla kontakter som är synkbara***/
  const connections = updateListOfConnections_([...contactResourceKeys, 'memberships']);
  //console.log("Alla kontakter som är synkbara");
  //console.log(connections);

  const connectionsResourceNames = [];
  for (let i = 0; i < connections.length; i++) {
    connectionsResourceNames.push(connections[i].resourceName);
  }
  //console.log("connectionsResourceNames");
  //console.log(connectionsResourceNames);
  /***SLUT - Hitta alla kontakter som är synkbara***/


  /***Hämta lista över vilka kontaktgruppers resursnamn som inte är systemgrupper***/
  const kontaktgrupperResourceNames = getContactGroupsResourceNames_();
  /***SLUT - Hämta lista över vilka kontaktgrupper som inte är systemgrupper***/


  /***Hitta vilka kontakter som tagits bort som inte är synkbara***/
  const resourceNamesToCheck = [];

  for (let i = 0; i < resourceNamesRemovedFromContactGroups.length; i++) {
    if (!connectionsResourceNames.includes(resourceNamesRemovedFromContactGroups[i])) {
      resourceNamesToCheck.push(resourceNamesRemovedFromContactGroups[i]);
    }
  }
  console.log("Dessa kontakter är icke synkbara kontakter som tagits bort från en kontaktgrupp");
  console.log(resourceNamesToCheck);

  const personResponses = getContactsByMemberResourceNames_(resourceNamesToCheck);
  const resourceNamesToDeleteNonSyncable = getResourceNamesToDeleteFromPersonResponses_(personResponses, kontaktgrupperResourceNames);
  /***SLUT - Hitta vilka kontakter som tagits bort som inte är synkbara***/


  /***Hitta vilka synkbara kontakter som inte är med i en kontaktgrupp***/
  const resourceNamesToDeleteSyncable = getResourceNamesToDeleteFromConnections_(connections, kontaktgrupperResourceNames);
  /***SLUT - Hitta vilka synkbara kontakter som inte är med i en kontaktgrupp***/

  //Raderar kontakterna
  batchDeleteContacts_(resourceNamesToDeleteNonSyncable);
  batchDeleteContacts_(resourceNamesToDeleteSyncable);
}


/**
 * Ger en lista med resursnamn för alla användarskapade kontaktgrupper som finns
 * 
 * @returns {string[]} - Lista med resursnamn för alla användarskapade kontaktgrupper
 */
function getContactGroupsResourceNames_() {

  const kontaktgrupper = getContactGroups_("");

  const resourceNames = [];

  for (let i = 0; i < kontaktgrupper.length; i++) {
    resourceNames.push(kontaktgrupper[i].resourceName);
  }
  console.log("Resursnamn för alla användarskapade kontaktgrupper");
  console.log(resourceNames);
  return resourceNames;
}


/**
 * Ger lista över resursnamn för de kontakter som har tagits bort från en kontaktgrupp och som inte
 * är synkbara och inte heller är med i någon annan kontaktgrupp som inte är en systemgrupp.
 * 
 * @param {Object[]} personResponses - Lista av Objekt av typen PersonResponse för kontaker som tagits bort
 * från en kontaktgrupp och som inte är synkbara.
 * @param {string[]} kontaktgrupperResourceNames - Lista av resursnamn för kontaktgrupper som inte är systemgrupper
 * 
 * @returns {string[]} - Lista över resursnamn för kontakter som inte är synkbara som ska tas bort
 */
function getResourceNamesToDeleteFromPersonResponses_(personResponses, kontaktgrupperResourceNames) {

  //console.log("personResponses");
  //console.log(personResponses);

  const resourceNamesToDelete = [];

  for (let i = 0; i < personResponses.length; i++) {
    const person = personResponses[i].person;
    const memberships = person.memberships;
    //console.log("memberships");
    //console.log(memberships);
    
    if (!checkIfContactInAnyNonSystemContactGroup_(kontaktgrupperResourceNames, memberships)) {
      resourceNamesToDelete.push(person.resourceName);
    }
  }
  console.warn("Dessa kontakter som inte är synkbara ska raderas");
  console.warn(resourceNamesToDelete);
  return resourceNamesToDelete;
}


/**
 * Ger lista över resursnamn för de kontakter som har tagits bort från en kontaktgrupp och som
 * är synkbara och inte heller är med i någon annan kontaktgrupp som inte är en systemgrupp.
 * 
 * @param {Object[]} connections - Lista med objekt för kontakter
 * från en kontaktgrupp och som inte är synkbara.
 * @param {string[]} kontaktgrupperResourceNames - Lista av resursnamn för kontaktgrupper som inte är systemgrupper
 * 
 * @returns {string[]} - Lista över resursnamn för kontakter som är synkbara som ska tas bort
 */
function getResourceNamesToDeleteFromConnections_(connections, kontaktgrupperResourceNames) {

  const resourceNamesToDelete = [];

  for (let i = 0; i < connections.length; i++) {
    const connection = connections[i];
    const memberships = connection.memberInfo.memberships;
    const resourceName = connection.resourceName;

    //console.log(resourceName);
    //console.log(memberships);

    if (!checkIfContactInAnyNonSystemContactGroup_(kontaktgrupperResourceNames, memberships)) {
      resourceNamesToDelete.push(resourceName);
    }
  }
  console.warn("Dessa kontakter som är synkbara ska raderas");
  console.warn(resourceNamesToDelete);
  return resourceNamesToDelete;
}


/**
 * Kollar om en kontakt är med i en kontaktgrupp som inte är en systemgrupp
 * 
 * @param {string[]} kontaktgrupperResourceNames - Lista av resursnamn för kontaktgrupper som inte är systemgrupper
 * @param {Object[]} memberships - Lista av objeket med kontaktgruppsmedlemskap för en kontakt
 * 
 * @returns {boolean} - Sant eller falskt om denna kontakt är med i en kontaktgrupp som inte är en systemgrupp
 */
function checkIfContactInAnyNonSystemContactGroup_(kontaktgrupperResourceNames, memberships) {

  for (let i = 0; i < memberships.length; i++) {
    const resourceName = memberships[i].contactGroupMembership.contactGroupResourceName;
    
    if (kontaktgrupperResourceNames.includes(resourceName)) {
      //console.log("Denna kontakt är fortfarande med i en kontaktgrupp " + resourceName);
      return true;
    }
  }
  //console.log("Denna kontakt är inte längre med i en kontaktgrupp");
  return false;
}


/**
 * Uppdaterar kontakter och skapar nya vid behov.
 * Returnerar resursnamn för de kontakter som tagits bort från någon kontaktgrupp
 * 
 * @param {Object[]} kontaktGrupper - Lista av Objekt med kontaktgruppsinformation
 * @param {Object[]} nyaKontakter - Lista av listor med information över de kontaktgrupper som ska finnas
 * @param {string} prefixContactgroups - Prefix för kontaktgrupper som synkroniseras
 * @param {string[]} contactResourceKeys - Attribut för en kontakt
 * 
 * @returns {string[]} - Lista med resursnamn för de kontakter som har tagits bort från någon kontaktgrupp
 */
function createAndUpdateContacts_(kontaktGrupper, nyaKontakter, prefixContactgroups, contactResourceKeys) {

  //Alla kontakter som tidigare har synkats
  const connections = updateListOfConnections_(contactResourceKeys);

  const contactsRemovedFromContactGroups = [];
  const resourceNamesAlreadyProcessed = [];
  
  //Loop och gå igenom varje kontaktgrupp
  for (let i = 0; i < kontaktGrupper.length; i++) {
    
    //console.log(kontaktGrupper[i]);

    const kontaktGruppNamn = kontaktGrupper[i].name;
    console.time(kontaktGruppNamn);

    console.info("----------------------------------");
    console.info("Namn på aktuell kontaktgrupp " + kontaktGruppNamn);
    const kontaktGruppResourceName = kontaktGrupper[i].resourceName;
    //console.log("Resursnamn för aktuell kontaktgrupp " + kontaktGruppResourceName);

    //Hämta vilka som är med i kontaktgruppen just nu
    /***Är med i kontaktgruppen just nu***/
    const kontaktGrupp = getContactGroup_(kontaktGrupper[i]);
    const memberResourceNames = kontaktGrupp.memberResourceNames;
    const kontaktLista = getContactsByMemberResourceNames_(memberResourceNames);
    const membersInfo = getMembersInfoFromPersonResponses_(kontaktLista);
  
    //console.log("kontaktGrupp");
    //console.log(kontaktGrupp);

    //console.log("memberResourceNames");
    //console.log(memberResourceNames);

    //console.log("kontaktLista");
    //console.log(kontaktLista);

    //console.log("Hämta lista över vilka som just nu är med i kontaktgruppen");
    //console.log(membersInfo);
    /***Är med i kontaktgruppen just nu - Slut***/

    //console.log("nyaKontakter");
    //console.log(nyaKontakter);

    /***Ska var med i kontaktgruppen***/
    const memberNumbersShouldBeInContactGroup = getMemberNumbersShouldBeInContactGroup_(nyaKontakter, kontaktGruppNamn, prefixContactgroups);
    /***Ska var med i kontaktgruppen - Slut***/

    const membersInfoStayingInGroup = [];

    const resourceNamesToAdd = [];
    const resourceNamesToRemove = [];
  
    //console.log("Loopa igenom vilka som ska tas bort från kontaktgruppen");
    //Loop och gå igenom varje kontakt som är med i gruppen just nu
    for (let n = 0; n < membersInfo.length; n++) {
      
      //Detta medlemsnummer finns ej med i den nya listan
      if (!memberNumbersShouldBeInContactGroup.includes(membersInfo[n].memberNumber)) {
        console.log("Ska ta bort kontakten från kontaktgruppen " + membersInfo[n].memberNumber);
        resourceNamesToRemove.push(membersInfo[n].resourceName);
        contactsRemovedFromContactGroups.push(membersInfo[n].resourceName);
      }
      else {
        membersInfoStayingInGroup.push(membersInfo[n]);
      }
    }

    //console.log("Ska fortsätta stanna i gruppen");
    //console.log(membersInfoStayingInGroup);

    const memberNumbersStayingInGroup = getMemberNumbersFromMembersInfo_(membersInfoStayingInGroup);
    //console.log("memberNumbersStayingInGroup");
    //console.log(memberNumbersStayingInGroup);

    
    //Loop - de som inte är med i kontaktgruppen ska läggas till. Om konto saknas ska det skapas
    //console.log("Loopa igenom vilka som ska läggas till i kontaktgruppen och eventuellt skapas");
    for (let n = 0; n < memberNumbersShouldBeInContactGroup.length; n++) {

      //Ej med i kontaktgruppen sedan innan
      if (!memberNumbersStayingInGroup.includes(memberNumbersShouldBeInContactGroup[n])) {

        //Hämta kontakten med ett givet medlemsnummer
        let connection = getConnectionByMemberNumber_(connections, memberNumbersShouldBeInContactGroup[n]);

        if (connection) {
          //Kontakten finns sedan innan
          console.log("Lägg till kontakten " + connection.memberNumber + " i gruppen");
          resourceNamesToAdd.push(connection.resourceName);
        }
        else {
          console.log("Skapa kontakten " + memberNumbersShouldBeInContactGroup[n] + " och lägg till i gruppen");
          const memberData = getMemberdataFromMemberNumber_(nyaKontakter, memberNumbersShouldBeInContactGroup[n]);

          connection = createContact_(memberData);
          resourceNamesToAdd.push(connection.resourceName);
          resourceNamesAlreadyProcessed.push(connection.resourceName);

          //Sparar anrop i stället för att uppdatera hela tiden.
          connections.push({
            resourceName: connection.resourceName,
            memberNumber: memberNumbersShouldBeInContactGroup[n]
          });
        }
      }
    }
    modifyContactGroupMembers_(kontaktGruppResourceName, resourceNamesToAdd, resourceNamesToRemove);

    console.timeEnd(kontaktGruppNamn);
  }

  console.info("----------------------------------");
  console.log("Följande resursnamn är redan processade och behöver ej uppdateras senare");
  console.log(resourceNamesAlreadyProcessed);
  updateContacts_(nyaKontakter, connections, contactResourceKeys, resourceNamesAlreadyProcessed);

  return contactsRemovedFromContactGroups; 
}


/**
 * Ger medlemsnummer för de medlemmar som ska vara med i en kontaktgrupp
 * 
 * @param {Object[]} nyaKontakter - Lista med info och e-postadresser för kommande kontaktgrupper
 * @param {string} namn - Namn för den kontaktgrupp att söka efter
 * @param {string} prefixContactgroups - Prefix för kontaktgrupper som synkroniseras
 * 
 * @returns {string[]} - Lista med medlemsnummer för aktuell kommande kontaktgrupp
 */
function getMemberNumbersShouldBeInContactGroup_(nyaKontakter, namn, prefixContactgroups) {

  //Hämta lista vilka som ska vara med i kontaktgruppen
  const kontaktGruppInfo = getNewContactGroupInfo_(nyaKontakter, namn, prefixContactgroups);
  console.log("Hämta lista över vilka som ska vara med i kontaktgruppen");
  console.log(kontaktGruppInfo);

  const kontaktGruppMemberNumbersList = getContactGroupMemberNumbers_(kontaktGruppInfo);
  //console.log("kontaktGruppMemberNumbersList");
  //console.log(kontaktGruppMemberNumbersList);

  return kontaktGruppMemberNumbersList;
}


/**
 * Uppdatera vilka kontakter som ska tillhöra en kontaktgrupp
 * 
 * @param {string} contactGroupResourceName - Resursnamn för en kontaktgrupp
 * @param {string[]} resourceNamesToAdd - Lista av resursnamn för kontakter att lägga till i kontaktgruppen
 * @param {string[]} resourceNamesToRemove - Lista av resursnamn för kontakter att ta bort från kontaktgruppen
 * 
 * @returns {Object} - Lista av resursnamn för kontakter som inte gick att hitta eller ta bort
 */
function modifyContactGroupMembers_(contactGroupResourceName, resourceNamesToAdd, resourceNamesToRemove) {

  console.log("Följande ska läggas till i gruppen");
  console.log(resourceNamesToAdd);

  console.log("Följande ska tas bort från gruppen");
  console.log(resourceNamesToRemove);

  if (0 === resourceNamesToAdd.length && 0 === resourceNamesToRemove.length) {
    console.log("Inga kontakter ska läggas till eller tas bort från kontaktgruppen");
    return;
  }

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.log("Funktionen modifyContactGroupMembers körs " + n);
    }
    try {
      const contactGroupModifyResource = People.ContactGroups.Members.modify({
        "resourceNamesToAdd": resourceNamesToAdd,
        "resourceNamesToRemove": resourceNamesToRemove
      }, contactGroupResourceName);

      if (!contactGroupModifyResource) {
        console.warn(contactGroupModifyResource);
      }
      return contactGroupModifyResource;
    }
    catch (e) {
      console.error("Problem med att anropa Members.modify i People.ContactGroups");
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Ger tillbaka en kontakt för ett angivet medlemsnummer
 * 
 * @param {Object[]} nyaKontakter - Lista av listor med information över de kontaktgrupper som ska finnas
 * @param {string} memberNumber - Ett medlemsnummer
 * 
 * @returns {Object} - Objekt för en medlem
 */
function getMemberdataFromMemberNumber_(nyaKontakter, memberNumber) {

  const allMembers = nyaKontakter[0];

  if (!allMembers) {
    return null;
  }

  for (let i = 0; i < allMembers.length; i++) {

    if (allMembers[i].member_no === memberNumber) {

      //console.log("medlemsdata");
      //console.log(allMembers[i]);
      return allMembers[i];
    }
  }
}


/**
 * Ger tillbaka en kontakt för ett angivet medlemsnummer
 * 
 * @param {Object[]} connections - Lista med objekt för kontakter
 * @param {string} memberNumber - Ett medlemsnummer
 * 
 * @returns {Object} - Objekt för en kontakt
 */
function getConnectionByMemberNumber_(connections, memberNumber) {

  for (let i = 0; i < connections.length; i++) {
    if (connections[i].memberNumber === memberNumber)
      return connections[i];
  }
}


/**
 * Ger lista med alla användarens kontakter som ska synkas
 * De kontakter som uppfyller att de är användarens egna samt
 * att kontakterna har medlemsnummer ifyllt på korrekt sätt returneras
 * 
 * @param {string[]} contactResourceKeys - Attribut för en kontakt
 * 
 * @returns {Object[]} - Lista med objekt för kontakter
 */
function updateListOfConnections_(contactResourceKeys) {

  const contactResourceKeysString = contactResourceKeys.toString();

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.log("Funktionen updateListOfConnections körs " + n);
    }
    try {
      const listOfConnections = [];

      let pageToken, page;
      do {
        page = People.People.Connections.list('people/me', {
          pageToken: pageToken,
          pageSize: 25,
          personFields: contactResourceKeysString,
          sources: ["READ_SOURCE_TYPE_CONTACT"]
        });
        const connections = page.connections;
        if (connections) {
          for (let i = 0; i < connections.length; i++) {

            const externalIds = connections[i].externalIds;

            if (externalIds) {

              for (let k = 0; k < externalIds.length; k++) {
                const externalId = externalIds[k];
                
                if ("Medlemsnummer" === externalIds[k].type) {

                  if ("CONTACT" === externalId.metadata.source.type) {

                    const connection = {
                      resourceName: connections[i].resourceName,
                      etag: connections[i].etag,
                      memberNumber: externalId.value,
                      memberInfo: connections[i]
                    };
                    listOfConnections.push(connection);
                  }
                }
              }
            }
          }
        }
        else {
          console.warn('Inga kontakter hittades.');
        }
        pageToken = page.nextPageToken;
      } while (pageToken);

      //console.log("listOfConnections");
      //console.log(listOfConnections);
      return listOfConnections;

    } catch(e) {
      console.error("Problem med att anropa GoogleTjänst People.People.Connectionss i funktionen updateListOfConnections");
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  } 
}


/**
 * Ger medlemsnummer för de som ska vara med i en kontaktgrupp
 * 
 * @param {Object[]} kontaktGruppInfo - Lista med info och medlemsnummer för aktuell kommande kontaktgrupp
 * 
 * @returns {string[]} - Lista med medlemsnummer för aktuell kommande kontaktgrupp
 */
function getContactGroupMemberNumbers_(kontaktGruppInfo) {

  const memberNumbers = [];

  for (let i = 1; i < kontaktGruppInfo.length; i++) {
    memberNumbers.push(kontaktGruppInfo[i]);
  }
  return memberNumbers;
}


/**
 * Ger lista med medlemsnummer givet en lista med resursnamn och medlemsnummer
 * 
 * @param {Object[]} - Lista av Objekt med resursnamn och medlemsnummmer
 * 
 * @returns {string[]} - Lista med medlemsnummer för angivna kontakter
 */
function getMemberNumbersFromMembersInfo_(membersInfoList) {

  const memberNumbers = [];

  for (let i = 0; i < membersInfoList.length; i++) {
    memberNumbers.push(membersInfoList[i].memberNumber);
  }
  return memberNumbers;
}


/**
 * Ger lista med objekt med viss medlemsinfo för de som redan är med i en kontaktgrupp
 * 
 * @param {Object[]} - Lista av Objekt av typen PersonRespone för angivna kontakter
 * 
 * @returns {Object[]} - Lista med objekt för angivna kontakter
 */
function getMembersInfoFromPersonResponses_(personResponses) {

  const membersInfoList = [];

  for (let i = 0; i < personResponses.length; i++) {

    const externalIds = personResponses[i].person.externalIds;

    let foundMatch = false;

    if (externalIds !== undefined) {
      for (let k = 0; k < externalIds.length; k++) {
        if ("Medlemsnummer" === externalIds[k].type) {
          
          const memberInfo = {
            memberNumber: externalIds[k].value,
            resourceName	: personResponses[i].requestedResourceName
          };
          foundMatch = true;
          membersInfoList.push(memberInfo);
        }
      }
    }

    if (!foundMatch) {
      console.log("Denna kontakt är manuellt tillagd eller något");
      const memberInfo = {
        memberNumber: "",
        resourceName	: personResponses[i].requestedResourceName
      };
      membersInfoList.push(memberInfo);
    }
  }
  return membersInfoList;
}


/**
 * Ger lista av objekt av kontakter givet resursnamn för kontakterna
 * 
 * @param {string[]} memberResourceNames - Lista av resursnamn för kontakter
 * 
 * @returns {Object[]} - Lista av Objekt av typen PersonRespone för angivna kontakter
 */
function getContactsByMemberResourceNames_(resourceNames) {

  if (!resourceNames || 0 === resourceNames.length) {
    return [];
  }

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.log("Funktionen getContactsByMemberResourceNames körs " + n);
    }    
    try {
      const group = People.People.getBatchGet({
        resourceNames: resourceNames,
        personFields: "emailAddresses,externalIds,memberships"
      });
      return group.responses;
    }
    catch (e) {
      console.error("Problem med att anropa People.People");
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Kollar igenom alla kontakter som synkroniseras med Scoutnet vilka kontakter
 * som ska uppdateras och uppdaterar sen dem vid behov.
 * 
 * @param {Object[]} nyaKontakter - Lista av listor med information över de kontaktgrupper som ska finnas
 * @param {Object[]} connections - Lista med objekt för kontakter
 * @param {string[]} contactResourceKeys - Attribut för en kontakt
 * @param {string[]} resourceNamesAlreadyProcessed - Resursnamn för kontakter som ej behöver uppdateras
 */
function updateContacts_(nyaKontakter, connections, contactResourceKeys, resourceNamesAlreadyProcessed) {

  //Den hinner inte uppdatera alla nya kontakter, så de nya kommer sen kollas för uppdateringar också
  connections = updateListOfConnections_(contactResourceKeys);

  //console.log("Connections");
  //console.log(connections);

  //console.log("nyaKontakter");
  //console.log(nyaKontakter);

  //console.log("Alla nycklar som finns");
  //console.log(contactResourceKeys);

  const personFields = getSimplePersonFields_();
  
  let personFieldsToUpdate = [];
  const contactsToUpdate = {};
  let numbersOfContactsToUpdate = 0;

  for (let i = 0; i < connections.length; i++) {
    //console.log("--------------------------------------");
    const connection = connections[i].memberInfo;
    //console.log("Medlemsinfo som är inlagt nu på kontakten");
    //console.log(connection);

    //console.log("Resursnamn för kontakten");
    //console.log(connections[i].resourceName);

    //console.log("Etag för kontakten");
    //console.log(connections[i].etag);

    if (resourceNamesAlreadyProcessed.includes(connections[i].resourceName)) {
      console.log("Denna kontakt är redan processad och ska ej uppdateras");
      continue;
    }

    const memberData = getMemberdataFromMemberNumber_(nyaKontakter, connections[i].memberNumber);
    //console.log("memberData");
    //console.log(memberData);
    if (!memberData) {
      console.log("Denna kontakt ska ej vara kvar längre " + connections[i].memberNumber);
      continue;
    }
    const memberDataContactResource = makeContactResource_(memberData);
    //console.log("Medlemsinfo som ska vara inlagd på kontakten");
    //console.log(memberDataContactResource);

    let contactShouldBeUpdated = false;

    for (let k = 0; k < personFields.length; k++) {
      if (checkDifference_(connection, memberDataContactResource, personFields[k])) {
        console.log("Skillnad på " + personFields[k].svName);
        personFieldsToUpdate.push(personFields[k].apiName);
        contactShouldBeUpdated = true;
      }
    }

    //Födelsedag är lite special vid jämförelse mellan objekt
    if (checkDifferenceBirthdays_(connection, memberDataContactResource)) {
      console.log("Skillnad på födelsedag");
      personFieldsToUpdate.push("birthdays");
      contactShouldBeUpdated = true;
    }
    //Vi kollar ej upp medlemsnummer då det ju är det som säger att kontakten ska synkas

    //Denna kontakt ska uppdateras
    if (contactShouldBeUpdated) {
      numbersOfContactsToUpdate++;
      console.info("Antal kontakter att uppdatera " + numbersOfContactsToUpdate);
      if (numbersOfContactsToUpdate > 200) { //Max uppdatera 200 stycken i taget
        console.warn("För många kontakter att uppdatera på en gång. Tar resten vid nästa körning");
        continue;
      }

      //Lägger till attributet etag
      memberDataContactResource.etag = connections[i].etag;
      contactsToUpdate[connections[i].resourceName] = memberDataContactResource;
    }
  }

  personFieldsToUpdate = removeDublicates_(personFieldsToUpdate).toString();
  console.log("Kontaktfält som ska uppdateras för någon kontakt");
  console.log(personFieldsToUpdate);

  //console.log("contactsToUpdate");
  //console.log(contactsToUpdate);

  console.info("Antal kontakter att uppdatera " + numbersOfContactsToUpdate);
  if (0 !== numbersOfContactsToUpdate) {
    batchUpdateContacts_(contactsToUpdate, personFieldsToUpdate);
  }
}


/**
 * Uppdaterar flera kontakters specificerade kontaktfält samtidigt
 * 
 * @param {Objekt} contactsToUpdate - Objekt med vilka kontakter som ska uppdateras och med ny data
 * @param {string} personFieldsToUpdate - Vilka kontaktfält som ska uppdateras
 */
function batchUpdateContacts_(contactsToUpdate, personFieldsToUpdate) {

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.log("Funktionen batchUpdateContacts körs " + n);
    }    
    try {
      People.People.batchUpdateContacts({
        "contacts": contactsToUpdate,
        "updateMask": personFieldsToUpdate,
        "sources": ["READ_SOURCE_TYPE_CONTACT"]
      });
      console.log("Uppdaterat kontakterna " + Object.keys(contactsToUpdate));
      return;
    }
    catch (e) {
      console.error("Problem med att anropa People.People");
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Raderar flera kontakter samtidigt
 * 
 * @param {string[]} resourceNames - Lista över resursnamn för kontakter som ska tas bort
 */
function batchDeleteContacts_(resourceNames) {

  if (!resourceNames || 0 === resourceNames.length) {
    return;
  }

  //Max 500 stycken kan tas bort samtidigt. Resten får tas vid nästa körning
  if (500 < resourceNames.length) {
    resourceNames = resourceNames.slice(0, 500);
  }

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.log("Funktionen batchDeleteContacts körs " + n);
    }    
    try {
      People.People.batchDeleteContacts({
        "resourceNames": resourceNames
      });
      console.log("Raderat kontakterna " + resourceNames);
      return;
    }
    catch (e) {
      console.error("Problem med att anropa People.People");
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Ger lista med objekt med information om personkontaktfält
 * 
 * @returns {Object[]} - Lista med objekt med information om personkontaktfält
 */
function getSimplePersonFields_() {

  const personFields = [];
  
  const keys_addresses = ["type", "streetAddress", "extendedAddress", "city", "postalCode", "country"];
  personFields.push({"apiName": "addresses", "svName": "adresser", "keys": keys_addresses, "removeValueEmpty": false});

  const keys_biographies = ["value", "contentType"];
  personFields.push({"apiName": "biographies", "svName": "anteckningar", "keys": keys_biographies, "removeValueEmpty": true});

  const keys_names = ["givenName", "familyName"];
  personFields.push({"apiName": "names", "svName": "namn", "keys": keys_names, "removeValueEmpty": false});

  const keys_nicknames = ["value"];
  personFields.push({"apiName": "nicknames", "svName": "smeknamn", "keys": keys_nicknames, "removeValueEmpty": true});

  const keys_emailAddresses = ["value", "type"];
  personFields.push({"apiName": "emailAddresses", "svName": "e-postadresser", "keys": keys_emailAddresses, "removeValueEmpty": true});

  const keys_genders = ["value"];
  personFields.push({"apiName": "genders", "svName": "kön", "keys": keys_genders, "removeValueEmpty": true});

  const keys_organizations = ["type", "current", "name", "department", "title"];
  personFields.push({"apiName": "organizations", "svName": "organisation", "keys": keys_organizations, "removeValueEmpty": false});

  const keys_phoneNumbers = ["value", "type"];
  personFields.push({"apiName": "phoneNumbers", "svName": "telefonnummer", "keys": keys_phoneNumbers, "removeValueEmpty": true});

  const keys_relations = ["person", "type"];
  personFields.push({"apiName": "relations", "svName": "relationer", "keys": keys_relations, "removeValueEmpty": true});

  return personFields;
}


/**
 * Kollar om ett visst kontaktfält skiljer sig mellan nuvarande kontakt och ett kontaktobjekt
 * 
 * @param {Object} connection - Persondata för en kontakt som redan finns
 * @param {Object} memberDataContactResource - Ett objekt av typen Person med kontaktinfo för en person
 * @param {Object} personField - Objekt med information om ett specifikt kontaktfält
 * 
 * @returns {boolean} - Sant eller falskt om kontaktfältet skiljer sig åt
 */
function checkDifference_(connection, memberDataContactResource, personField) {

  const nameOfPersonField = personField.apiName;

  const connectionObject = connection[nameOfPersonField];
  const statusAndDataObject = checkDifferenceHelpfunction_(connectionObject, memberDataContactResource, nameOfPersonField, personField.removeValueEmpty);
  if ('status' in statusAndDataObject) {
    //console.log("status är definerad i objektet som " + statusAndDataObject.status);
    //En första koll om det är någon förändring true eller false. T.ex nytt attribut
    return statusAndDataObject.status;
  }

  const memberData = statusAndDataObject.memberData;
  
  const keys = personField.keys;
  const existingData = makeArrayOfFilteredConnectionObject_(connectionObject, keys); 

  return checkDifferenceMemberInfo_(existingData, memberData, nameOfPersonField);
}


/**
 * Kollar om kontaktfältet för födelsedag skiljer sig mellan nuvarande kontakt och ett kontaktobjekt
 * 
 * @param {Object} connection - Persondata för en kontakt som redan finns
 * @param {Object} memberDataContactResource - Ett objekt av typen Person med kontaktinfo för en person
 * 
 * @returns {boolean} - Sant eller falskt om födelsedagarna skiljer sig åt
 */
function checkDifferenceBirthdays_(connection, memberDataContactResource) {

  const nameOfPersonField = "birthdays";
  
  const connectionObject = connection[nameOfPersonField];
  const statusAndDataObject = checkDifferenceHelpfunction_(connectionObject, memberDataContactResource, nameOfPersonField, false);

  if ('status' in statusAndDataObject) {
    //console.log("status är definerad i objektet som " + statusAndDataObject.status);
    //En första koll om det är någon förändring true eller false. T.ex nytt attribut
    return statusAndDataObject.status;
  }

  const memberData = statusAndDataObject.memberData;

  const existingData = [];
  
  for (let i = 0; i < connectionObject.length; i++) {
    const birthdayObject = {
      "year": connectionObject[i].date.year,
      "month": connectionObject[i].date.month,
      "day": connectionObject[i].date.day
    };
    existingData.push(birthdayObject);
  }

  const memberDataObject = [];
  for (let i = 0; i < memberData.length; i++) {
    const birthdayObject = {
      "year": memberData[i].date.year,
      "month": memberData[i].date.month,
      "day": memberData[i].date.day
    };
    memberDataObject.push(birthdayObject);
  }
  
  return checkDifferenceMemberInfo_(existingData, memberDataObject, nameOfPersonField);
}


/**
 * Skapar lista av objekt för en typ av kontaktfält för en kontakt
 *
 * @param {Object[]} connectionObject - Data för ett kontaktfält för en kontakt som redan finns
 * @param {string[]} keys - Namn på attribut för ett visst kontaktfält
 * 
 * @returns {Object[]} - Lista av objekt för en typ av kontaktfält för en kontakt
 */
function makeArrayOfFilteredConnectionObject_(connectionObject, keys) {
  
  const existingDataList = [];
  //console.log("MakeArray Nycklar " + keys);
  for (let i = 0; i < connectionObject.length; i++) {
    const existingDataObject = {};

    for (let k = 0; k < keys.length; k++) {
      existingDataObject[keys[k]] = connectionObject[i][keys[k]];
    }
    existingDataList.push(existingDataObject);
  }
  return existingDataList;
}


/**
 * Om det inte finns något inlagt på kontakten i Google sedan innan ger funktionen
 * ett objekt med status falskt om det inte heller finns någon ny data och om det nu
 * finns ett till kontaktfält ges ett objekt med status sant.
 * Om redan finns data inlagt på kontakten ges objekt med memberData med aktuell information
 * 
 * @param {Object[]} connectionObject - Data för ett kontaktfält för en kontakt som redan finns
 * @param {Object} memberDataContactResource - Ett objekt av typen Person med kontaktinfo för en person
 * @param {string} nameOfPersonField - Namn på ett kontaktfält
 * @param {boolean} removeValueEmpty - Om fältet ska tas bort om det är tomt
 * 
 * @returns {Object} - Ett objekt med attributet memberData med kontaktinfo för det angivna kontaktfältet
 */
function checkDifferenceHelpfunction_(connectionObject, memberDataContactResource, nameOfPersonField, removeValueEmpty) {
  
  let memberData = memberDataContactResource[nameOfPersonField];
  if (removeValueEmpty) {
    memberData = removeElementsWithValueOrPersonEmpty_(memberData);
  }

  if (!connectionObject) { //Inget inlagt på kontakten i Google

    if ("birthdays" === nameOfPersonField)  {

      const memberDataBirthdaysList = [];
      for (let i = 0; i < memberData.length; i++) {
        if (memberData[i].date.year && memberData[i].date.month && memberData[i].date.day)  {
        
          const birthdayObject = {
            "year": memberData[i].date.year,
            "month": memberData[i].date.month,
            "day": memberData[i].date.day
          };
          memberDataBirthdaysList.push(birthdayObject);
        }
      }

      //console.log("memberDataBirthdaysList");
      //console.log(memberDataBirthdaysList);
      memberData = memberDataBirthdaysList;
    }

    if (typeof memberData === "undefined" || 0 === memberData.length) { //Tomt med data för kontaktfältet från Scoutnet
      //console.log("Ingen data nu heller för detta kontaktfält");
      return {"status": false};
    }
    console.log("Funktion för jämförelse av " + nameOfPersonField);
    console.log(connectionObject);
    console.log(memberData);
    console.log("Det finns nu ett till kontaktfält");
    return {"status": true};
  }
  return {
    "memberData": memberData
  };
}


/**
 * Tar bort objekt från en lista av objekt för de objekt som inte har
 * något attribut med värde för antingen attributen value eller person.
 * Detta görs för att ta bort tomma kontaktfält från svaret som ges vid
 * anrop mot Google för att kunna jämföra med ny data.
 * 
 * @param {Object[]} memberData - Lista av objekt för en kontaktfältstyp för en kontakt
 * 
 * @returns {Object[]} - Lista av objekt för ett kontaktfältstyp för en kontakt
 */
function removeElementsWithValueOrPersonEmpty_(memberData) {

  const newMemberData = [];
  for (let i = 0; i < memberData.length; i++) {
    if (memberData[i].value || memberData[i].person) {
      newMemberData.push(memberData[i]);
    }
  }
  return newMemberData;
}


/**
 * Jämför listor av objekt bestående av kontaktfältsattribut och deras värden och
 * kollar om de är olika.
 * 
 * @param {Object[]} existingData - Lista av objekt för en typ av kontaktfält för en kontakt
 * @param {Object[]} memberData - Lista av objekt med medlemsdata för en typ av kontaktfält för en medlem
 * @param {string} nameOfPersonField - Namn på ett specifikt kontaktfält
 * 
 * @returns {boolean} - Sant eller falskt om det är skillnad på nuvarande kontaktdata och den som ska vara
 */
function checkDifferenceMemberInfo_(existingData, memberData, nameOfPersonField) {

  //console.log(nameOfPersonField);

  //console.log("checkDifferenceMemberInfo");
  //console.log(existingData);
  //console.log(memberData);

  if (existingData.length !== memberData.length) {
    console.log("Olika många fält för detta kontaktattribut. Någon ändring har skett");
    return true;
  }

  for (let i = 0; i < existingData.length; i++) {
    const existingDataObject = existingData[i];
    const memberDataObject = memberData[i];

    //console.log("Datan som finns");
    //console.log(existingDataObject);

    //console.log("Datan som ska finnas");
    //console.log(memberDataObject);

    const keysOfExistingDataObject = Object.keys(existingDataObject);
    //console.log("Nycklar som ska kollas");
    //console.log(keysOfExistingDataObject);
    
    for (let n = 0; n < keysOfExistingDataObject.length; n++) {

      if (existingDataObject[keysOfExistingDataObject[n]] == memberDataObject[keysOfExistingDataObject[n]]) {
        //console.log("Samma data " + keysOfExistingDataObject[n] + " = " + existingDataObject[keysOfExistingDataObject[n]]);
      }
      else {
        console.log("******************************");
        console.log("Data är ej lika");
        console.log("Gammal data " + keysOfExistingDataObject[n] + " = " + existingDataObject[keysOfExistingDataObject[n]]);
        console.log("Ny data " + keysOfExistingDataObject[n] + " = " + memberDataObject[keysOfExistingDataObject[n]]);
        return true; 
      }
    }
  }
  //console.log("INGEN förändring alls för detta attrbut");
  return false;
}


/**
 * Ger ett objekt för en kontaktresurs givet medlemsdata
 * 
 * @param {Object} memberData - Persondata för en medlem
 * 
 * @returns {Object} - Ett objekt av typen Person med kontaktinfo för en person
 */
function makeContactResource_(memberData) {
  //memberData.first_name = "Test";
  
  //const avatar_updated = "avatar_updated";
  //const avatar_url = "avatar_url";

  const contactResource = {
    "addresses": [{
      "type": "Hem",
      "streetAddress": memberData.streetAddress,
      "extendedAddress": memberData.extendedAddress,
      "city": memberData.town,
      "postalCode": memberData.postcode,
      "country": memberData.country
    }],
    "biographies": [{
      "value": memberData.biographies,
      "contentType": "TEXT_PLAIN"
    }],
    "birthdays": [{
      "date": {
        "year": memberData.date_of_birth_year,
        "month": memberData.date_of_birth_month,
        "day": memberData.date_of_birth_day
      }    
    }],
    "names": [{
      "givenName" : memberData.first_name,
      "familyName": memberData.last_name
    }],
    "nicknames": [{
      "value": memberData.nickname
    }],
    "emailAddresses": [{
        "value": memberData.email,
        "type" : "Primär e-postadress"
      }, {
        "value": memberData.contact_alt_email,
        "type" : "Alternativ e-post"
    }],
    "externalIds": [{
      "value": memberData.member_no,
      "type": "Medlemsnummer"
    }],
    "genders": [{
      "value" : memberData.sex
    }],
    "organizations": [{
      "type": "Scoutkår",
      "current": true,
      "name": memberData.group,
      "department": memberData.department,
      "title": memberData.title
    }],
    "phoneNumbers": [{
      "value": memberData.contact_mobile_phone,
      "type": "Mobil"
    },{
      "value": memberData.contact_home_phone,
      "type": "Hem"
    },{
      "value": memberData.contact_mobile_mum,
      "type": "Anhörig 1 mobil"
    },{
      "value": memberData.contact_telephone_mum,
      "type": "Anhörig 1 hem"
    },{
      "value": memberData.contact_mobile_dad,
      "type": "Anhörig 2 mobil"
    },{
      "value": memberData.contact_telephone_dad,
      "type": "Anhörig 2 hem"
    }],
    "relations": [{
      "person": memberData.contact_email_mum,
      "type": "Anhörig 1",
    },{
      "person": memberData.contact_email_dad,
      "type": "Anhörig 2",
    }]
  };

  return contactResource;
}


/**
 * Skapar en kontakt givet medlemsdata
 * 
 * @param {Object} memberData - Persondata för en medlem
 * 
 * @returns {Object} - Ett objekt av typen Person med kontaktinfo för en person
 */
function createContact_(memberData) {

  const contactResource = makeContactResource_(memberData);
  //console.log("contactResource");
  //console.log(contactResource);

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.log("Funktionen createContact körs " + n);
    }
    try {
      const peopleResource = People.People.createContact(contactResource);
      console.log(peopleResource);
      return peopleResource;
    }
    catch (e) {
      console.error("Problem med att anropa People.People med:" + contactResource);
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Ger info om en specifik kontaktgrupp och dess kommande kontakter
 * 
 * @param {Object[]} nyaKontakter - Lista med info och e-postadresser för kommande kontaktgrupper
 * @param {string} namn - Namn för den kontaktgrupp att söka efter
 * @param {string} prefixContactgroups - Prefix för kontaktgrupper som synkroniseras
 * 
 * @returns {Object[]} - Lista med info och medlemsnummer för aktuell kommande kontaktgrupp
 */
function getNewContactGroupInfo_(nyaKontakter, namn, prefixContactgroups) {
  
    for (let i = 1; i < nyaKontakter.length; i++) {

    const nameOfActualContactGroup = prefixContactgroups + nyaKontakter[i][0].name;
    if (nameOfActualContactGroup === namn) {
      return nyaKontakter[i];
    }
  }
}


/**
 * Skapar nya kontaktgrupper och tar bort inaktuella kontaktgrupper
 * 
 * @param {Object[]} gamlaKontaktGrupper - Lista av Objekt med kontaktgruppsinformation
 * @param {Object[]} nyaKontaktGrupper - Lista av listor med information över de kontaktgrupper som ska finnas
 * @param {string} prefixContactgroups - Prefix för kontaktgrupper som synkroniseras
 * 
 * @returns {Object[]} - Lista av Objekt med kontaktgruppsinformation
 */
function createAndDeleteContactGroups_(gamlaKontaktGrupper, nyaKontaktGrupper, prefixContactgroups) {

  console.info("Skapar nya kontaktgrupper och tar bort gamla");

  const nameOfOldContactGroups = getNameOfContactGroups_(gamlaKontaktGrupper);

  const nameOfToBeContactGroups = [];
  //console.log(nyaKontaktGrupper);

  for (let i = 1; i < nyaKontaktGrupper.length; i++) {
    nameOfToBeContactGroups.push(prefixContactgroups + nyaKontaktGrupper[i][0].name);
  }
  console.log("Namn på de kontaktgrupper som redan finns");
  console.log(nameOfOldContactGroups);

  console.log("Namn på kontaktgrupper som ska finnas");
  console.log(nameOfToBeContactGroups);

  //Ta bort de kontaktgrupper som ej ska finnas
  for (let i = 0; i < nameOfOldContactGroups.length; i++) {
    if (!nameOfToBeContactGroups.includes(nameOfOldContactGroups[i])) {
      console.log("Ta bort denna grupp " + gamlaKontaktGrupper[i].name);
      deleteContactGroup_(gamlaKontaktGrupper[i]);
    }
  }

  //Skapa nya kontaktgrupper som ska finnas
  for (let i = 0; i < nameOfToBeContactGroups.length; i++) {
    if (!nameOfOldContactGroups.includes(nameOfToBeContactGroups[i])) {
      const group = createContactGroup_(nameOfToBeContactGroups[i]);
    }
  }
  return getContactGroups_(prefixContactgroups);
}


/**
 * Ger lista med namn över de kontaktgrupper som anges
 * 
 * @param {Object[]} gamlaKontaktGrupper - Lista av Objekt med kontaktgruppsinformation
 * 
 * @returns {string[]} nameOfContactGroups - Lista med namnen på angivna kontaktgrupper
 */
function getNameOfContactGroups_(kontaktgrupper) {

  console.log("Skapar lista med namn över kontaktgrupper");
  const nameOfContactGroups = [];

  for (let i = 0; i < kontaktgrupper.length; i++) {
    nameOfContactGroups.push(kontaktgrupper[i].name);
    //console.log(nameOfContactGroups[i]);
  }
  return nameOfContactGroups;
}


/**
 * Ta bort en kontaktgrupp
 * 
 * @param {Objekt} contactGroup - Objekt med kontaktgruppsinformation
 */
function deleteContactGroup_(contactGroup) {

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.log("Funktionen deleteContactGroup körs " + n);
    }    
    try {
      People.ContactGroups.remove(contactGroup.resourceName);
      console.log("Tagit bort bort kontaktgruppen " + contactGroup.name);
      return;
    }
    catch (e) {
      console.error("Problem med att anropa People.ContactGroups med:" + contactGroup.name);
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Skapa en kontaktgrupp
 * 
 * @param {string} namn - Namn för en kontaktgrupp att skapa
 * 
 * @returns {Object} - Objekt av typen ContactGroup för skapad kontaktgrupp
 */
function createContactGroup_(namn) {

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.log("Funktionen createContactGroup körs " + n);
    }    
    try {
      const contactGroupResource = {
        "contactGroup": {
          "name": namn
        }
      };

      const group = People.ContactGroups.create(contactGroupResource);
      console.log("Skapat kontaktgruppen " + namn);
      return group;
    }
    catch (e) {
      console.error("Problem med att anropa People.ContactGroups med:" + namn);
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Hämta en kontaktgrupp
 * 
 * @param {Object} contactGroup - Objekt med kontaktgruppsinformation
 * 
 * @returns {Object} - Objekt med mer detaljerad kontaktgruppsinformation
 */
function getContactGroup_(contactGroup) {

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
      console.log("Funktionen getContactGroup körs " + n);
    }    
    try {
      const group = People.ContactGroups.get(contactGroup.resourceName,
        {maxMembers: 999}
      );
      
      //console.log("Hämtat kontaktgruppen " + contactGroup.name);
      return group;
    }
    catch (e) {
      console.error("Problem med att anropa People.ContactGroups med:" + contactGroup.name);
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Ger lista över de kontaktgrupper som redan finns och som ska uppdateras
 * 
 * @param {string} prefixContactgroups - Prefix för kontaktgrupper som synkroniseras
 * 
 * @returns {Object[]} - Lista av Objekt med kontaktgruppsinformation
 */
function getContactGroups_(prefixContactgroups) {

  for (let n = 0; n < 6; n++) {
    if (0 !== n) {
     console.log("Funktionen getContactGroups körs " + n);
    }
    try {
      const listOfContactGroups = [];

      let pageToken, page;
      do {
        page = People.ContactGroups.list({
          pageToken: pageToken,
          pageSize: 25
        });
        const contactGroups = page.contactGroups;
        if (contactGroups) {
          for (let i = 0; i < contactGroups.length; i++) {
            
            const contactGroup = {
              resourceName: contactGroups[i].resourceName,
              groupType	: contactGroups[i].groupType,
              name: contactGroups[i].name,
              memberCount: contactGroups[i].memberCount
            };
            
            if ("USER_CONTACT_GROUP" === contactGroup.groupType) {
              if (contactGroup.name.startsWith(prefixContactgroups)) {
                //console.log(contactGroups[i]);
                //console.log(contactGroup);
                listOfContactGroups.push(contactGroup);
              }
            }
          }
        }
        else {
          console.log('Inga kontaktgrupper hittades.');
        }
        pageToken = page.nextPageToken;
      } while (pageToken);

      //console.log(listOfContactGroups);
      return listOfContactGroups;

    } catch(e) {
      console.error("Problem med att anropa GoogleTjänst People.ContactGroups i funktionen getContactGroups");
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Ta bort dubletter från en lista
 * 
 * @param {string[] | number[] | Object[]} - lista
 * 
 * @returns {string[] | number[] | Object[]} - lista
 */
function removeDublicates_(list) {
  const listWithoutDuplicates = []
  //console.log("Försöker radera dubletter");
  
  for (let i = 0; i < list.length; i++){
    if (!listWithoutDuplicates.includes(list[i])){
      listWithoutDuplicates.push(list[i])
      //console.log("Denna är ny " + list[i]);
    }
    else {
      //console.log("Hittade dublett av " + list[i]);
    }
  }
  return listWithoutDuplicates;
}
