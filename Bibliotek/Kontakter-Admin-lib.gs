/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Körs vid GET-anrop till webbappen
 * 
 * @param {Object} inputKonfig - Objekt med kårens konfiguration
 * @param {Object} e - Query-parametrar vid GET-anrop till webbappen
 *
 * @returns {Object} - Ett objekt av typen TextOutput
 */
function synkroniseraKontakter(inputKonfig, e) {

  console.time("Kontakter-Admin");

  konfig = inputKonfig;

  console.log(e);
  const params = e.parameters;

  if (Object.keys(params).length === 0) {
    console.warn("Inga parametrar angivna. MVH " + konfig.groupName);
    return ContentService.createTextOutput("Inga parametrar angivna. MVH " + konfig.groupName)
    .setMimeType(ContentService.MimeType.TEXT);
  }
  
  const userEmail = params.username[0];
  const userPassword = params.password[0];
  const userVersion = params.version[0];
  let forceUpdate = params.forceupdate[0];

  if ("true" === forceUpdate) {
    console.warn("Detta var en tvingad uppdatering");
    forceUpdate = true;
  }
  else {
    forceUpdate = false;
  }

  let contactGroupsList;

  if (!checkIfVersionOk_(userVersion)) {
    contactGroupsList = "Du använder en version av skriptet som inte stöds längre.";
  }
  else if (userEmail && checkCredentials_(userEmail, userPassword, userVersion, forceUpdate)) {
    //Hämta en lista över alla Google Grupper som denna person är med i
    const groups = getListOfGroupsForAUser_(userEmail);
    const listOfGroupEmails = getListOfGroupsEmails_(groups);

    contactGroupsList = getContactGroupsData_(listOfGroupEmails, forceUpdate);
  }
  else {
    contactGroupsList = "Du har angivet en felaktig kombination av e-postadress & lösenord eller försökt köra programmet för ofta. " +
                        "Om e-postadressen finns registrerad och var fel kommer det strax ett e-brev till " +
                        "dig med ditt lösenord.";
  }

  console.log("Skickar svar till användare");
  //console.log(contactGroupsList);
  console.timeEnd("Kontakter-Admin");

  const response = JSON.stringify(contactGroupsList);
  return ContentService.createTextOutput(response)
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * Uppdatera kalkylbladet med de användare som ska ha behörigheter
 * 
 * @param {Object} inputKonfig - Objekt med kårens konfiguration
 */
function updateContactGroupsAuthnSheetUsers(inputKonfig) {

  konfig = inputKonfig;

  const sheetDataKontakterAnvandare = getDataFromActiveSheet_("Kontakter-Användare");

  const sheet = sheetDataKontakterAnvandare["sheet"];
  const selection = sheetDataKontakterAnvandare["selection"];
  const data = sheetDataKontakterAnvandare["data"];

  const grd = getKontaktGruppAuthnRubrikData_();

  const delete_rows = [];

  const listOfEmailsAlreadyAccess = [];
  
  const rowsToSync = findWhatRowsToSync_(0, data.length, data.length);
  const start = rowsToSync.start;
  const slut = rowsToSync.slut;
  

  const listOfAllGoogleGroupsShouldHaveAccess = getListOfAllGoogleGroupsShouldHaveAccess_();
  const listOfEmailsShouldHaveAccess = getAllEmailsShouldHaveAccess_(listOfAllGoogleGroupsShouldHaveAccess);

  console.info("Rader med användare att kolla igenom - Startrad " + start + " slutrad " + slut);

  for (let i = start-1; i < slut; i++) {
    
    let email = data[i][grd["e-post"]];
    let password = data[i][grd["lösenord"]];
    const last_authn = data[i][grd["senast_använd"]];
    const num_of_forced_updates = data[i][grd["tvingade_uppdateringar"]];

    const rad_nummer = i+1;
    
    //console.log('Rad: ' + rad_nummer + ' E-post: ' + email + ' Lösenord: ' + password + ' Senast använd: ' + last_authn + ' Antal tvingade uppdateringar: ' + num_of_forced_updates);

    email = getGmailAdressWithoutDots_(email.toLowerCase());
    if (!listOfEmailsShouldHaveAccess.includes(email)) {
      console.info("Användare har ej behörighet längre till en kontaktgrupp " + email);
      console.log("Försöker ta bort aktuell rad " + rad_nummer);
      delete_rows.push(rad_nummer);
      continue;
    }
    else {
      //console.log("Användare finns redan i listan " + email);
      listOfEmailsAlreadyAccess.push(email);

      if (!password) {
        console.warn("Lösenord saknas för denna användare " + email);
        console.warn("Skapar lösenord för denna användare");

        const cell = selection.getCell(rad_nummer, grd["lösenord"]+1);
        let password = createRandomPasswordForContactGroupsUser_();
        cell.setValue(password);
      }
    }
  }
  deleteRowsFromSpreadsheet_(sheet, delete_rows);

  //Radera det som står i kolumnen för antal tvingade uppdateringar
  const range_tvingade_uppdateringar = sheet.getRange(start, grd["tvingade_uppdateringar"]+1, slut-start+1);
  range_tvingade_uppdateringar.clear();

  console.info("Lägga till eventuella nedanstående e-postadresser så att de får behörighet");
  for (let i = 0; i < listOfEmailsShouldHaveAccess.length; i++) {
    
    const email = listOfEmailsShouldHaveAccess[i];
    if (!listOfEmailsAlreadyAccess.includes(email)) {
      console.info(email);
      const password = createRandomPasswordForContactGroupsUser_();
      sheet.appendRow([email, password]);
    }
  }  
}


/**
 * En testfunktion för att själv kunna få fram oformaterad brödtext för e-brev
 * samt html-formaterad brödtext för e-brev.
 * 
 * @param {Object} inputKonfig - Objekt med kårens konfiguration
 * @param {string} subject - Ämnesrad på e-postutkast
 */
function testGetHtmlEmailBody(inputKonfig, subject) {

  konfig = inputKonfig;

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
 * Returnerar lista med vilket index som olika rubriker har i kalkylarket
 * för bladet Kontakter-Användare
 *
 * @returns {Object[]} - Objekt med rubrik som attribut och dess rubrikindex som värde
 */
function getKontaktGruppAuthnRubrikData_() {
  
  //Siffran är vilken kolumn i kalkylarket.
  const kontaktgruppAuthnRubrikData = {};
  kontaktgruppAuthnRubrikData["e-post"] = 0;
  kontaktgruppAuthnRubrikData["lösenord"] = 1;

  kontaktgruppAuthnRubrikData["senast_använd"] = 2;
  kontaktgruppAuthnRubrikData["version"] = 3;
  kontaktgruppAuthnRubrikData["tvingade_uppdateringar"] = 4;

  return kontaktgruppAuthnRubrikData;
}


/**
 * Returnerar lista med vilket index som olika rubriker har i kalkylarket
 * för bladet Kontakter
 *
 * @returns {Object[]} - Objekt med rubrik som attribut och dess rubrikindex som värde
 */
function getKontaktGruppKonfigRubrikData_() {
  
  //Siffran är vilken kolumn i kalkylarket.
  const kontaktgruppKonfigRubrikData = {};
  kontaktgruppKonfigRubrikData["namn"] = 0;
  kontaktgruppKonfigRubrikData["e-post"] = 1;

  kontaktgruppKonfigRubrikData["scoutnet_list_id"] = 2;

  return kontaktgruppKonfigRubrikData;
}


/**
 * Kontrollerar om användaren använder en ok version
 * 
 * @param {string} version_running - Användarens version av skript
 * 
 * @returns {boolean} - Gällande om versionen av användarens skript är ok eller ej
 */
function checkIfVersionOk_(version_running) {

  if (!version_running) {
    console.error("Ej angiven version");
    return false;
  }

  console.info("Version som används av användaren " + version_running);
  console.info("Äldsta tillåtna version " + konfig.version_oldest_ok);

  const version_running_split_list = version_running.split(".");

  const version_oldest_ok_split_list = konfig.version_oldest_ok.split(".");

  //Gå igenom varje nivå av underversion
  for (let i = 0; i < version_running_split_list.length; i++) {

    if (!version_oldest_ok_split_list[i]) {
      console.error("Denna nivå av underversion finns ej sedan tidigare");
      return false;
    }
    if (version_running_split_list[i].length > version_oldest_ok_split_list[i].length) {
      console.log("Fler siffror i aktuell underversion än i äldsta tillåtna");
      return true;
    }
    if (version_running_split_list[i] > version_oldest_ok_split_list[i]) {
      console.log("Nyare underversion än äldsta tillåtna");
      return true;
    }
    if (version_running_split_list[i] < version_oldest_ok_split_list[i]) {
      console.error("Äldre underversion än äldsta tillåtna");
      return false;
    }
  }
  return true;
}


/**
 * Generera ett lösenord för en användare för kontaktgrupper
 * 
 * @returns {string} - Ett slumpvis genererat lösenord
 */
function createRandomPasswordForContactGroupsUser_() {

  const lengthForPassword = 15;

  let password = "";
  const possibleCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz0123456789";

  for (let i = 0; i < lengthForPassword; i++) {
    password += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
  }
  return password;
}


/**
 * Ger lista över de Google-grupper vars medlemmar ska ha behörighet
 * 
 * @returns {string[]} - Lista över e-postadresser för Google-grupper
 */
function getListOfAllGoogleGroupsShouldHaveAccess_() {

  updateListOfGroups_();

  const sheetDataKontakter = getDataFromActiveSheet_("Kontakter");

  const data = sheetDataKontakter["data"];

  const rowsToSync = findWhatRowsToSync_(0, data.length, data.length);
  const start = rowsToSync.start;
  const slut = rowsToSync.slut;

  const listOfAllGoogleGroupsShouldHaveAccess = [];

  const grd = getKontaktGruppKonfigRubrikData_();

  console.info("Lista över e-postadresser för Google-grupper vars medlemmar ska ha behörighet");

  for (let i = start-1; i < slut; i++) {

    const email = data[i][grd["e-post"]];
    if (checkIfGroupExists_(email)) {
      listOfAllGoogleGroupsShouldHaveAccess.push(email);
    }
  }

  console.info(listOfAllGoogleGroupsShouldHaveAccess);
  return listOfAllGoogleGroupsShouldHaveAccess;
}


/**
 * Ger e-postadresser för de som är medlemmar i angivna Google-grupper
 * 
 * @param {string[]} listOfAllGoogleGroupsShouldHaveAccess - Lista över e-postadresser för Google-grupper
 * 
 * @returns {string[]} - Lista över e-postadresser för de som är med i angivna Google-grupper
 */
function getAllEmailsShouldHaveAccess_(listOfAllGoogleGroupsShouldHaveAccess) {

  let listOfAllEmails = [];

  for (let i = 0; i < listOfAllGoogleGroupsShouldHaveAccess.length; i++) {
    
    const email = listOfAllGoogleGroupsShouldHaveAccess[i];

    const groupMembers = getGroupMembers_(email);

    const listOfEmails = getListOfEmailsFromListOfGroupMembers_(groupMembers);
    //console.log("Google-grupp " + email);
    //console.log(listOfEmails);
    listOfAllEmails.push.apply(listOfAllEmails, listOfEmails);
  }

  console.info("Användare som ska ha behörighet");
  listOfAllEmails = removeDublicates_(listOfAllEmails);
  console.info(listOfAllEmails);
  return listOfAllEmails;
}


/**
 * Ger lista med e-postadresser för de medlemsobjekt i angiven lista
 * 
 * @param {Object[]} groupMembers - Lista med medlemsobjekt
 * 
 * @returns {string[]} - Lista över e-postadresser för de angivna medlemsobjekten
 */
function getListOfEmailsFromListOfGroupMembers_(groupMembers) {

  const listOfEmails = [];

  for (let i = 0; i < groupMembers.length; i++) {
    const email = groupMembers[i].email;
    listOfEmails.push(email);
  }
  return listOfEmails;
}


/**
 * Hämta data över alla kontaktgrupper aktuella för angivna Google Grupper
 *
 * @param {string[]} listOfGroupEmails - Lista över e-postadresser för Google Grupper
 * @param {boolean} forceUpdate - Tvinga uppdatering av data eller ej från Scoutnet
 * 
 * @returns {Object[][]} - Lista med medlemsobjekt för aktuella kontaktgrupper
 */
function getContactGroupsData_(listOfGroupEmails, forceUpdate) {

  const sheetDataKontakter = getDataFromActiveSheet_("Kontakter");

  const sheet = sheetDataKontakter["sheet"];
  const selection = sheetDataKontakter["selection"];
  const data = sheetDataKontakter["data"];

  const grd = getKontaktGruppKonfigRubrikData_();

  const delete_rows = [];

  let contactGroupsList = [];

  //Hämta lista med alla medlemmar i kåren och alla deras attribut
  let allMembers = fetchScoutnetMembers_(forceUpdate);
  allMembers = filterMemberAttributes_(allMembers);

  const rowsToSync = findWhatRowsToSync_(0, data.length, data.length);
  const start = rowsToSync.start;
  const slut = rowsToSync.slut;

  updateListOfGroups_();

  for (let i = start-1; i < slut; i++) {
    
    const name = data[i][grd["namn"]];
    const email = data[i][grd["e-post"]];
    const scoutnet_list_id = data[i][grd["scoutnet_list_id"]];
    
    if (!listOfGroupEmails.includes(email)) {
      //console.log("Användare ej med i Google Gruppen " + email);
      continue;
    }
    else {
      //console.log("Användare med i Google Gruppen " + email);
    }

    const rad_nummer = i + 1;
    console.info("********************");   
    console.info('Rad: ' + rad_nummer + ' Namn: ' + name + ' E-post: ' + email + ' Scoutnet: ' + scoutnet_list_id);

    let updateContactGroup = true;

    if (!email && !scoutnet_list_id) { //Ta bort raden
      console.log("Försöker ta bort rad " + rad_nummer);      
      delete_rows.push(rad_nummer);
      updateContactGroup = false;
    }

    if (!name) {
      const cell = selection.getCell(rad_nummer,grd["namn"]+1);
      console.warn("Sätter cellen för namn till gul");
      cell.setBackground("yellow");
    }
    else if (name) {
      const cell = selection.getCell(rad_nummer,grd["namn"]+1);
      if ("#ffffff" !== cell.getBackground()) {
        console.log("Sätter cellen för namn till vit");
        cell.setBackground("white");
      }
    }
    
    if (email && checkIfEmailIsAGroup_(email)) {
      const cell = selection.getCell(rad_nummer,grd["e-post"]+1);
      if ("#ffffff" !== cell.getBackground()) {
        console.log("Sätter cellen för e-post till vit");
        cell.setBackground("white");
      }
    }
    else {
      const cell = selection.getCell(rad_nummer,grd["e-post"]+1);
      console.error("Sätter cellen för e-post till röd");
      cell.setBackground("red");
    }

    if (updateContactGroup) {
      //Hämta uppdatering av kontaktgruppsinfo
      const memberNumbersInAList = getUpdateForContactGroup_(selection, rad_nummer, data[i], grd, forceUpdate);
      console.info("Namn på kontaktlista och medlemmar i den");
      console.info(memberNumbersInAList);

      contactGroupsList.push(memberNumbersInAList);
    }
  }
  
  const memberNumbersList = getMemberNumbersFromContactGroupsList_(contactGroupsList);
  const memberList = getMembersForContactGroupsByMemberNumbers_(allMembers, memberNumbersList);

  //Lägga memberList först i en listan
  contactGroupsList.unshift(memberList);

  deleteRowsFromSpreadsheet_(sheet, delete_rows);

  return contactGroupsList;
}


/**
 * Ger lista med medlemsobjekt för de med angivna medlemsnummer
 *
 * @param {Object[]} allMembers - Lista av medlemsobjekt
 * @param {number[]} memberNumbers - Lista med medlemsnummer
 *
 * @returns {Object[]} - Lista av medlemsobjekt för endast de med angivna
 * medlemsnummer samt tillagt attribut anpassat för Google Kontakter
 */
function getMembersForContactGroupsByMemberNumbers_(allMembers, memberNumbers) {

  const memberList = [];

  for (let i = 0; i < memberNumbers.length; i++) {

    const obj = allMembers.find(obj => obj.member_no === memberNumbers[i]);
    
    let emailList;
    if (checkIfAgeIsOver18_(obj)) {
      emailList = getEmailListSyncOption_(obj, "-m", false);
      if (konfig.STORE_CONTACTS_RELATIVES_FOR_ADULTS) {
        moveRelativesContactInfoToBiographies(obj);
      }
      else  {
        removeRelativesContactInfo(obj);
      }
    }
    else  {
      emailList = getEmailListSyncOption_(obj, "", false);
    }

    obj.google_contact_group = makeStringForGoogleContactGroup_(emailList);
    memberList.push(obj);

    //console.log("Kontaktdata");
    //console.log(obj);
  }

  return memberList;
}


/**
 * Flytta kontaktinfo för anhöriga till anmärkningsfältet för kontakten
 * 
 * @param {Object} memberData - Persondata för en medlem
 */
function moveRelativesContactInfoToBiographies(memberData)  {

  let bioContacts = [];

  if (memberData.contact_mothers_name)  {
    bioContacts.push("Anhörig 1: " + memberData.contact_mothers_name);
    memberData.contact_mothers_name = "";
  }
  if (memberData.contact_email_mum)  {
    bioContacts.push("Anhörig 1 e-post: " + memberData.contact_email_mum);
    memberData.contact_email_mum = "";
  }
  if (memberData.contact_mobile_mum)  {
    bioContacts.push("Anhörig 1 mobil: " + memberData.contact_mobile_mum);
    memberData.contact_mobile_mum = "";
  }
  if (memberData.contact_telephone_mum)  {
    bioContacts.push("Anhörig 1 hem: " + memberData.contact_telephone_mum);
    memberData.contact_telephone_mum = "";
  }


  if (memberData.contact_fathers_name)  {
    bioContacts.push("Anhörig 2: " + memberData.contact_fathers_name);
    memberData.contact_fathers_name = "";
  }
  if (memberData.contact_email_dad)  {
    bioContacts.push("Anhörig 2 e-post: " + memberData.contact_email_dad);
    memberData.contact_email_dad = "";
  }
  if (memberData.contact_mobile_dad)  {
    bioContacts.push("Anhörig 2 mobil: " + memberData.contact_mobile_dad);
    memberData.contact_mobile_dad = "";
  }
  if (memberData.contact_telephone_dad)  {
    bioContacts.push("Anhörig 2 hem: " + memberData.contact_telephone_dad);
    memberData.contact_telephone_dad = "";
  }

  let tmpBioContactsString = "";
  for (let i = 0; i < bioContacts.length; i++) {
    tmpBioContactsString += bioContacts[i] + "\n";
  }
  memberData.biographies += tmpBioContactsString;
}


/**
 * Ta bort kontaktinfo för anhöriga för kontakten
 * 
 * @param {Object} memberData - Persondata för en medlem
 */
function removeRelativesContactInfo(memberData) {

  memberData.contact_mothers_name = "";
  memberData.contact_email_mum = "";
  memberData.contact_mobile_mum = "";
  memberData.contact_telephone_mum = "";

  memberData.contact_fathers_name = "";
  memberData.contact_email_dad = "";
  memberData.contact_mobile_dad = "";
  memberData.contact_telephone_dad = "";
}


/**
 * Ger sant eller falskt om en medlem är minst 18 år gammal
 * 
 * @param {Object} memberData - Persondata för en medlem
 * 
 * @returns {boolean} - Om medlemen är minst 18 år gammal eller ej
 */
function checkIfAgeIsOver18_(memberData)  {

  const ageToCheck = 18;
  const today = new Date();
  
  const date_of_birth_year = Number(memberData.date_of_birth_year);
  const year = today.getFullYear();

  if (date_of_birth_year + ageToCheck > year)  {
    //console.log("Personen är under " + ageToCheck);
    return false;
  }
  else if (date_of_birth_year + ageToCheck < year)  {
    //console.log("Personen är över " + ageToCheck);
    return true;
  }
  
  const date_of_birth_month = Number(memberData.date_of_birth_month);
  const month = today.getMonth()+1;
  if (date_of_birth_month > month)  {
    //console.log("Personen fyller " + ageToCheck + " en senare månad");
    return false;
  }
  else if (date_of_birth_month < month)  {
    //console.log("Personen har fyllt " + ageToCheck + " en tidigare månad");
    return true;
  }

  const date_of_birth_day = Number(memberData.date_of_birth_day);
  const dayOfMonth = today.getDate();
  if (date_of_birth_day > dayOfMonth)  {
    //console.log("Personen fyller " + ageToCheck + " en senare dag i månaden");
    return false;
  }
  
  //console.log("Personen har fyllt " + ageToCheck);
  return true;
}


/**
 * Ger lista med unika medlemsnummer för de som är med i någon kontaktgrupp
 *
 * @param {Object[][]} contactGroupsList - Lista av listor med kontaktgruppsinformation och medlemsnummer för de i respektive grupp
 *
 * @returns {number[]} - Lista med unika medlemsnummer för de som är med i någon kontaktgrupp
 */
function getMemberNumbersFromContactGroupsList_(contactGroupsList) {

  let memberNumbers = [];

  for (let i = 0; i < contactGroupsList.length; i++) {

    const contactGroupList = contactGroupsList[i];
    for (let k = 1; k < contactGroupList.length; k++) {
      memberNumbers.push(contactGroupList[k]);
    }
  }

  //Ta bort dubbletter
  memberNumbers = removeDublicates_(memberNumbers);

  console.info("********************");
  console.info("Dessa medlemmar är med i någon kontaktgrupp för denna användare");
  console.info(memberNumbers);
  return memberNumbers;
}


/**
 * Ger lista av medlemsobjekt där vissa medlemsattribut tagits bort
 *
 * @param {Object[]} medlemmar - Lista av medlemsobjekt
 *
 * @returns {Object[]} - Lista av medlemsobjekt med färre medlemsattribut
 */
function filterMemberAttributes_(medlemmar) {
  
  const filteredMembers = [];

  const attribut_lista = ['member_no', 'first_name', 'last_name', 'nickname', 'contact_leader_interest', 'date_of_birth',
                        'group', 'unit', 'group_role',
                        'sex', 'address_1', 'address_2', 'postcode', 'town',
                        'country', 'contact_mobile_phone', 'contact_home_phone', 'contact_mothers_name',
                        'contact_mobile_mum', 'contact_telephone_mum', 'contact_fathers_name', 'contact_mobile_dad',
                        'contact_telephone_dad', 'note', 'avatar_updated', 'avatar_url',
                        'email', 'contact_email_mum', 'contact_email_dad', 'contact_alt_email'];

  for (let i = 0; i < medlemmar.length; i++) {
    
    //console.log(medlemmar[i]);
    const member = {};

    member['biographies'] = "";

    for (let k = 0; k < attribut_lista.length; k++) {
      const nameOfAttribute = attribut_lista[k];

      if ('group_role' === nameOfAttribute) {
        if (medlemmar[i]['group_role'] && medlemmar[i]['unit_role']) {
          member['title'] = medlemmar[i]['group_role'] + ", " + medlemmar[i]['unit_role'];
        }
        else if (medlemmar[i]['group_role']) {
          member['title'] = medlemmar[i]['group_role'];
        }
        else if (medlemmar[i]['unit_role']) {
          member['title'] = medlemmar[i]['unit_role'];
        }
      }
      else if ('address_1' === nameOfAttribute) {
        if (medlemmar[i]['address_co']) {
          member['streetAddress'] = "c/o " + medlemmar[i]['address_co'] + ", " + medlemmar[i]['address_1'];
        }
        else {
          member['streetAddress'] = medlemmar[i]['address_1'];
        }
      }
      else if ('address_2' === nameOfAttribute) {
        if (medlemmar[i]['address_2'] && medlemmar[i]['address_3']) {
          member['extendedAddress'] = medlemmar[i]['address_2'] + ", " + medlemmar[i]['address_3'];
        }
        else if (medlemmar[i]['address_2']) {
          member['extendedAddress'] = medlemmar[i]['address_2'];
        }
        else if (medlemmar[i]['address_3']) {
          member['extendedAddress'] = medlemmar[i]['address_3'];
        }
      }
      else if ('unit' === nameOfAttribute) {
        if (medlemmar[i]['unit'] && medlemmar[i]['patrol']) {
          member['department'] = medlemmar[i]['unit'] + "/" + medlemmar[i]['patrol'];
        }
        else if (medlemmar[i]['unit']) {
          member['department'] = medlemmar[i]['unit'];
        }
        else if (medlemmar[i]['patrol']) {
          member['department'] = medlemmar[i]['patrol'];
        }
      }
      else if ('sex' === nameOfAttribute) {
         member['sex'] = translateGenderToEnglish_(medlemmar[i]['sex']);
      }
      else if ('date_of_birth' === nameOfAttribute) {
        member['date_of_birth_year'] = medlemmar[i]['date_of_birth'].substr(0, 4);
        member['date_of_birth_month'] = medlemmar[i]['date_of_birth'].substr(5, 2);
        member['date_of_birth_day'] = medlemmar[i]['date_of_birth'].substr(8, 2);
      }
      else if ('contact_leader_interest' === nameOfAttribute) {
        member['biographies'] += getTextIfContactLeaderInterest_(medlemmar[i]['contact_leader_interest']);
      }
      else if ('note' === nameOfAttribute) {
        member['biographies'] += cleanNote_(medlemmar[i]['note']);
      }
      else {
        member[nameOfAttribute] = medlemmar[i][nameOfAttribute];
      }
    }

    filteredMembers.push(member);
  }
  return filteredMembers;
}


/**
 * Ger rensad text för eventuell inlagd anteckning
 * 
 * @param {string} note - Anteckning för en medlemsprofil
 * 
 * @returns {string} - Sammanfattad info om given anteckning
 */
function cleanNote_(note) {
  
  let cleanNoteString = "";

  if (!note) {
    return "";
  }

  note = note.toLowerCase();

  for (let i = 0; i < konfig.noteKeysToReplace.length; i++) {
    if (note.includes(konfig.noteKeysToReplace[i][0].toLowerCase())) {
      cleanNoteString += konfig.noteKeysToReplace[i][1] + "\n";
    }
  }
  return cleanNoteString;
}


/**
 * Ger text för eventuellt ledarintresse inlagt
 * 
 * @param {string} contact_leader_interest - Ja om intresse finns
 * 
 * @returns {string} - Mening om att hjälpa till eller ingen text beroende på indata
 */
function getTextIfContactLeaderInterest_(contact_leader_interest) {

  if ("Ja" === contact_leader_interest) {
    return "Förälder kan hjälpa till i kåren\n";
  }
  return "";
}


/**
 * Översätt kön till motsvarande engelsk term för en kontakt
 * 
 * @param {string} gender - Kön för en person
 * 
 * @returns {string} - Motsvarande kön på engelska för Googles API
 */
function translateGenderToEnglish_(gender) {

  switch(gender) {
    case "Kvinna":
      return "female";
    case "Man":
      return "male";
    default:
      return "unspecified";
  }
}


/**
 * Hämta data över de medlemmar som ska vara med i en kontaktgrupp
 *
 * @param {Object} selection - Hela området på kalkylarket som används
 * @param {number} rad_nummer - Radnummer för aktuell grupp i kalkylarket
 * @param {string[]} radInfo - Lista med data för aktuell rad i kalkylarket
 * @param {string[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * @param {boolean} forceUpdate - Tvinga uppdatering av data eller ej från Scoutnet
 * 
 * @returns {Object[]} - Lista med kontaktgruppsinformation och medlemsnummer för de i gruppen
 */
function getUpdateForContactGroup_(selection, rad_nummer, radInfo, grd, forceUpdate) {

  const name = radInfo[grd["namn"]];

  const scoutnet_list_id = radInfo[grd["scoutnet_list_id"]]; //Själva datan
  const cell_scoutnet_list_id = selection.getCell(rad_nummer, grd["scoutnet_list_id"]+1); //Range

  const membersMultipleMailinglists = fetchScoutnetMembersMultipleMailinglists_(scoutnet_list_id, cell_scoutnet_list_id, "", forceUpdate);
  
  const contactGroupInfo = {
    name: name
  };

  const membersInAList = [];
  membersInAList.push(contactGroupInfo);

  for (let i = 0; i < membersMultipleMailinglists.length; i++) {
    membersInAList.push(membersMultipleMailinglists[i].member_no);
  }
  return membersInAList;
}


/**
 * Ger en textsträng med e-postadresser anpassad för Google Kontakter
 * 
 * @param {string[]} - Lista över e-postadresser enligt specificerade attribut
 *
 * @returns {Object[]} - Textsträng för e-postadresser i Google Kontakter
 */
function makeStringForGoogleContactGroup_(emailList) {

  //Skapa lista med enbart korrekta e-postadresser
  let realEmailList = [];
  for (let i = 0; i < emailList.length; i++) {
    if (checkIfEmail_(emailList[i])) {
      realEmailList.push(emailList[i]);
    }
    else {
      console.warn("Ogiltig e-postadress " + emailList[i]);
    }
  }

  //Ta bort dubletter
  realEmailList = removeDublicates_(realEmailList);

  let contactGroupList = [];
  for (let i = 0; i < realEmailList.length; i++) {
    
    if (0 === i) {
      if (realEmailList.length === 1) {
        contactGroupList.push(realEmailList[i]);
        //console.log("Första och enda elementet " + realEmailList[i]);
      }
      else {
        contactGroupList.push(realEmailList[i] + ">");
        //console.log("Första elementet " + realEmailList[i]);
      }
    }
    else if (realEmailList.length-1 === i) {
      contactGroupList.push("<" + realEmailList[i]);
      //console.log("Sista elementet " + realEmailList[i]);
    }
    else {
      contactGroupList.push("<" + realEmailList[i] + ">");
      //console.log("Ett element i mitten någonstans " + realEmailList[i]);
    }
  }
  contactGroupList = contactGroupList.toString();
  return contactGroupList;
}


/**
 * Kontrollerar om inskickade autentiseringsuppgifter är giltiga
 * 
 * @param {string} userEmail - E-postadress för en användare
 * @param {string} userPassword - Lösenord för en användare för synkning av kontaktgrupper
 * @param {string} userVersion - Version av skript för en användare
 * @param {boolean} forceUpdate - Tvinga uppdatering av data eller ej från Scoutnet
 * 
 * @returns {boolean} - Gällande om inskickade autentiseringsuppgifter är giltiga
 */
function checkCredentials_(userEmail, userPassword, userVersion, forceUpdate) {
  
  console.info("Kontrollerar om inskickade autentiseringsuppgifter är giltiga")
  
  userEmail = getGmailAdressWithoutDots_(userEmail.toLowerCase());

  console.info("userEmail: " + userEmail + " userPassword: " + userPassword);

  const sheetDataKontakterAnvandare = getDataFromActiveSheet_("Kontakter-Användare");

  //const sheet = sheetDataKontakterAnvandare["sheet"];
  const selection = sheetDataKontakterAnvandare["selection"];
  const data = sheetDataKontakterAnvandare["data"];

  const grd = getKontaktGruppAuthnRubrikData_();
  
  const rowsToSync = findWhatRowsToSync_(0, data.length, data.length);
  const start = rowsToSync.start;
  const slut = rowsToSync.slut;

  console.info("Rader med användare att kolla igenom - Startrad " + start + " slutrad " + slut);

  for (let i = start-1; i < slut; i++) {
    
    let email = data[i][grd["e-post"]];
    const password = data[i][grd["lösenord"]];
    const last_authn = data[i][grd["senast_använd"]];
    const version = data[i][grd["version"]];
    let num_of_forced_updates = data[i][grd["tvingade_uppdateringar"]];

    email = getGmailAdressWithoutDots_(email.toLowerCase());

    if (email !== userEmail) {
      continue;
    }

    const rad_nummer = i+1;    
    console.info('Rad: ' + rad_nummer + ' E-post: ' + email + ' Lösenord: ' + password + ' Senast använd: ' + last_authn);

    if (password != userPassword) {
      console.error("Felaktigt lösenord angivet " + userPassword);
      sendEmailWithContactsGroupsPassword_(userEmail, password);
      return false;
    }
    console.info("Korrekt angivet lösenord för angiven e-postadress");
    const cell = selection.getCell(rad_nummer, grd["senast_använd"]+1);
    const datum = new Date();
    cell.setValue(datum).setNumberFormat("yyyy-MM-dd hh:mm:ss");
    console.log("Uppdatera datum i kalkylblad för senast använd " + datum);

    if (version != userVersion) {
      console.info("Ny version för denna användare " + userVersion);
      const cell_userVersion = selection.getCell(rad_nummer, grd["version"]+1);
      cell_userVersion.setValue(userVersion);
    }

    if (typeof num_of_forced_updates !== "number")  {
      num_of_forced_updates = 0;
    }
    if (forceUpdate)  {
      if (num_of_forced_updates < konfig.MAX_NUMBER_OF_CONTACTS_FORCE_UPDATE) {
        const cell = selection.getCell(rad_nummer, grd["tvingade_uppdateringar"]+1);
        num_of_forced_updates++;
        cell.setValue(num_of_forced_updates);
      }
      else {
        console.error("Användaren försökt köra tvingad uppdatering för ofta");
        return false;
      }
    }    

    return true;
  }

  console.warn("Användaren finns ej i listan och saknar därmed behörighet");
  return false;
}


/**
 * Skicka e-brev till angiven e-postadress med information
 * om korrekt autentiseringsuppgifter för denna användare
 * 
 * @param {string} userEmail - E-postadress för en användare
 * @param {string} password - Lösenord för en användare för synkning av kontaktgrupper
 */
function sendEmailWithContactsGroupsPassword_(userEmail, password) {

  const emailOptions = {};

  /***Avsändarnamn***/
  if (konfig.contact_groups_email_sender_name) {
    emailOptions["name"] = konfig.contact_groups_email_sender_name;
  }
  /***Avsändarnamn - Slut***/

  /***Avsändaradress***/
  if (konfig.contact_groups_email_sender_from) {
    if (isFromEmailAdressAllowed_(konfig.contact_groups_email_sender_from)) {
      emailOptions["from"] = konfig.contact_groups_email_sender_from;
    }
    else {
      console.error("Angiven avsändaradress är ej godkänd");
      console.error("Avsändaradressen måste finnas upplagd som alias i din Gmail");
    }
  }
  /***Avsändaradress - Slut***/

  let contact_groups_email_plainBody_credentials = konfig.contact_groups_email_plainBody.replace("{{userEmail}}", userEmail);
  contact_groups_email_plainBody_credentials = contact_groups_email_plainBody_credentials.replace("{{password}}", password);

  let contact_groups_email_htmlBody_credentials = konfig.contact_groups_email_htmlBody.replace("{{userEmail}}", userEmail);
  contact_groups_email_htmlBody_credentials = contact_groups_email_htmlBody_credentials.replace("{{password}}", password);

  emailOptions["htmlBody"] = contact_groups_email_htmlBody_credentials;

  console.info("Skickar e-post till " + userEmail);
  GmailApp.sendEmail(userEmail, konfig.contact_groups_email_subject, contact_groups_email_plainBody_credentials, emailOptions);
}


/**
 * Ger lista över de grupper som denna person är med i
 * 
 * @param {string} userKey - Unikt identifierare för en person
 *
 * @returns {Object[]} - Lista över grupper som denna person är med i
 */
function getListOfGroupsForAUser_(userKey) {
  
  for (let n = 0; n < 6; n++) {
    try {
      const listOfGroups = [];

      let pageToken, page;
      do {
        page = AdminDirectory.Groups.list({
          domain: konfig.domain,
          maxResults: 150,
          pageToken: pageToken,
          userKey: userKey
        });
        const groups = page.groups;
        if (groups) {
          for (let i = 0; i < groups.length; i++) {

            const group = {
              email: groups[i].email,
              id: groups[i].id,
              name: groups[i].name
            };
            listOfGroups.push(group);
          }
        }
        else {
          console.info('Inga grupper hittades.');
        }
        pageToken = page.nextPageToken;
      } while (pageToken);

      console.info("Denna person är med i " + listOfGroups.length + " grupper");
      return listOfGroups;

    } catch(e) {
      console.error("Problem med att anropa GoogleTjänst AdminDirectory.Groups i funktionen getListOfGroupsForAUser");
      if (n === 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }
  }
}


/**
 * Ger lista över de grupper som denna person är med i
 * 
 * @param {Object[]} - Lista med objekt av grupper
 *
 * @returns {string[]} - Lista med e-postadresser för alla angivna grupper
 */
function getListOfGroupsEmails_(groups) {

  const listOfGroupsEmails = [];

  for (let i = 0; i < groups.length; i++) {
    listOfGroupsEmails.push(groups[i].email);
  }
  console.log(listOfGroupsEmails);
  return listOfGroupsEmails;
}
