/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


let domain = 'hasselbyscout.se'; //Domänen/Webbsideadressen utan www till kåren och som används i Google Workspace

let groupId = '12'; //Kårens id som kan hittas i Scoutnet om du har tillräcklig behörighet


let api_key_list_all = 'jkdf949348948'; //Kan hittas i Scoutnet om du har tillräcklig behörighet

let api_key_mailinglists = 'jhshdfh98489498'; //Kan hittas i Scoutnet om du har tillräcklig behörighet

//Typ av organisationsenhet
let organisationType = 'group'; //Ska enbart ändras om du kör programmet för ett distrikt. Ska då bytas till district

//Adressen till Scoutnet. Ska ej ändras
let scoutnet_url = 'www.scoutnet.se'; //Scoutnets webbadress



let contact_groups_email_subject = "Användaruppgifter - Google kontaktgrupper synkning";

let contact_groups_email_sender_name = "";

let contact_groups_email_sender_from = "";

//Skapa din egen med hjälp av funktionen testGetHtmlEmailBody
/***Brödtext enkel***/
let contact_groups_email_plainBody = "Hej, Du har nyss försökt autentisera dig med en felaktig kombination av e-postadress och lösenord för att synkronisera kontaktgrupper. Vänligen använd följande uppgifter i stället: E-postadress: {{userEmail}} Lösenord: {{password}} Mvh";
/***Brödtext enkel - Slut***/

/***Brödtext Html***/
let contact_groups_email_htmlBody = '<div dir="ltr">Hej,<div><br></div><div>Du har nyss försökt autentisera dig med en felaktig kombination av e-postadress och lösenord för att synkronisera kontaktgrupper.</div><div><br></div><div>Vänligen använd följande uppgifter i stället:</div><div><br></div><div>E-postadress: {{userEmail}}</div><div>Lösenord: {{password}}</div><div><br></div><div>Mvh</div></div>';
/***Brödtext Html - Slut***/


let noteKeysToReplace = [
    ["lEdare", "Förälder har ledarintresse"],
    ["Rabatt", "Rabatter i butiker av intresse"],
  ];


/**
 * Testfunktion för att testa anrop med olika
 * användarnamn/lösenord
 */
function testaDoGet() {
  let e = {
    parameters : {
      username: "en e-postadress",
      password: "lösenord"
    }
  }
  doGet(e);
}


/**
 * Körs vid GET-anrop till webbappen
 * 
 * @param {Objekt} e - Query-parametrar vid GET-anrop till webbappen
 *
 * @returns {Object} - Ett objekt av typen TextOutput
 */
function doGet(e) {

  Logger.log(e);
  let params = e.parameters;

  if (Object.keys(params).length == 0)  {
    Logger.log("Inga parametrar angivna");
    return ContentService.createTextOutput("Inga parametrar angivna")
    .setMimeType(ContentService.MimeType.TEXT);
  }
  
  let userEmail = params.username[0];
  let userPassword = params.password[0];

  Logger.log("userEmail " + userEmail);

  let contactGroupsList;

  if (userEmail && checkCredentials_(userEmail, userPassword)) {
    //Hämta en lista över alla Google Grupper som denna person är med i
    let groups = getListOfGroupsForAUser_(userEmail);
    let listOfGroupEmails = getListOfGroupsEmails_(groups);

    contactGroupsList = getContactGroupsData_(listOfGroupEmails);
  }
  else  {
    contactGroupsList = "Du har angivet en felaktig kombination av e-postadress & lösenord. " +
                        "Om e-postadressen finns registrerad kommer det strax ett e-brev till " +
                        "dig med ditt lösenord";
  }

  Logger.log("Svar");
  Logger.log(contactGroupsList);

  let response = JSON.stringify(contactGroupsList);
  return ContentService.createTextOutput(response)
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * Uppdatera kalkylbladet med de användare som ska ha behörigheter
 */
function updateContactGroupsAuthnSheetUsers()  {

  let sheetDataKontakterAnvandare = getDataFromSheet_("Kontakter-Användare");

  let sheet = sheetDataKontakterAnvandare["sheet"];
  let selection = sheetDataKontakterAnvandare["selection"];
  let data = sheetDataKontakterAnvandare["data"];

  let grd = getKontaktGruppAuthnRubrikData_();

  let delete_rows = [];

  let listOfEmailsAlreadyAccess = [];
  
  let rowsToSync = findWhatRowsToSync(0, data.length, data.length);
  let start = rowsToSync.start;
  let slut = rowsToSync.slut;
  

  let listOfAllGoogleGroupsShouldHaveAccess = getListOfAllGoogleGroupsShouldHaveAccess_();
  let listOfEmailsShouldHaveAccess = getAllEmailsShouldHaveAccess_(listOfAllGoogleGroupsShouldHaveAccess);

  Logger.log("Startrad " + start + " slutrad " + slut);

  for (let i = start-1; i < slut; i++) {
    
    let email = data[i][grd["e-post"]];
    let password = data[i][grd["lösenord"]];
    let last_authn = data[i][grd["senast_använd"]];

    let rad_nummer = i+1;
    
    Logger.log('Rad: ' + rad_nummer + ' E-post: ' + email + ' Lösenord: ' + password + ' Senast använd: ' + last_authn);

    email = getGmailAdressWithoutDots(email.toLowerCase());
    if(!listOfEmailsShouldHaveAccess.includes(email))  {
      Logger.log("Användare har ej behörighet längre till en kontaktgrupp " + email);
      Logger.log("Försöker ta bort rad " + rad_nummer);
      delete_rows.push(rad_nummer);
      continue;
    }
    else  {
      Logger.log("Användare finns redan i listan " + email);
      listOfEmailsAlreadyAccess.push(email);

      if (!password)  {
        Logger.log("Lösenord saknas för denna användare");
        Logger.log("Skapar lösenord för denna användare");

        let cell=selection.getCell(rad_nummer, grd["lösenord"]+1);
        let password = createRandomPasswordForContactGroupsUser_();
        cell.setValue(password);
      }
    }
  }
  deleteRowsFromSpreadsheet(sheet, delete_rows);

  Logger.log("Lägga till dessa så att de får behörighet")
  for (let i = 0; i < listOfEmailsShouldHaveAccess.length; i++) {
    
    let email = listOfEmailsShouldHaveAccess[i];
    if(!listOfEmailsAlreadyAccess.includes(email))  {
      
      Logger.log(email);
      let password = createRandomPasswordForContactGroupsUser_();
      sheet.appendRow([email, password]);      
    }
  }  
}


/**
 * Generera ett lösenord för en användare för kontaktgrupper
 * 
 * @returns {String} - Ett slumpvis genererat lösenord
 */
function createRandomPasswordForContactGroupsUser_() {

  let lengthForPassword = 15;

  let password = "";
  let possibleCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz0123456789";

  for (let i = 0; i < lengthForPassword; i++) {
    password += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
  }
  Logger.log(password);
  return password;
}


/**
 * Ger lista över de Google-grupper vars medlemmar ska ha behörighet
 * 
 * @returns {String[]} - Lista över e-postadresser för Google-grupper
 */
function getListOfAllGoogleGroupsShouldHaveAccess_()  {

  updateListOfGroups();

  let sheetDataKontakter = getDataFromSheet_("Kontakter");

  let data = sheetDataKontakter["data"];

  let rowsToSync = findWhatRowsToSync(0, data.length, data.length);
  let start = rowsToSync.start;
  let slut = rowsToSync.slut;

  let listOfAllGoogleGroupsShouldHaveAccess = [];

  let grd = getKontaktGruppKonfigRubrikData_();

  Logger.log("Lista över e-postadresser för Google-grupper vars medlemmar ska ha behörighet");

  for (let i = start-1; i < slut; i++) {

    let email = data[i][grd["e-post"]];
    if (checkIfGroupExists(email)) {
      listOfAllGoogleGroupsShouldHaveAccess.push(email);
    }
  }

  Logger.log(listOfAllGoogleGroupsShouldHaveAccess);
  return listOfAllGoogleGroupsShouldHaveAccess;
}


/**
 * Ger e-postadresser för de som är medlemmar i angivna Google-grupper
 * 
 * @param {String[]} listOfAllGoogleGroupsShouldHaveAccess - Lista över e-postadresser för Google-grupper
 * 
 * @returns {String[]} - Lista över e-postadresser för de som är med i angivna Google-grupper
 */
function getAllEmailsShouldHaveAccess_(listOfAllGoogleGroupsShouldHaveAccess) {

  let listOfAllEmails = [];

  for (let i = 0; i < listOfAllGoogleGroupsShouldHaveAccess.length; i++) {
    
    let email = listOfAllGoogleGroupsShouldHaveAccess[i];

    let groupMembers = getGroupMembers(email);

    let listOfEmails = getListOfEmailsFromListOfGroupMembers_(groupMembers);
    listOfAllEmails.push.apply(listOfAllEmails, listOfEmails);
  }

  Logger.log("Användare som ska ha behörighet");
  listOfAllEmails = removeDublicates(listOfAllEmails);
  Logger.log(listOfAllEmails);
  return listOfAllEmails;
}


/**
 * Ger lista med e-postadresser för de medlemsobjekt i angiven lista
 * 
 * @param {Objekt[]} groupMembers - Lista med medlemsobjekt
 * 
 * @returns {String[]} - Lista över e-postadresser för de angivna medlemsobjekten
 */
function getListOfEmailsFromListOfGroupMembers_(groupMembers)  {

  let listOfEmails = [];

  for (let i = 0; i < groupMembers.length; i++) {

    let email = groupMembers[i].email;
    listOfEmails.push(email);
  }
  return listOfEmails;
}


/**
 * Hämta data från ett kalkylblad
 *
 * @param {String} nameOfSheet - Namn på kalkylbladet
 * 
 * @returns {Objekt} - Objekt bestående av data från aktuellt kalkylblad
 */
function getDataFromSheet_(nameOfSheet)  {
  let spreadsheetUrl_Kontakter = 'https://docs.google.com/spreadsheets/d/kjdskdjf32332/edit';

  let sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Kontakter).getSheetByName(nameOfSheet);
  if (sheet == null) {
    Logger.log("Bladet " + nameOfSheet + " finns ej i kalkylarket");
  }
  let selection = sheet.getDataRange();
  let data = selection.getValues();

  let sheetData = {};
  sheetData["sheet"] = sheet;
  sheetData["selection"] = selection;
  sheetData["data"] = data;

  Logger.log(sheetData["data"]);
  return sheetData;
}


/**
 * Hämta data över alla kontaktgrupper aktuella för angivna Google Grupper
 *
 * @param {String[]} listOfGroupEmails - Lista över e-postadresser för Google Grupper
 * 
 * @returns {Objekt[][]} - Lista med medlemsobjekt för aktuella kontaktgrupper
 */
function getContactGroupsData_(listOfGroupEmails)  {

  let sheetDataKontakter = getDataFromSheet_("Kontakter");

  let sheet = sheetDataKontakter["sheet"];
  let selection = sheetDataKontakter["selection"];
  let data = sheetDataKontakter["data"];

  let grd = getKontaktGruppKonfigRubrikData_();

  let delete_rows = [];

  let contactGroupsList = [];

  //Hämta lista med alla medlemmar i kåren och alla deras attribut
  let allMembers = fetchScoutnetMembers();
  allMembers = filterMemberAttributes_(allMembers);

  let rowsToSync = findWhatRowsToSync(0, data.length, data.length);
  let start = rowsToSync.start;
  let slut = rowsToSync.slut;

  updateListOfGroups();

  Logger.log("Startrad " + start + " slutrad " + slut);

  for (let i = start-1; i < slut; i++) {
    
    let name = data[i][grd["namn"]];
    let email = data[i][grd["e-post"]];
    let scoutnet_list_id = data[i][grd["scoutnet_list_id"]];
    
    if(!listOfGroupEmails.includes(email))  {
      Logger.log("Användare ej med i Google Gruppen " + email);
      continue;
    }
    else  {
      Logger.log("Användare med i Google Gruppen " + email);
    }

    let rad_nummer = i+1;
    
    Logger.log('Rad: ' + rad_nummer + ' Namn: ' + name + ' E-post: ' + email + ' Scoutnet: ' + scoutnet_list_id);

    let updateContactGroup = true;

    if (email=="" && scoutnet_list_id=="") { //Ta bort raden
      Logger.log("Försöker ta bort rad " + rad_nummer);
      
      delete_rows.push(rad_nummer);
      updateContactGroup = false;
    }

    if (name=="") {
      let cell=selection.getCell(rad_nummer,grd["namn"]+1);
      Logger.log("Sätter cellen för namn till gul");
      cell.setBackground("yellow");
    }
    else if (name!="") {
      let cell=selection.getCell(rad_nummer,grd["namn"]+1);
      if ("#ffffff" != cell.getBackground()) {
        Logger.log("Sätter cellen för namn till vit");
        cell.setBackground("white");
      }
    }
    
    if (email!="" && checkIfEmailIsAGroup(email)) {
      let cell=selection.getCell(rad_nummer,grd["e-post"]+1);
      if ("#ffffff" != cell.getBackground()) {
        Logger.log("Sätter cellen för e-post till vit");
        cell.setBackground("white");
      }
    }
    else  {
      let cell=selection.getCell(rad_nummer,grd["e-post"]+1);
      Logger.log("Sätter cellen för e-post till röd");
      cell.setBackground("red");
    }

    if (updateContactGroup) {
      //Hämta uppdatering av kontaktgruppsinfo
      let memberNumbersInAList = getUpdateForContactGroup_(selection, rad_nummer, data[i], grd);
      Logger.log("memberNumbersInAList");
      Logger.log(memberNumbersInAList);

      contactGroupsList.push(memberNumbersInAList);   
    }
  }
  
  let memberNumbersList = getMemberNumbersFromContactGroupsList_(contactGroupsList);
  let memberList = getMembersForContactGroupsByMemberNumbers_(allMembers, memberNumbersList);
  //Logger.log("memberlist");
  //Logger.log(memberList);

  //Lägga memberList först i en listan
  contactGroupsList.unshift(memberList);

  deleteRowsFromSpreadsheet(sheet, delete_rows);

  return contactGroupsList;
}


/**
 * Ger lista med unika medlemsnummer för de som är med i någon kontaktgrupp
 *
 * @param {Objekt[]} allMembers - Lista av medlemsobjekt
 * @param {Number[]} - Lista med medlemsnummer
 *  
 * @returns {Objekt[]} - Lista av medlemsobjekt för endast de med angivna
 * medlemsnummer samt tillagt attribut anpassat för Google Kontakter
 */
function getMembersForContactGroupsByMemberNumbers_(allMembers, memberNumbers) {

  let memberList = [];

  for (let i = 0; i < memberNumbers.length; i++) {

    let obj = allMembers.find(obj => obj.member_no == memberNumbers[i]);

    let emailList = getEmailListSyncOption(obj, "", false);

    obj.google_contact_group = makeStringForGoogleContactGroup_(emailList);
    memberList.push(obj);

    //Logger.log("obj");
    //Logger.log(obj);
  }

  return memberList;
}


/**
 * Ger lista med unika medlemsnummer för de som är med i någon kontaktgrupp
 *
 * @param {Objekt[][]} contactGroupsList - Lista av listor med kontaktgruppsinformation och medlemsnummer för de i respektive grupp
 *  
 * @returns {Number[]} - Lista med unika medlemsnummer för de som är med i någon kontaktgrupp
 */
function getMemberNumbersFromContactGroupsList_(contactGroupsList)  {

  let memberNumbers = [];

  for (let i = 0; i<contactGroupsList.length; i++) {

    let contactGroupList = contactGroupsList[i];
    for (let k = 1; k<contactGroupList.length; k++) {
      memberNumbers.push(contactGroupList[k]);
    }
  }

  //Ta bort dubletter
  memberNumbers = removeDublicates(memberNumbers);

  Logger.log("memberNumbers");
  Logger.log(memberNumbers);
  return memberNumbers;
}


/**
 * Ger lista av medlemsobjekt där vissa medlemsattribut tagits bort
 *
 * @param {Objekt[]} medlemmar - Lista av medlemsobjekt
 *  
 * @returns {Objekt[]} - Lista av medlemsobjekt med färre medlemsattribut
 */
function filterMemberAttributes_(medlemmar) {

  Logger.log(medlemmar);
  let filteredMembers = [];

  let attribut_lista = ['member_no', 'first_name', 'last_name', 'nickname', 'contact_leader_interest', 'date_of_birth',
                        'group', 'unit', 'group_role',
                        'sex', 'address_1', 'address_2', 'postcode', 'town',
                        'country', 'contact_mobile_phone', 'contact_home_phone', 'contact_mothers_name',
                        'contact_mobile_mum', 'contact_telephone_mum', 'contact_fathers_name', 'contact_mobile_dad',
                        'contact_telephone_dad', 'note', 'avatar_updated', 'avatar_url',
                        'email', 'contact_email_mum', 'contact_email_dad', 'contact_alt_email'];

  for (let i = 0; i<medlemmar.length; i++) {
    //Logger.log(medlemmar[i]);
    let member = {};

    member['biographies'] = "";

    for (let k = 0; k<attribut_lista.length; k++) {
      let nameOfAttribute = attribut_lista[k];

      if ('group_role' == nameOfAttribute) {
        if (medlemmar[i]['group_role'] && medlemmar[i]['unit_role']) {
          member['title'] = medlemmar[i]['group_role'] + ", " + medlemmar[i]['unit_role'];
        }
        else if (medlemmar[i]['group_role'])  {
          member['title'] = medlemmar[i]['group_role'];
        }
        else if (medlemmar[i]['unit_role'])  {
          member['title'] = medlemmar[i]['unit_role'];
        }
      }
      else if ('address_1' == nameOfAttribute)  {
        if (medlemmar[i]['address_co']) {
          member['streetAddress'] = "c/o " + medlemmar[i]['address_co'] + ", " + medlemmar[i]['address_1'];
        }
        else {
          member['streetAddress'] = medlemmar[i]['address_1'];
        }
      }
      else if ('address_2' == nameOfAttribute)  {
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
      else if ('unit' == nameOfAttribute)  {
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
      else if ('sex' == nameOfAttribute)  {
         member['sex'] = translateGenderToEnglish(medlemmar[i]['sex']);
      }
      else if ('date_of_birth' == nameOfAttribute)  {
        member['date_of_birth_year'] = medlemmar[i]['date_of_birth'].substr(0, 4);
        member['date_of_birth_month'] = medlemmar[i]['date_of_birth'].substr(5, 2);
        member['date_of_birth_day'] = medlemmar[i]['date_of_birth'].substr(8, 2);
      }
      else if ('contact_leader_interest' == nameOfAttribute) {
        member['biographies'] += getTextIfContactLeaderInterest_(medlemmar[i]['contact_leader_interest']);
      }
      else if ('note' == nameOfAttribute)  {  
        member['biographies'] += cleanNote_(medlemmar[i]['note']);
      }
      else  {
        member[nameOfAttribute] = medlemmar[i][nameOfAttribute];
      }
    }

    filteredMembers.push(member);
  }
  //Logger.log(filteredMembers);
  return filteredMembers;
}



/**
 * Ger rensad text för eventuell inlagd anteckning
 * 
 * @param {String} note - Anteckning för en medlemsprofil
 * 
 * @returns {String} - Sammanfattad info om given anteckning
 */
function cleanNote_(note)  {
  
  let cleanNoteString = "";

  if ("" == note) {
    return "";
  }

  note = note.toLowerCase();

  for (let i = 0; i<noteKeysToReplace.length; i++) {
    if (note.includes(noteKeysToReplace[i][0].toLowerCase())) {
      cleanNoteString += noteKeysToReplace[i][1] + ". ";
    }
  }
  return cleanNoteString;
}


/**
 * Ger text för eventuellt ledarintresse inlagt
 * 
 * @param {String} contact_leader_interest - Ja om intresse finns
 * 
 * @returns {String} - Mening om att hjälpa till eller ingen text beroende på indata
 */
function getTextIfContactLeaderInterest_(contact_leader_interest)  {

  if ("Ja" == contact_leader_interest) {
    return "Förälder kan hjälpa till i kåren. ";
  }
  return "";
}


/**
 * Översätt kön till motsvarande engelsk term för en kontakt
 * 
 * @param {String} gender - Kön för en person
 * 
 * @returns {String} - Motsvarande kön på engelska för Googles API
 */
function translateGenderToEnglish(gender) {

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
 * @param {Objekt} selection - Hela området på kalkylarket som används
 * @param {Int} rad_nummer - Radnummer för aktuell grupp i kalkylarket
 * @param {String[]} radInfo - Lista med data för aktuell rad i kalkylarket
 * @param {String[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * 
 * @returns {Objekt[]} - Lista med kontaktgruppsinformation och medlemsnummer för de i gruppen
 */
function getUpdateForContactGroup_(selection, rad_nummer, radInfo, grd) {

  let name = radInfo[grd["namn"]];

  let scoutnet_list_id = radInfo[grd["scoutnet_list_id"]]; //Själva datan
  let cell_scoutnet_list_id = selection.getCell(rad_nummer, grd["scoutnet_list_id"]+1); //Range

  let tmpMembersInAList = fetchScoutnetMembersMultipleMailinglists(scoutnet_list_id, cell_scoutnet_list_id, "");
  
  let contactGroupInfo = {
    name: name
  };

  let membersInAList = [];
  membersInAList.push(contactGroupInfo);

  for (let i = 0; i<tmpMembersInAList.length; i++) {
    membersInAList.push(tmpMembersInAList[i].member_no);
  }
  return membersInAList;
}


/**
 * Ger en textsträng med e-postadresser anpassas för Google Kontakter
 * 
 * @param {String[]} - Lista över e-postadresser enligt specificerade attribut
 *
 * @returns {Object[]} - Textsträng för e-postadresser i Google Kontakter
 */
function makeStringForGoogleContactGroup_(emailList)  {

  //Skapa lista med enbart korrekta e-postadresser
  let realEmailList = [];
  for (let i = 0; i<emailList.length; i++) {
    if (checkIfEmail(emailList[i])) {
      realEmailList.push(emailList[i]);
    }
    else {
      Logger.log("Ogiltig e-postadress " + emailList[i]);
    }
  }

  //Ta bort dubletter
  realEmailList = removeDublicates(realEmailList);

  let contactGroupList = [];
  for (let i = 0; i<realEmailList.length; i++) {
    
    if (0 == i) {
      if (realEmailList.length == 1) {
        contactGroupList.push(realEmailList[i]);
        //Logger.log("Första och enda elementet " + realEmailList[i]);
      }
      else  {
        contactGroupList.push(realEmailList[i] + ">");
        //Logger.log("Första elementet " + realEmailList[i]);
      }      
    }
    else if (realEmailList.length-1 == i) {
      contactGroupList.push("<" + realEmailList[i]);
      //Logger.log("Sista elementet " + realEmailList[i]);
    }
    else {
      contactGroupList.push("<" + realEmailList[i] + ">");
      //Logger.log("Ett element i mitten någonstans " + realEmailList[i]);
    }
  }
  contactGroupList = contactGroupList.toString();
  return contactGroupList;
}


/**
 * Kontrollerar om inskickade autentiseringsuppgifter är giltiga
 * 
 * @param {String} userEmail - E-postadress för en användare
 * @param {String} password - Lösenord för en användare för synkning av kontaktgrupper
 * 
 * @returns {Boolean} - Gällande om inskickade autentiseringsuppgifter är giltiga
 */
function checkCredentials_(userEmail, userPassword) {
  
  Logger.log("Kontrollerar om följande uppgifter är giltiga")
  
  userEmail = getGmailAdressWithoutDots(userEmail.toLowerCase());

  Logger.log("Inskickad data");
  Logger.log("userEmail: " + userEmail);
  Logger.log("userPassword: " + userPassword);

  let sheetDataKontakterAnvandare = getDataFromSheet_("Kontakter-Användare");

  let sheet = sheetDataKontakterAnvandare["sheet"];
  let selection = sheetDataKontakterAnvandare["selection"];
  let data = sheetDataKontakterAnvandare["data"];

  let grd = getKontaktGruppAuthnRubrikData_();

  
  let rowsToSync = findWhatRowsToSync(0, data.length, data.length);
  let start = rowsToSync.start;
  let slut = rowsToSync.slut;

  Logger.log("Startrad " + start + " slutrad " + slut);

  for (let i = start-1; i < slut; i++) {
    
    let email = data[i][grd["e-post"]];
    let password = data[i][grd["lösenord"]];
    let last_authn = data[i][grd["senast_använd"]];

    email = getGmailAdressWithoutDots(email.toLowerCase());

    if (email != userEmail) {
      continue;
    }

    let rad_nummer = i+1;
    
    Logger.log('Rad: ' + rad_nummer + ' E-post: ' + email + ' Lösenord: ' + password + ' Senast använd: ' + last_authn);

    if (password != userPassword) {
      Logger.log("Felaktigt lösenord angivet " + userPassword);
      sendEmailWithContactsGroupsPassword_(userEmail, password);
      return false;
    }
    Logger.log("Korrekt angivet lösenord för angiven e-postadress");
    let cell = selection.getCell(rad_nummer, grd["senast_använd"]+1);
    let datum = new Date();
    cell.setValue(datum).setNumberFormat("yyyy-MM-dd hh:mm:ss");
    Logger.log("Uppdatera datum i kalkylblad för senast använd " + datum);
    return true;
  }

  Logger.log("Användaren finns ej i listan och saknar därmed behörighet");
  return false;
}


/**
 * Skicka e-brev till angiven e-postadress med information
 * om korrekt autentiseringsuppgifter för denna användare
 * 
 * @param {String} userEmail - E-postadress för en användare
 * @param {String} password - Lösenord för en användare för synkning av kontaktgrupper
 */
function sendEmailWithContactsGroupsPassword_(userEmail, password) {

  let emailOptions = {};

  /***Avsändarnamn***/
  if (contact_groups_email_sender_name)  {
    emailOptions["name"] = contact_groups_email_sender_name;
  }
  /***Avsändarnamn - Slut***/

  /***Avsändaradress***/
  if (contact_groups_email_sender_from)  {
    if (isFromEmailAdressAllowed(contact_groups_email_sender_from)) {
      emailOptions["from"] = contact_groups_email_sender_from;
    }
    else  {
      Logger.log("Angiven avsändaradress är ej godkänd");
      Logger.log("Avsändaradressen måste finnas upplagd som alias i din Gmail");
    }
  }
  /***Avsändaradress - Slut***/

  contact_groups_email_plainBody = contact_groups_email_plainBody.replace("{{userEmail}}", userEmail);
  contact_groups_email_plainBody = contact_groups_email_plainBody.replace("{{password}}", password);

  contact_groups_email_htmlBody = contact_groups_email_htmlBody.replace("{{userEmail}}", userEmail);
  contact_groups_email_htmlBody = contact_groups_email_htmlBody.replace("{{password}}", password);

  emailOptions["htmlBody"] = contact_groups_email_htmlBody;

  Logger.log("Skickar e-post till " + userEmail);
  GmailApp.sendEmail(userEmail, contact_groups_email_subject, contact_groups_email_plainBody, emailOptions);
}


/**
 * En testfunktion för att själv kunna få fram oformaterad brödtext för e-brev
 * samt html-formaterad brödtext för e-brev.
 * 
 * Skapa ett utkast i din Gmail med ämne satt till Kontaktgrupper och kör sen
 * denna funktion så skrivs brödtexten ut i körningsloggen. 
 */
function testGetHtmlEmailBody() {
  
  let subject = "Kontaktgrupper";

  let draft = getDraft(subject);

  if (!draft) { //Kolla om ämnesraden är korrekt
    Logger.log("Finns ej ett utkast i Gmail med korrekt ämnesrad");
    return;
  }

  let plainBody = draft.getPlainBody();
  let body = draft.getBody();

  Logger.log("plainBody");
  Logger.log(plainBody);

  Logger.log("body");
  Logger.log(body);
}


/**
 * Ger lista över de grupper som denna person är med i
 * 
 * @param {String} userKey - Unikt identifierare för en person
 *
 * @returns {Object[]} - Lista över grupper som denna person är med i
 */
function getListOfGroupsForAUser_(userKey) {
  
  Logger.log("Hämtar lista över alla grupper som denna person är med i");
  let listOfGroups = [];

  let pageToken, page;
  do {
    page = AdminDirectory.Groups.list({
      domain: domain,
      maxResults: 150,
      pageToken: pageToken,
      userKey: userKey
    });
    let groups = page.groups;
    if (groups) {   
      for (let i = 0; i < groups.length; i++) {

        let group = {
          email: groups[i].email,
          id: groups[i].id,
          name: groups[i].name
        };
        //Logger.log(group);
        listOfGroups.push(group);
      }      
    }
    else {
      Logger.log('Inga grupper hittades.');      
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  //Logger.log(listOfGroups);
  //Logger.log(listOfGroups.length);
  return listOfGroups;
}


/**
 * Ger lista över de grupper som denna person är med i
 * 
 * @param {Object[]} - Lista med objekt av grupper
 *
 * @returns {String[]} - Lista med e-postadresser för alla angivna grupper
 */
function getListOfGroupsEmails_(groups)  {

  let listOfGroupsEmails = [];

  for (let i = 0; i < groups.length; i++) {
    listOfGroupsEmails.push(groups[i].email);
  }
  Logger.log(listOfGroupsEmails);
  return listOfGroupsEmails;
}


/**
 * Returnerar lista med vilket index som olika rubriker har i kalkylarket
 * för bladet Kontakter-Användare
 *
 * @returns {Objekt[]} - Objekt med rubrik som attribut och dess rubrikindex som värde
 */
function getKontaktGruppAuthnRubrikData_() {
  
  //Siffran är vilken kolumn i kalkylarket.
  let kontaktgruppAuthnRubrikData = {};
  kontaktgruppAuthnRubrikData["e-post"] = 0;
  kontaktgruppAuthnRubrikData["lösenord"] = 1;

  kontaktgruppAuthnRubrikData["senast_använd"] = 2;

  return kontaktgruppAuthnRubrikData;
}


/**
 * Returnerar lista med vilket index som olika rubriker har i kalkylarket
 * för bladet Kontakter
 *
 * @returns {Objekt[]} - Objekt med rubrik som attribut och dess rubrikindex som värde
 */
function getKontaktGruppKonfigRubrikData_() {
  
  //Siffran är vilken kolumn i kalkylarket.
  let kontaktgruppKonfigRubrikData = {};
  kontaktgruppKonfigRubrikData["namn"] = 0;
  kontaktgruppKonfigRubrikData["e-post"] = 1;

  kontaktgruppKonfigRubrikData["scoutnet_list_id"] = 2;

  return kontaktgruppKonfigRubrikData;
}
