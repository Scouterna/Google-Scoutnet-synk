/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Uppdatera medlemslistor för aktuella rader i kalkylarket
 * 
 * @param {Object} INPUT_KONFIG_OBJECT - Objekt med kårens konfiguration
 * @param {number} start - Rad att börja uppdatera på
 * @param {number} slut - Rad att sluta uppdatera på
 */
function uppdateraMedlemslistor(INPUT_KONFIG_OBJECT, start, slut) {
  synkroniseraMedlemslistor(INPUT_KONFIG_OBJECT, start, slut, true, false);
}


/**
 * Skicka ut e-brev till de som ska få det för angivna medlemlistor
 * 
 * @param {Object} INPUT_KONFIG_OBJECT - Objekt med kårens konfiguration
 * @param {number} start - Rad att börja gå igenom för att skicka ut e-brev på
 * @param {number} slut - Rad att sluta gå igenom för att skicka ut e-brev på
 */
function skickaUtTillMedlemslistor(INPUT_KONFIG_OBJECT, start, slut)  {
  synkroniseraMedlemslistor(INPUT_KONFIG_OBJECT, start, slut, false, true);
}


/**
 * Funktion att använda för att synkronisera en medlemlista
 * 
 * @param {Object} INPUT_KONFIG_OBJECT - Objekt med kårens konfiguration
 * @param {number} radNummer - Rad att synkronisera
 * @param {boolean} shouldUpdate - Om medlemslistan ska uppdateras
 * @param {boolean} shouldSend - Om e-brev ska skickas ut till medlemlemslistan
 */
function synkroniseraMedlemslistorEnRad(INPUT_KONFIG_OBJECT, radNummer, shouldUpdate, shouldSend) {
  synkroniseraMedlemslistor(INPUT_KONFIG_OBJECT, radNummer, radNummer, shouldUpdate, shouldSend);
}


/**
 * Huvudfunktion för att hantera synkronisering av medlemslistor med Scoutnet
 * 
 * @param {Object} INPUT_KONFIG_OBJECT - Objekt med kårens konfiguration
 * @param {number} start - Rad att börja synkronisera på
 * @param {number} slut - Rad att sluta synkronisera på
 * @param {boolean} shouldUpdate - Om medlemslistan ska uppdateras
 * @param {boolean} shouldSend - Om e-brev ska skickas ut till medlemlemslistan
 */
function synkroniseraMedlemslistor(INPUT_KONFIG_OBJECT, start, slut, shouldUpdate, shouldSend) {
  
  const forceUpdate = true;

  console.time("Medlemslistor");

  KONFIG = INPUT_KONFIG_OBJECT;

  const sheetDataMedlemslistor = getDataFromActiveSheet_("Medlemslistor");
  const grd = getMedlemslistorKonfigRubrikData_();
  //Hämta lista med alla medlemmar i kåren och alla deras attribut
  const allActiveMembers = fetchScoutnetMembers_(true, false);
  const allWaitingMembers = fetchScoutnetMembers_(true, true);
  const allMembers = [...allActiveMembers, ...allWaitingMembers];
  addExtraMemberAttributes_(allMembers);
  console.info("Antal medlemmar i kåren samt väntelistan " + allMembers.length);

  const sheet = sheetDataMedlemslistor["sheet"];
  const selection = sheetDataMedlemslistor["selection"];
  const data = sheetDataMedlemslistor["data"];
  
  const delete_rows = [];
  
  const rowsToSync = findWhatRowsToSync_(start, slut, data.length);
  start = rowsToSync.start;
  slut = rowsToSync.slut;
  console.info("Rader att synkronisera - startrad " + start + " slutrad " + slut);
  
  for (let i = start-1; i < slut; i++) {
    
    const name = data[i][grd["namn"]];
    const scoutnet_list_id = data[i][grd["scoutnet_list_id"]];
    const spreadsheetUrl = data[i][grd["spreadsheetUrl"]];
    
    const rad_nummer = i + 1;
    console.time("Rad: " + rad_nummer + " - " + name); //Detta då namnfältet skulle kunna vara tomt
    console.info("----------------------------------");
    console.info('Rad: ' + rad_nummer + ' Namn: ' + name + ' Scoutnet: ' + scoutnet_list_id + ' spreadsheetUrl: ' + spreadsheetUrl);

    let update_memberlist = true;
    
    let cell = selection.getCell(rad_nummer, grd["namn"]+1);
    if (!name) { //Kolla om fältet för namn är angivet
      cell.setBackground("yellow");
    }
    else {
      setBackgroundColour_(cell, "white", false);
    }
    
    if (!spreadsheetUrl) { //Inget kalkylark är angivet
      if (!name && !scoutnet_list_id) { //Ta bort raden
        console.log("Försöker ta bort rad " + rad_nummer);
        delete_rows.push(rad_nummer);
      }
      else {
        //Kalkylark är ej angivet
        continue;
      }
      update_memberlist = false;
    }
    
    const rowSpreadsheet = openSpreadsheetUrlForMemberlist_(selection, rad_nummer, grd, spreadsheetUrl);
    if (!rowSpreadsheet)  {
      update_memberlist = false;
    }
    
    if (update_memberlist) {
      if (null === shouldUpdate || shouldUpdate) {
        //Uppdatera aktuell medlemslista
        updateMemberlist_(selection, rad_nummer, data[i], grd, allMembers, rowSpreadsheet, forceUpdate);
      }
      if (null === shouldSend || shouldSend) {
        //Skicka ut e-brev till de i medlemslistan
        skickaMedlemslista_(selection, rad_nummer, data[i], grd, rowSpreadsheet);
      }
    }
    console.timeEnd("Rad: " + rad_nummer + " - " + name);
  }
  //Ta bort tomma rader i kalkylarket
  deleteRowsFromSpreadsheet_(sheet, delete_rows);
  console.timeEnd("Medlemslistor");
}


/**
 * Returnerar lista med vilket index som olika rubriker har i kalkylbladet
 *
 * @returns {number[]} - Lista med rubrikindex för respektive rubrik
 */
function getMedlemslistorKonfigRubrikData_() {
  
  //Siffran är vilken kolumn i kalkylarket.
  const medlemslistaKonfigRubrikData = {};
  medlemslistaKonfigRubrikData["namn"] = 0;
  medlemslistaKonfigRubrikData["scoutnet_list_id"] = 1;
  medlemslistaKonfigRubrikData["spreadsheetUrl"] = 2;
  medlemslistaKonfigRubrikData["email_draft_subject"] = 3;
  medlemslistaKonfigRubrikData["email_condition"] = 4;
  medlemslistaKonfigRubrikData["email_document_merge"] = 5;

  medlemslistaKonfigRubrikData["email_sender_name"] = 6;
  medlemslistaKonfigRubrikData["email_sender_email"] = 7;
  medlemslistaKonfigRubrikData["email_replyto"] = 8;
  medlemslistaKonfigRubrikData["email_noreply"] = 9;
  
  medlemslistaKonfigRubrikData["email_recipient"] = 10;
  medlemslistaKonfigRubrikData["email_cc"] = 11;
  medlemslistaKonfigRubrikData["email_bcc"] = 12;

  return medlemslistaKonfigRubrikData;
}


/**
 * Skapa kolumnrubriker i kalkylarket för medlemslistor konfiguration
 * 
 * @param {Object} INPUT_KONFIG_OBJECT - Objekt med kårens konfiguration
 */
function skapaRubrikerMedlemslistor(INPUT_KONFIG_OBJECT) {

  KONFIG = INPUT_KONFIG_OBJECT;

  const sheetDataMedlemslistor = getDataFromActiveSheet_("Medlemslistor");

  const sheet = sheetDataMedlemslistor["sheet"];
  //const selection = sheetDataMedlemslistor["selection"];
  //const data = sheetDataMedlemslistor["data"];
  const mlkrd = getMedlemslistorKonfigRubrikData_();

  // Frys de två översta raderna på arket så att rubrikerna alltid syns
  sheet.setFrozenRows(2);

  /********Rad 1********************/
  const range1_rad1 = sheet.getRange(1, mlkrd["email_sender_name"]+1, 1, 4);
  const range2_rad1 = sheet.getRange(1, mlkrd["email_recipient"]+1, 1, 3);
  
  //Inga angivna celler på rad 1 är sammanfogade
  if (! (range1_rad1.isPartOfMerge() || range2_rad1.isPartOfMerge())) { 
    
    console.log("Inga av de angivna cellerna på rad 1 är sammanfogade");
    range1_rad1.merge();
    range2_rad1.merge();
    console.log("Vi har nu sammanfogat dem");
  }
  else {
    console.log("Några celler är sedan tidigare sammanfogade på rad 1, så vi gör inget åt just det");
  }

  const values_rad1 = [
    ["Avsändare", "", "", "", "Mottagare", "", ""]
  ];

  // Sätter området för cellerna som vi ska ändra
  // De 7 kolumnerna för att styra e-postinställningar
  const range_rad1 = sheet.getRange(1, mlkrd["email_sender_name"]+1, 1, 7);
  range_rad1.setHorizontalAlignment("center");
  range_rad1.setFontWeight("bold");

  // Sätter våra rubriker på vårt område
  range_rad1.setValues(values_rad1);

  /*******Rad 2********************/
  // Våra värden vi vill ha som rubriker för de olika kolumnerna på rad 2
  const values_rad2 = [
    ["Namn", "Scoutnet-id", "Länk till kalkylark", "Ämnesrad på utkastet i Gmail", "Villkor", "Koppla dokument",
    "Avsändare namn", "Avsändare e-post", "Svarsadress e-post", "Svara-ej",
    "Mottagare e-post", "Kopia e-post", "Blindkopia e-post"]
  ];

  // Sätter området för cellerna på rad 2 som vi ska ändra
  const range_rad2 = sheet.getRange(2, 1, 1, values_rad2[0].length);

  // Sätter våra rubriker på vårt område
  range_rad2.setValues(values_rad2);
  range_rad2.setFontWeight("bold");
  range_rad2.setFontStyle("italic");
  /*******************************/

  /*******Sätt kantlinjer*********/ 
  const kolumn1 = getA1RangeOfColumns_(sheet, mlkrd["email_sender_name"]+1, 4);
  //Kolumnen för scoutnet_list_id;
  kolumn1.setBorder(null, true, null, true, null, null);
  
  const kolumn2 = getA1RangeOfColumns_(sheet, mlkrd["email_recipient"]+1, 3);
  kolumn2.setBorder(null, true, null, true, null, null);
  /*******************************/
}


/**
 * Ställer in egna attribut och de funktioner som körs för att räkna ut
 * värdet på attributet för respektive person.
 * Funktionerna använder R1C1 notation för att skriva formeln i google kalkylark
 * och hänvisar då relativt aktuell kolumn till en rad R eller kolumn C från denna
 * R[0]C[-37] betyder därmed att man hänvisar till samma rad (0 rader förändring) och
 * till värdet i cellen 37 kolumner till vänster.
 * 
 * Vilken plats som varje eget attribut får är att först sätts alla standardattribut
 * ut och sedan nedanstående i ordning. Enklast är att testa för att se till att det
 * blir korrekt.
 * Observera att dessa påverkar alla medlemslistor som används, så var försiktig om du
 * tar bort någon funktion nedan då den kanske används i någon annan lista.
 */
MEDLEMSLISTA_EGNA_ATTRIBUT_FUNKTIONER = [
  ];


/**
 * Lägger till extra medlemsattribut till kårens medlemmar
 * 
 * @param {Object[]} allMembers - Lista med medlemsobjekt för alla medlemmar i kåren & väntelistan
 */
function addExtraMemberAttributes_(allMembers) {

  const date = new Date();
  const todayDate = date.toLocaleString('sv-SE', { timeZone: "Europe/Paris"});

  let useraccounts = getGoogleAccounts_();

  for (let i = 0; i < allMembers.length; i++) {
    const member = allMembers[i];
    
    addExtraMemberAttributeAge_(member, todayDate);
    addExtraMemberAttributeDaysUntilBirthday_(member, todayDate);
    addExtraMemberAttributeNumberOfDaysAsMember_(member, todayDate);
    addExtraMemberAttributeEmailSameAsParents_(member)
    addExtraMemberAttributeUserAccount_(useraccounts, member, todayDate);
  }
}


/**
 * Lägger till extra medlemsattribut gällande ålder på medlem
 * 
 * @param {Object} member - Medlemsobjekt för en medlem
 * @param {string} todayDate - Dagens datum
 */
function addExtraMemberAttributeAge_(member, todayDate)  {
  member.alder = dateDiff_(member.date_of_birth, todayDate, "Y");
}


/**
 * Lägger till extra medlemsattribut gällande antal dagar till nästa födelsedag
 * 
 * @param {Object} member - Medlemsobjekt för en medlem
 * @param {string} todayDate - Dagens datum
 */
function addExtraMemberAttributeDaysUntilBirthday_(member, todayDate)  {

  const birthYear = member.date_of_birth.substr(0, 4);
  const birthMonth = member.date_of_birth.substr(5, 2) - 1;
  const birthDay = member.date_of_birth.substr(8, 2);

  const nextBirthYear = Number(birthYear) + Number(member.alder) + 1;

  const nextBirthDate = new Date(nextBirthYear, birthMonth, birthDay);
  const nextBirthDay = nextBirthDate.toLocaleString('sv-SE', { timeZone: "Europe/Paris"});

  member.dagar_till_fodelsedag = dateDiff_(todayDate, nextBirthDay, "D");
}


/**
 * Lägger till extra medlemsattribut gällande antal dagar som medlem i kåren
 * 
 * @param {Object} member - Medlemsobjekt för en medlem
 * @param {string} todayDate - Dagens datum
 */
function addExtraMemberAttributeNumberOfDaysAsMember_(member, todayDate) {
  member.dagar_som_medlem = dateDiff_(member.confirmed_at, todayDate, "D");
}


/**
 * Lägger till extra medlemsattribut gällande om primär e-postadress
 * är samma som antingen anhörig 1 e-post eller anhörig 2 e-post
 * 
 * @param {Object} member - Medlemsobjekt för en medlem
 */
function addExtraMemberAttributeEmailSameAsParents_(member) {
  
  if (member.email) {
    if (member.email === member.contact_email_mum)  {
      member.primar_samma_anhorig_epost = "LIKA";
      return;
    }
    else if (member.email === member.contact_email_dad) {
      member.primar_samma_anhorig_epost = "LIKA";
      return;
    }
  }
  member.primar_samma_anhorig_epost = "OLIKA";
}


/**
 * Lägger till extra medlemsattribut hämtat från personens kårkonto om det finns
 * 
 * @param {Object[]} useraccounts - Lista med objekt av Googlekonton
 * @param {Object} member - Medlemsobjekt för en medlem
 * @param {string} todayDate - Dagens datum
 */
function addExtraMemberAttributeUserAccount_(useraccounts, member, todayDate) {

  const googleUserAccount = useraccounts.find(u => u.externalIds !== undefined && u.externalIds.some(extid => extid.type === "organization" && extid.value === member.member_no)); // leta upp befintligt Googlekonto som representerar rätt objekt
  
  if (googleUserAccount)  {
    member.kar_konto = googleUserAccount.primaryEmail;
    member.kar_konto_dagar_sedan_skapat = dateDiff_(googleUserAccount.creationTime, todayDate, "D");

    if (googleUserAccount.suspended) {
      member.kar_konto_status = "Nej";
    }
    else {
      member.kar_konto_status = "Ja";
    }

    if (googleUserAccount.lastLoginTime.startsWith("1970-01-01")) {
      member.kar_konto_har_loggat_in = "Nej";
    }
    else {
      member.kar_konto_har_loggat_in = "Ja";
      member.kar_konto_dagar_sedan_loggat_in = dateDiff_(googleUserAccount.lastLoginTime, todayDate, "D");
    }    

    if (googleUserAccount.primaryEmail === member.email) {
      member.kar_konto_samma_primar = "Ja";
    }
    else {
      member.kar_konto_samma_primar = "Nej";
    }
  }
}


/**
 * Ger antalet dagar eller år mellan två datum
 * 
 * @param {string}-{string}-{string} dateInputOne - Ett första datum ÅÅÅÅ-MM-DD
 * @param {string}-{string}-{string} dateInputTwo - Ett första datum ÅÅÅÅ-MM-DD
 * @param {string} format - Format Y=År eller D=Dagar
 * 
 * @return {number} - Antalet dagar eller år mellan två datum
 */
function dateDiff_(dateInputOne, dateInputTwo, format) {

  if (dateInputOne.length < 10) {
    return "";
  }

  const dateOneYear = dateInputOne.substr(0, 4);
  const dateOneMonth = dateInputOne.substr(5, 2) - 1;
  const dateOneDay = dateInputOne.substr(8, 2);
  const dateOne = new Date(dateOneYear, dateOneMonth, dateOneDay);

  const dateTwoYear = dateInputTwo.substr(0, 4);
  const dateTwoMonth = dateInputTwo.substr(5, 2) - 1;
  const dateTwoDay = dateInputTwo.substr(8, 2);

  if ("D" === format) {
    const dateTwo = new Date(dateTwoYear, dateTwoMonth, dateTwoDay);

    const diffTime = dateTwo.getTime() - dateOne.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    return diffDays;
  }

  if ("Y" === format) {
    
    let diffYear = dateTwoYear - dateOneYear;
    
    if (dateOneMonth > dateTwoMonth) {
      return diffYear-1;
      
    }
    if (dateOneMonth == dateTwoMonth) {
      if (dateOneDay > dateTwoDay) {
        return diffYear-1;
      }
      if (dateOneDay == dateTwoDay) {
        return diffYear;
      }
    }
    return diffYear;
  }  
}


/**
 * Ger ett kalkylark för en medlemslista givet URL
 * 
 * @param {Object} selection - Området på kalkylarket för alla listor som används just nu
 * @param {number} rad_nummer - Radnummer för aktuell medlemslista i kalkylarket
 * @param {string[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * @param {Object[]} rowSpreadsheet - Ett googleobjekt av typen Spreadsheet där listan finns
 * @param {string} spreadsheetUrl - URL för ett kalkylark för en medlemslista
 * 
 * @returns {Object | boolean} - Ett Google-kalkylark eller falskt
 */
function openSpreadsheetUrlForMemberlist_(selection, rad_nummer, grd, spreadsheetUrl) {

  const cell = selection.getCell(rad_nummer, grd["spreadsheetUrl"]+1);
  try {
    const rowSpreadsheet = SpreadsheetApp.openByUrl(spreadsheetUrl);
    setBackgroundColour_(cell, "white", false);
    return rowSpreadsheet;
  }
  catch (e) { //Om url är fel
    console.error(e);
    cell.setBackground("red");
    return false;
  }
}


/**
 * Skickar ut e-brev till de i aktuell medlemlista
 * 
 * @param {Object} selection - Området på kalkylarket för alla listor som används just nu
 * @param {number} rad_nummer - Radnummer för aktuell medlemslista i kalkylarket
 * @param {string[]} radInfo - Lista med data för aktuell rad i kalkylarket
 * @param {string[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * @param {Object[]} rowSpreadsheet - Ett googleobjekt av typen Spreadsheet där listan finns
 */
function skickaMedlemslista_(selection, rad_nummer, radInfo, grd, rowSpreadsheet) {

  const email_draft_subject = radInfo[grd["email_draft_subject"]];
  const email_document_merge = radInfo[grd["email_document_merge"]];
  const email_sender_name = radInfo[grd["email_sender_name"]];

  const sheet = rowSpreadsheet.getSheets()[0];
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  console.log("lastColumn ska vara " + lastColumn);
  console.log("lastRow ska vara " + lastRow);

  /***Dessa data hämta från utkastet och är lika för alla vid giltighetskontrollen***/
  console.info("Ämne på e-post i utkast: " + email_draft_subject);
  const draft = getDraft_(email_draft_subject);

  let cell = selection.getCell(rad_nummer, grd["email_draft_subject"]+1);
  if (!draft) { //Kolla om ämnesraden är korrekt
    console.error("Ogiltig ämmnesrad " + email_draft_subject);
    cell.setBackground("red");
    return;
  }
  else {
    setBackgroundColour_(cell, "white", false);
  }

  cell = selection.getCell(rad_nummer, grd["email_sender_name"]+1);
  if (email_sender_name) { //Kolla om fältet för avsändarnamn är angivet
    setBackgroundColour_(cell, "white", false);
  }
  else {
    console.warn("Inget avsändarnamn angivet");
    cell.setBackground("yellow");
  }
  
  cell = selection.getCell(rad_nummer, grd["email_document_merge"]+1);
  let documentToMerge;
  if (email_document_merge) { //Kolla om fältet för koppla dokument är angivet
    
    documentToMerge = getDocumentToMerge_(email_document_merge);
    
    if (documentToMerge) { //Lyckades hitta dokument att koppla
      setBackgroundColour_(cell, "white", false);
    }
    else {
      console.error("Fel på något dokument-id");
      cell.setBackground("red");
      return;
    }
  }
  else {
    console.log("Inget koppla dokument angivet");
    cell.setBackground("yellow");
  }
  /**************************************************************************/

  sendEmailMemberlists_(selection, rad_nummer, radInfo, grd, draft, sheet, documentToMerge);
}


/**
 * Skickar e-post för medlemslistor
 * 
 * @param {Object} selection - Området på kalkylarket för alla listor som används just nu
 * @param {number} rad_nummer - Radnummer för aktuell medlemslista i kalkylarket
 * @param {string[]} radInfo - Lista med data för aktuell rad i kalkylarket
 * @param {string[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * @param {Object} draft - Ett e-postutkast av typen GmailMessage
 * @param {Object} sheet - Ett Google-objekt för ett kalkylblad
 * @param {Object[]} documentToMerge - En lista av objekt av typen File
 */
function sendEmailMemberlists_(selection, rad_nummer, radInfo, grd, draft, sheet, documentToMerge) {

  const data = getVerkligMedlemslista_(sheet);
  const attribut = getVerkligaRubriker_(sheet);

  const email_condition = radInfo[grd["email_condition"]];
  const email_draft_subject = radInfo[grd["email_draft_subject"]];

  const body = draft.getBody();
  const plainBody = draft.getPlainBody();
  const attachments = draft.getAttachments();

  const allowedFromEmailAdresses = getAllowedFromEmailAdresses_();

  for (let i = 0; i < data.length; i++) {
    const rowNumber = i+2;
    console.time("Rad: " + rowNumber + " - " + data[i][attribut.Förnamn] + " " + data[i][attribut.Efternamn]);

    console.log("******************************");
    console.log("Rad %d i kalkylarket för denna medlemslista", rowNumber);

    /***Villkor***/
    const actual_email_condition = replaceTemplate_(email_condition, attribut, data[i]);
    if (actual_email_condition) {
      if (!eval(actual_email_condition)) {
        console.log("Uppfyller INTE villkoren " + data[i][attribut.Förnamn] + " " + data[i][attribut.Efternamn]);
        console.log(actual_email_condition);
        continue;
      }
    }
    
    console.log("Uppfyller villkoren för " + data[i][attribut.Förnamn] + " " + data[i][attribut.Efternamn]);
    console.log(actual_email_condition);
    /***Villkor - Slut***/

    const emailOptions = {};
    /***Hämta & Ersätt text***/
    
    /***Ämnesrad***/
    const actual_subject = replaceTemplate_(email_draft_subject, attribut, data[i]);
    /***Ämnesrad - Slut***/

    /***Mottagare e-post***/
    const email_recipient = getEmailDataSenderAndRecipients_(selection, rad_nummer, radInfo, grd, attribut, data[i], emailOptions, allowedFromEmailAdresses);
    if (!email_recipient) {
      continue;
    }
    /***Mottagare e-post- Slut***/

    /***Brödtext***/
    const actual_plainBody = replaceTemplate_(plainBody, attribut, data[i]);
    const actual_body = replaceTemplate_(body, attribut, data[i]);
    emailOptions["htmlBody"] = actual_body;
    /***Brödtext  Slut***/
    
    /***Bilagor***/
    emailOptions["attachments"] = getAndMakeAttachments_(attachments, documentToMerge, attribut, data[i]);
    /***Bilagor - Slut***/
    
    //console.log("email_recipient " + email_recipient);
    //console.log("actual_subject " + actual_subject);
    //console.log("actual_plainBody " + actual_plainBody);
    //console.log("Bilagor " + attachments);
    //console.log("emailOptions");
    //console.log(emailOptions);

    GmailApp.sendEmail(email_recipient, actual_subject, actual_plainBody, emailOptions);

    console.timeEnd("Rad: " + rowNumber + " - " + data[i][attribut.Förnamn] + " " + data[i][attribut.Efternamn]);
    console.info("Hittills mejlat %d av %d personer i denna medlemslista", i+1, data.length);
  }
}


/**
 * Lägger till data gällande avsändare och mottagare till
 * medskickat objekt emailOptions samt returnererar
 * e-postadress för mottagare alternativt boolean falskt om
 * mottagare, kopia-mottagare samt blindkopia-mottagare saknas
 * 
 * @param {Object} selection - Området på kalkylarket för alla listor som används just nu
 * @param {number} rad_nummer - Radnummer för aktuell medlemslista i kalkylarket
 * @param {string[]} radInfo - Lista med data för aktuell rad i kalkylarket
 * @param {string[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * @param {Object} attribut - Ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} dataArray - En lista innehållande persondata för en person
 * @param {Object} emailOptions - Objekt med inställningar för e-brevet
 * @param {string[]} allowedFromEmailAdresses - Lista med godkända som avsändaradresser
 * 
 * @param {string | boolean} - Falskt eller e-postadress för mottagare
 */
function getEmailDataSenderAndRecipients_(selection, rad_nummer, radInfo, grd, attribut, dataArray, emailOptions, allowedFromEmailAdresses) {

  const email_sender_name = radInfo[grd["email_sender_name"]];
  const email_sender_email = radInfo[grd["email_sender_email"]];
  const email_replyto = radInfo[grd["email_replyto"]];
  const email_noreply = radInfo[grd["email_noreply"]].toString();
  const email_recipient = radInfo[grd["email_recipient"]];
  const email_cc = radInfo[grd["email_cc"]];
  const email_bcc = radInfo[grd["email_bcc"]];

  /***Dessa celler ska färgmarkeras eller ändras vid fel***/
  const cell_email_sender_email = selection.getCell(rad_nummer, grd["email_sender_email"]+1);
  const cell_email_replyto = selection.getCell(rad_nummer, grd["email_replyto"]+1);
  const cell_email_noreply = selection.getCell(rad_nummer, grd["email_noreply"]+1);
  /*******************************************/

  /***Avsändarnamn***/
  if (email_sender_name) {
    const actual_email_sender_name = replaceTemplate_(email_sender_name, attribut, dataArray);
    emailOptions["name"] = actual_email_sender_name;
  }
  /***Avsändarnamn - Slut***/

  /***Avsändaradress***/
  const actual_email_sender_email = getSender_(email_sender_email, "avsändaradress", attribut, dataArray, cell_email_sender_email, emailOptions, allowedFromEmailAdresses);
  if (!actual_email_sender_email) {
    return false;
  }
  /***Avsändaradress - Slut***/

  /***Svarsadress e-post***/
  const actual_email_replyto = getSender_(email_replyto, "svarsadress", attribut, dataArray, cell_email_replyto, emailOptions, allowedFromEmailAdresses);
  if (!actual_email_replyto) {
    return false;
  }
  /***Svarsadress e-post - Slut***/

  /***Svara-ej***/
  const actual_email_noreply = checkIfNoReplyOption_(email_noreply, attribut, dataArray, cell_email_noreply)
  if (actual_email_noreply) {
    emailOptions["noReply"] = true;
  }
  /***Svara-ej - Slut***/

  /***Mottagare e-post***/
  const actual_email_recipient = getRecipient_(email_recipient, "mottagaradress", attribut, dataArray);
  /***Mottagare e-post- Slut***/

  /***Kopia e-post***/
  const actual_email_cc = getRecipient_(email_cc, "kopia e-post", attribut, dataArray);
  if (actual_email_cc) {
    emailOptions["cc"] = actual_email_cc;
  }
  /***Kopia e-post - Slut***/

  /***Blindkopia e-post***/
  const actual_email_bcc = getRecipient_(email_bcc, "blindkopia e-post", attribut, dataArray);
  if (actual_email_bcc) {
    emailOptions["bcc"] = actual_email_bcc;
  }
  /***Blindkopia e-post - Slut***/

  if (!(actual_email_recipient || actual_email_cc || actual_email_bcc)) {
    console.error("Ingen mottagare är angiven på något sätt. Vi hoppar över denna person");
    return false;
  }
  return actual_email_recipient;
}


/**
 * Ger sant eller falskt om Svara-ej är påslagen eller ej
 * 
 * @param {string} textInput - En textmall innehållande ev kortkoder
 * @param {Object} attribut - Ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} dataArray - En lista innehållande persondata för en person
 * @param {Object} cell - Ett objekt av typen Range
 *
 * @returns {boolean} - Sant eller falskt om Svara-ej är påslagen eller ej
 */
function checkIfNoReplyOption_(textInput, attribut, dataArray, cell) {

  let text = replaceTemplate_(textInput, attribut, dataArray);
  if (text) { //Om den ej är tom
    text = JSON.parse(text);
  }
  if (text) {
    cell.setValue(true);
    //console.log("Svara-ej är påslagen " + text);
    return true;
  }
  else {
    cell.setValue(false);
    //console.log("Svara-ej är avstängd " + text);
    return false;
  }
}


/**
 * Givet en kommaseparerad sträng med id för filer på Google drive
 * ges en lista med objekten av filerna
 * 
 * @param {string} ids - En kommaseparerad sträng av id:n eller URL för filer
 *
 * @returns {Object[]} - En lista av objekt av typen File
 */
function getDocumentToMerge_(ids) {
  
  const idList = ids.split(",");
  const docs = [];
  const nameOfDocuments = [];
  
  for (let i = 0; i < idList.length; i++) {
    const idOrUrl = idList[i].trim();

    try {
      const doc = DriveApp.getFileById(idOrUrl);
      docs.push(doc);
      nameOfDocuments.push(doc.getName());
    } catch (e) {
      try {
        const docId = DocumentApp.openByUrl(idOrUrl).getId();
        const doc = DriveApp.getFileById(docId);
        docs.push(doc);
        nameOfDocuments.push(doc.getName());
      } catch (e) {
        console.error(e);
        return false;
      }
    }
  }
  console.log("Lyckades hitta dokument att koppla");
  console.log(nameOfDocuments);
  return docs;
}


/**
 * Ger en lista med de bilagor som ska skickas
 * genom att använda de bilagor som finns i utkastet samt de
 * dokument som ska kopplas
 * 
 * @param {Object[]} attachmentsInput - Lista av objekt av typen GmailAttachment som finns i utkastet som bilaga
 * @param {Object[]} documentToMerge - En lista av objekt av typen File
 * @param {Object} attribut - Ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} dataArray - En lista innehållande persondata för en person
 *
 * @returns {Object[]} - Lista av objekt för de bilagor som ska skickas
 */
function getAndMakeAttachments_(attachmentsInput, documentToMerge, attribut, dataArray) {

  const attachments = [];

  for (let i = 0; i < attachmentsInput.length; i++) {
    attachments.push(attachmentsInput[i]);
    console.log("Lägger till bilagan " + attachmentsInput[i].getName());
  }

  for (let i = 0; documentToMerge && i < documentToMerge.length; i++) {
    
    let copy_id;
    try {
      const docName = documentToMerge[i].getName();
      const newDocName = replaceTemplate_(docName, attribut, dataArray);
      copy_id = documentToMerge[i].makeCopy(newDocName).getId();
      const copy_file = DocumentApp.openById(copy_id);

      const body = copy_file.getBody();
      if (body) {
        replaceContentOfDocument_(body, attribut, dataArray);
      }

      const header = copy_file.getHeader();
      if (header) {
        replaceContentOfDocument_(header, attribut, dataArray);
      }

      const footer = copy_file.getFooter();
      if (footer) {
        replaceContentOfDocument_(footer, attribut, dataArray);
      }

      console.log("URL för temporärt skapad fil är");
      console.log(copy_file.getUrl());
      copy_file.saveAndClose();

      const pdf = DocumentApp.openById(copy_id).getAs('application/pdf');
      attachments.push(pdf);
      console.log("Lägger till den personliga bilagan " + pdf.getName());
    }
    catch (e) {
      console.error(e);
    }
    finally {
      try {
        //Radera den temporärt skapade filen
        DriveApp.getFileById(copy_id).setTrashed(true);
      }
      catch (e) {
        console.error(e);
      }
    }
  }
  return attachments;
}


/**
 * Ersätter kortkoder med personlig text i ett Google-dokument
 * inom ett typområde i dokumentet
 * 
 * @param {Object} section - Ett objekt av typen för ett typområde i ett dokument
 * @param {Object} attribut - Ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} dataArray - En lista innehållande persondata för en person
 */
function replaceContentOfDocument_(section, attribut, dataArray) {

  const section_text = section.getText();
  
  //Skapar en lista med alla kortkoder som används
  const textMatches = getListOfUsedShortcodes_(section_text);

  //Mycket här i kan läggas i en egen funktion
  for (let i = 0; textMatches && i < textMatches.length; i++) {

    //Ny data för aktuell person som ska ersätta kortkoden
    const replaceData = getReplaceDataForShortcode_(textMatches[i], attribut, dataArray);

    //Ersätt koden med personlig data
    section.replaceText(textMatches[i], replaceData || '');
  }
}


/**
 * Ger en personlig text givet indatatext med kortkoder
 * 
 * @param {string} textInput - En textmall innehållande ev kortkoder
 * @param {Object} attribut - Ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} dataArray - En lista innehållande persondata för en person
 *
 * @returns {string} - En personligfierad textsträng
 */
function replaceTemplate_(textInput, attribut, dataArray) {

  let text = textInput.slice();
  //Skapar en lista med alla kortkoder som används
  const textMatches = getListOfUsedShortcodes_(text);

  for (let i = 0; textMatches && i<textMatches.length; i++) {
    
    //Ny data för aktuell personsom ska ersätta kortkoden
    const replaceData = getReplaceDataForShortcode_(textMatches[i], attribut, dataArray);
    //Ersätt koden med personlig data
    text = text.replace(textMatches[i], replaceData || '');
  }
  //console.log(text);
  return text;
}


/**
 * Ger texten som ska ersätta en specifik kortkod
 * 
 * @param {string} textMatch - En kortkod som används
 * @param {Object} attribut - Ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} dataArray - En lista innehållande persondata för en person
 *
 * @returns {string[]} - En lista av de kortkoder som används
 */
function getReplaceDataForShortcode_(textMatch, attribut, dataArray) {

  //Ta bort måsvingarna
  textMatch = textMatch.replace(/[\{\}][\{\}]/g, '');
  //Vilken kolumn (0-index) som kortkoden finns i kalkylarket
  const textColMatch = attribut[textMatch];
  //Ny data = den som finns i kolumn textColMatch för denna person
  const replaceData = dataArray[textColMatch];

  //console.log("Kortkoder som hittades " + textMatch);
  //console.log(textColMatch);
  //console.log(replaceData);
  return replaceData;
}


/**
 * Givet text ger en lista av alla kortkoder som används i texten
 * 
 * @param {string} text - En textsträng
 *
 * @returns {string[]} - En lista av de kortkoder som används
 */
function getListOfUsedShortcodes_(text) {
  const listOfUsedShortcodes = text.match(/\{\{[^\{\}]+\}\}/g);
  return listOfUsedShortcodes;
}


/**
 * Givet en mall returnerar funktionen sant eller falskt om en personlig e-postadress
 * går att använda som avsändaradress respektive svarsadress beroende på
 * syfte. Data läggs också till i objektet emailOptions för hur e-post ska
 * skickas. Ändrar färg på cell i kalkylark vid statusändring.
 * 
 * @param {string} textInput - En textmall innehållande ev kortkoder
 * @param {string} nameOfTheAttribute - En textsträng med namnet på e-postattributet
 * @param {Object} attribut - Ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} dataArray - En lista innehållande persondata för en person
 * @param {Object} cell - Ett objekt av typen Range
 * @param {Object} emailOptions - Ett objekt där extra data för att skicka e-posten finns
 * @param {string[]} allowedFromEmailAdresses - Lista med godkända som avsändaradresser
 *
 * @returns {boolean} - Sant eller falskt om adressen är tillåten att använda
 */
function getSender_(textInput, nameOfTheAttribute, attribut, dataArray, cell, emailOptions, allowedFromEmailAdresses) {

  let text = replaceTemplate_(textInput, attribut, dataArray);
  text = getCleanString_(text);
  text = text.toLowerCase();

  if ("avsändaradress" === nameOfTheAttribute && allowedFromEmailAdresses.includes(text)) {
    setBackgroundColour_(cell, "white", false);
    emailOptions["from"] = text;
  }
  else if ("svarsadress" === nameOfTheAttribute && checkIfEmail_(text)) {
    setBackgroundColour_(cell, "white", false);
    emailOptions["replyTo"] = text;
  }
  else if (!text) {
    console.warn("Ingen " + nameOfTheAttribute + " angiven");
    cell.setBackground("yellow");
  }
  else {
    console.error("Ogiltig " + nameOfTheAttribute + " angiven " + text +". Vi hoppar över denna person");
    cell.setBackground("red");
    return false;
  }
  return true;
}


/**
 * Givet en mall returnerar funktionen en personlig gjord kommaseparerad
 * textsträng
 * 
 * @param {string} textInput - En textmall innehållande ev kortkoder
 * @param {string} nameOfTheAttribute - En textsträng med namnet på e-postattributet
 * @param {Object} attribut - Ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} dataArray - En lista innehållande persondata för en person
 *
 * @returns {string} - En textsträng utan kommentarer eller mellanrum
 */
function getRecipient_(textInput, nameOfTheAttribute, attribut, dataArray) {

  let text = replaceTemplate_(textInput, attribut, dataArray);
  text = getCleanEmailArray_(text).toString();
  
  if (text) {
    console.log(nameOfTheAttribute + " är angiven " + text);
  }
  else {
    //console.log("Ingen " + nameOfTheAttribute + " är angiven " + text);
  }
  return text;
}


/**
 * Givet en variabel returnerar funktionen en kommaseparerad textsträng
 * där endast de element som är e-postadresser är med
 * 
 * @param {string} input - En variabel
 *
 * @returns {string[]} - En textsträng utan kommentarer eller mellanrum
 */
function getCleanEmailArray_(input) {

  const emailArray = [];
  input = getCleanString_(input);
  const inputSplitArray = input.split(",");

  for (let i = 0; i < inputSplitArray.length; i++) {
    if (checkIfEmail_(inputSplitArray[i])) {
      emailArray.push(inputSplitArray[i]);
    }
  }
  return emailArray;
}


/**
 * Ger en matris med data för medlemslistan i kalkylbladet
 * 
 * @param {Object} sheet - Ett objekt av typen Sheet
 *
 * @returns {string[][]} - En matris innehållande persondata
 */
function getVerkligMedlemslista_(sheet) {

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const range = sheet.getRange(2, 1, lastRow-1, lastColumn);

  const values = range.getDisplayValues();

  //console.log("Data i kalkylarket för medlemslista");
  //console.log(values);
  return values;
}


/**
 * Ger ett objekt med rubrikerna i kalkylbladet som nycklar och
 * dess respektive kolumnplacering som värde
 * 
 * @param {Object} sheet - Ett objekt av typen Sheet
 *
 * @returns {Object} - Ett objekt med kolumnrubriker och dess placeringar
 */
function getVerkligaRubriker_(sheet) {

  const lastColumn = sheet.getLastColumn();
  const range = sheet.getRange(1, 1, 1, lastColumn);

  const values = range.getDisplayValues()[0];

  //console.log("Rubriker i kalkylarket");
  //console.log(values);

  const data = {};
  for (let i = 0; i < values.length; i++) {
    data[values[i]] = i;
  }
  return data;
}


/**
 * Uppdatera en lista över medlemmar
 * 
 * @param {Object} selection - Området på kalkylarket för alla listor som används just nu
 * @param {number} rad_nummer - Radnummer för aktuell medlemslista i kalkylarket
 * @param {string[]} radInfo - Lista med data för aktuell rad i kalkylarket
 * @param {string[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * @param {Object[]} allMembers - Lista med medlemsobjekt
 * @param {Object[]} spreadsheet - Ett googleobjekt av typen Spreadsheet där listan finns
 * @param {boolean} forceUpdate - Tvinga uppdatering av data eller ej från Scoutnet
 */
function updateMemberlist_(selection, rad_nummer, radInfo, grd, allMembers, spreadsheet, forceUpdate) {

  /************************/
  const scoutnet_list_id = radInfo[grd["scoutnet_list_id"]]; //Själva datan
  const cell_scoutnet_list_id = selection.getCell(rad_nummer, grd["scoutnet_list_id"]+1); //Range
  console.log("********** Synkronisering - hämta data **********");
  const membersMultipleMailinglists = fetchScoutnetMembersMultipleMailinglists_(scoutnet_list_id, cell_scoutnet_list_id, "", forceUpdate);
  console.log("********** Synkronisering - hämta data - Slut **********");
  /***********************/ 

  const membersInAList = []
  for (let i = 0; i < membersMultipleMailinglists.length; i++) {
    //Leta upp medlemmen i listan övar alla medlemmar
    const obj = allMembers.find(obj => obj.member_no === membersMultipleMailinglists[i].member_no);
    membersInAList.push(obj);
    //console.log(obj);
  }

  const mlrd = getMedlemslistorRubrikData_();
  //console.log(mlrd);
  const numAttrMembers = mlrd.length;
  console.log("Antal medlemsattribut att använda " + numAttrMembers);

  const sheet = spreadsheet.getSheets()[0];

  /****Den gamla datan som ska bort***/
  clearOldSpreadsheetData_(sheet, membersInAList, numAttrMembers);
  /*********************************************/

  /****Storlek på den nya rubriken som ska in**/
  const range_rad1 = sheet.getRange(1, 1, 1, numAttrMembers);
  range_rad1.setFontWeight("bold");
  range_rad1.setFontStyle("italic");

  const memberRubrikMatrix = createMemberlistRubrikRow_(mlrd);
  range_rad1.setValues([memberRubrikMatrix]);
  /********************************************/

  if (membersInAList.length > 0) {
    /****Storlek på den nya datan som ska in*****/
    const range_medlemmar = sheet.getRange(2, 1, membersInAList.length, numAttrMembers);
    const memberMatrix = createMemberlistMatrix_(membersInAList, mlrd);
    //console.log(memberMatrix);
    range_medlemmar.setValues(memberMatrix);
    /********************************************/

    setCustomColumns_(sheet, numAttrMembers+1, membersInAList.length);
  }
}


/**
 * Tar bort gammal medlemsdata från ett kalkylblad
 * 
 * @param {Object} sheet - Ett googleobjekt av typen Sheet
 * @param {Object[]} membersInAList - En lista av medlemsobjekt
 * @param {number} numAttrMembers - Antal medlemsattribut som används
 */
function clearOldSpreadsheetData_(sheet, membersInAList, numAttrMembers) {

  const lastRow = sheet.getLastRow();
  let lastColumn = sheet.getLastColumn();
  let numRows = lastRow+1;

  if (membersInAList.length+1 > lastRow) {
    //Vi ska rensa om det blir fler rader i nya också
    numRows = membersInAList.length+1;
  }

  if (numAttrMembers > lastColumn) {
    //Vi ska rensa om det blir fler kolumner i nya också
    lastColumn = numAttrMembers;
  }
  console.log("lastColumn ska vara " + lastColumn);
  console.log("lastRow ska vara " + lastRow);
  
  //Storlek på den gamla datan som ska bort
  const range_allt = sheet.getRange(1, 1, numRows, lastColumn);
  range_allt.clearContent();
}


/**
 * Bygger upp en rad med rubriker för medlemsdatan
 * 
 * @param {Object[]} mlrd - En lista över rubriker och och attribut för tillhörande medlemmar
 * 
 * @returns {string[]} - Lista bestående av rubrikerna för medlemsdatan
 */
function createMemberlistRubrikRow_(mlrd) {

  const row = [];
  for (let i = 0; i < mlrd.length; i++) {
    const svName = mlrd[i].svName;
    row.push(svName);
  }
  //console.log("Rubriker för medlemsattribut");
  //console.log(row);
  return row;
}


/**
 * Bygger upp en matris med medlemsdata för flera medlemmar
 * 
 * @param {Object[]} membersInAList - Lista över medlemsobjekt
 * @param {Object[]} mlrd - En lista över rubriker och och attribut för tillhörande medlemmar
 * 
 * @returns {string[][]} - Matris bestående av listor som är rader med medlemsdata
 */
function createMemberlistMatrix_(membersInAList, mlrd) {

  const memberMatrix = [];
  for (let i = 0; i < membersInAList.length; i++) {
    const row = createMemberlistRow_(membersInAList[i], mlrd);
    memberMatrix.push(row);
  }
  return memberMatrix;
}


/**
 * Bygger upp en rad med medlemsdata för en medlem
 * 
 * @param {Object} member - Ett medlemsobjekt
 * @param {Object[]} mlrd - En lista över rubriker och och attribut för tillhörande medlemmar
 * 
 * @returns {string[]} - Lista med medlemsdata
 */
function createMemberlistRow_(member, mlrd) {

  const row = [];
  for (let i = 0; i < mlrd.length; i++) {
    const name = mlrd[i].apiName;
    value = member[name];
    //console.log("Attribut " + name + " värde " + value);
    row.push(value);
  }
  return row;
}


/**
 * Sätter specialkolumner i ett kalkylark
 * 
 * @param {Object} sheet - Ett googleobjekt av typen Sheet
 * @param {number} startCol - Startkolumn för var dessa kolumner ska skrivas
 * @param {number} numRow - Antal rader att skriva specialfunktionerna på
 */
function setCustomColumns_(sheet, startCol, numRow) {

  const cf = MEDLEMSLISTA_EGNA_ATTRIBUT_FUNKTIONER;
  const num_cf = cf.length;
  if (0 === num_cf) {
    return;
  }

  /***********Rubriker**********/
  const row = [];
  for (let i = 0; i < num_cf; i++) {
    const namn = cf[i].namn;
    row.push(namn);
  }

  const range_cf_rubrik = sheet.getRange(1, startCol, 1, num_cf);
  range_cf_rubrik.setValues([row]);

  /***********Data i extra kolumner*****/
  for (let i = 0; i < num_cf; i++) {
    const formula = cf[i].formel;
    const range_cf = sheet.getRange(2, startCol+i, numRow, 1);
    range_cf.setFormulaR1C1(formula);
  }
}


/**
 * Returnerar lista med objekt för standardkolumner i externa kalkylbladet med namn
 * i Scoutnets API och det svenska attributnamnet
 *
 * @returns {Object[]} - Lista med objekt för standardkolumner i externa kalkylbladet
 */
function getMedlemslistorRubrikData_() {
  
  const mlrd = [
    {"apiName": "member_no", "svName": "Medlemsnr."},
    {"apiName": "first_name", "svName": "Förnamn"},
    {"apiName": "last_name", "svName": "Efternamn"},
    {"apiName": "nickname", "svName": "Smeknamn"},
    {"apiName": "ssno", "svName": "Personnummer"},
    {"apiName": "note", "svName": "Noteringar"},
    {"apiName": "date_of_birth", "svName": "Födelsedatum"},
    {"apiName": "status", "svName": "Status"},
    {"apiName": "created_at", "svName": "Registrerad Scouterna"},
    {"apiName": "confirmed_at", "svName": "Startdatum kår"},
    {"apiName": "group", "svName": "Kår"},
    {"apiName": "unit", "svName": "Avdelning"},
    {"apiName": "patrol", "svName": "Patrull"},
    {"apiName": "unit_role", "svName": "Avdelningsroll"},
    {"apiName": "group_role", "svName": "Kårfunktion"},
    {"apiName": "sex", "svName": "Kön"},
    {"apiName": "address_co", "svName": "c/o"},
    {"apiName": "address_1", "svName": "Adress"},
    {"apiName": "address_2", "svName": "Adress, rad 2"},
    {"apiName": "address_3", "svName": "Adress, rad 3"},
    {"apiName": "postcode", "svName": "Postnummer"},
    {"apiName": "town", "svName": "Postort"},
    {"apiName": "country", "svName": "Land"},
    {"apiName": "email", "svName": "Primär e-postadress"},
    {"apiName": "contact_alt_email", "svName": "Alternativ e-post"},
    {"apiName": "contact_mobile_phone", "svName": "Mobiltelefon"},
    {"apiName": "contact_home_phone", "svName": "Hemtelefon"},
    {"apiName": "contact_mothers_name", "svName": "Anhörig 1 namn"},
    {"apiName": "contact_email_mum", "svName": "Anhörig 1 e-post"},
    {"apiName": "contact_mobile_mum", "svName": "Anhörig 1 mobiltelefon"},
    {"apiName": "contact_telephone_mum", "svName": "Anhörig 1 hemtelefon"},
    {"apiName": "contact_fathers_name", "svName": "Anhörig 2 namn"},
    {"apiName": "contact_email_dad", "svName": "Anhörig 2 e-post"},
    {"apiName": "contact_mobile_dad", "svName": "Anhörig 2 mobiltelefon"},
    {"apiName": "contact_telephone_dad", "svName": "Anhörig 2 hemtelefon"},
    {"apiName": "extra_emails", "svName": "Medlem valda e-post för e-postlista"},
    {"apiName": "contact_leader_interest", "svName": "Jag kan hjälpa till!"},
    {"apiName": "prev_term", "svName": "Föregående termin"},
    {"apiName": "prev_term_due_date", "svName": "Föregående termin förfallodatum"},
    {"apiName": "current_term", "svName": "Aktuell termin"},
    {"apiName": "current_term_due_date", "svName": "Aktuell termin förfallodatum"},
    {"apiName": "avatar_updated", "svName": "Profilbild uppdaterad"},
    {"apiName": "avatar_url", "svName": "Profilbild url"},
    {"apiName": "kar_konto", "svName": "Kårkonto"},
    {"apiName": "kar_konto_status", "svName": "Kårkonto aktivt"},
    {"apiName": "kar_konto_dagar_sedan_skapat", "svName": "Kårkonto dagar sedan skapat"},
    {"apiName": "kar_konto_har_loggat_in", "svName": "Kårkonto har loggat in"},
    {"apiName": "kar_konto_dagar_sedan_loggat_in", "svName": "Kårkonto dagar sedan inloggad"},
    {"apiName": "kar_konto_samma_primar", "svName": "Kårkonto samma som primär e-post"},
    {"apiName": "alder", "svName": "Ålder"},
    {"apiName": "dagar_till_fodelsedag", "svName": "Dagar till nästa födelsedag"},
    {"apiName": "dagar_som_medlem", "svName": "Antal dagar som medlem i kåren"},
    {"apiName": "primar_samma_anhorig_epost", "svName": "Primär e-post som anhörigs e-post"}
  ];

  return mlrd;
}
