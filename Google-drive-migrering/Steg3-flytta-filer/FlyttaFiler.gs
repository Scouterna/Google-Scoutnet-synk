/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */

var loglevel = 3 // 1..5

/**
 * Funktion för att flytta dina filer och kopiera mappar
 * Funktionen uppdaterar även ändrade filer
 * Max tid för exekvering är 30 minuter. Kör igen för att återuppta kopieringen.
 * När du ser "Klar!" sist i loggen så har du kört hela skriptet.
 */
function copyFiles() {

  //Hämta mappen vi ska leta filer i
  //T.ex https://drive.google.com/drive/u/0/folders/qwer-asdfghjklzxcvbnmqwertyuio
  let sourceFolderId = "qwer-asdfghjklzxcvbnmqwertyuio";

  let destFolderId = "oiuytrewqlkjhgfdsamnbvcxz";
 
  //Din e-postadress för att veta vilka filer/mappar vi kan ändra ägare på
  let yourEmail = Session.getActiveUser().getEmail();
  if (loglevel > 3) Logger.log("Din e-post " + yourEmail);  
  
  //Anropar functionen som ska flytta på alla dina egna filer
  copyFilesAndCopyFolders("/", sourceFolderId, destFolderId, yourEmail);

  Logger.log("Klar!")
}


/**
 * Rekursiv funktion för att flytta dina filer och kopiera mappar
 * 
 * @param {string} parentPath - Path for föräldra mappen
 * @param {string} sourceFolderId - Id för en Google-mapp att flytta från
 * @param {string} destFolderId - Id för en Google-mapp att flytta till
 * @param {string} yourEmail - Din e-postadress som kör skriptet
 */
function copyFilesAndCopyFolders(parentPath, sourceFolderId, destFolderId, yourEmail) {
  
  //Hämta mappen vi ska leta filer i
  let sourceFolder = DriveApp.getFolderById(sourceFolderId);
  let destFolder = DriveApp.getFolderById(destFolderId);
  
  if (!sourceFolder || !destFolder) {
    Logger.log("Du kör fel funktion!!");
    return;
  }
  
  // Hämta alla filer som finns i denna mapp
  let sourceFiles = sourceFolder.getFiles();

  let sourceFolderName = sourceFolder.getName()
  let destFolderName = destFolder.getName()

  if (loglevel > 3) Logger.log("folder: " + parentPath);
  
  while(sourceFiles.hasNext()) {
    try {
      let sourceFile = sourceFiles.next();

      if (checkMimeTypeIfOkToMakeNew(sourceFile, parentPath)) {
        let sourceFileName = sourceFile.getName();
        try {
          let hasDestFiles = destFolder.getFilesByName(sourceFileName);
          let shouldCopyFile = !hasDestFiles.hasNext();
          while (hasDestFiles.hasNext()) {
            let destFile = hasDestFiles.next();
            if (sourceFile.getMimeType() == destFile.getMimeType()) { // Det kan finnas filer med samma namn, men med olika mime type: google-apps.document != Word.document
              let sourceUpdated = sourceFile.getLastUpdated();
              let destUpdated   = destFile.getLastUpdated();
              const TimeDiffAllowed = 5000; // 5 sek
              let sourceTime = sourceUpdated.getTime();
              let destTime = destUpdated.getTime();
              if (sourceTime <= destTime+TimeDiffAllowed) {
                if (loglevel > 3) Logger.log("Filen " + parentPath + sourceFileName + " finns redan, sourcefile updated:" + sourceUpdated + ", destfile updated: " + destUpdated);
                shouldCopyFile = false;
                break;
              }
              else {
                if (loglevel > 2) Logger.log("Uppdaterar " + parentPath + sourceFileName + " finns redan, sourcefile updated:" + sourceTime + ", destfile updated: " + destTime);
                destFile.setTrashed(true); // Nyare fil finns
                shouldCopyFile = true;
                break;
              }
            }
            else {
              if (loglevel > 3) Logger.log("Samma fil " + parentPath + sourceFileName + ", olika source mime:" + sourceFile.getMimeType() + ", dest mime:" + destFile.getMimeType());
              shouldCopyFile = true;
            }
          }
          if (shouldCopyFile) {
            if (loglevel > 2) Logger.log("Kopierar " + parentPath + sourceFileName);
            sourceFile.makeCopy(sourceFileName, destFolder);
          }
        }
        catch (e) {
          Logger.log("Problem med file: " + e);
        }
      }
    }
    catch(e) {
      Logger.log("Problem med fil: " + e);
    }
  }

  //Hämta alla undermappar som finns i denna mapp
  let sourceChildFolders = sourceFolder.getFolders();  
  
  while(sourceChildFolders.hasNext()) {
    try {
      //Kollar nästa mapp
      let sourceChildFolder = sourceChildFolders.next();
      
      //Vad mappen heter
      let sourceChildName = sourceChildFolder.getName();

      if (loglevel > 3) Logger.log("Mapp: " + parentPath + sourceChildName)

      //Vilket id som mappen har
      let sourceChildId = sourceChildFolder.getId();
      
      try {
        let destFolders = destFolder.getFoldersByName(sourceChildName);
        let destChild;
        if (destFolders.hasNext()) {
            destChild = destFolders.next();
            if (loglevel > 3) Logger.log("Mappen " + sourceChildName + " finns redan, namn:" + destChild.getName());
        }
        else {
          //Skapa en ny mapp på rätt plats
          if (loglevel > 2) Logger.log("Skapar ny mapp: " + parentPath + sourceChildName)
          destChild = destFolder.createFolder(sourceChildName);
        }
        let destChildId = destChild.getId();
        copyFilesAndCopyFolders(parentPath + sourceChildName + "/", sourceChildId, destChildId, yourEmail);
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
 * @param {File} sourceFile
 * @param {string} parentPath
 * 
 * @returns {boolean}
 */
function checkMimeTypeIfOkToMakeNew(sourceFile, parentPath) {

  let mimeType = sourceFile.getMimeType();

  //Listan över de att välja över hittas på
  //https://developers.google.com/drive/api/v3/ref-export-formats

  const mimeTypesToTouch = [
    "text/plain",
    "application/rtf",
    "application/vnd.oasis.opendocument.text",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "application/x-vnd.oasis.opendocument.spreadsheet",
    "text/csv",
    "text/xml",
    "text/html",
    "application/x-javascript",
    "text/css",
    "text/tab-separated-values",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/tiff",
    "image/svg+xml",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.presentation",
    "application/vnd.oasis.opendocument.graphics",
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.spreadsheet",
    "application/vnd.google-apps.drawing",
    "image/x-photoshop",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.google-apps.form",
    "video/mp4",
    "application/vnd.google-apps.presentation",
    "application/x-download", // pdf
    "application/x-iwork-pages-sffpages",
    "application/msaccess",
    "application/x-font-ttf"
  ];

  if (mimeTypesToTouch.includes(mimeType)) {
    return true;
  }
  if (loglevel > 2) Logger.log("Kopierar inte : " + parentPath + sourceFile.getName() + ", okänd mime typ : " + mimeType);
  return false;
}
