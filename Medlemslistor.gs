/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Returnerar lista med objekt för specialkolumner i kalkylarket med namn
 * och formel
 *
 * @returns {Object[]} - Lista med objekt för specialkolumner i kalkylarket
 */
function getCustomFunctions() {

  var cf = [
    {'namn': 'Ålder', 'formel': '=DATEDIF(R[0]C[-37], TODAY(), "Y")'},   
    {'namn': 'Dagar till nästa födelsedag', 'formel': '=DATE(YEAR(R[0]C[-38])+DATEDIF(R[0]C[-38],TODAY(),"Y")+1,MONTH(R[0]C[-38]),DAY(R[0]C[-38]))-TODAY()'},
    {'namn': 'Antal dagar som medlem i kåren', 'formel': '=DATEDIF(R[0]C[-36],TODAY(), "D")'}
  ];
  
  return cf;
}


/**
 * Funktion för att ange att enbart vissa radintervall i kalkylarket
 * för medlemslistor ska synkroniseras
 *
 * Exempelvis rad 0 till 10. Helt fritt att ändra själv
 */
function MedlemslistorVissaRader1() {
  Medlemslistor(0, 10);
}


/**
 * Funktion för att ange att enbart vissa radintervall i kalkylarket
 * för medlemslistor ska synkroniseras
 *
 * Exempelvis rad 11 till 20. Helt fritt att ändra själv
 */
function MedlemslistorVissaRader2() {
  Medlemslistor(11, 20);
}


/**
 * Huvudfunktion för att hantera synkronisering av medlemslistor med Scoutnet
 * 
 * @param {number} start - rad att börja synkronisera på
 * @param {number} slut - rad att sluta synkronisera på
 */
function Medlemslistor(start, slut) {
  
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Medlemslistor).getSheets()[0];
  var selection = sheet.getDataRange();
  var data = selection.getValues();
  
  var grd = getMedlemslistorKonfigRubrikData();
  
  var delete_rows = [];
  
  //Hämta lista med alla medlemmar i kåren och alla deras attribut
  var allMembers = fetchScoutnetMembers();
  
  var rowsToSync = findWhatRowsToSync(start, slut, data.length);
  start = rowsToSync.start;
  slut = rowsToSync.slut;
  
  Logger.log("Startrad " + start + " slutrad " + slut);
  
  for (var i = start-1; i < slut; i++) {
    
    var name = data[i][grd["namn"]];
    var scoutnet_list_id = data[i][grd["scoutnet_list_id"]];
    var spreadsheetUrl = data[i][grd["spreadsheetUrl"]];
    
    var rad_nummer = i+1;
    Logger.log('Rad: ' + rad_nummer + ' Namn: ' + name + ' Scoutnet: ' + scoutnet_list_id + ' spreadsheetUrl: ' + spreadsheetUrl);
    
    var update_group = "yes";
    
    var cell=selection.getCell(rad_nummer, grd["namn"]+1);
    if (name=="") { //Kolla om fältet för namn är angivet
      cell.setBackground("yellow");
    }
    else {
      if ("#ffffff" != cell.getBackground()) {
        cell.setBackground("white");
      }
    }

    if (spreadsheetUrl=="") { //Inget kalkylark är angivet      
      if (name=="" && scoutnet_list_id=="") { //Ta bort raden
        Logger.log("Försöker ta bort rad " + rad_nummer);        
        delete_rows.push(rad_nummer);        
      }
      update_group = "no";          
    }

    var cell=selection.getCell(rad_nummer, grd["spreadsheetUrl"]+1);
    var rowSpreadsheet;
    try {
      rowSpreadsheet = SpreadsheetApp.openByUrl(spreadsheetUrl);
      
      if ("#ffffff" != cell.getBackground()) {
        cell.setBackground("white");
      }
    }
    catch (e) { //Om url är fel
      Logger.log(e);
      update_group = "no";
      cell.setBackground("red");
    }    

    if (update_group == "yes") {
      //Uppdatera aktuell medlemslista
      updateMemberlist(selection, rad_nummer, data[i], grd, allMembers, rowSpreadsheet);
      
      //skicka ut e-brev till de i medlemslistan
      skickaMedlemslista(selection, rad_nummer, data[i], grd, rowSpreadsheet);
    }
  }
  //Ta bort tomma radera i kalkylarket
  deleteRowsFromSpreadsheet(sheet, delete_rows);
}


/**
 * Skickar ut e-brev till de i aktuell medlemlista
 * 
 * @param {Object} selection - området på kalkylarket för alla listor som används just nu
 * @param {number} rad_nummer - radnummer för aktuell medlemslista i kalkylarket
 * @param {string[]} radInfo - lista med data för aktuell rad i kalkylarket
 * @param {string[]} grd - lista med vilka kolumnindex som respektive parameter har
 * @param {Object[]} rowSpreadsheet - ett googleobjekt av typen Spreadsheet där listan finns
 */
function skickaMedlemslista(selection, rad_nummer, radInfo, grd, rowSpreadsheet)  {

  var email_draft_subject = radInfo[grd["email_draft_subject"]];
  var email_condition = radInfo[grd["email_condition"]];
  var email_document_merge = radInfo[grd["email_document_merge"]];

  var email_sender_name = radInfo[grd["email_sender_name"]];
  var email_sender_email = radInfo[grd["email_sender_email"]];
  var email_replyto = radInfo[grd["email_replyto"]];
  var email_noreply = radInfo[grd["email_noreply"]].toString();
  var email_recipient = radInfo[grd["email_recipient"]];
  var email_cc = radInfo[grd["email_cc"]];
  var email_bcc = radInfo[grd["email_bcc"]];


  var sheet = rowSpreadsheet.getSheets()[0];
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  Logger.log("lastColumn ska vara " + lastColumn);
  Logger.log("lastRow ska vara " + lastRow); 

  var attribut = getVerkligaRubriker(sheet);
  var data = getVerkligMedlemslista(sheet);

  /***Dessa celler ska färgmarkeras eller ändras vid fel***/
  var cell_email_sender_email = selection.getCell(rad_nummer, grd["email_sender_email"]+1);
  var cell_email_replyto = selection.getCell(rad_nummer, grd["email_replyto"]+1);
  var cell_email_noreply = selection.getCell(rad_nummer, grd["email_noreply"]+1);
  /*******************************************/

  /***Dessa data hämta från utkastet och är lika för alla vid giltighetskontrollen***/
  Logger.log("Ämne på e-post i utkast " + email_draft_subject);
  var draft = getDraft(email_draft_subject);

  var cell=selection.getCell(rad_nummer, grd["email_draft_subject"]+1);
  if (!draft) { //Kolla om ämnesraden är korrekt
    Logger.log("Ogiltig ämmnesrad " + email_draft_subject);
    cell.setBackground("red");
    return;
  }
  else {
    if ("#ffffff" != cell.getBackground()) {
      cell.setBackground("white");
    }
  }

  var cell=selection.getCell(rad_nummer, grd["email_sender_name"]+1);
  if (email_sender_name) { //Kolla om fältet för avsändarnamn är angivet
    if ("#ffffff" != cell.getBackground()) {
      cell.setBackground("white");
    }
  }
  else {
    Logger.log("Inget avsändarnamn angivet");
    cell.setBackground("yellow");
  }
  
  var cell=selection.getCell(rad_nummer, grd["email_document_merge"]+1);
  var documentToMerge;
  if (email_document_merge) { //Kolla om fältet för koppla dokument är angivet
    
    documentToMerge = getDocumentToMerge(email_document_merge);
    
    if (documentToMerge) {
      Logger.log("Lyckades hitta dokument att koppla");
      Logger.log(documentToMerge);
      if ("#ffffff" != cell.getBackground()) {
        cell.setBackground("white");
      }
    }
    else  {
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

  var body = draft.getBody();
  var plainBody = draft.getPlainBody();
  var attachments = draft.getAttachments();

  for (var i = 0; i<data.length; i++) {
    Logger.log("Rad  i kalkylarket " + i);

    /***Villkor***/    
    var tmp_email_condition = replaceTemplate(email_condition, attribut, data[i]);
    if (tmp_email_condition)  {
      if (!eval(tmp_email_condition)) {
        Logger.log("Uppfyller INTE villkoren " + data[i][attribut.Förnamn] + " " + data[i][attribut.Efternamn]);
        Logger.log(tmp_email_condition);
        continue;
      }
    }
    
    Logger.log("Uppfyller villkoren " + data[i][attribut.Förnamn] + " " + data[i][attribut.Efternamn]);
    Logger.log(tmp_email_condition);
    /***Villkor - Slut***/

    var emailOptions = {};
    /***Hämta & Ersätt text***/
    
    /***Ämnesrad***/
    var tmp_subject = replaceTemplate(email_draft_subject, attribut, data[i]);
    /***Ämnesrad - Slut***/

    /***Avsändarnamn***/
    if (email_sender_name)  {
      var tmp_email_sender_name = replaceTemplate(email_sender_name, attribut, data[i]);
      emailOptions["name"] = tmp_email_sender_name;
    }
    /***Avsändarnamn - Slut***/

    /***Avsändaradress***/
    var tmp_email_sender_email = getSender(email_sender_email, "avsändaradress", attribut, data[i], cell_email_sender_email, emailOptions);
    if (!tmp_email_sender_email) {
      continue;
    }
    /***Avsändaradress - Slut***/

    /***Svarsadress e-post***/
    var tmp_email_replyto = getSender(email_replyto, "svarsadress", attribut, data[i], cell_email_replyto, emailOptions);
    if (!tmp_email_replyto) {
      continue;
    }
    /***Svarsadress e-post - Slut***/

    /***Svara-ej***/
    var tmp_email_noreply = replaceTemplate(email_noreply, attribut, data[i]);
    if (tmp_email_noreply)  { //Om den ej är tom
      tmp_email_noreply = JSON.parse(tmp_email_noreply);
    }
    if (tmp_email_noreply)  {
      cell_email_noreply.setValue(true);
      Logger.log("Svara-ej är påslagen " + tmp_email_noreply);
      emailOptions["noReply"] = true;
    }
    else {
      cell_email_noreply.setValue(false);
      Logger.log("Svara-ej är avstängd " + tmp_email_noreply);
    }
    /***Svara-ej - Slut***/

    /***Mottagare e-post***/
    var tmp_email_recipient = getRecipient(email_recipient, "mottagaradress", attribut, data[i]);
    /***Mottagare e-post- Slut***/

    /***Kopia e-post***/
    var tmp_email_cc = getRecipient(email_cc, "kopia e-post", attribut, data[i]);
    if (tmp_email_cc) {
      emailOptions["cc"] = tmp_email_cc;
    }
    /***Kopia e-post - Slut***/

    /***Blindkopia e-post***/
    var tmp_email_bcc = getRecipient(email_bcc, "blindkopia e-post", attribut, data[i]);
    if (tmp_email_bcc) {
      emailOptions["bcc"] = tmp_email_bcc;
    }
    /***Blindkopia e-post - Slut***/

    if (!(tmp_email_recipient || tmp_email_cc || tmp_email_bcc))  {
      Logger.log("Ingen mottagare är angiven på något sätt. Vi hoppar över denna person");
      continue;
    }
    
    /***Brödtext***/
    var tmp_plainBody = replaceTemplate(plainBody, attribut, data[i]);
    var tmp_body = replaceTemplate(body, attribut, data[i]);
    emailOptions["htmlBody"] = tmp_body;    
    /***Brödtext  Slut***/
    
    /***Bilagor***/
    emailOptions["attachments"] = getAndMakeAttachments(attachments, documentToMerge, attribut, data[i]);
    /***Bilagor - Slut***/

    
    Logger.log("tmp_email_recipient " + tmp_email_recipient);
    Logger.log("tmp_subject " + tmp_subject);
    Logger.log("tmp_plainBody " + tmp_plainBody);
    Logger.log("Bilagor " + attachments);
    Logger.log("emailOptions");
    Logger.log(emailOptions);

    GmailApp.sendEmail(tmp_email_recipient, tmp_subject, tmp_plainBody, emailOptions);
  }
}


/**
 * Ger en lista med de bilagor som ska skickas
 * genom att använda de bilagor som finns i utkastet samt de
 * dokument som ska kopplas
 * 
 * @param {Object[]} attachments - lista av objekt av typen GmailAttachment som finns i utkastet som bilaga
 * @param {Object[]} documentToMerge - en lista av objekt av typen File
 * @param {Object} attribut - ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} dataArray - en lista innehållande persondata för en person
 *
 * @returns {Object[]} - lista av objekt för de bilagor som ska skickas
 */
function getAndMakeAttachments(attachments, documentToMerge, attribut, dataArray) {

  var tmp_attachments = [];

  for (var i = 0; i<attachments.length; i++)  {
    tmp_attachments.push(attachments[i]);
    Logger.log("Lägger till bilagan " + attachments[i].getName());
  }

  for (var i = 0; documentToMerge && i<documentToMerge.length; i++)  {
    
    var tmp_copy_id;
    try {
      var docName = documentToMerge[i].getName();
      var newDocName = replaceTemplate(docName, attribut, dataArray);
      tmp_copy_id = documentToMerge[i].makeCopy(newDocName).getId();
      var tmp_copy = DocumentApp.openById(tmp_copy_id);

      var body = tmp_copy.getBody();
      replaceContentOfDocument(body, attribut, dataArray);

      var header = tmp_copy.getHeader();
      replaceContentOfDocument(header, attribut, dataArray);

      var footer = tmp_copy.getFooter();
      replaceContentOfDocument(footer, attribut, dataArray);
      

      Logger.log("URL för temporärt skapad fil är");
      Logger.log(tmp_copy.getUrl());
      tmp_copy.saveAndClose();
      
      var tmp_pdf = DocumentApp.openById(tmp_copy_id).getAs('application/pdf');
      tmp_attachments.push(tmp_pdf);
      Logger.log("Lägger till den personliga bilagan " + tmp_pdf.getName());
    }
    catch (e) {
      Logger.log(e);
    }
    finally {
      try {
        //Radera den temporärt skapade filen
        DriveApp.getFileById(tmp_copy_id).setTrashed(true);
      }
      catch (e) {
        Logger.log(e);
      }
    }
  }
  return tmp_attachments;
}


/**
 * Ersätter kortkoder med personlig text i ett Google-dokument
 * inom ett typområde i dokumentet
 * 
 * @param {Object} section - ett objekt av typen för ett typområde i ett dokument
 * @param {Object} attribut - ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} dataArray - en lista innehållande persondata för en person
 */
function replaceContentOfDocument(section, attribut, dataArray) {

  var section_text = section.getText();
  
  //Skapar en lista med alla kortkoder som används
  var textMatches = getListOfUsedShortcodes(section_text);

  //Mycket här i kan läggas i en egen funktion
  for (var i = 0; textMatches && i<textMatches.length; i++)  {

    //Ny data för aktuell person som ska ersätta kortkoden
    var replaceData = getReplaceDataForShortcode(textMatches[i], attribut, dataArray);

    //Ersätt koden med personlig data
    section.replaceText(textMatches[i], replaceData || '');
  }
}


/**
 * Ger texten som ska ersätta en specifik kortkod
 * 
 * @param {string} textMatch - en kortkod som används
 * @param {Object} attribut - ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} dataArray - en lista innehållande persondata för en person
 *
 * @returns {string[]} - en lista av de kortkoder som används
 */
function getReplaceDataForShortcode(textMatch, attribut, dataArray)  {

  //Ta bort måsvingarna
  var textMatch = textMatch.replace(/[\{\}][\{\}]/g, '');
  //Vilken kolumn (0-index) som kortkoden finns i kalkylarket
  var textColMatch = attribut[textMatch];
  //Ny data = den som finns i kolumn textColMatch för denna person
  var replaceData = dataArray[textColMatch];

  //Logger.log(textMatch);
  //Logger.log(textColMatch);
  //Logger.log(replaceData);
  return replaceData;
}


/**
 * Givet text ger en lista av alla kortkoder som används i texten
 * 
 * @param {string} text - en textsträng
 *
 * @returns {string[]} - en lista av de kortkoder som används
 */
function getListOfUsedShortcodes(text)  {
  var tmp_list = text.match(/\{\{[^\{\}]+\}\}/g);
  return tmp_list;
}


/**
 * Givet en kommaseparerad sträng med id för filer på Google drive
 * ges en lista med objekten av filerna
 * 
 * @param {string} ids - en kommaseparerad sträng av id:n för filer
 *
 * @returns {Object[]} - en lista av objekt av typen File
 */
function getDocumentToMerge(ids) {
  
  var idList = ids.split(",");  
  var docs = [];
  
  for (var i = 0; i < idList.length; i++) {    
    var id = idList[i].trim();

    try {    
      var doc = DriveApp.getFileById(id);
      docs.push(doc);
    } catch (e) {
      Logger.log(e);    
      return false;    
    }
  }
  return docs;
}


/**
 * Givet en mall returnerar funktionen en personlig e-postadress
 * att använda som avsändaradress respektive svarsadress beroende på
 * syfte. Data läggs till i objekten emailOptions för hur e-post ska
 * skickas. Ändrar färg på cell i kalkylark vid statusändring.
 * 
 * @param {string} variable - en textmall innehållande ev kortkoder
 * @param {string} nameOfVariable - en textsträng med namnet på e-postattributet
 * @param {Object} attribut - ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} data - en lista innehållande persondata för en person
 * @param {Object} cell - ett objekt av typen Range
 * @param {Object} emailOptions - ett objekt där extra data för att skicka e-posten finns
 *
 * @returns {string} - en textsträng utan kommentarer eller mellanrum
 */
function getSender(variable, nameOfVariable, attribut, data, cell, emailOptions)  {

  var tmp_variable = replaceTemplate(variable, attribut, data);
  tmp_variable = getCleanString(tmp_variable);
  tmp_variable = tmp_variable.toLowerCase();

  if ("avsändaradress"==nameOfVariable && isFromEmailAdressAllowed(tmp_variable)) {
    if ("#ffffff" != cell.getBackground()) {
      cell.setBackground("white");
    }
    emailOptions["from"] = tmp_variable;
  }
  else if ("svarsadress"==nameOfVariable && checkIfEmail(tmp_variable))  {
    if ("#ffffff" != cell.getBackground()) {
      cell.setBackground("white");
    }
    emailOptions["replyTo"] = tmp_variable;
  }
  else if (!tmp_variable)  {
    Logger.log("Ingen " + nameOfVariable + " angiven");
    cell.setBackground("yellow");
  }
  else {
    Logger.log("Ogiltig " + nameOfVariable + " angiven " + tmp_variable +". Vi hoppar över denna person");
    cell.setBackground("red");
    return false;
  }
  return true;
}


/**
 * Givet en mall returnerar funktionen en personlig gjord kommaseparerad
 * textsträng
 * 
 * @param {string} variable - en textmall innehållande ev kortkoder
 * @param {string} nameOfVariable - en textsträng med namnet på e-postattributet
 * @param {Object} attribut - ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} data - en lista innehållande persondata för en person
 *
 * @returns {string} - en textsträng utan kommentarer eller mellanrum
 */
function getRecipient(variable, nameOfVariable, attribut, data) {

  var tmp_variable = replaceTemplate(variable, attribut, data);
  tmp_variable = getCleanEmailArray(tmp_variable).toString();
  Logger.log(nameOfVariable);
  Logger.log(tmp_variable);
  if (tmp_variable)  {
    Logger.log(nameOfVariable + " är angiven " + tmp_variable);
  }
  else {
    Logger.log("Ingen " + nameOfVariable + " är angiven " + tmp_variable);
  }
  return tmp_variable;
}


/**
 * Givet en variabel returnerar funktionen en kommaseparerad textsträng
 * där endast de element som är e-postadresser är med
 * 
 * @param {string} input - en variabel
 *
 * @returns {string[]} - en textsträng utan kommentarer eller mellanrum
 */
function getCleanEmailArray(input) {

  var emailArray = [];
  input = getCleanString(input);  
  var tmpArray = input.split(",");

  for (var i = 0; i<tmpArray.length; i++) {
    if (checkIfEmail(tmpArray[i]))  {
      emailArray.push(tmpArray[i]);
    }
  }
  return emailArray;
}


/**
 * Ger sant eller falskt om angiven e-postadress är tillåten
 * som avsändareadress
 * 
 * @param {string} email - en e-postadress
 *
 * @returns {boolean} - om avsändaradressen är tillåten
 */
function isFromEmailAdressAllowed(email) {  
  return contains(getAllowedFromEmailAdresses(), email);
}


/**
 * Ger vilka e-postadresser som det går att ange som avsändare
 *
 * @returns {string[]} - en lista med e-postadresser
 */
function getAllowedFromEmailAdresses() {
  
  var aliases = GmailApp.getAliases();
  var min_adress = Session.getEffectiveUser().getEmail();
  
  aliases.push(min_adress);
  //Logger.log(aliases);
  return aliases;
}


/**
 * Ger en personlig text givet indatatext med kortkoder
 * 
 * @param {string} textInput - en textmall innehållande ev kortkoder
 * @param {Object} attribut - ett objekt med kolumnrubriker och dess placeringar
 * @param {string[]} dataArray - en lista innehållande persondata för en person
 *
 * @returns {string} - en personligfierad textsträng
 */
function replaceTemplate(textInput, attribut, dataArray)  {

  var text = textInput.slice();
  //Skapar en lista med alla kortkoder som används
  var textMatches = getListOfUsedShortcodes(text);

  for (var i = 0; textMatches && i<textMatches.length; i++)  {
    
    //Ny data för aktuell personsom ska ersätta kortkoden
    var replaceData = getReplaceDataForShortcode(textMatches[i], attribut, dataArray);
    //Ersätt koden med personlig data
    text = text.replace(textMatches[i], replaceData || '');
  }
  //Logger.log(text);
  return text;
}


/**
 * Ger en matris med data för medlemslistan i kalkylarket
 * 
 * @param {Object} sheet - ett objekt av typen Sheet
 *
 * @returns {string[][]} - en matris innehållande persondata
 */
function getVerkligMedlemslista(sheet) {

  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var range = sheet.getRange(2, 1, lastRow-1, lastColumn);

  var values = range.getDisplayValues();

  Logger.log("Data i kalkylarket för medlemslista");
  Logger.log(values);
  return values;
}


/**
 * Ger ett objekt med rubrikerna i kalkylarket som nycklar och
 * dess respektive kolumnplacering som värde
 * 
 * @param {Object} sheet - ett objekt av typen Sheet
 *
 * @returns {Object} - ett objekt med kolumnrubriker och dess placeringar
 */
function getVerkligaRubriker(sheet) {

  var lastColumn = sheet.getLastColumn();
  var range = sheet.getRange(1, 1, 1, lastColumn);

  var values = range.getDisplayValues()[0];

  Logger.log("Rubriker i kalkylarket");
  Logger.log(values);

  var data = {};
  for (var i = 0; i<values.length; i++) {
    data[values[i]] = i;
  }
  return data;
}


/**
 * Ger ett e-postutkast om det finns givet ämnesraden på det
 * 
 * @param {string} subject - ämnesrad på e-postutkast
 *
 * @returns {Object} - ett e-postutkast av typen GmailMessage
 */
function getDraft(subject)  {

  subject = getComparableString(subject);

  var drafts = GmailApp.getDraftMessages();
  for (var i = 0; i<drafts.length; i++) {

    var draftSubject = drafts[i].getSubject();
    draftSubject = getComparableString(draftSubject);

    if (draftSubject == subject)  {
      Logger.log(draftSubject);
      return drafts[i];
    }
  }
  return false;
}


/**
 * Gör om en textsträng till gemener och tar bort tomrum
 * 
 * @param {string} text - textsträng
 *
 * @returns {string} - textsträng som är enklare att jämföra
 */
function getComparableString(text)  {

  //Ta bort tomma mellanrum vid start och slut och konvertera till gemener
  text = text.toLowerCase().trim();
  //Ta bort alla tomma mellanrum
  text = text.replace(/([\s])+/g, '');
  return text;
}


/**
 * Skapa kolumnrubriker i kalkylarket för medlemslistor konfig
 */
function skapaRubrikerMedlemslistor() {

  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Medlemslistor).getSheets()[0];

  var mlkrd = getMedlemslistorKonfigRubrikData();

  // Frys de två översta raderna på arket så att rubrikerna alltid syns
  sheet.setFrozenRows(2);

  /********Rad 1********************/
  var range1_rad1 = sheet.getRange(1, mlkrd["email_sender_name"]+1, 1, 4);
  var range2_rad1 = sheet.getRange(1, mlkrd["email_recipient"]+1, 1, 3);
  
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

  var values_rad1 = [
    ["Avsändare", "", "", "", "Mottagare", "", ""]
  ];

  // Sätter området för cellerna som vi ska ändra
  // De 7 kolumnerna för att styra e-postinställningar
  var range_rad1 = sheet.getRange(1, mlkrd["email_sender_name"]+1, 1, 7);
  range_rad1.setHorizontalAlignment("center");
  range_rad1.setFontWeight("bold");

  // Sätter våra rubriker på vårt område
  range_rad1.setValues(values_rad1);

  /*******Rad 2********************/
  // Våra värden vi vill ha som rubriker för de olika kolumnerna på rad 2
  var values_rad2 = [
    ["Namn", "Scoutnet-id", "Länk till kalkylark", "Ämnesrad på utkastet i Gmail", "Villkor", "Koppla dokument",
    "Avsändare namn", "Avsändare e-post", "Svarsadress e-post", "Svara-ej",
    "Mottagare e-post", "Kopia e-post", "Blindkopia e-post"]
  ];

  // Sätter området för cellerna på rad 2 som vi ska ändra
  var range_rad2 = sheet.getRange(2, 1, 1, values_rad2[0].length);

  // Sätter våra rubriker på vårt område
  range_rad2.setValues(values_rad2);
  range_rad2.setFontWeight("bold");
  range_rad2.setFontStyle("italic");
  /*******************************/

  /*******Sätt kantlinjer*********/ 
  var kolumn1 = getA1RangeOfColumns(sheet, mlkrd["email_sender_name"]+1, 4);
  //Kolumnen för scoutnet_list_id;
  kolumn1.setBorder(null, true, null, true, null, null);
  
  var kolumn2 = getA1RangeOfColumns(sheet, mlkrd["email_recipient"]+1, 3);
  kolumn2.setBorder(null, true, null, true, null, null);  
  /*******************************/
}


/**
 * Uppdatera en lista över medlemmar
 * 
 * @param {Object} selection - området på kalkylarket för alla listor som används just nu
 * @param {number} rad_nummer - radnummer för aktuell medlemslista i kalkylarket
 * @param {string[]} radInfo - lista med data för aktuell rad i kalkylarket
 * @param {string[]} grd - lista med vilka kolumnindex som respektive parameter har
 * @param {Object[]} allMembers - lista med medlemsobjekt
 * @param {Object[]} spreadsheet - ett googleobjekt av typen Spreadsheet där listan finns
 */
function updateMemberlist(selection, rad_nummer, radInfo, grd, allMembers, spreadsheet) {

  /************************/
  var scoutnet_list_id = radInfo[grd["scoutnet_list_id"]]; //Själva datan
  var cell_scoutnet_list_id = selection.getCell(rad_nummer, grd["scoutnet_list_id"]+1); //Range
  Logger.log(".......Synkronisering - hämta data............");
  var tmpMembersInAList = fetchScoutnetMembersMultipleMailinglists(scoutnet_list_id, cell_scoutnet_list_id, "");
  Logger.log(".......Slut Synkronisering - hämta data.......");
  /***********************/ 

  var membersInAList = []
  for (var i = 0; i<tmpMembersInAList.length; i++) {
    //Leta upp medlemmen i listan övar alla medlemmar
    var obj = allMembers.find(obj => obj.member_no == tmpMembersInAList[i].member_no);
    membersInAList.push(obj);
    Logger.log(obj);
  }

  var mlrd = getMedlemslistorRubrikData();
  Logger.log(mlrd);
  var numAttrMembers = mlrd.length;
  Logger.log("Antal medlemsattribut att använda " + numAttrMembers);

  var sheet = spreadsheet.getSheets()[0];

  /****Storlek på den gamla datan som ska bort***/
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var numRows = lastRow+1;

  if (membersInAList.length+1>lastRow)  {
    //Vi ska rensa om det blir fler rader i nya också
    numRows = membersInAList.length+1;
  }  

  if (numAttrMembers>lastColumn)  {
    //Vi ska rensa om det blir fler kolumner i nya också
    lastColumn = numAttrMembers;
  }  
  Logger.log("lastColumn ska vara " + lastColumn);
  Logger.log("lastRow ska vara " + lastRow);
  
  //Storlek på den gamla datan som ska bort
  var range_allt = sheet.getRange(1, 1, numRows, lastColumn);
  range_allt.clearContent();
  /*********************************************/

  /****Storlek på den nya datan som ska in*****/
  var range_medlemmar = sheet.getRange(2, 1, membersInAList.length, numAttrMembers);
  var memberMatrix = createMemberlistMatrix(membersInAList, mlrd);
  Logger.log(memberMatrix);
  range_medlemmar.setValues(memberMatrix);  
  /********************************************/

  /****Storlek på den nya rubriken som ska in**/
  var range_rad1 = sheet.getRange(1, 1, 1, numAttrMembers);
  range_rad1.setFontWeight("bold");
  range_rad1.setFontStyle("italic");

  var memberRubrikMatrix = createMemberlistRubrikRow(mlrd);
  range_rad1.setValues([memberRubrikMatrix]);
  /********************************************/

  setCustomColumns(sheet, numAttrMembers+1, membersInAList.length);
}


/**
 * Bygger upp en rad med rubriker för medlemsdatan
 * 
 * @param {Object[]} mlrd - en lista över rubriker och och attribut för tillhörande medlemmar
 * 
 * @returns {string[]} - lista bestående av rubrikerna för medlemsdatan
 */
function createMemberlistRubrikRow(mlrd)  {

  var row = [];
  for (var i = 0; i<mlrd.length; i++) {    
    var svName = mlrd[i].svName;
    row.push(svName);
  }
  Logger.log("Rubriknamn " + row);
  return row;
}


/**
 * Bygger upp en matris med medlemsdata för flera medlemmar
 * 
 * @param {Object[]} membersInAList - lista över medlemsobjekt
 * @param {Object[]} mlrd - en lista över rubriker och och attribut för tillhörande medlemmar
 * 
 * @returns {string[[]]} - matris bestående av listor som är rader med medlemsdata
 */
function createMemberlistMatrix(membersInAList, mlrd) {

  var memberMatrix = [];
  for (var i = 0; i<membersInAList.length; i++) {
    var row = createMemberlistRow(membersInAList[i], mlrd);
    memberMatrix.push(row);
  }
  return memberMatrix;
}


/**
 * Bygger upp en rad med medlemsdata
 * 
 * @param {Object} member - ett medlemsobjekt
 * @param {Object[]} mlrd - en lista över rubriker och och attribut för tillhörande medlemmar
 * 
 * @returns {string[]} - Lista med medlemsdata
 */
function createMemberlistRow(member, mlrd)  {

  var row = [];
  for (var i = 0; i<mlrd.length; i++) {   
    var name = mlrd[i].apiName;
    value = member[name];
    //Logger.log("Attribut " + name + " värde " + value);
    row.push(value);
  }
  return row;
}


/**
 * Sätter specialkolumner i ett kalkylark
 * 
 * @param {Object} sheet - ett googleobjekt av typen Sheet
 * @param {number} startCol - startkolumn för var dessa kolumner ska skrivas
 * @param {number} numRow - antal rader att skriva specialfunktionerna på
 */
function setCustomColumns(sheet, startCol, numRow)  {

  var cf = getCustomFunctions();
  var num_cf = cf.length;

  /***********Rubriker**********/
  var row = [];
  for (var i = 0; i<num_cf; i++) {
    var namn = cf[i].namn;
    row.push(namn);
  }

  var range_cf_rubrik = sheet.getRange(1, startCol, 1, num_cf);
  range_cf_rubrik.setValues([row]);

  /***********Data i extra kolumner*****/
  for (var i = 0; i<num_cf; i++) {
    var formula = cf[i].formel;
    var range_cf = sheet.getRange(2, startCol+i, numRow, 1);
    range_cf.setFormulaR1C1(formula);
  }
}


/**
 * Returnerar lista med vilket index som olika rubriker har i kalkylarket
 *
 * @returns {number[]} - Lista med rubrikindex för respektive rubrik
 */
function getMedlemslistorKonfigRubrikData() {
  
  //Siffran är vilken kolumn i kalkylarket.
  var medlemslistaKonfigRubrikData = {};
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
 * Returnerar lista med objekt för standardkolumner i kalkylarket med namn
 * i Scoutnets API och det svenska attributnamnet
 *
 * @returns {Object[]} - Lista med objekt för standardkolumner i kalkylarket
 */
function getMedlemslistorRubrikData()  {
  
  var mlrd = [
    {"apiName": "member_no", "svName": "Medlemsnr."},
    {"apiName": "first_name", "svName": "Förnamn"},
    {"apiName": "last_name", "svName": "Efternamn"},
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
