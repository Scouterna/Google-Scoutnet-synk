/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Funktion för att för de filer du ej äger göra följande:
 * - Skapa kopia på filen om filformat är godkänt
 * - Ändra data i orginalfilen då det inte går att radera den helt
 * - Ta bort din egen åtkomst till orginalfilen så att den försvinner
 * - Ta bort ägaren till orginalfilen från den nya kopian 
 */
function copyFileNewOwner() {
  
  var emailOfAdmin = "webmaster@dinegnascoutkår.se";
  
  var domain = "dinegnascoutkår.se";
  
  //Mappen vi ska leta filer i
  //T.ex https://drive.google.com/drive/u/0/folders/qwer-asdfghjklzxcvbnmqwertyuio
  var folderId = "qwer-asdfghjklzxcvbnmqwertyuio";


  if (!emailOfAdmin.endsWith(domain)) {
    Logger.log("Felaktig domän på e-postadress!!");
    return;
  }
  
  //Din e-postadress för att veta vilka filer/mappar vi kan ändra ägare på
  var yourEmail = Session.getActiveUser().getEmail();
  Logger.log("Din e-post " + yourEmail);  

  //Anropar functionen som ska byta ägare på alla filer
  changeFileAndFolderMakeCopy(folderId, yourEmail);  
}


/**
 * Rekursiv funktion för att skapa kopior på filer och ta bort orginalen
 * 
 * @param {string} folderId - Id för en Google-mapp
 * @param {string} yourEmail - Din e-postadress som kör skriptet
 */
function changeFileAndFolderMakeCopy(folderId, yourEmail) {
  
  //Hämta mappen vi ska leta filer i
  var folder = DriveApp.getFolderById(folderId);
  
  if (!folder) {
    Logger.log("Du kör fel funktion!!");
    return;
  }
  
  //Hämta alla filer som finns i denna mapp
  var files = folder.getFiles();  
  
  while(files.hasNext()) {
    try {
      //Kollar nästa fil
      var file = files.next();
      
      //Vad filen heter
      var fileName = file.getName();
      
      //Vem som äger filen innan
      var oldFileOwner = file.getOwner().getEmail();

      if (oldFileOwner == yourEmail) {
        Logger.log("Du äger denna fil - " + fileName);                      
      }
      else {
        Logger.log("Du äger EJ denna fil - " + fileName);
        makeNewFile(file, folder, yourEmail);       
      }
    }    
    catch(e) {
      Logger.log("Problem med fil: " + e);
    }    
  }  
  
  //Hämta alla undermappar som finns i denna mapp
  var childFolders = folder.getFolders();  
  
  while(childFolders.hasNext()) {
    try {
      //Kollar nästa mapp
      var childFolder = childFolders.next();
      
      //Vad mappen heter
      var childName = childFolder.getName();
      
      //Vilket id som mappen har
      var childId = childFolder.getId();     
      
      changeFileAndFolderMakeCopy(childId, yourEmail);
    }    
    catch(e) {
      Logger.log("Problem med mapp: " + e);
    }    
  }  
}


/**
 * Funktion för att skapa en kopia på en fil och ta bort orginalet
 * 
 * @param {Object} file - Ett filobjekt
 * @param {Object} folder - Ett mappobjekt
 * @param {string} yourEmail - Din e-postadress som kör skriptet
 */
function makeNewFile(file, folder, yourEmail) {
  try {
    var owner = file.getOwner().getEmail();
    var name = file.getName();
    var mimeType = file.getMimeType();
    
    //Filformat på filen
    Logger.log("MimeType " + mimeType);

    //Vi ska göra en ny kopia och ta bort den gamla
    if (checkMimeTypeIfOkToMakeNew(mimeType)) {
      Logger.log("Ok filtyp att kopiera och ta bort");
      
      try {
        Logger.log("Försöker kopiera filen  " + name);
        var newFile = file.makeCopy(name, folder);
        Logger.log("Nykopierad fil med namn " + newFile.getName());

        Logger.log("Försöker radera innehållet i orginalfilen  " + name);
        file.setContent("Denna fils innehåll är borttaget. Kopia finns hos kåren");
        Logger.log("Raderat innehåll i orginalfilen");

        Logger.log("Försöker radera orginalfilen  " + name);
        file.revokePermissions(yourEmail);
        Logger.log("Raderat orginalfilen från din egna drive");

        Logger.log("Försöker ta bort gamla filägarens behörighet till den nya filkopian  " + name);
        newFile.revokePermissions(owner);
        Logger.log("Tagit bort behörighet till den nya filkopian för " + owner);
      }  
      catch (e) {        
        Logger.log(e.message);
      }
    }
    else {
      Logger.log("Denna filtyp ska lämnas orörd");
    }    
  }  
  catch (e) {        
    Logger.log(e.message);
  }
}


/**
 * Funktion för att kontrollera om filtypen är ok att röra
 * 
 * @param {string} mimeType - Sträng för en mimetype
 * 
 * @returns {boolean}
 */
function checkMimeTypeIfOkToMakeNew(mimeType) {

  //Listan över de att välja över hittas på
  //https://developers.google.com/drive/api/v3/ref-export-formats

  var mimeTypesToTouch = [
    "text/plain",
    "application/rtf",
    "application/vnd.oasis.opendocument.text",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/x-vnd.oasis.opendocument.spreadsheet",
    "text/csv",
    "text/tab-separated-values",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.presentation",
    "application/vnd.google-apps.document"
  ];

  if (mimeTypesToTouch.includes(mimeType)) {
    return true;
  }
  return false;
}
