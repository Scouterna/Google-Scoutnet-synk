/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Testfunktion för att synkronisera några rader med grupper
 */
function GrupperTestsynk() {
  Grupper(1, 10);
}


/**
 * Huvudfunktion för att hantera synkronisering av googlegrupper med Scoutnet
 * Anropas antingen med (startrad, slutrad)
 * (startrad, slutrad, etikett)
 * (etikett)
 */
function Grupper(...args) {
  
  let forceUpdate = false;

  console.time("Grupper");
  const sheetDataGrupper = getDataFromActiveSheet_("Grupper");
  const sheet = sheetDataGrupper["sheet"];
  const selection = sheetDataGrupper["selection"];
  const data = sheetDataGrupper["data"];
  
  const grd = grupperRubrikData_();
  const listOfEmailAdressesOfActiveAccounts = getEmailAdressesofAllActiveGoogleAccounts_();
  const delete_rows = [];  
  const arrayOfRows = getActualGroupRowsToSync_(args, data, grd);
  
  for (let i = 0; i < arrayOfRows.length; i++) {
    const rowIndex = arrayOfRows[i];
    
    const name = data[rowIndex][grd["namn"]];
    let email = data[rowIndex][grd["e-post"]];
    //const etikett = data[rowIndex][grd["etikett"]];
    const scoutnet_list_id = data[rowIndex][grd["scoutnet_list_id"]];
    //const synk_option = data[rowIndex][grd["synk_option"]];
    let groupId = data[rowIndex][grd["groupId"]];
    //const group_moderate_content_email = data[rowIndex][grd["group_moderate_content_email"]];
    
    const rad_nummer = rowIndex+1;
    Logger.log('Rad: ' + rad_nummer + ' Namn: ' + name + ' E-post: ' + email + ' Scoutnet: ' + scoutnet_list_id + ' Grupp-ID: ' + groupId);

    let update_group = true;
    
    if (!groupId) { //Vi borde nog skapa en grupp
      
      if (!name && !email) { //Ta bort raden
        Logger.log("Försöker ta bort rad " + rad_nummer);
        delete_rows.push(rad_nummer);
        update_group = false;
      }
      else if (!name && email) { //Vi gör ingenting
      }
      else if (name && !email) { //Vi gör ingenting
      }      
      else if (name && email) { //Ev skapa ny grupp        
        const groupInfo = mightNeedToCreateGroup_(selection, rad_nummer, email, name, grd);
        email = groupInfo.email;
        groupId = groupInfo.groupId;
      }
    }    
    
    else if (groupId) {  //Gruppen finns sedan innan
      const groupInfo = groupAlreadyExists_(selection, rad_nummer, groupId, email, data[rowIndex], name, grd, delete_rows, update_group);
      email = groupInfo.email;
      groupId = groupInfo.groupId;
      update_group = groupInfo.update_group;
    }

    if (update_group) { //Uppdatera medlemmar av en grupp
      updateGroup_(selection, rad_nummer, groupId, email, data[rowIndex], grd, listOfEmailAdressesOfActiveAccounts, forceUpdate);
    }
  }
  deleteRowsFromSpreadsheet_(sheet, delete_rows);
  console.timeEnd("Grupper");
}


/**
 * Returnerar lista med vilket index som olika rubriker har i kalkylarket
 *
 * @returns {number[]} - Lista med rubrikindex för respektive rubrik
 */
function grupperRubrikData_() {
  
  //Siffran är vilken kolumn i kalkylarket.
  const gruppRubrikData = {};
  gruppRubrikData["namn"] = 0;
  gruppRubrikData["e-post"] = 1;
  gruppRubrikData["etikett"] = 2;
  
  gruppRubrikData["scoutnet_list_id"] = 3;
  gruppRubrikData["synk_option"] = 4;
  gruppRubrikData["scoutnet_list_id_send"] = 5;
  gruppRubrikData["synk_option_send"] = 6;
  gruppRubrikData["scoutnet_list_id_receive"] = 7;
  gruppRubrikData["synk_option_receive"] = 8;
  gruppRubrikData["customFooterText"] = 9;
  
  gruppRubrikData["groupId"] = 10;
  gruppRubrikData["cell_url"] = 11;
  
  gruppRubrikData["isArchived"] = 12;
  gruppRubrikData["group_moderate_content_email"] = 13;
  
  gruppRubrikData["felmeddelande"] = 14;
                  
  return gruppRubrikData;
}


/**
 * Funktion för logik för synkronisering av Grupper gruppen redan finns
 * 
 * @param {Objekt} selection - Hela området på kalkylarket som används
 * @param {number} rad_nummer - Radnummer för aktuell grupp i kalkylarket
 * @param {string} groupId - Googles id för en grupp
 * @param {string} email - Gruppens e-postadress
 * @param {string[]} radInfo - Lista med data för aktuell rad i kalkylarket
 * @param {string} name - Namn på e-postgruppen
 * @param {string[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * @param {number[]} delete_rows - Lista med villka rader som ska tas bort
 * @param {boolean} update_group - Sant eller falskt om gruppen ska uppdateras eller ej
 * 
 * @returns {Object} - Objekt med email och groupId
 */
function groupAlreadyExists_(selection, rad_nummer, groupId, email, radInfo, name, grd, delete_rows, update_group) {

  if (!name && !email) { //Ta bort gruppen
        
    Logger.log("Försöker ta bort " + groupId + " rad " + rad_nummer);
    deleteGroup_(groupId, true);
    Logger.log(groupId + " raderades");

    delete_rows.push(rad_nummer);
    update_group = false;
  }
  else if (!email) { //Om tom, hämta e-postadressen från systemet och sätt tillbaka den

    const group = getAdminDirectoryGroup_(groupId);
    email = group.email;
    let cell = selection.getCell(rad_nummer, grd["e-post"]+1);
    cell.setValue(email);
    cell.setBackground("white");
  }
  else if (email) { //Kontrollerar om vi behöver uppdatera
    
    /**************************** */
    const groupInfo = groupIdAndEmailExists_(selection, rad_nummer, groupId, email, radInfo, name, grd);
    email = groupInfo.email;
    groupId = groupInfo.groupId; 
    /*****************************/
  }

  const groupInfo = {};
  groupInfo.email = email;
  groupInfo.groupId = groupId;
  groupInfo.update_group = update_group;

  return groupInfo;
}


/**
 * Funktion för logik för synkronisering av Grupper om gruppId och e-postadress finns
 * 
 * @param {Objekt} selection - Hela området på kalkylarket som används
 * @param {number} rad_nummer - Radnummer för aktuell grupp i kalkylarket
 * @param {string} groupId - Googles id för en grupp
 * @param {string} email - Gruppens e-postadress
 * @param {string[]} radInfo - Lista med data för aktuell rad i kalkylarket
 * @param {string} name - Namn på e-postgruppen
 * @param {string[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * 
 * @returns {Object} - Objekt med email och groupId
 */
function groupIdAndEmailExists_(selection, rad_nummer, groupId, email, radInfo, name, grd)  {

  const customFooterText = radInfo[grd["customFooterText"]];
  const isArchived = radInfo[grd["isArchived"]];

  let group = getAdminDirectoryGroup_(groupId);
                
  if (email !== group.email) { //E-postadressen har ändrats
    
    Logger.log("E-postadress för gruppen har ändrats på raden " + rad_nummer);          
    
    if (!checkIfGroupExists_(email) && checkEmailFormat_(email)) {
      
      email = email.toLowerCase().replace(/\s+/g, ''); //Ta bort tomma mellanrum
      email = removeDiacritics_(email);            
      
      Logger.log("try remove " + groupId + " row " + rad_nummer);
      deleteGroup_(groupId, false);  //Vi gör på detta sätt då det varit stora problem
      //med att tjänsten ej svarat tidigare om vi gjort en patch/update
      Logger.log(groupId + " togs bort");
      
      group = createGroup_(email, name, true);
      Logger.log("Uppdaterat e-postadress för gruppen: " + email);            
      groupId = group.id;
      
      let cell = selection.getCell(rad_nummer, grd["e-post"]+1);
      cell.setValue(email);
      cell.setBackground("white");
      
      cell = selection.getCell(rad_nummer, grd["groupId"]+1);
      cell.setValue(groupId);
      
      setCellValueCellUrl_(selection, rad_nummer, grd["cell_url"], email);
    }
    else { //Om gruppens e-postadress redan finns
      
      const cell = selection.getCell(rad_nummer, grd["e-post"]+1);
      cell.setBackground("red");
    }
  }
  else if (name !== group.name) { //Om namnet, men inte e-postadressen för gruppen ändrats
    
    Logger.log("Gruppnamnet har ändrats på rad " + rad_nummer);
    patchAdminDirectoryGroup_(name, groupId);
  }
  else if (email === group.email) { //Om e-posten är oförändrad. Behöver ändra bakgrund om man
    //ändrat till en ogiltig e-postadress och sen ändrar tillbaka
    Logger.log("E-post ej ändrad för grupppen " + email);
    let cell = selection.getCell(rad_nummer, grd["e-post"]+1);
    setBackgroundColour_(cell, "white", false);

    cell = selection.getCell(rad_nummer, grd["cell_url"]+1).getValue();
    if (!cell) {
      Logger.log("Denna cell för länk är tom och ska upppdateras");
      setCellValueCellUrl_(selection, rad_nummer, grd["cell_url"], email);
    }
  }
  
  group = getAdminGroupSettings_(email);
  if (customFooterText !== group.customFooterText) {
    Logger.log("Sidfot ska ändras för gruppen");
  }
  
  if (checkIfIsArchivedShouldChange_(isArchived, group.isArchived)) {
    Logger.log("Arkivinställning ska ändras för gruppen");          
  }

  const groupInfo = {};
  groupInfo.email = email;
  groupInfo.groupId = groupId;

  return groupInfo;
}


/**
 * Skapar en googlegrupp vid behov alternativt hämtar och sätter gruppId i kalkylbladet
 * 
 * @param {Objekt} selection - Hela området på kalkylarket som används
 * @param {number} rad_nummer - Radnummer för aktuell grupp i kalkylarket
 * @param {string} email - Gruppens e-postadress
 * @param {string} name - Namn på e-postgruppen
 * @param {string[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * 
 * @returns {Object} - Objekt med email och groupId
 */
function mightNeedToCreateGroup_(selection, rad_nummer, email, name, grd) {

  let groupId;

  if (!checkIfGroupExists_(email) && checkEmailFormat_(email)) { //Skapa gruppen
          
    email = email.toLowerCase().replace(/\s+/g, ''); //Ta bort tomma mellanrum
    email = removeDiacritics_(email);
    
    const group = createGroup_(email, name, true);
    groupId = group.id;
    Logger.log("Skapade gruppen: " + email);
    
    let cell = selection.getCell(rad_nummer, grd["e-post"]+1);
    cell.setValue(email);
    cell.setBackground("white");
    
    cell = selection.getCell(rad_nummer, grd["groupId"]+1);
    cell.setValue(groupId);
    
    setCellValueCellUrl_(selection, rad_nummer, grd["cell_url"], email);
    
  }
  else { //Om gruppens e-postadress redan finns
    const group = getAdminDirectoryGroup_(email);
    groupId = group.id;
    let cell = selection.getCell(rad_nummer, grd["groupId"]+1);
    cell.setValue(groupId);
  }

  const groupInfo = {};
  groupInfo.email = email;
  groupInfo.groupId = groupId;

  return groupInfo;
}


/**
 * Ger en lista med alla rader för grupper som ska synkroniseras
 * 
 * @param {string[]} args - Variabler som skickas med funktionanrop för gruppsynkronisering
 * @param {Object[][]} data - Lista av listor med datan som finns i kalkylbladet
 * @param {string[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * 
 * @returns {number[]} - Lista med rader för grupper som ska synkroniseras
 */
function getActualGroupRowsToSync_(args, data, grd) {

  const startEndInput = getStartEndRowsToSyncAccordingToInput_(args);
  const rowsToSync = findWhatRowsToSync_(startEndInput.start, startEndInput.slut, data.length);
  const start = rowsToSync.start;
  const slut = rowsToSync.slut;  
  
  Logger.log(start + " " + slut);
  updateListOfGroups_();

  let arrayOfRows;
  if (0 === args.length || 2 === args.length) {
    arrayOfRows = getArrayOfRows_(start, slut);
  }
  else  {
    arrayOfRows = getArrayOfRowsWithTag_(data, grd, start, slut, args[args.length-1]);
  }

  rowNumbersToSync = [];
  for (let i = 0; i < arrayOfRows.length; i++) {
    rowNumbersToSync.push(arrayOfRows[i]+1);
  }
  Logger.log("Rader att synkronisera");
  Logger.log(rowNumbersToSync);

  return arrayOfRows;
}


/**
 * Ger ett objekt med antingen begärd start- och slutrad att synkronisera
 * alternativt alla rader om endast etikett att synkronisera är angivet
 * 
 * @param {string[]} args - Variabler som skickas med funktionanrop för gruppsynkronisering
 * 
 * @returns {Object} - Objekt med inmatad start- och slutrad
 */
function getStartEndRowsToSyncAccordingToInput_(args)  {

  const startEndInput = {};

  if (1 === args.length) {
    startEndInput.start = 0;
    startEndInput.slut = 999;
  }
  else  {
    startEndInput.start = args[0];
    startEndInput.slut = args[1];
  }
  return startEndInput;
}


/**
 * Ger en lista av alla rader som ska synkroniseras givet rader att kolla och en etikett
 * 
 * @param {Object[][]} data - Lista av listor med datan som finns i kalkylbladet
 * @param {string[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * @param {number} start - Rad att börja synkronisera på
 * @param {number} slut - Rad att sluta synkronisera på
 * @param {string} etikett - Etikett att hålla utkik efter
 * 
 * @returns {number[]} - Lista av raderna som ska synkroniseras
 */
function getArrayOfRowsWithTag_(data, grd, start, slut, etikett) {

  const arrayOfRows = [];

  etikett = etikett.toLowerCase();

  for (let i = start-1; i < slut; i++)  {

    const etikettFromSpreadsheet = data[i][grd["etikett"]].toLowerCase();
    if (etikettFromSpreadsheet === etikett)  {
      arrayOfRows.push(i);
    }
  }
  return arrayOfRows;
}


/**
 * Ger en lista av alla rader som ska synkroniseras givet start- och slutrad
 * 
 * @param {number} start - Rad att börja synkronisera på
 * @param {number} slut - Rad att sluta synkronisera på
 * 
 * @returns {number[]} - Lista av radera som ska synkroniseras
 */
function getArrayOfRows_(start, slut)  {

  const arrayOfRows = [];

  for (let i = start-1; i < slut; i++)  {
    arrayOfRows.push(i);
  }
  return arrayOfRows;
}


/**
 * Konvertera inställning om att arkivera e-brev till boolean
 *
 * @param {string} input - Cellvärde från kalkylark
 *
 * @returns {string} - Om vi ska arkivera e-brev eller ej
 */
function convertInputForIsArchivedToBoolString_(input) {
  
  if (input) { //Cellvärde finns
    if ("false" === input || "nej" === input) {
      return "false";
    }
    else {
      return "true";
    }   
  }
  return "false";  
}


/**
 * Ta reda på om inställning för att arkivera e-post har ändrats
 *
 * @param {string} shouldBeArchived - Cellvärde från kalkylark
 * @param {string} groupIsArchived - String true eller false-värde om aktuell inställning
 *
 * @returns {boolean} - Om arkiveringsinställningen ska ändras eller ej
 */
function checkIfIsArchivedShouldChange_(shouldBeArchived, groupIsArchived) {
   
  shouldBeArchived = convertInputForIsArchivedToBoolString_(shouldBeArchived);
  
  if (shouldBeArchived === groupIsArchived) {
    return false;
  }
  return true;
}


/**
 * Skriver in länken till gruppen i kalkylarket
 *
 * @param {Object} selection - Ett googleojekt
 * @param {string} rad_nummer - Radnummer i kalkylarket för en specifik googlegrupp
 * @param {string} column - Kolumnnummer som detta hör till
 * @param {string} email - E-postadress för googlegruppen
 */
function setCellValueCellUrl_(selection, rad_nummer, column, email) {
  
  const cell = selection.getCell(rad_nummer, column+1);
  
  const arr = email.split("@");
  const list_name = arr[0];
  
  const cell_url = '=HYPERLINK("https://groups.google.com/a/' + domain + '/g/' + list_name + '/members";"Länk")';
  
  cell.setValue(cell_url);
}


/**
 * Skapar en grupp med angiven e-postadress och namn
 * med fördefinerade behörighetsinställningar
 *
 * @param {string} email - E-postadress för gruppen
 * @param {string} name - Namn på e-postgruppen
 * @param {boolean} shouldUpdateListOfGroups - Om listan över grupper ska uppdateras
 *
 * @returns {Object} - Objekt av den nya skapade Googlegrupppen
 */
function createGroup_(email, name, shouldUpdateListOfGroups) {

  const groupToCreate = {
    "email": email,
    "name": name,
    "description": "Scoutnet"
  };
  AdminDirectory.Groups.insert(groupToCreate);
            
  const group = getAdminDirectoryGroup_(email);

  if (shouldUpdateListOfGroups) {
    updateListOfGroups_();
  }  
  return group;
}


/**
 * Tar bort en grupp med angivet id
 *
 * @param {string} groupId - Googles id för en grupp
 * @param {boolean} shouldUpdateListOfGroups - Om listan över grupper ska uppdateras
 */
function deleteGroup_(groupId, shouldUpdateListOfGroups) {
  Logger.log("Försöker radera grupp " + groupId);
  AdminDirectory.Groups.remove(groupId);

  if (shouldUpdateListOfGroups) {
    updateListOfGroups_();
  }
}


/**
 * Returnera fullständig information om en medlem i en grupp
 *
 * @param {string} groupId - Googles id för en grupp
 * @param {string} memberKey - Unik identifierare för en medlem i en grupp
 *
 * @returns {Object[]} member - Ett medlemsobjekt
 */
function getGroupMember_(groupId, memberkey) {
  
  //Logger.log("Försöker hämta grupp:" + groupId);
  //Logger.log("Försöker med memberKey:" + memberkey);
  
  for (let n = 0; n < 6; n++) {
    Logger.log("Funktionen getGroupMember körs " + n);
    
    try {
      const groupMember = AdminDirectory.Members.get(groupId, memberkey);
      //Logger.log(groupMember);
      return groupMember;
    }
    catch (e) {
      Logger.log("Problem med att anropa Members.get i getGroupMember med:" + memberkey);
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Uppdatera medlemmar för en grupp
 *
 * @param {Objekt} selection - Hela området på kalkylarket som används
 * @param {number} rad_nummer - Radnummer för aktuell grupp i kalkylarket
 * @param {string} groupId - Googles id för en grupp
 * @param {string} email - Gruppens e-postadress
 * @param {string[]} radInfo - Lista med data för aktuell rad i kalkylarket
 * @param {string[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * @param {string[]} listOfEmailAdressesOfActiveAccounts - Lista över e-postadresser för aktiva Googlekonton
 * @param {boolean} forceUpdate - Tvinga uppdatering av data eller ej från Scoutnet
 */
function updateGroup_(selection, rad_nummer, groupId, email, radInfo, grd, listOfEmailAdressesOfActiveAccounts, forceUpdate) {

  /*****Skicka och ta emot*/
  let allMembers_both_email = getEmailsForAGroupByNameOfColumnAndSyncOption_(selection, rad_nummer, radInfo, grd["scoutnet_list_id"], grd["synk_option"], listOfEmailAdressesOfActiveAccounts, forceUpdate, "Båda");
  /***********************/
  /*****Bara skicka*******/
  let allMembers_send_email = getEmailsForAGroupByNameOfColumnAndSyncOption_(selection, rad_nummer, radInfo, grd["scoutnet_list_id_send"], grd["synk_option_send"], listOfEmailAdressesOfActiveAccounts, forceUpdate, "Bara skicka");
  /***********************/
  /*****Bara ta emot******/
  let allMembers_receive_email = getEmailsForAGroupByNameOfColumnAndSyncOption_(selection, rad_nummer, radInfo, grd["scoutnet_list_id_receive"], grd["synk_option_receive"], listOfEmailAdressesOfActiveAccounts, forceUpdate, "Bara ta emot");
  /***********************/
  
  /*****Till vilka som ska bli informerade om misstänkt spam*****/
  const group_moderate_content_email = radInfo[grd["group_moderate_content_email"]]; //Själva datan
  const cell_group_moderate_content_email = selection.getCell(rad_nummer, grd["group_moderate_content_email"]+1); //Range
  const emailAdressesToSendSpamNotification = getEmailadressesToSendSpamNotification_(group_moderate_content_email, cell_group_moderate_content_email, forceUpdate);
  /**************************************************************/

  /*****Kolla vilka som ska få skicka till listan*****/
  let postPermission = 'ANYONE_CAN_POST';
  
  if (0 !== allMembers_send_email.length) { //Vi vill att bara några ska kunna skicka till listan
    postPermission = 'ALL_MANAGERS_CAN_POST';
    Logger.log("Bara på listan kan skicka till listan");    
  }
  Logger.log("postPermission = " + postPermission);
  /***********************/

  /*****Vi ska flytta runt e-postadresserna mellan listorna om de finns i flera*****/
  const different_email_lists = moveEmailToCorrectList_(allMembers_both_email, allMembers_send_email, allMembers_receive_email, emailAdressesToSendSpamNotification);
  /***********************/

  // allMembers_email ==  alla distinkta e-postadresser som finns från alla tre+två(admin) grupper
  let allMembers_email = addMultipleListsInObjectToAList_(different_email_lists);

  addDeleteAndUpdateGroupmembersToGroup_(groupId, allMembers_email, different_email_lists);

  let customFooterText = radInfo[grd["customFooterText"]];
  const isArchivedText = radInfo[grd["isArchived"]];
  changeGroupPermissions_(email, postPermission, customFooterText, isArchivedText);  
  
  Logger.log("Slut på funktionen UpdateGroup");
}


/**
 * Ger delmängd av e-postadresser för som ska vara med i en grupp
 * enligt namn på kolumn i kalkylblad och synkinställning
 *
 * @param {Objekt} selection - Hela området på kalkylarket som används
 * @param {number} rad_nummer - Radnummer för aktuell grupp i kalkylarket
 * @param {string[]} radInfo - Lista med data för aktuell rad i kalkylarket
 * @param {number} kolumnIndex_list_id - Kolumnindex för var listId står
 * @param {number} kolumnIndex_synk_option - Kolumnindex för var synkinställning står
 * @param {string[]} listOfEmailAdressesOfActiveAccounts - Lista över e-postadresser för aktiva Googlekonton
 * @param {boolean} forceUpdate - Tvinga uppdatering av data eller ej från Scoutnet
 * @param {string} text - Text som ska stå i loggen vid körning för att markera vad e-postadresserna avser
 */
function getEmailsForAGroupByNameOfColumnAndSyncOption_(selection, rad_nummer, radInfo, kolumnIndex_list_id, kolumnIndex_synk_option, listOfEmailAdressesOfActiveAccounts, forceUpdate, text) {

  const scoutnet_list_id = radInfo[kolumnIndex_list_id]; //Själva datan
  const cell_scoutnet_list_id = selection.getCell(rad_nummer, kolumnIndex_list_id+1); //Range
  const synk_option = radInfo[kolumnIndex_synk_option];
  
  Logger.log(".......... " + text + " ....................");  
  const allMembers = fetchScoutnetMembersMultipleMailinglists_(scoutnet_list_id, cell_scoutnet_list_id, listOfEmailAdressesOfActiveAccounts, forceUpdate);
  let allMembers_email = getMemberlistsMemberEmail_(allMembers, synk_option);
  Logger.log("...1Slut - " + text + " ....................");

  return allMembers_email;
}


/**
 * Ger en lista givet ett objekt och värden för samtliga attribut.
 *
 * @param {Object} different_email_lists - Olika listor med e-postadresser för olika behörighetsroller i gruppen
 * 
 * @returns {string[]} - Samtliga e-postadresser för de med olika behörighetsroller i gruppen
 */ 
function addMultipleListsInObjectToAList_(different_email_lists)  {

  let allMembers_email = [];

  const different_email_lists_values = Object.values(different_email_lists);

  for (let i = 0; i < different_email_lists_values.length; i++) {
    allMembers_email.push.apply(allMembers_email, different_email_lists_values[i]);
  }
  allMembers_email = removeDublicates_(allMembers_email);

  return allMembers_email;
}


/**
 * Uppdatera en grupp genom att lägga till, ta bort och uppdatera medlemmar i en grupp
 *
 * @param {string} groupId - Googles id för en grupp
 * @param {string[]} allMembers_email - Lista med e-postadresser för medlemmar i en grupp
 * @param {Object} different_email_lists - Olika listor med e-postadresser för olika behörighetsroller i gruppen
 */ 
function addDeleteAndUpdateGroupmembersToGroup_(groupId, allMembers_email, different_email_lists)  {
  
  const group_members = getGroupMembers_(groupId); //Alla gruppmedlemmar med deras roller
  const group_members_email = [];
  
  //Om finns i googlegrupp men inte i vår lista
  for (let i = 0; i < group_members.length; i++) {    
      
    if (!allMembers_email.includes(group_members[i].email)) {  
      Logger.log(group_members[i].email + " Borde tas bort från " + groupId  + "Google e-postlista");
      deleteGroupMember_(groupId, group_members[i].memberId, group_members[i].email);
    }
    group_members_email.push(group_members[i].email);
  }
  
  
  for (let i = 0; i < allMembers_email.length; i++) { //Vi gör detta som nummer två för att spara lite tid,
    //och för att Google i bland ändrar e-postadress för en användare.
    
    //Denna e-post finns ej med, så vi lägger till personen
    if (!group_members_email.includes(allMembers_email[i])) { //Lägg till person till e-postlista
      updateGroupEmailThatIsNewInGroup_(groupId, allMembers_email[i], different_email_lists);
    }
    
    //Denna e-post finns redan med i gruppen, men har kanske fel roll?
    else {
      updateGroupEmailThatAlreadyExists_(groupId, group_members, allMembers_email[i], different_email_lists);
    }
  }
}


/**
 * Uppdatera en grupp genom att lägga till en ny e-postadress i gruppen
 *
 * @param {string} groupId - Gruppens id hos grupp
 * @param {string} member_email - E-postadress för en specifik medlem i gruppen
 * @param {Object} different_email_lists - Olika listor med e-postadresser för olika behörighetsroller i gruppen
 */ 
function updateGroupEmailThatIsNewInGroup_(groupId, member_email, different_email_lists)  {

  const allMembers_both_email = different_email_lists.allMembers_both_email;
  const allMembers_send_email = different_email_lists.allMembers_send_email;
  const allMembers_receive_email = different_email_lists.allMembers_receive_email;

  const allMembers_both_email_admin = different_email_lists.allMembers_both_email_admin;
  const allMembers_send_email_admin = different_email_lists.allMembers_send_email_admin;

  if (allMembers_both_email.includes(member_email)) { //Lägg till så att både kan skicka och ta emot
    Logger.log(member_email + " Borde lägga till i Googles e-postlista. Skicka och ta emot");
    addGroupMember_(groupId, member_email, 'MANAGER', 'ALL_MAIL');
  }
  else if (allMembers_send_email.includes(member_email)) { //Lägg till så att bara kan skicka
    Logger.log(member_email + " Borde lägga till i Googles e-postlista. Bara skicka");
    addGroupMember_(groupId, member_email, 'MANAGER', 'NONE');
  }
  else if (allMembers_receive_email.includes(member_email)){ //Lägg till så att bara kan ta emot
    Logger.log(member_email + " Borde lägga till i Googles e-postlista. Bara ta emot");
    addGroupMember_(groupId, member_email, 'MEMBER', 'ALL_MAIL');
  }
  
  else if (allMembers_both_email_admin.includes(member_email)){ //Lägg till admin så att både kan skicka och ta emot
    Logger.log(member_email + " Borde lägga till i Googles e-postlista. Admin Skicka och ta emot");
    addGroupMember_(groupId, member_email, 'OWNER', 'ALL_MAIL');
  }
  else if (allMembers_send_email_admin.includes(member_email)){ //Lägg till admin så att bara kan skicka
    Logger.log(member_email + " Borde lägga till i Googles e-postlista. Admin Bara skicka");
    addGroupMember_(groupId, member_email, 'OWNER', 'DISABLED');
  }
}


/**
 * Uppdatera roll för en e-postadress i en grupp
 *
 * @param {string} groupId - Gruppens id hos grupp
 * @param {Object[]} group_members - Lista av medlemsobjekt med attributen email, role, memberId för medlemmar i en grupp
 * @param {string} member_email - E-postadress för en specifik medlem i gruppen
 * @param {Object} different_email_lists - Olika listor med e-postadresser för olika behörighetsroller i gruppen
 */ 
function updateGroupEmailThatAlreadyExists_(groupId, group_members, member_email, different_email_lists)  {

  const allMembers_both_email = different_email_lists.allMembers_both_email;
  const allMembers_send_email = different_email_lists.allMembers_send_email;
  const allMembers_receive_email = different_email_lists.allMembers_receive_email;

  const allMembers_both_email_admin = different_email_lists.allMembers_both_email_admin;
  const allMembers_send_email_admin = different_email_lists.allMembers_send_email_admin;

  //Both, Send, Receive
  const memberTypeOld = getMembertype_(groupId, group_members, member_email);
  const memberId = getMemberId_(group_members, member_email);
  
  Logger.log(member_email + " fanns redan på listan med rollen " + memberTypeOld);
  
  if (allMembers_both_email.includes(member_email)) { //Ska kunna skicka och ta emot        
    if (memberTypeOld !== "Both") { //Har någon annan roll sedan innan
      updateGroupMember_(groupId, memberId, member_email, 'MANAGER', 'ALL_MAIL');
      Logger.log(member_email + " fanns redan på listan med rollen " + memberTypeOld);
      Logger.log(member_email + " har nu rollen skicka och ta emot");
    }
  }
  else if (allMembers_send_email.includes(member_email)) { //Ska bara kunna skicka        
    if (memberTypeOld !== "Send") { //Har någon annan roll sedan innan
      updateGroupMember_(groupId, memberId, member_email, 'MANAGER', 'NONE');
      Logger.log(member_email + " fanns redan på listan med rollen " + memberTypeOld);
      Logger.log(member_email + " har nu rollen bara skicka");
    }
  }
  else if (allMembers_receive_email.includes(member_email)) { //Ska bara kunna ta emot        
    if (memberTypeOld !== "Receive") { //Har någon annan roll sedan innan
      updateGroupMember_(groupId, memberId, member_email, 'MEMBER', 'ALL_MAIL');
      Logger.log(member_email + " fanns redan på listan med rollen " + memberTypeOld);
      Logger.log(member_email + " har nu rollen bara ta emot");
    }
  }
  
  else if (allMembers_both_email_admin.includes(member_email)) { //Ska kunna skicka och ta emot ADMIN        
    if (memberTypeOld !== "OWNER_Both") { //Har någon annan roll sedan innan
      updateGroupMember_(groupId, memberId, member_email, 'OWNER', 'ALL_MAIL');
      Logger.log(member_email + " fanns redan på listan med rollen " + memberTypeOld);
      Logger.log(member_email + " har nu rollen bara ta emot ADMIN");
    }
  }
  else if (allMembers_send_email_admin.includes(member_email)) { //Ska bara kunna skicka ADMIN      
    if (memberTypeOld !== "OWNER_Send") { //Har någon annan roll sedan innan
      updateGroupMember_(groupId, memberId, member_email, 'OWNER', 'DISABLED');
      Logger.log(member_email + " fanns redan på listan med rollen " + memberTypeOld);
      Logger.log(member_email + " har nu rollen bara skicka ADMIN");
    }
  }
}


/**
 * Ger lista över alla aktiva Google-konton i denna domän
 * om det finns flera domänen tillåter vi bara huvuddomänen
 *
 * @returns {string[]} - E-postadresser för aktiva Googlekonton
 */
function getEmailAdressesofAllActiveGoogleAccounts_() {
  
  const emailAddresses = [];
  let users;
  let pageToken, page;
  const catchAllAddress = "*@" + domain;
  do {
    page = AdminDirectory.Users.list({
      domain: domain,
      orderBy: 'givenName',
      maxResults: 150,
      pageToken: pageToken
    });
    users = page.users;
    if (users) {
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        //Logger.log('%s (%s)', user.name.fullName, user.primaryEmail);
        
        if (!user.suspended) {          
          for (let k = 0; k < user.emails.length; k++) { //Varje användare kan ha alias också
            
            const email = user.emails[k].address;
            if (email.endsWith(domain)) { //Endast adresser för huvuddomänen
              if (email !== catchAllAddress) {
                emailAddresses.push(email);
                //Logger.log(email);
              }
            }
          }
        }
      }
    } else {
      Logger.log('Ingen användare hittades.');
      const empty = [];
      return empty;
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  
  return emailAddresses;  
}


/**
 * Uppdatera en persons status i en specifik grupp
 *
 * @param {string} groupId - Gruppens id hos grupp
 * @param {string} memberId - E-postadressens id hos Google
 * @param {string} email - E-postadress för en specifik medlem i gruppen
 * @param {string} role - Önskad ny roll i gruppen
 * @param {string} delivery_settings - Inställning för e-postleverans
 */ 
function updateGroupMember_(groupId, memberId, email, role, delivery_settings) {
   
  const settings = {
    delivery_settings: delivery_settings,
    role: role
  };
  try {
    AdminDirectory.Members.update(settings, groupId, memberId);
  }
  catch (e) {
    Logger.log("Kunde inte ändra en medlems rolltyp för e-postadress:" + email);
    deleteGroupMember_(groupId, memberId, email);    
  }
}


/**
 * Returnerar vilken typ av person detta är på listan
 *
 * @param {string} groupId - Id för denna grupp
 * @param {Object[]} group_members - Lista med medlemsobjekt
 * @param {string} email - E-postadress för en specifik medlem i gruppen
 *
 * @returns {string} - Textsträng som förklarar medlemstypen i gruppen
 */
function getMembertype_(groupId, group_members, email) {
  
  for (let i = 0; i < group_members.length; i++) {
   
		if (group_members[i].email === email)	{ 
      if ('MANAGER' === group_members[i].role) {
        const groupMember = getGroupMember_(groupId, group_members[i].memberId);
        const delivery_settings = groupMember.delivery_settings;
        if('ALL_MAIL' === delivery_settings) {
          return "Both";
        }
        else {
          return "Send";
        }            
      }
      else if ('OWNER' === group_members[i].role) {
        const groupMember = getGroupMember_(groupId, group_members[i].memberId);
        const delivery_settings = groupMember.delivery_settings;
        if('ALL_MAIL' === delivery_settings) {
          return "OWNER_Both";
        }
        else {
          return "OWNER_Send";
        }
      }
      else { 
        return "Receive"
      }
		}	
	}
  return "Kunde inte hitta rollen på denna medlem " + email;
}


/**
 * Returnerar gruppmedlemens id givet dess email
 *
 * @param {Object[]} group_members - Lista med medlemsobjekt
 * @param {string} email - E-postadress för en specifik medlem i gruppen
 *
 * @returns {string} - E-postadressens id hos Google alternativt
 * e-postadressen om inte något id kan hittas
 */
function getMemberId_(group_members, email) {
  
  for (let i = 0; i < group_members.length; i++) {   
		if (group_members[i].email === email)	{
      return group_members[i].memberId;
		}
	}
  return email;
}


/**
 * Flytta runt e-postadresser till korrekt lista om de finns i flera olika
 *
 * @param {string[]} allMembers_both_email - E-postlista för att skicka och ta emot e-brev
 * @param {string[]} allMembers_send_email - E-postlista för att bara kunna skicka e-brev
 * @param {string[]} allMembers_receive_email - E-postlista för att bara kunna ta emot e-brev
 * @param {string[]} emailAdressesToSendSpamNotification - E-postlista för vart e-brev gällande misstänkt skräppost ska skickas till
 *
 * @returns {Object} - Objekt med e-postadresser för olika listor
 */
function moveEmailToCorrectList_(allMembers_both_email, allMembers_send_email, allMembers_receive_email, emailAdressesToSendSpamNotification) {
  
  //Om e-post finns i "skicka" och "ta emot" ska de läggas till i "båda"
  for (let i = 0; i < allMembers_send_email.length; i++) {
    if (allMembers_receive_email.includes(allMembers_send_email[i])) {
        allMembers_both_email.push(allMembers_send_email[i]);
    }
  }
  
  //Om e-post finns i "skicka" och "båda" ska de tas bort ur "skicka"
  allMembers_send_email = getListsWithUniqueElements_(allMembers_both_email, allMembers_send_email);
  
  //Om e-post finns i "ta emot" och "båda" ska de tas bort ur "ta emot"
  allMembers_receive_email = getListsWithUniqueElements_(allMembers_both_email, allMembers_receive_email);
  
  /*****E-postadresser för skräppostnotifikation*****/
  const email_lists = moveEmailToCorrectListRegardingSpamNotification_(allMembers_both_email, allMembers_send_email, allMembers_receive_email, emailAdressesToSendSpamNotification);
  allMembers_both_email = email_lists[0]
  allMembers_send_email = email_lists[1];
  allMembers_receive_email = email_lists[2];
  
  let allMembers_both_email_admin = email_lists[3];
  let allMembers_send_email_admin = email_lists[4];  
  /*****************************/
  
  //Vi tar bort alla upprepade e-postadresser inom sina egna listor och skriver ut dem
  allMembers_both_email = printListAndRemoveDublicates_(allMembers_both_email, "Båda");
  allMembers_send_email = printListAndRemoveDublicates_(allMembers_send_email, "Bara skicka");
  allMembers_receive_email = printListAndRemoveDublicates_(allMembers_receive_email, "Bara ta emot");
  
  allMembers_both_email_admin = printListAndRemoveDublicates_(allMembers_both_email_admin, "Båda ADMIN");
  allMembers_send_email_admin = printListAndRemoveDublicates_(allMembers_send_email_admin, "Bara skicka ADMIN");
  

  const different_email_lists = {};
  different_email_lists.allMembers_both_email = allMembers_both_email;
  different_email_lists.allMembers_send_email = allMembers_send_email;
  different_email_lists.allMembers_receive_email = allMembers_receive_email;

  different_email_lists.allMembers_both_email_admin = allMembers_both_email_admin;
  different_email_lists.allMembers_send_email_admin = allMembers_send_email_admin;

  Logger.log(different_email_lists);
  return different_email_lists;
}


/**
 * Flytta runt e-postadresser till korrekt lista avseende skäppostnotifikation
 * 
 * @param {string[]} allMembers_both_email - E-postlista för att skicka och ta emot e-brev
 * @param {string[]} allMembers_send_email - E-postlista för att bara kunna skicka e-brev
 * @param {string[]} allMembers_receive_email - E-postlista för att bara kunna ta emot e-brev
 * @param {string[]} emailAdressesToSendSpamNotification - E-postlista för vart e-brev gällande misstänkt skräppost ska skickas till
 *
 * @returns {string[allMembers_both_email, allMembers_send_email, allMembers_receive_email, allMembers_both_email_admin, allMembers_send_email_admin]}
 */
function moveEmailToCorrectListRegardingSpamNotification_(allMembers_both_email, allMembers_send_email, allMembers_receive_email, emailAdressesToSendSpamNotification) {

  let allMembers_both_email_admin = [];
  let allMembers_send_email_admin = [];
  
  //Om e-post finns i "emailAdressesToSendSpamNotification" och i någon annan lista ska de läggas till i motsvarande adminlistan
  for (let i = 0; i < emailAdressesToSendSpamNotification.length; i++) {
    
    if (allMembers_both_email.includes(emailAdressesToSendSpamNotification[i])) {
      allMembers_both_email_admin.push(emailAdressesToSendSpamNotification[i]);
    }
    else if (allMembers_receive_email.includes(emailAdressesToSendSpamNotification[i])) {
      allMembers_both_email_admin.push(emailAdressesToSendSpamNotification[i]);
    }
    else {
      allMembers_send_email_admin.push(emailAdressesToSendSpamNotification[i]);
    }
  }
  
  //Om e-post finns i "skicka admin" och "båda admin" ska de tas bort ur "skicka admin"
  allMembers_send_email_admin = getListsWithUniqueElements_(allMembers_both_email_admin, allMembers_send_email_admin);
  
  //Om e-post finns i "båda" och "emailAdressesToSendSpamNotification" ska de tas bort ur "båda"
  allMembers_both_email = getListsWithUniqueElements_(emailAdressesToSendSpamNotification, allMembers_both_email);
  
  //Om e-post finns i "skicka" och "emailAdressesToSendSpamNotification" ska de tas bort ur "skicka"
  allMembers_send_email = getListsWithUniqueElements_(emailAdressesToSendSpamNotification, allMembers_send_email);
  
  //Om e-post finns i "ta emot" och "emailAdressesToSendSpamNotification" ska de tas bort ur "ta emot"
  allMembers_receive_email = getListsWithUniqueElements_(emailAdressesToSendSpamNotification, allMembers_receive_email);
  
  
  //Om e-post är en grupp och finns i "båda" ska den tas bort ur "båda" och läggas till i "ta emot"
  const emailsSortedAsGroupOrNot_both = getEmailsSortedAsGroupOrNot_(allMembers_both_email);
  const groupEmails_both = emailsSortedAsGroupOrNot_both[0];
  const notGroupEmails_both = emailsSortedAsGroupOrNot_both[1];
  allMembers_both_email = notGroupEmails_both;
  allMembers_receive_email.push.apply(allMembers_receive_email, groupEmails_both);
  
  //Om e-post är en grupp och finns i "skicka" ska den tas bort ur "skicka" och informera i loggen
  const emailsSortedAsGroupOrNot_send = getEmailsSortedAsGroupOrNot_(allMembers_send_email);
  const groupEmails_send = emailsSortedAsGroupOrNot_send[0];
  const notGroupEmails_send = emailsSortedAsGroupOrNot_send[1];
  allMembers_send_email = notGroupEmails_send;

  if (0 !== groupEmails_send.length) {
    Logger.log("Följande e-postadresser står i kolumnen skicka.");
    Logger.log("De är dock grupper och får ej stå med där och kommer tas bort");
    Logger.log(groupEmails_send);
  }

  return [allMembers_both_email, allMembers_send_email, allMembers_receive_email, allMembers_both_email_admin, allMembers_send_email_admin];
}


/**
 * Skriv ut en lista till loggen och ta bort dubletter ur listan
 *
 * @param {string[]} listInput - Lista
 * @param {string} text - Text som skrivs ut före och efter listans innehåll
 *
 * @returns {string[]} - Listan utan dubletter i sig
 */
function printListAndRemoveDublicates_(listInput, text) {

  const list = removeDublicates_(listInput);

  Logger.log(".......... " + text + " ....................");
  Logger.log(list);
  Logger.log("....Slut - " + text + " ....................");
  
  return list;
}


/**
 * Ta bort element ur secondList om de finns i mainList
 *
 * @param {string[]} mainList - Lista som vi lämnar orörd
 * @param {string[]} secondList - Lista som vi tar bort dubletter ur
 *
 * @returns {string[]} - Lista av secondList utan de element som fanns i mainList
 */
function getListsWithUniqueElements_(mainList, secondList) {
  
  const emailListWithUniqueElements = [];
  
  for (let i = 0; i < secondList.length; i++) {
    if (!mainList.includes(secondList[i])) {
      emailListWithUniqueElements.push(secondList[i]);
    }
  }
  return emailListWithUniqueElements;
}


/**
 * Ger lista över alla unika e-postadresser för denna typ
 *
 * @param {Object[]} members - Objekt av medlemmar
 * @param {string} synk_option - Synkroniseringsinställning
 *
 * @returns {string[]} - Lista över unika e-postadresser
 */
function getMemberlistsMemberEmail_(members, synk_option) {
  
  let members_email = [];
  
  for (let i = 0; i < members.length; i++) {
    members_email.push.apply(members_email, getEmailListSyncOption_(members[i], synk_option, true));
  }
  
  for (let i = 0; i < members_email.length; i++) {
    members_email[i] = getGmailAdressWithoutDots_(members_email[i]);
  }
  members_email = removeDublicates_(members_email);
  //Ifall samma e-postadress är hos flera medlemmar eller upprepas i olika kontaktfält.
  //Sparar in på dataförfrågningar till Google något
  return members_email;
}


/**
 * Lägg till en medlem till en specifik grupp
 *
 * @param {string} groupId - Gruppens id hos Google
 * @param {string} email - E-postadress att lägg till
 * @param {string} role - Roll att tilldela
 * @param {string} delivery_settings - Om person ska ta emot e-post eller ej
 */
function addGroupMember_(groupId, email, role, delivery_settings) {
  
  const member = {
    delivery_settings: delivery_settings,
    email: email,
    role: role
  };
  try {
    AdminDirectory.Members.insert(member, groupId);
  }
  catch (e) {    
    if (e.message.endsWith("Member already exists.")) {
      Logger.log("Kan inte lägga till e-postadress då den redan är tillagd denna omgång eller ett alias för den: " + email);
    }
    else {       
      Logger.log("Kan inte lägga till e-postadress:" + email + " pga " + e.message);
    }
  }
}


/**
 * Tar bort en medlem tillhörande en specifik grupp
 *
 * @param {string} groupId - Gruppens id hos Google
 * @param {string} memberId - E-postadressens id hos Google
 * @param {string} email - E-postadress att lägg till
 */
function deleteGroupMember_(groupId, memberId, email) {
  
  try {
    Logger.log("Försöker ta bort " + email);
    AdminDirectory.Members.remove(groupId, memberId);
  }
  catch (e) {      
    Logger.log("Kan inte ta bort e-postadress:" + email + " pga " + e.message);
  }
}


/**
 * Ändra behörigheter för en grupp efter att den är skapad
 *
 * @param {string} email - E-postadress för en grupp
 * @param {string} postPermission - Definierar vilka som ska få skicka till e-postlistan
 * @param {string} customFooterText - Text i sidfot om man så önskar för alla e-brev
 * @param {string} isArchivedText - Text som definerar om e-brev ska arkiveras
 */
function changeGroupPermissions_(email, postPermission, customFooterText, isArchivedText) {  
  
  customFooterText = customFooterText.trim();
  let includeCustomFooter = "false";
  
  const isArchived = convertInputForIsArchivedToBoolString_(isArchivedText);
  Logger.log("IsArchived " + isArchived);

  if ("WRONG_INPUT" === postPermission) {
    postPermission = "ANYONE_CAN_POST";
  }

  if (customFooterText) {
    includeCustomFooter = "true";
  }
  else {
    customFooterText = "";
  }

  Logger.log("postPermission " + postPermission);
  Logger.log("Include custom footer " + includeCustomFooter);

  const group = AdminGroupsSettings.newGroups();

  group.whoCanJoin = "INVITED_CAN_JOIN";
  group.whoCanViewMembership = "ALL_MANAGERS_CAN_VIEW";
  group.whoCanViewGroup = "ALL_MANAGERS_CAN_VIEW";
  group.allowExternalMembers = "true";
  group.whoCanPostMessage = postPermission;
  group.primaryLanguage = "sv";
  group.isArchived = isArchived;
  group.messageModerationLevel = "MODERATE_NONE";
  group.spamModerationLevel = "MODERATE";
  group.whoCanModerateMembers = "NONE";
  group.whoCanModerateContent = "OWNERS_ONLY";
  group.replyTo = "REPLY_TO_SENDER";
  group.includeCustomFooter = includeCustomFooter;
  group.customFooterText = customFooterText;
  //group.membersCanPostAsTheGroup = true;  //TODO
  group.includeInGlobalAddressList = "true";
  group.whoCanLeaveGroup = "NONE_CAN_LEAVE";
  group.whoCanContactOwner = "ALL_MANAGERS_CAN_CONTACT";
  group.whoCanDiscoverGroup = "ALL_MEMBERS_CAN_DISCOVER";
  
  patchAdminGroupSettings_(group, email);
}


/**
 * Skapa kolumnrubriker i kalkylarket och dölj kolumnen med Grupp-ID
 */
function skapaRubrikerGrupper() {
  
  const sheetDataGrupper = getDataFromActiveSheet_("Grupper");

  const sheet = sheetDataGrupper["sheet"];
  //const selection = sheetDataGrupper["selection"];
  //const data = sheetDataGrupper["data"];
  
  const grd = grupperRubrikData_();
  
  // Frys de två översta raderna på arket så att rubrikerna alltid syns
  sheet.setFrozenRows(2);
  
  /********Rad 1********************/
  const range1_rad1 = sheet.getRange(1, grd["scoutnet_list_id"]+1, 1, 2);
  const range2_rad1 = sheet.getRange(1, grd["scoutnet_list_id_send"]+1, 1, 2);
  const range3_rad1 = sheet.getRange(1, grd["scoutnet_list_id_receive"]+1, 1, 2);
  
  if (!(range1_rad1.isPartOfMerge() ||
        range2_rad1.isPartOfMerge() ||
        range3_rad1.isPartOfMerge())) { //Inga angivna celler på rad 1 är sammanfogade
    
    Logger.log("Inga av de angivna cellerna på rad 1 är sammanfogade");
    
    range1_rad1.merge();
    range2_rad1.merge();
    range3_rad1.merge();
    
    Logger.log("Vi har nu sammanfogat dem");    
  }
  else {
    Logger.log("Några celler är sedan tidigare sammanfogade på rad 1, så vi gör inget åt just det");
  }
  
  const values_rad1 = [
    ["Kan skicka och ta emot", "", "Kan skicka", "", "Kan ta emot", ""]
  ];

  // Sätter området för cellerna som vi ska ändra
  // De 6 kolumnerna för listId & synkinställning
  const range_rad1 = sheet.getRange(1, grd["scoutnet_list_id"]+1, 1, 6);
  range_rad1.setHorizontalAlignment("center");
  range_rad1.setFontWeight("bold");

  // Sätter våra rubriker på vårt område
  range_rad1.setValues(values_rad1);
  
  /********************************/
    
  /*******Rad 2********************/
  // Våra värden vi vill ha som rubriker för de olika kolumnerna på rad 2
  const values_rad2 = [
    ["Namn", "E-post", "Etikett för synkronisering", "Scoutnet-id", "Synkinställning", "Scoutnet-id", "Synkinställning", "Scoutnet-id", "Synkinställning", "Sidfot", "Grupp-ID hos Google (RÖR EJ)", "Länk", "Arkivera e-post", "E-post skräppostmoderator", "Felmeddelande"]
  ];
  
  // Sätter området för cellerna på rad 2 som vi ska ändra
  const range_rad2 = sheet.getRange(2, 1, 1, values_rad2[0].length);

  // Sätter våra rubriker på vårt område med kursiv text
  range_rad2.setValues(values_rad2);
  range_rad2.setFontStyle("italic");
  
  /*******************************/
  
  /*******Sätt kantlinjer*********/
  
  const kolumn1 = getA1RangeOfColumns_(sheet, grd["scoutnet_list_id"]+1, 2);
  //Kolumnen för scoutnet_list_id;
  kolumn1.setBorder(null, true, null, true, null, null);
  
  const kolumn2 = getA1RangeOfColumns_(sheet, grd["scoutnet_list_id_send"]+1, 2);
  kolumn2.setBorder(null, true, null, true, null, null);
  
  const kolumn3 = getA1RangeOfColumns_(sheet, grd["scoutnet_list_id_receive"]+1, 2);
  kolumn3.setBorder(null, true, null, true, null, null);  
  
  /*******************************/
  
  /*******Kolumn Grupp-ID*********/
  
  const column = getA1RangeOfColumns_(sheet, grd["groupId"]+1, 1); //Kolumnen för Grupp-ID  
  column.setBackground("orange");
  column.setFontColor("blue");
  
  //Vi tar bort alla skyddade områden
  const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);  
  for (let i = 0; i < protections.length; i++) {
    const protection = protections[i];
    if (protection.canEdit()) {
      protection.remove();
    }
  }
  //Vi skyddar kolumnen för Grupp-ID så man inte råkar ändra av misstag
  column.protect().setWarningOnly(true);
  
  //Dölj kolumnen med group-id
  sheet.hideColumn(column);
  
  /*******************************/  
}


/**
 * Ger e-postadresser till vart information beträffande misstänkt skräppost ska skickas
 *
 * @param {string} group_moderate_content_email - E-postadress för att skicka misstänkt
 * skräppost för gruppen
 * @param {Object} cell_group_moderate_content_email - Cell i kalkylbladet för e-postadress
 * för att skicka misstänkt skräppost för gruppen
 * @param {boolean} forceUpdate - Tvinga uppdatering av data eller ej från Scoutnet
 *
 * @returns {string[]} - Lista med e-postadresser
 */
function getEmailadressesToSendSpamNotification_(group_moderate_content_email, cell_group_moderate_content_email, forceUpdate) {
  
  let emailAdresses = [];
  let boolModerateGroupEmail = false;
  
  emailAdresses = fetchScoutnetMembersMultipleMailinglists_(group_moderate_content_email, cell_group_moderate_content_email, "", forceUpdate)
  if (0 !== emailAdresses.length) {
    Logger.log("E-post för skräppostmoderator är angiven");
    boolModerateGroupEmail = true;
  }
  else if (typeof moderateContentEmail !== 'undefined' && moderateContentEmail) {
    emailAdresses = fetchScoutnetMembersMultipleMailinglists_(moderateContentEmail, "", "", forceUpdate);
  }
  else { //Om man ej anger listId för en e-postlista ska användaren som kör detta program bli notifierad
    const activeUser = {
      manuell: Session.getActiveUser().getEmail()
    };
    emailAdresses.push(activeUser);
  }
  emailAdresses = getMemberlistsMemberEmail_(emailAdresses, "m-"); //Bara primäradress från Scoutnet
  
  const emailAdressesNotGroups = [];
  
  for (let i = 0; i < emailAdresses.length; i++) {
    if (checkIfEmailIsAGroup_(emailAdresses[i])) {
      cell_group_moderate_content_email.setBackground("red");
    }
    else {
      emailAdressesNotGroups.push(emailAdresses[i]);
    }
  }
  
  if (emailAdressesNotGroups.length === emailAdresses.length) {
    if (boolModerateGroupEmail) {
      //E-post för skräppostmoderator är angiven
      cell_group_moderate_content_email.setBackground("white");
    }
    else {
      //E-post för skräppostmoderator är ej angiven
      cell_group_moderate_content_email.setBackground("yellow");
    }
  }
  emailAdresses = emailAdressesNotGroups;
  
  Logger.log("EmailAdresses");
  Logger.log(emailAdresses);
  return emailAdresses;
}


/**
 * Returnera gruppinställningar via AdminGroupSettings
 *
 * @param {string} email - E-postadress för gruppen
 *
 * @returns {Object} - En Googlegrupp
 */
function getAdminGroupSettings_(email) {
  
  for (let n = 0; n < 6; n++) {
    Logger.log("Funktionen getAdminGroupSettings körs " + n);
    
    try {
      return AdminGroupsSettings.Groups.get(email);
    }
    catch (e) {
      Logger.log("Problem med att anropa AdminGroupsSettings.Groups.get i getAdminGroupSettings med:" + email);
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Patcha en grupp via AdminGroupsSettings
 *
 * @param {Object} group - Gruppinställningar
 * @param {string} email - E-postadress för gruppen
 */
function patchAdminGroupSettings_(group, email) {
  
  for (let n = 0; n < 6; n++) {
    Logger.log("Funktionen patchAdminGroupSettings körs " + n);
    
    try {
      AdminGroupsSettings.Groups.patch(group, email);
      return;
    }
    catch (e) {
      Logger.log("Problem med att anropa AdminGroupsSettings.Groups.patch i patchAdminGroupSettings med:" + email);
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Returna en grupp via AdminDirectory
 *
 * @param {string} groupKey - Unik nyckel för gruppen
 *
 * @returns {Object} - En Googlegrupp
 */
function getAdminDirectoryGroup_(groupKey) {
  Logger.log("GroupKey");
  Logger.log(groupKey);

  for (let n = 0; n < 6; n++) {
    Logger.log("Funktionen getAdminDirectoryGroup körs " + n);
    
    try {
      const group = AdminDirectory.Groups.get(groupKey);
      return group;
    }
    catch (e) {
      Logger.log("Problem med att anropa AdminDirectory.Groups.get i getAdminDirectoryGroup med:" + groupKey);
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Patcha en grupp via AdminDirectoryGroup
 *
 * @param {string} newName - Nytt namn för gruppen
 * @param {string} groupId - Id för gruppen
 */
function patchAdminDirectoryGroup_(newName, groupId) {
  
  const group = {
    name: newName
  };

  for (let n = 0; n < 6; n++) {
    Logger.log("Funktionen patchAdminDirectoryGroup körs " + n);
    
    try {
      AdminDirectory.Groups.patch(group, groupId);
      return;
    }
    catch (e) {
      Logger.log("Problem med att anropa AdminDirectory.Groups.patch i patchAdminDirectoryGroup med:" + groupId);
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Visar kolumner som styr avancerade inställningar för grupper
 */
function avanceradLayoutGrupper() {

  const sheetDataGrupper = getDataFromActiveSheet_("Grupper");
  const sheet = sheetDataGrupper["sheet"];  
  const grd = grupperRubrikData_();
  
  sheet.showColumns(grd["scoutnet_list_id_send"]+1, 5);  
  sheet.showColumns(grd["isArchived"]+1, 2);
}


/**
 * Döljer kolumner som styr avancerade inställningar för grupper
 */
function enkelLayoutGrupper() {
  
  const sheetDataGrupper = getDataFromActiveSheet_("Grupper");
  const sheet = sheetDataGrupper["sheet"];
  const grd = grupperRubrikData_();
  
  sheet.hideColumns(grd["scoutnet_list_id_send"]+1, 6);  
  sheet.hideColumns(grd["isArchived"]+1, 2);
}
 

/**
 * Returnerar en lista med e-postadresser som tillhör googlegrupper
 *
 * @param {string[]} emails - Lista med e-postadresser
 *
 * @returns {string[groupEmails, notGroupEmails]} - Lista med e-postadresser sorterade som grupp eller ej
 */       
function getEmailsSortedAsGroupOrNot_(emails) {
  
  const groupEmails = [];
  const notGroupEmails = [];
  
  for (let i = 0; i < emails.length; i++) {    
    if(checkIfEmailIsAGroup_(emails[i])) {
      groupEmails.push(emails[i]);
    }
    else {
      notGroupEmails.push(emails[i]);
    }
  }
  return [groupEmails, notGroupEmails];
}


/**
 * Testfunktion för att lista alla grupper
 */
function TestListAllGroups() {
  let pageToken, page;
  do {
    page = AdminDirectory.Groups.list({
      domain: domain,
      maxResults: 150,
      pageToken: pageToken
    });
    const groups = page.groups;
    if (groups) {
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        Logger.log('%s (%s), %s', group.name, group.email, group.id);
      }
    } else {
      Logger.log('Inga grupper hittades.');
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}


/**
 * Testfunktion för att läsa kalkylbladet
 */
function TestReadSpreadSheet() {
  
  const sheetDataGrupper = getDataFromActiveSheet_("Grupper");

  //const sheet = sheetDataGrupper["sheet"];
  //const selection = sheetDataGrupper["selection"];
  const data = sheetDataGrupper["data"];

  const grd = grupperRubrikData_();
  
  for (let i = 1; i < data.length; i++) {
    
    Logger.log('Namn: ' + data[i][grd["namn"]] + ' E-post: ' + data[i][grd["e-post"]] + ' list-id: ' + data[i][grd["scoutnet_list_id"]] + ' grupp id: ' + data[i][grd["groupId"]]);           
  }
  return data;
}
