/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Funktion att använda för att enbart uppdatera en specifik
 * medlemslista på en specifik rad
 */
function MedlemslistorVissaRaderUppdateraEnbartTmp() {
  medlemslistorEnRad_(1, true, false);
}


/**
 * Funktion att använda för att enbart skicka ut e-brev till
 * en specifik medlemslista på en specifik rad
 */
function MedlemslistorVissaRaderSkickaEnbartTmp() {
  medlemslistorEnRad_(1, false, true);
}


/**
 * Funktion att använda för att uppdatera samtliga medlemslistor
 */
function MedlemslistorUppdateraEnbart() {
  synkroniseraMedlemslistor_(0, 100, true, false);
}


/**
 * Funktion att använda för att ställa in att start- och slutrad
 * är lika
 * 
 * @param {number} radNummer - Rad att synkronisera
 * @param {boolean} shouldUpdate - Om medlemslistan ska uppdateras
 * @param {boolean} shouldSend - Om e-brev ska skickas ut till medlemlemslistan
 */
function medlemslistorEnRad_(radNummer, shouldUpdate, shouldSend) {
  synkroniseraMedlemslistor_(radNummer, radNummer, shouldUpdate, shouldSend);
}


/**
 * Huvudfunktion för att hantera synkronisering av medlemslistor med Scoutnet
 * 
 * @param {number} start - Rad att börja synkronisera på
 * @param {number} slut - Rad att sluta synkronisera på
 * @param {boolean} shouldUpdate - Om medlemslistan ska uppdateras
 * @param {boolean} shouldSend - Om e-brev ska skickas ut till medlemlemslistan
 */
function synkroniseraMedlemslistor_(start, slut, shouldUpdate, shouldSend) {
  
  const forceUpdate = true;

  const sheetDataMedlemslistor = getDataFromActiveSheet_("Medlemslistor");
  const grd = getMedlemslistorKonfigRubrikData_();
  //Hämta lista med alla medlemmar i kåren och alla deras attribut
  const allMembers = fetchScoutnetMembers_(true);

  const sheet = sheetDataMedlemslistor["sheet"];
  const selection = sheetDataMedlemslistor["selection"];
  const data = sheetDataMedlemslistor["data"];
  
  const delete_rows = [];
  
  const rowsToSync = findWhatRowsToSync_(start, slut, data.length);
  start = rowsToSync.start;
  slut = rowsToSync.slut;
  Logger.log("Startrad " + start + " slutrad " + slut);
  
  for (let i = start-1; i < slut; i++) {
    
    const name = data[i][grd["namn"]];
    const scoutnet_list_id = data[i][grd["scoutnet_list_id"]];
    const spreadsheetUrl = data[i][grd["spreadsheetUrl"]];
    
    const rad_nummer = i + 1;
    Logger.log('Rad: ' + rad_nummer + ' Namn: ' + name + ' Scoutnet: ' + scoutnet_list_id + ' spreadsheetUrl: ' + spreadsheetUrl);

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
        Logger.log("Försöker ta bort rad " + rad_nummer);
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
  }
  //Ta bort tomma rader i kalkylarket
  deleteRowsFromSpreadsheet_(sheet, delete_rows);
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
 * @param {Object | boolean} - Ett Google-kalkylark eller falskt
 */
function openSpreadsheetUrlForMemberlist_(selection, rad_nummer, grd, spreadsheetUrl) {

  const cell = selection.getCell(rad_nummer, grd["spreadsheetUrl"]+1);
  try {
    const rowSpreadsheet = SpreadsheetApp.openByUrl(spreadsheetUrl);
    setBackgroundColour_(cell, "white", false);
    return rowSpreadsheet;
  }
  catch (e) { //Om url är fel
    Logger.log(e);
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
  Logger.log("lastColumn ska vara " + lastColumn);
  Logger.log("lastRow ska vara " + lastRow);

  /***Dessa data hämta från utkastet och är lika för alla vid giltighetskontrollen***/
  Logger.log("Ämne på e-post i utkast " + email_draft_subject);
  const draft = getDraft_(email_draft_subject);

  let cell = selection.getCell(rad_nummer, grd["email_draft_subject"]+1);
  if (!draft) { //Kolla om ämnesraden är korrekt
    Logger.log("Ogiltig ämmnesrad " + email_draft_subject);
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
    Logger.log("Inget avsändarnamn angivet");
    cell.setBackground("yellow");
  }
  
  cell = selection.getCell(rad_nummer, grd["email_document_merge"]+1);
  let documentToMerge;
  if (email_document_merge) { //Kolla om fältet för koppla dokument är angivet
    
    documentToMerge = getDocumentToMerge(email_document_merge);
    
    if (documentToMerge) {
      Logger.log("Lyckades hitta dokument att koppla");
      Logger.log(documentToMerge);
      setBackgroundColour_(cell, "white", false);
    }
    else {
      Logger.log("Fel på något dokument-id");
      cell.setBackground("red");
      return;
    }
  }
  else {
    Logger.log("Inget koppla dokument angivet");
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

  for (let i = 0; i < data.length; i++) {
    Logger.log("Rad i kalkylarket " + i);

    /***Villkor***/
    const actual_email_condition = replaceTemplate_(email_condition, attribut, data[i]);
    if (actual_email_condition) {
      if (!eval(actual_email_condition)) {
        Logger.log("Uppfyller INTE villkoren " + data[i][attribut.Förnamn] + " " + data[i][attribut.Efternamn]);
        Logger.log(actual_email_condition);
        continue;
      }
    }
    
    Logger.log("Uppfyller villkoren " + data[i][attribut.Förnamn] + " " + data[i][attribut.Efternamn]);
    Logger.log(actual_email_condition);
    /***Villkor - Slut***/

    const emailOptions = {};
    /***Hämta & Ersätt text***/
    
    /***Ämnesrad***/
    const actual_subject = replaceTemplate_(email_draft_subject, attribut, data[i]);
    /***Ämnesrad - Slut***/

    /***Mottagare e-post***/
    const email_recipient = getEmailDataSenderAndRecipients_(selection, rad_nummer, radInfo, grd, attribut, data[i], emailOptions);
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
    
    Logger.log("email_recipient " + email_recipient);
    Logger.log("actual_subject " + actual_subject);
    Logger.log("actual_plainBody " + actual_plainBody);
    Logger.log("Bilagor " + attachments);
    Logger.log("emailOptions");
    Logger.log(emailOptions);

    GmailApp.sendEmail(email_recipient, actual_subject, actual_plainBody, emailOptions);
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
 * 
 * @param {string | boolean} - Falskt eller e-postadress för mottagare
 */
function getEmailDataSenderAndRecipients_(selection, rad_nummer, radInfo, grd, attribut, dataArray, emailOptions) {

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
  const actual_email_sender_email = getSender_(email_sender_email, "avsändaradress", attribut, dataArray, cell_email_sender_email, emailOptions);
  if (!actual_email_sender_email) {
    return false;
  }
  /***Avsändaradress - Slut***/

  /***Svarsadress e-post***/
  const actual_email_replyto = getSender_(email_replyto, "svarsadress", attribut, dataArray, cell_email_replyto, emailOptions);
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
    Logger.log("Ingen mottagare är angiven på något sätt. Vi hoppar över denna person");
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
    Logger.log("Svara-ej är påslagen " + text);
    return true;
  }
  else {
    cell.setValue(false);
    Logger.log("Svara-ej är avstängd " + text);
    return false;
  }
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
    Logger.log("Lägger till bilagan " + attachmentsInput[i].getName());
  }

  for (let i = 0; documentToMerge && i < documentToMerge.length; i++) {
    
    let copy_id;
    try {
      const docName = documentToMerge[i].getName();
      const newDocName = replaceTemplate_(docName, attribut, dataArray);
      copy_id = documentToMerge[i].makeCopy(newDocName).getId();
      const copy_file = DocumentApp.openById(copy_id);

      const body = copy_file.getBody();
      replaceContentOfDocument_(body, attribut, dataArray);

      const header = copy_file.getHeader();
      replaceContentOfDocument_(header, attribut, dataArray);

      const footer = copy_file.getFooter();
      replaceContentOfDocument_(footer, attribut, dataArray);

      Logger.log("URL för temporärt skapad fil är");
      Logger.log(copy_file.getUrl());
      copy_file.saveAndClose();

      const pdf = DocumentApp.openById(copy_id).getAs('application/pdf');
      attachments.push(pdf);
      Logger.log("Lägger till den personliga bilagan " + pdf.getName());
    }
    catch (e) {
      Logger.log(e);
    }
    finally {
      try {
        //Radera den temporärt skapade filen
        DriveApp.getFileById(copy_id).setTrashed(true);
      }
      catch (e) {
        Logger.log(e);
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
  //Logger.log(text);
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

  //Logger.log(textMatch);
  //Logger.log(textColMatch);
  //Logger.log(replaceData);
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
 * Givet en kommaseparerad sträng med id för filer på Google drive
 * ges en lista med objekten av filerna
 * 
 * @param {string} ids - En kommaseparerad sträng av id:n för filer
 *
 * @returns {Object[]} - En lista av objekt av typen File
 */
function getDocumentToMerge(ids) {
  
  const idList = ids.split(",");
  const docs = [];
  
  for (let i = 0; i < idList.length; i++) {
    const id = idList[i].trim();

    try {
      const doc = DriveApp.getFileById(id);
      docs.push(doc);
    } catch (e) {
      Logger.log(e);
      return false;
    }
  }
  return docs;
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
 *
 * @returns {boolean} - Sant eller falskt om adressen är tillåten att använda
 */
function getSender_(textInput, nameOfTheAttribute, attribut, dataArray, cell, emailOptions) {

  let text = replaceTemplate_(textInput, attribut, dataArray);
  text = getCleanString_(text);
  text = text.toLowerCase();

  if ("avsändaradress" === nameOfTheAttribute && isFromEmailAdressAllowed_(text)) {
    setBackgroundColour_(cell, "white", false);
    emailOptions["from"] = text;
  }
  else if ("svarsadress" === nameOfTheAttribute && checkIfEmail_(text)) {
    setBackgroundColour_(cell, "white", false);
    emailOptions["replyTo"] = text;
  }
  else if (!text) {
    Logger.log("Ingen " + nameOfTheAttribute + " angiven");
    cell.setBackground("yellow");
  }
  else {
    Logger.log("Ogiltig " + nameOfTheAttribute + " angiven " + text +". Vi hoppar över denna person");
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
  Logger.log(nameOfTheAttribute);
  Logger.log(text);
  
  if (text) {
    Logger.log(nameOfTheAttribute + " är angiven " + text);
  }
  else {
    Logger.log("Ingen " + nameOfTheAttribute + " är angiven " + text);
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

  Logger.log("Data i kalkylarket för medlemslista");
  Logger.log(values);
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

  Logger.log("Rubriker i kalkylarket");
  Logger.log(values);

  const data = {};
  for (let i = 0; i < values.length; i++) {
    data[values[i]] = i;
  }
  return data;
}


/**
 * Skapa kolumnrubriker i kalkylarket för medlemslistor konfig
 */
function skapaRubrikerML() {

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
    
    Logger.log("Inga av de angivna cellerna på rad 1 är sammanfogade");
    range1_rad1.merge();
    range2_rad1.merge();
    Logger.log("Vi har nu sammanfogat dem");
  }
  else {
    Logger.log("Några celler är sedan tidigare sammanfogade på rad 1, så vi gör inget åt just det");
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
  Logger.log(".......Synkronisering - hämta data............");
  const membersMultipleMailinglists = fetchScoutnetMembersMultipleMailinglists_(scoutnet_list_id, cell_scoutnet_list_id, "", forceUpdate);
  Logger.log(".......Slut Synkronisering - hämta data.......");
  /***********************/ 

  const membersInAList = []
  for (let i = 0; i < membersMultipleMailinglists.length; i++) {
    //Leta upp medlemmen i listan övar alla medlemmar
    const obj = allMembers.find(obj => obj.member_no === membersMultipleMailinglists[i].member_no);
    membersInAList.push(obj);
    Logger.log(obj);
  }

  const mlrd = getMedlemslistorRubrikData_();
  Logger.log(mlrd);
  const numAttrMembers = mlrd.length;
  Logger.log("Antal medlemsattribut att använda " + numAttrMembers);

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
    Logger.log(memberMatrix);
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
  Logger.log("lastColumn ska vara " + lastColumn);
  Logger.log("lastRow ska vara " + lastRow);
  
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
  Logger.log("Rubriknamn " + row);
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
    //Logger.log("Attribut " + name + " värde " + value);
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

  const cf = medlemslista_egna_attribut_funktioner;
  const num_cf = cf.length;

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
  medlemslistaKonfigRubrikData["email_bcc"] = 11;

  return medlemslistaKonfigRubrikData;
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
    {"apiName": "avatar_url", "svName": "Profilbild url"}
  ];

  return mlrd;
}
