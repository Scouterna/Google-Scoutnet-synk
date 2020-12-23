/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Funktion för att flytta dina filer och kopiera mappar
 */
function moveFiles() {

  //Hämta mappen vi ska leta filer i
  //T.ex https://drive.google.com/drive/u/0/folders/qwer-asdfghjklzxcvbnmqwertyuio
  var sourceFolderId = "qwer-asdfghjklzxcvbnmqwertyuio";

  var destFolderId = "oiuytrewqlkjhgfdsamnbvcxz";

  
  //Din e-postadress för att veta vilka filer/mappar vi kan ändra ägare på
  var yourEmail = Session.getActiveUser().getEmail();
  Logger.log("Din e-post " + yourEmail);  
  
  //Anropar functionen som ska flytta på alla dina egna filer
  moveFilesAndCopyFolders(sourceFolderId, destFolderId, yourEmail);
}


/**
 * Rekursiv funktion för att flytta dina filer och kopiera mappar
 * 
 * @param {string} sourceFolderId - Id för en Google-mapp att flytta från
 * @param {string} destFolderId - Id för en Google-mapp att flytta till
 * @param {string} yourEmail - Din e-postadress som kör skriptet
 */
function moveFilesAndCopyFolders(sourceFolderId, destFolderId, yourEmail) {
  
  //Hämta mappen vi ska leta filer i
  var sourceFolder = DriveApp.getFolderById(sourceFolderId);

  var destFolder = DriveApp.getFolderById(destFolderId);
  
  if (!sourceFolder || !destFolder) {
    Logger.log("Du kör fel funktion!!");
    return;
  }
  
  //Hämta alla filer som finns i denna mapp
  var sourceFiles = sourceFolder.getFiles();  
  
  while(sourceFiles.hasNext()) {
    try {
      //Kollar nästa fil
      var sourceFile = sourceFiles.next();

      var mimeType = sourceFile.getMimeType();
      
      //Vad filen heter
      var sourceFileName = sourceFile.getName();
      
      //Vem som äger sourceFilen innan
      var sourceFileOwner = sourceFile.getOwner().getEmail();
      
      if (sourceFileOwner == yourEmail) {
        Logger.log("Du äger denna fil " + sourceFileName);        
        if (checkMimeTypeIfOkToMakeNew(mimeType)) {
          try {
              //Flytta denna fil om det går
              sourceFile.moveTo(destFolder);
              Logger.log("Filen " + sourceFileName + " är nu flyttad");
          }
          catch (e) {
              Logger.log(e.message);
          }
        }      
      }
      else {
        Logger.log("Du äger EJ denna fil " + sourceFileName);        
      }      
    }    
    catch(e) {
      Logger.log("Problem med fil: " + e);
    }    
  }  
  
  //Hämta alla undermappar som finns i denna mapp
  var sourceChildFolders = sourceFolder.getFolders();  
  
  while(sourceChildFolders.hasNext()) {
    try {
      //Kollar nästa mapp
      var sourceChildFolder = sourceChildFolders.next();
      
      //Vad mappen heter
      var sourceChildName = sourceChildFolder.getName();
      
      //Vilket id som mappen har
      var sourceChildId = sourceChildFolder.getId();
      
      try {
        //Skapa en ny mapp på rätt plats
        var destChild = destFolder.createFolder(sourceChildName);
        destChildId = destChild.getId();
        moveFilesAndCopyFolders(sourceChildId, destChildId, yourEmail);
      }    
      catch(e) {
        Logger.log("Problem med mapp: " + e);
      }
    }    
    catch(e) {
      Logger.log("Problem med mapp: " + e);
    }    
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

    //return true;

    //Listan över de att välja över hittas på
    //https://developers.google.com/drive/api/v3/ref-export-formats

  var mimeTypesToTouch = [
    "text/plain",
    "application/rtf",
    "application/vnd.oasis.opendocument.text",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "application/x-vnd.oasis.opendocument.spreadsheet",
    "text/csv",
    "text/tab-separated-values",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.presentation",
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.spreadsheet"
  ];

  if (mimeTypesToTouch.includes(mimeType)) {
    return true;
  }
  return false;
}
