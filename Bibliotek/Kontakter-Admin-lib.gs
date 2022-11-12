/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Körs vid GET-anrop till webbappen
 * 
 * @param {Object} INPUT_KONFIG_OBJECT - Objekt med kårens konfiguration
 * @param {Object} e - Query-parametrar vid GET-anrop till webbappen
 *
 * @returns {Object} - Ett objekt av typen TextOutput
 */
function synkroniseraKontakter(INPUT_KONFIG_OBJECT, e) {

  console.time("Kontakter-Admin");

  KONFIG = INPUT_KONFIG_OBJECT;

  console.log(e);
  const params = e.parameters;

  if (Object.keys(params).length === 0) {
    console.warn("Inga parametrar angivna. MVH " + KONFIG.GROUP_NAME);
    return ContentService.createTextOutput("Inga parametrar angivna. MVH " + KONFIG.GROUP_NAME)
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
  //console.log(response);
  return ContentService.createTextOutput(response)
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * Uppdatera kalkylbladet med de användare som ska ha behörigheter
 * 
 * @param {Object} INPUT_KONFIG_OBJECT - Objekt med kårens konfiguration
 */
function updateContactGroupsAuthnSheetUsers(INPUT_KONFIG_OBJECT) {

  KONFIG = INPUT_KONFIG_OBJECT;

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
 * @param {Object} INPUT_KONFIG_OBJECT - Objekt med kårens konfiguration
 * @param {string} subject - Ämnesrad på e-postutkast
 */
function testGetHtmlEmailBody(INPUT_KONFIG_OBJECT, subject) {

  KONFIG = INPUT_KONFIG_OBJECT;

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
  console.info("Äldsta tillåtna version " + KONFIG.version_oldest_ok);

  const version_running_split_list = version_running.split(".");

  const version_oldest_ok_split_list = KONFIG.version_oldest_ok.split(".");

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
  let filteredMembers = filterMemberAttributes_(allMembers);  

  //Listor med telefonnummer, e-postadress och medlemsnummer för alla vuxna medlemmar för att
  //sen kunna se vilka som har barn i kåren
  const comparableAdultMembers = getComparableAdultmembersContactInformation_(filteredMembers);

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
  const memberListAndTrimmedMemberNumbers = getMembersForContactGroupsByMemberNumbers_(filteredMembers, memberNumbersList, comparableAdultMembers);
  
  const memberList = memberListAndTrimmedMemberNumbers[0];

  const trimmedMemberNumbers = memberListAndTrimmedMemberNumbers[1];  //De medlemsnummer som inte ska användas
  const memberNumbersToReplace = memberListAndTrimmedMemberNumbers[2];
  //Här ska vi rensa bort alla medlemsnummer som faktiskt inte ska användas
  contactGroupsList = removeTrimmedMemberNumbersFromContactGroupsList_(contactGroupsList, trimmedMemberNumbers, memberNumbersToReplace);

  //Lägga memberList först i en listan
  contactGroupsList.unshift(memberList);

  deleteRowsFromSpreadsheet_(sheet, delete_rows);

  return contactGroupsList;
}


/**
 * Ger en lista med jämförbara telefonnummer och e-postadress för alla vuxna medlemmar
 *
 * @param {Object[][]} contactGroupsList - Lista av listor med kontaktgruppsinformation och medlemsnummer för de i respektive grupp
 * @param {number[]} trimmedMemberNumbers - Lista med medlemsnummer som inte finns
 * @param {Object} memberNumbersToReplace - Objekt med medlemsnummer som ska ersättas med något annat
 *
 * @returns {Object[][]} - Lista av listor med kontaktgruppsinformation och medlemsnummer
 * för de i respektive grupp där medlemsnummer som inte finns på riktigt har tagits bort
 */
function removeTrimmedMemberNumbersFromContactGroupsList_(contactGroupsList, trimmedMemberNumbers, memberNumbersToReplace) {

  const tmpContactGroupsList = [];

  for (let i = 0; i < contactGroupsList.length; i++) {

    const contactGroupList = contactGroupsList[i];
    const tmpContactGroupList = [];
    tmpContactGroupList.push(contactGroupList[0]);
    for (let k = 1; k < contactGroupList.length; k++) {

      if (typeof memberNumbersToReplace[contactGroupList[k]] !== "undefined") {
        //console.log("Vi ska byta ut medlemsnummer " + contactGroupList[k] + " mot " + memberNumbersToReplace[contactGroupList[k]]);
        tmpContactGroupList.push(memberNumbersToReplace[contactGroupList[k]]);
      }
      else if (!trimmedMemberNumbers.includes(contactGroupList[k])) {
        tmpContactGroupList.push(contactGroupList[k]);
      }
      else  {
        //console.log("Trimmat medlemsnummer " + contactGroupList[k]);
      }
    }
    tmpContactGroupsList.push(tmpContactGroupList);
  }

  return tmpContactGroupsList;
}


/**
 * Ger ett objekt bestående av listor med e-post, mobilnummer samt medlemsnummer
 * för alla vuxna medlemmar
 *
 * @param {Object[]} filteredMembers - Lista av medlemsobjekt
 *
 * @returns {Object[]} - Objekt med listor över medlemsinfo för vuxna medlemmar
 */
function getComparableAdultmembersContactInformation_(filteredMembers) {

  const email = [];
  const contact_mobile_phone = [];
  const member_no = [];

  for (let i = 0; i < filteredMembers.length; i++) {
    const filteredMember = filteredMembers[i];

    if  (checkIfAgeIsOver18_(filteredMember))  {
      //console.log(filteredMember.first_name + " " + filteredMember.last_name);

      if (filteredMember.email || filteredMember.contact_mobile_phone || filteredMember.contact_home_phone)  {
        email.push(getComparableEmail_(filteredMember.email));
        contact_mobile_phone.push(intPhoneNumber_(filteredMember.contact_mobile_phone));
        member_no.push(filteredMember.member_no);
      }
      else  {
        const fullName = filteredMember.first_name + " " + filteredMember.last_name;
        console.warn("Denna medlem (" + fullName + ") över 18 år har varken e-post eller telefonnummer registrerat");
      }
    }
  }

  const comparableMembers = {email, contact_mobile_phone, member_no};
  //console.log("comparableMembers");
  //console.log(comparableMembers);

  return comparableMembers;
}


/**
 * Gör om en e-postadress till gemener, tar bort tomrum samt punkter
 *
 * @param {string} email - En e-postadress
 * @param {number[]} memberNumbers - Lista med medlemsnummer
 *
 * @returns {string} - En e-postadress för enklare jämförelse
 */
function getComparableEmail_(email)  {
  
  //Ta bort tomma mellanrum vid start och slut och konvertera till gemener
  email = email.toLowerCase().trim();
  //Ta bort alla punkter
  email = email.replace(/\./g,'');

  return email;
}


/**
 * Ger lista med medlemsobjekt för de med angivna medlemsnummer
 *
 * @param {Object[]} filteredMembers - Lista av medlemsobjekt
 * @param {number[]} memberNumbers - Lista med medlemsnummer
 * @param {Object[]} comparableAdultMembers - Objekt med listor över medlemsinfo för vuxna medlemmar
 * 
 * @returns {Object[][]} - Lista av medlemsobjekt för endast de med angivna
 * medlemsnummer samt medlemsnummer som ej ska användas
 */
function getMembersForContactGroupsByMemberNumbers_(filteredMembers, memberNumbers, comparableAdultMembers) {

  const memberList = [];
  const trimmedMemberNumbers = []; //För att få bort anhörigas medlemsnummer för vuxna
  const memberNumbersToReplace = {}; //Anhörig medlemsnummer som ska bytas till vuxen medlems medlemsnummer
  const memberNumbersProcessed = [];

  for (let i = 0; i < memberNumbers.length; i++) {

    const obj = filteredMembers.find(obj => obj.member_no === memberNumbers[i]);
    //console.log("obj");
    //console.log(obj);
    
    //Är undefined om det inte ska skapas kontaktkort för en anhörig
    if (typeof obj === "undefined") {
      trimmedMemberNumbers.push(memberNumbers[i]);
      continue;
    }    
    
    if (obj.isRelativeContact) { //Om en anhörigs kontaktkort
      //console.log("Detta kontaktkort tillhör en anhörig till en medlem");
      moveRelativesContactInfoToBiographies_(obj);
    }
    else if (checkIfAgeIsOver18_(obj)) { //Om medlem över 18 år
      changeContactRelativeForAdults_(obj);
      memberNumbersProcessed.push(memberNumbers[i]);
    }
    else  { //Om medlem under 18 år
      memberNumbersProcessed.push(memberNumbers[i]);

      const memberNumberMum = checkIfSomeContactInfoBelongsToAdultMember_(obj, comparableAdultMembers, "mum", 1);
      const memberNumberDad = checkIfSomeContactInfoBelongsToAdultMember_(obj, comparableAdultMembers, "dad", 2);

      if (memberNumberMum) {
        memberNumbersToReplace[memberNumbers[i]+"-1"] = memberNumberMum;
      }
      if (memberNumberDad) {
        memberNumbersToReplace[memberNumbers[i]+"-2"] = memberNumberDad;
      }
      else  {
        //console.log("Denna medlem har inte någon anhöriginfo som tillhör en vuxen medlem");
      }
      
      if (!checkIfEmailBelongsToMemberAndNotRelative_(obj))  {
        obj.email = "";
      }
      moveRelativesContactInfoToBiographies_(obj);
    }
    
    memberList.push(obj);
    //console.log("Kontaktdata");
    //console.log(obj);
  }

  //Dessa medlemsnummer ersätter påhittade anhörigmedlemsnummer för någon medlem
  const memberNumbersToReplaceWith = removeDublicates_(Object.values(memberNumbersToReplace));

  for (let i = 0; i < memberNumbersToReplaceWith.length; i++) {
    if (!memberNumbersProcessed.includes(memberNumbersToReplaceWith[i]))  {
      //console.log("Denna medlem " + memberNumbersToReplaceWith[i] + " läggs till då den står som anhörig till någon som ska med");

      const obj = filteredMembers.find(obj => obj.member_no === memberNumbersToReplaceWith[i]);
      //Här kan vi rensa bort anhöriginfo för vuxna medlemmar då vi antar att denna medlem är vuxen
      changeContactRelativeForAdults_(obj);
      memberList.push(obj);
    }
  }

  console.log("memberNumbersToReplace");
  console.log(memberNumbersToReplace);
  
  return [memberList, trimmedMemberNumbers, memberNumbersToReplace];
}


/**
 * Kollar om en medlems primära e-postadress tillhör medlemmen eller en anhörig
 * 
 * @param {Object} memberData - Persondata för en medlem
 * 
 * @returns {boolean} - Om primär e-post tillhör medlemmen själv
 */
function checkIfEmailBelongsToMemberAndNotRelative_(memberData)  {
  
  const comparableEmail = getComparableEmail_(memberData.email);

  if (comparableEmail === getComparableEmail_(memberData.contact_email_mum)) {
    return false;
  }
  if (comparableEmail === getComparableEmail_(memberData.contact_email_dad)) {
    return false;
  }
  //const memberFullname = memberData.first_name + " " + memberData.last_name;
  //console.log("Denna medlem under 18 år har en egen personlig e-postadress registrerad " + memberFullname);
  return true;
}


/**
 * Ändra anhöriginfo för för vuxna medlemmar
 * 
 * @param {Object} memberData - Persondata för en medlem
 */
function changeContactRelativeForAdults_(memberData) {

  if (KONFIG.STORE_CONTACTS_RELATIVES_FOR_ADULTS) {
    moveRelativesContactInfoToBiographies_(memberData);
  }
  else  {
    removeRelativesContactInfo_(memberData);
  }
}


/**
 * Kollar om kontaktinfo för en medlem tillhör en vuxen medlem
 * 
 * @param {Object} memberData - Persondata för en medlem
 * @param {Object[]} comparableAdultMembers - Objekt med listor över medlemsinfo för vuxna medlemmar
 * @param {string} relativeRelation - Namn på medlemsattribut för relation till anhörig
 * @param {number} relativeNumber - Vilket anhörignummer för en medlem
 * 
 * @returns {boolean} - Om kontaktinfo för medlemmen tillhör en vuxen medlem eller ej
 */
function checkIfSomeContactInfoBelongsToAdultMember_(memberData, comparableAdultMembers, relativeRelation, relativeNumber) {

  let indexesMatchesEmail = [];
  let indexesMatchesMobile = [];

  const relativeMobileAttribute = "contact_mobile_" + relativeRelation;
  const relativeEmailAttribute = "contact_email_" + relativeRelation;

  const memberFullname = memberData.first_name + " " + memberData.last_name;

  if (memberData[relativeEmailAttribute]) {
    const comparableEmail = getComparableEmail_(memberData[relativeEmailAttribute]);

    if (comparableAdultMembers.email.includes(comparableEmail)) {
      indexesMatchesEmail = getAllIndexes_(comparableAdultMembers.email, comparableEmail);
      //console.log(memberFullname + " e-post för Anhörig #" + relativeNumber + " är också registrerad på en vuxen medlems profil");
      //console.log("Indexmatchar e-post " + indexesMatchesEmail);
    }
  }

  if (memberData[relativeMobileAttribute]) {
    const comparableMobile = intPhoneNumber_(memberData[relativeMobileAttribute]);

    if (comparableAdultMembers.contact_mobile_phone.includes(comparableMobile)) {
      indexesMatchesMobile = getAllIndexes_(comparableAdultMembers.contact_mobile_phone, comparableMobile);
      //console.log(memberFullname + " mobilnummer för Anhörig #" + relativeNumber + " är också registrerad på en vuxen medlems profil");
      //console.log("Indexmatchar mobilnummer " + indexesMatchesMobile);
    }
  }

  if (0 !== indexesMatchesEmail.length && 0 !== indexesMatchesMobile.length)  {

    for (let i = 0; i < indexesMatchesEmail.length; i++) {
      if (indexesMatchesMobile.includes(indexesMatchesEmail[i]))  {
        console.log("En fullständig matchning för en vuxen medlem har hittats hos " + memberFullname + " Anhörig #" + relativeNumber);
        //console.log("E-post på föräldern " + comparableAdultMembers.email[indexesMatchesEmail[i]]);
        return comparableAdultMembers.member_no[indexesMatchesEmail[i]];
      }
    }
  }
  else if (0 !== indexesMatchesEmail.length || 0 !== indexesMatchesMobile.length)  {
    console.warn("En partiell matchning för en vuxen medlem har hittats hos " + memberFullname + " Anhörig #" + relativeNumber);
  }
  
  return false;
}


/**
 * Ger en lista med alla index för en textsträng i en lista
 * 
 * @param {string[]} list - En lista
 * @param {string} text - En textsträng
 * 
 * @returns {string[]} - En lista med index för alla matchande förekomster
 */
function getAllIndexes_(list, text)  {

  const indexes = [];
  for (let i = 0; i < list.length; i++) {
    if (text === list[i]) {
      indexes.push(i);
    }
  }
  return indexes;
}


/**
 * Flytta kontaktinfo för anhöriga till anmärkningsfältet för kontakten
 * 
 * @param {Object} memberData - Persondata för en medlem
 */
function moveRelativesContactInfoToBiographies_(memberData)  {

  let bioContacts = [];

  if (memberData.contact_mothers_name)  {
    bioContacts.push("Anhörig 1: " + memberData.contact_mothers_name);
    memberData.contact_mothers_name = "";
  }
  if (memberData.contact_email_mum)  {
    bioContacts.push("Anhörig 1 e-post: " + memberData.contact_email_mum);
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
function removeRelativesContactInfo_(memberData) {

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

  if (!memberData.date_of_birth_year || !memberData.date_of_birth_month || !memberData.date_of_birth_day)  {
    return false;
  }

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
    
    const medlem = medlemmar[i];

    //console.log(medlem);
    const tmpMember = {};

    tmpMember['biographies'] = "";

    for (let k = 0; k < attribut_lista.length; k++) {
      const nameOfAttribute = attribut_lista[k];

      if ('group_role' === nameOfAttribute) {
        if (medlem['group_role'] && medlem['unit_role']) {
          tmpMember['title'] = medlem['group_role'] + ", " + medlem['unit_role'];
        }
        else if (medlem['group_role']) {
          tmpMember['title'] = medlem['group_role'];
        }
        else if (medlem['unit_role']) {
          tmpMember['title'] = medlem['unit_role'];
        }
      }
      else if ('address_1' === nameOfAttribute) {
        if (medlem['address_co']) {
          tmpMember['streetAddress'] = "c/o " + medlem['address_co'] + ", " + medlem['address_1'];
        }
        else {
          tmpMember['streetAddress'] = medlem['address_1'];
        }
      }
      else if ('address_2' === nameOfAttribute) {
        if (medlem['address_2'] && medlem['address_3']) {
          tmpMember['extendedAddress'] = medlem['address_2'] + ", " + medlem['address_3'];
        }
        else if (medlem['address_2']) {
          tmpMember['extendedAddress'] = medlem['address_2'];
        }
        else if (medlem['address_3']) {
          tmpMember['extendedAddress'] = medlem['address_3'];
        }
      }
      else if ('unit' === nameOfAttribute) {
        if (medlem['unit'] && medlem['patrol']) {
          tmpMember['department'] = medlem['unit'] + "/" + medlem['patrol'];
        }
        else if (medlem['unit']) {
          tmpMember['department'] = medlem['unit'];
        }
        else if (medlem['patrol']) {
          tmpMember['department'] = medlem['patrol'];
        }
      }
      else if ('sex' === nameOfAttribute) {
         tmpMember['sex'] = translateGenderToEnglish_(medlem['sex']);
      }
      else if ('date_of_birth' === nameOfAttribute) {
        tmpMember['date_of_birth_year'] = medlem['date_of_birth'].substr(0, 4);
        tmpMember['date_of_birth_month'] = medlem['date_of_birth'].substr(5, 2);
        tmpMember['date_of_birth_day'] = medlem['date_of_birth'].substr(8, 2);
      }
      else if ('contact_leader_interest' === nameOfAttribute) {
        tmpMember['biographies'] += getTextIfContactLeaderInterest_(medlem['contact_leader_interest']);
      }
      else if ('note' === nameOfAttribute) {
        tmpMember['biographies'] += cleanNote_(medlem['note']);
      }
      else {
        tmpMember[nameOfAttribute] = medlem[nameOfAttribute];
      }
    }
    tmpMember['isRelativeContact'] = false;

    filteredMembers.push(tmpMember);

    if (!checkIfAgeIsOver18_(tmpMember)) {
      if (tmpMember['contact_mobile_mum'] || tmpMember['contact_telephone_mum'] || tmpMember['contact_email_mum']) {
        const tmpMemberRelative = getContactForMemberRelative_(tmpMember, 'contact_mothers_name', 'mum', 1);
        filteredMembers.push(tmpMemberRelative);
      }
      if (tmpMember['contact_mobile_dad'] || tmpMember['contact_telephone_dad'] || tmpMember['contact_email_dad']) {
        const tmpMemberRelative = getContactForMemberRelative_(tmpMember, 'contact_fathers_name', 'dad', 2);
        filteredMembers.push(tmpMemberRelative);
      }
    }
  }
  return filteredMembers;
}


/**
 * Skapa ett medlemsobjekt för en anhörig till en medlem
 * 
 * @param {Object} medlem - Ett medlemsobjekt
 * @param {string} relativeNameAttribute - Namn på medlemsattribut för namn för en anhörig
 * @param {string} relativeRelation - Namn på medlemsattribut för relation till anhörig
 * @param {number} relativeNumber - Vilket anhörignummer för en medlem
 * 
 * @returns {Object} - Ett medlemsobjekt skapat för en anhörig till en medlem
 */
function getContactForMemberRelative_(medlem, relativeNameAttribute, relativeRelation, relativeNumber)  {

  const tmpMemberRelative = {};

  const relativeMobileAttribute = "contact_mobile_" + relativeRelation;
  const relativeTelephoneAttribute = "contact_telephone_" + relativeRelation;
  const relativeEmailAttribute = "contact_email_" + relativeRelation;

  const nameOfRelative = getNameOfRelative_(medlem, relativeNameAttribute, relativeNumber);
  tmpMemberRelative['first_name'] = nameOfRelative['first_name'];
  tmpMemberRelative['last_name'] = nameOfRelative['last_name'];

  tmpMemberRelative['member_no'] = medlem['member_no'] + "-" + relativeNumber;
  //Denna relation kommer sen bli Anhörig 1 hos förälderns kontaktkort
  tmpMemberRelative['contact_mothers_name'] = medlem['first_name'] + " " + medlem['last_name'];

  
  tmpMemberRelative['contact_mobile_phone'] = medlem[relativeMobileAttribute];

  tmpMemberRelative['contact_home_phone'] = medlem[relativeTelephoneAttribute];

  tmpMemberRelative['email'] = medlem[relativeEmailAttribute];

  tmpMemberRelative['streetAddress'] = medlem['streetAddress'];
  
  tmpMemberRelative['extendedAddress'] = medlem['extendedAddress'];

  tmpMemberRelative['postcode'] = medlem['postcode'];

  tmpMemberRelative['town'] = medlem['town'];

  tmpMemberRelative['country'] = medlem['country'];

  tmpMemberRelative['group'] = medlem['group'];

  tmpMemberRelative['department'] = medlem['department'];

  tmpMemberRelative['date_of_birth_year'];
  tmpMemberRelative['date_of_birth_month'];
  tmpMemberRelative['date_of_birth_day'];

  tmpMemberRelative['title'] = "Anhörig " + relativeNumber;

  tmpMemberRelative['biographies'] = "";

  tmpMemberRelative['isRelativeContact'] = true;

  return tmpMemberRelative;
}


/**
 * Skapa ett medlemsobjekt för en anhörigs namn för en medlem
 * 
 * @param {Object} medlem - Ett medlemsobjekt
 * @param {string} relativeNameAttribute - Namn på medlemsattribut för namn för en anhörig
 * @param {number} relativeNumber - Vilket anhörignummer för en medlem
 * 
 * @returns {Object} - Ett medlemsobjekt för en medlem med endast attribut för namn
 */
function getNameOfRelative_(medlem, relativeNameAttribute, relativeNumber) {

  const nameOfRelative = {};

  if (medlem[relativeNameAttribute]) {  //Om något angivet
    
    let [huvud, ...rest] = medlem[relativeNameAttribute].split(" ");
    rest = rest.join(" ");  //Om dubbla efternamn för anhörig

    nameOfRelative['first_name'] = huvud;
    if (rest) {
      nameOfRelative['last_name'] = rest;
    }
    else  {
      nameOfRelative['last_name'] = medlem.last_name;
    }
  }
  else {  //Om namn saknas på anhörig
    nameOfRelative['first_name'] = medlem['first_name'];
    nameOfRelative['last_name'] = medlem['last_name'] + " - Anhörig " + relativeNumber;
  }

  return nameOfRelative;
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

  for (let i = 0; i < KONFIG.NOTE_KEYS_TO_REPLACE.length; i++) {
    if (note.includes(KONFIG.NOTE_KEYS_TO_REPLACE[i][0].toLowerCase())) {
      cleanNoteString += KONFIG.NOTE_KEYS_TO_REPLACE[i][1] + "\n";
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
    membersInAList.push(membersMultipleMailinglists[i].member_no + "-1");
    membersInAList.push(membersMultipleMailinglists[i].member_no + "-2");
  }
  return membersInAList;
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
      if (num_of_forced_updates < KONFIG.MAX_NUMBER_OF_CONTACTS_FORCE_UPDATE) {
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
  if (KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_SENDER_NAME) {
    emailOptions["name"] = KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_SENDER_NAME;
  }
  /***Avsändarnamn - Slut***/

  /***Avsändaradress***/
  if (KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_SENDER_FROM) {
    if (getAllowedFromEmailAdresses_().includes(KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_SENDER_FROM)) {
      emailOptions["from"] = KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_SENDER_FROM;
    }
    else {
      console.error("Angiven avsändaradress är ej godkänd");
      console.error("Avsändaradressen måste finnas upplagd som alias i din Gmail");
    }
  }
  /***Avsändaradress - Slut***/

  let contact_groups_email_plainBody_credentials = KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_PLAINBODY.replace("{{userEmail}}", userEmail);
  contact_groups_email_plainBody_credentials = contact_groups_email_plainBody_credentials.replace("{{password}}", password);

  let contact_groups_email_htmlBody_credentials = KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_HTMLBODY.replace("{{userEmail}}", userEmail);
  contact_groups_email_htmlBody_credentials = contact_groups_email_htmlBody_credentials.replace("{{password}}", password);

  emailOptions["htmlBody"] = contact_groups_email_htmlBody_credentials;

  console.info("Skickar e-post till " + userEmail);
  GmailApp.sendEmail(userEmail, KONFIG.CONTACT_GROUPS_EMAIL_CREDENTIALS_SUBJECT, contact_groups_email_plainBody_credentials, emailOptions);
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
          domain: KONFIG.DOMAIN,
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
