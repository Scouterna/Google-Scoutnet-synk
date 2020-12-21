/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Funktion för att ge bort ägarskap för filer och mappar
 */
function changeOwnership() {
  
  //Fyll i här vem som ska bli den nya ägaren av filerna
  var emailOfNewOwner = "webmaster@dinegnascoutkår.se";
  
  //Fyll i här domänen för den som ska bli den nya ägaren
  var domain = "dinegnascoutkår.se";  

  //Mappen vi ska leta filer i
  //T.ex https://drive.google.com/drive/u/0/folders/qwer-asdfghjklzxcvbnmqwertyuio
  var folderId = "qwer-asdfghjklzxcvbnmqwertyuio";


  if (!emailOfNewOwner.endsWith(domain)) {
    Logger.log("Felaktig domän på e-postadress!!");
    return;
  }
  
  //Din e-postadress för att veta vilka filer/mappar vi kan ändra ägare på
  var yourEmail = Session.getActiveUser().getEmail();
  Logger.log("Din e-post " + yourEmail);  
  
  //Anropar functionen som ska byta ägare på alla filer
  changeFileAndFolderOwnership(folderId, emailOfNewOwner, yourEmail);  
}


/**
 * Rekursiv funktion för att byta ägare på filer och mappar du äger
 * 
 * @param {string} folderId - Id för en Google-mapp
 * @param {string} emailOfNewOwner - E-postadress för den nya ägaren
 * @param {string} yourEmail - Din e-postadress som kör skriptet
 */
function changeFileAndFolderOwnership(folderId, emailOfNewOwner, yourEmail) {
  
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
        Logger.log("Du äger denna fil " + fileName);
        
        try {
            file.addEditor(emailOfNewOwner);
        }
        catch (e) {
            Logger.log(e.message);
        }
        try {
            file.setOwner(emailOfNewOwner);
        }
        catch (e) {
            Logger.log(e.message);
        }
        Logger.log("Nu äger " + emailOfNewOwner + " denna fil");        
      }
      else {
        Logger.log("Du äger EJ denna fil " + fileName);        
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
      
      //Vem som äger mappen innan
      var oldChildFolderOwner = childFolder.getOwner().getEmail();
      
      if (oldChildFolderOwner == yourEmail) {
        Logger.log("Du äger denna mapp " + childName);
        
        try {
            childFolder.addEditor(emailOfNewOwner);
        }
        catch (e) {
            Logger.log(e.message);
        }
        try {
            childFolder.setOwner(emailOfNewOwner);
        }
        catch(e){
            Logger.log(e.message);
        }
        Logger.log("Nu äger " + emailOfNewOwner + " denna mapp");                
      }
      else {
        Logger.log("Du äger EJ denna mapp " + childName);        
      }
      changeFileAndFolderOwnership(childId, emailOfNewOwner, yourEmail);
    }    
    catch(e) {
      Logger.log("Problem med mapp: " + e);
    }    
  }  
}
