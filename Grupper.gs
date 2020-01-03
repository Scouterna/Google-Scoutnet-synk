/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/scouternasetjanster 
 */


/*
 * Returnerar lista med vilket index som olika rubriker har i kalkylarket
 *
 * @returns {number[]} - Lista med rubrikindex för respektive rubrik
 */
function GrupperRubrikData() {
  
  //Siffran är vilken kolumn i kalkylarket.
  var gruppRubrikData = {};
  gruppRubrikData["namn"] = 0;
  gruppRubrikData["e-post"] = 1;
  
  gruppRubrikData["scoutnet_list_id"] = 2;
  gruppRubrikData["synk_option"] = 3;
  gruppRubrikData["scoutnet_list_id_send"] = 4;
  gruppRubrikData["synk_option_send"] = 5;
  gruppRubrikData["scoutnet_list_id_receive"] = 6;
  gruppRubrikData["synk_option_receive"] = 7;
  gruppRubrikData["customFooterText"] = 8;
  
  gruppRubrikData["groupId"] = 9;
  gruppRubrikData["cell_url"] = 10;
  gruppRubrikData["felmeddelande"] = 11;
                  
  return gruppRubrikData;
}


/*
 * Huvudfunktion för att hantera synkronisering av googlegrupper med Scoutnet
 */
function Grupper() {
  
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Grupper).getSheets()[0];
  var selection = sheet.getDataRange();
  var data = selection.getValues();
  
  var grd = GrupperRubrikData();
  
  var listOfEmailAdressesOfActiveAccounts = getEmailAdressesofAllActiveGoogleAccounts();
  
  var delete_rows = [];
  
  for (var i = 2; i < data.length; i++) {
    
    var name = data[i][grd["namn"]];
    var email = data[i][grd["e-post"]];
    var scoutnet_list_id = data[i][grd["scoutnet_list_id"]];
    var synk_option = data[i][grd["synk_option"]];
    var groupId = data[i][grd["groupId"]];
    var customFooterText = data[i][grd["customFooterText"]];
    
    var rad_nummer = i+1;
    
    Logger.log('Namn: ' + name + ' E-post: ' + email + ' Scoutnet: ' + scoutnet_list_id + ' Grupp-ID: ' + groupId);
    
    var update_group = "yes";
    
    
    if (groupId=="") { //Vi borde skapa en grupp
      
      if (name=="" && email=="") { //Ta bort raden
        Logger.log("Försöker ta bort rad " + rad_nummer);
        
        delete_rows.push(rad_nummer);
        update_group = "no";
      }
      else if (name=="" && email!="") { //Vi gör ingenting
      }
      else if (name!="" && email=="") { //Vi gör ingenting
      }
      
      else if (name!="" && email!="") {        
        
        if (false==checkIfGroupExists(email) && true==checkEmailFormat(email)) { //Skapa gruppen
          
          email = email.toLowerCase().replace(/\s+/g, ''); //Ta bort tomma mellanrum
          email = removeDiacritics(email);
          
          var group = createGroup(email, name);
          var groupId = group.id;
          Logger.log("Skapade gruppen: " + email);
          
          var cell=selection.getCell(rad_nummer, grd["e-post"]+1);
          cell.setValue(email);
          cell.setBackground("white");
          
          cell=selection.getCell(rad_nummer, grd["groupId"]+1);
          cell.setValue(groupId);
          
          setCellValueCellUrl(selection, rad_nummer, grd["cell_url"], email);
          
        }
        else { //Om gruppens e-postadress redan finns
          
          var cell=selection.getCell(rad_nummer, grd["e-post"]+1);
          cell.setBackground("red");
        }        
      }           
    }
    
    
    else if (groupId!="") {  //Gruppen finns sedan innan
      
      if (name=="" && email=="") { //Ta bort gruppen
        
        Logger.log("Försöker ta bort " + groupId + " rad " + rad_nummer);
        AdminDirectory.Groups.remove(groupId);
        Logger.log(groupId + " raderades");
        
        delete_rows.push(rad_nummer);
        update_group = "no";
      }
      else if (email=="") { //Om tom, hämta e-postadressen från systemet och sätt tillbaka den
        
        var tmp_usr = AdminDirectory.Groups.get(groupId);
        var email = tmp_usr.email;
        var cell=selection.getCell(rad_nummer,grd["e-post"]+1);
        cell.setValue(email);
        cell.setBackground("white");
      }
      else if (email!="") { //Kontrollerar om vi behöver uppdatera
        
        var group = AdminDirectory.Groups.get(groupId);
        
        if (email!=group.email) { //E-postadressen har ändrats
          
          Logger.log("E-postadress för gruppen har ändrats på raden " + rad_nummer);          
          
          if (false==checkIfGroupExists(email) && true==checkEmailFormat(email)) {
            
            email = email.toLowerCase().replace(/\s+/g, ''); //Ta bort tomma mellanrum
            email = removeDiacritics (email);            
            
            Logger.log("try remove " + groupId + " row " + rad_nummer);
            AdminDirectory.Groups.remove(groupId); //Vi gör på detta sätt då det varit stora problem
            //med att tjänsten ej svarat tidigare om vi gjort en patch/update
            Logger.log(groupId + " togs bort");
            
            var group = createGroup(email, name);
            Logger.log("Uppdaterat e-postadress för gruppen: " + email);            
            groupId = group.id;
            
            var cell=selection.getCell(rad_nummer, grd["e-post"]+1);
            cell.setValue(email);
            cell.setBackground("white");
            
            cell=selection.getCell(rad_nummer, grd["groupId"]+1);
            cell.setValue(groupId);
            
            setCellValueCellUrl(selection, rad_nummer, grd["cell_url"], email);
          }
          else { //Om gruppens e-postadress redan finns
            
            var cell=selection.getCell(rad_nummer, grd["e-post"]+1);
            cell.setBackground("red");
          }
        }
        else if (name != group.name) { //Om namnet, men inte e-postadressen för gruppen ändrats
          
          Logger.log("Gruppnamnet har ändrats på rad " + rad_nummer);
          var tmp_group = {
            name: name
          };
          AdminDirectory.Groups.patch(tmp_group, groupId);
        }
        else if (email == group.email) { //Om e-posten är oförändrad. Behöver ändra bakgrund om man
          //ändrat till en ogiltig e-postadress och sen ändrar tillbaka
          Logger.log("E-post ej ändrad för grupppen " + email);
          var cell=selection.getCell(rad_nummer, grd["e-post"]+1);
          cell.setBackground("white");
        }
        if (customFooterText != group.customFooterText) {
          update_group = "yes";
        }
      }
    }    
    
    if (update_group == "yes") {
      //Uppdatera medlemmar av en grupp
      updateGroup(selection, rad_nummer, groupId, email, data[i], grd, listOfEmailAdressesOfActiveAccounts);
      
    }
  }
  deleteRowsFromSpreadsheet(sheet, delete_rows);
}


/*
 * Ta bort rader från kalkylarket
 *
 * @param {Object} sheet - Googleobjekt
 * @param {numbers[]} delete_rows - Lista med villka rader som ska tas bort
 */
function deleteRowsFromSpreadsheet(sheet, delete_rows) {
  
  for (var k = delete_rows.length-1; k >= 0 ; k--) { //Tar bort rader, starta nerifrån
    
    var tmp_row = delete_rows[k];
    Logger.log("Remove row " + tmp_row);
    sheet.deleteRow(tmp_row);
  }  
}


/*
 * Skiver in i kalkylarket länken till gruppen
 *
 * @param {Object} selection - ett googleojekt
 * @param {string} rad_nummer - radnummer i kalkylarket för en specifik googlegrupp
 * @param {string} column - kolumnnummer som detta hör till
 * @param {string} email - e-postadress för googlegruppen
 */
function setCellValueCellUrl(selection, rad_nummer, column, email) {
  
  var cell =selection.getCell(rad_nummer, column+1);
  
  var arr = email.split("@");
  var list_name = arr[0];
  
  var cell_url = '=HYPERLINK("https://groups.google.com/a/' + domain + '/forum/#!managemembers/' + list_name + '/members/active";"Länk")';
  cell.setValue(cell_url);
}


/*
 * Skapar en grupp med angiven e-postadress och namn
 * med fördefinerade behörighetsinställningar
 *
 * @param {string} email - e-postadress för gruppen
 * @param {string} name - namn på e-postgruppen
 *
 * @returns {Object} - Objekt av den nya skapade Googlegrupppen
 */
function createGroup(email, name) {

  var tmp_group = {
    "email": email,
    "name": name,
    "description": "Scoutnet"
  };
            
  AdminDirectory.Groups.insert(tmp_group);
            
  var group = AdminDirectory.Groups.get(email);
  
  return group;
}


/*
 * Returnera fullständig information om en medlem i en grupp
 *
 * @param {string} groupId - Googles id för en grupp
 * @param {string} memberKey - Unik identifierare för en medlem i en grupp
 *
 * @returns {Object[]} member - Ett medlemsobjekt
 */
function getGroupMember(groupId, memberkey) {
  
  //Logger.log("Försöker lägga till i grupp:" + groupId);
  //Logger.log("Försöker med memberKey:" + memberkey);
  try {
    var groupMember = AdminDirectory.Members.get(groupId, memberkey);
    return groupMember;
  }
  catch (e) {
    Logger.log("Kunde inte lägga till e-postadress:" + memberkey);
  }  
}


/*
 * Returnera gruppmedlemmar för en specifik grupp
 *
 * @param {string} groupId - Googles id för en grupp
 *
 * @returns {Object[]} members - Lista av medlemsobjekt med attributen email, role för medlemmar i en grupp
 */
function getGroupMembers(groupId) {
  
  var group = [];
  
  var pageToken, page;
  do {
    page = AdminDirectory.Members.list(groupId,{
      domainName: domain,
      maxResults: 150,
      pageToken: pageToken,
    });
    var members = page.members
    if (members)
    {
      for (var i = 0; i < members.length; i++)
      {
        var member = members[i];
        
        var tmpEmail = getGmailAdressWithoutDots(member.email.toLowerCase());
        var member = {
          email: tmpEmail,
          role: member.role
        };
        group.push(member);
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
      
  return group;
}


/*
 * Om en medlem (dennes member_no) har ett Googlekonto
 * så returnerar vi dennes e-postadress. Annars bara en tom sträng
 *
 * @param {string} member_no - Medlemsnummer för en medlem
 *
 * @returns {string} - E-postadress för medlem om finns, annars tom sträng
 */
function getGoogleAccount(member_no) {
  
  var users;
  
  var qry = "externalId='"+ member_no +"'";
  
  for (var n=0; n<6; n++) {
    Logger.log("Funktionen getGoogleAcount körs " + n);
    try {
      
      var pageToken, page;
      do {
        page = AdminDirectory.Users.list({
          domain: domain,
          query: qry,
          orderBy: 'givenName',
          maxResults: 150,
          pageToken: pageToken
        });
        users = page.users;
        if (users) {
          
          //Logger.log('%s (%s)', users[0].name.fullName, users[0].primaryEmail);
          return users[0].primaryEmail;
          
        } else {
          //Logger.log('Inga användare hittades.');
          return "";
        }
        pageToken = page.nextPageToken;
      } while (pageToken);    
      
    } catch(e) {
      Logger.log("Problem med att anropa GoogleTjänst Users.list i funktionen getGoogleAccount");
      if (n == 5) {
        throw e;
      } 
      Utilities.sleep((Math.pow(2,n)*1000) + (Math.round(Math.random() * 1000)));
    }    
  }  
}


/*
 * Uppdatera medlemmar för en grupp
 *
 * @param {Objekt} selection - Hela området på kalkylarket som används
 * @param {int} rad_nummer - Radnummer för aktuell grupp i kalkylarket
 * @param {string} groupId - Googles id för gruppen
 * @param {string} email - Gruppens e-postadress
 * @param {string[]} radInfo - Lista med data för aktuell rad i kalkylarket
 * @param {string[]} grd - Lista med vilka kolumnindex som respektive parameter har
 * @param {string[]} listOfEmailAdressesOfActiveAccounts - Lista över e-postadresser för aktiva Googlekonton
 */
function updateGroup(selection, rad_nummer, groupId, email, radInfo, grd, listOfEmailAdressesOfActiveAccounts) {
    
  /*****Skicka och ta emot*/
  var scoutnet_list_id_both = radInfo[grd["scoutnet_list_id"]]; //Själva datan
  var cell_scoutnet_list_id_both = selection.getCell(rad_nummer, grd["scoutnet_list_id"]+1); //Range
  var synk_option_both = radInfo[grd["synk_option"]];
  Logger.log("..........1Båda....................");
  var allMembers_both = fetchScoutnetMembersMultipleMailinglists(scoutnet_list_id_both, cell_scoutnet_list_id_both, listOfEmailAdressesOfActiveAccounts);
  var allMembers_both_email = getMemberlistsMemberEmail(allMembers_both, synk_option_both);
  Logger.log("..........1Slut Båda....................");
  /***********************/
  
  /*****Bara skicka*******/
  var scoutnet_list_id_send = radInfo[grd["scoutnet_list_id_send"]]; //Själva datan
  var cell_scoutnet_list_id_send = selection.getCell(rad_nummer, grd["scoutnet_list_id_send"]+1); //Range
  var synk_option_send = radInfo[grd["synk_option_send"]];
  Logger.log("..........1Bara skicka....................");
  var allMembers_send = fetchScoutnetMembersMultipleMailinglists(scoutnet_list_id_send, cell_scoutnet_list_id_send, listOfEmailAdressesOfActiveAccounts);
  var allMembers_send_email = getMemberlistsMemberEmail(allMembers_send, synk_option_send);
  Logger.log("..........1Slut bara skicka....................");
  /***********************/
  
  /*****Bara ta emot******/
  var scoutnet_list_id_receive = radInfo[grd["scoutnet_list_id_receive"]]; //Själva datan
  var cell_scoutnet_list_id_receive = selection.getCell(rad_nummer, grd["scoutnet_list_id_receive"]+1); //Range
  var synk_option_receive = radInfo[grd["synk_option_receive"]];
  Logger.log("..........1Bara ta emot....................");
  var allMembers_receive = fetchScoutnetMembersMultipleMailinglists(scoutnet_list_id_receive, cell_scoutnet_list_id_receive, listOfEmailAdressesOfActiveAccounts);
  var allMembers_receive_email = getMemberlistsMemberEmail(allMembers_receive, synk_option_receive);
  Logger.log("..........1Slut bara ta emot....................");
  /***********************/
  
  /*****Till vilka som ska bli informerade om misstänkt spam*****/
  var emailAdressesToSendSpamNotification = getEmailadressesToSendSpamNotification();
  /**************************************************************/
  
  /*****Vi ska flytta runt e-postadresserna mellan listorna om de finns i flera*****/
  var email_lists = moveEmailToCorrectList(allMembers_both_email, allMembers_send_email, allMembers_receive_email, emailAdressesToSendSpamNotification);
  allMembers_both_email = email_lists[0]
  allMembers_send_email = email_lists[1];
  allMembers_receive_email = email_lists[2];
  
  var allMembers_both_email_admin = email_lists[3];
  var allMembers_send_email_admin = email_lists[4];
  /***********************/
  
  
  /*****Kolla vilka som ska få skicka till listan*****/
  var postPermission = 'ANYONE_CAN_POST';
  
  if (scoutnet_list_id_send) { //Vi vill att bara några ska kunna skicka till listan
    
    postPermission = 'ALL_MANAGERS_CAN_POST';
    Logger.log("Bara på listan kan skicka till listan");    
  }  
  /***********************/
  
  
  Logger.log("postPermission = " + postPermission);
  var allMembers_email = [];
  allMembers_email.push.apply(allMembers_email, allMembers_both_email);
  allMembers_email.push.apply(allMembers_email, allMembers_send_email);
  allMembers_email.push.apply(allMembers_email, allMembers_receive_email);
  
  allMembers_email.push.apply(allMembers_email, allMembers_both_email_admin);
  allMembers_email.push.apply(allMembers_email, allMembers_send_email_admin);
  
  allMembers_email = removeDublicates(allMembers_email);
  // allMembers_email ==  alla distinkta e-postadresser som finns från alla tre+två(admin) grupper
  
  var group_members = getGroupMembers(groupId); //Alla gruppmedlemmar med deras roller
  var group_members_email = [];
  
  //Om finns i googlegrupp men inte i vår lista
  for (var i = 0; i < group_members.length; i++) {    
      
    if (!contains(allMembers_email, group_members[i].email)) {  
      Logger.log(group_members[i].email + " Borde tas bort från " + groupId  + "Google e-postlista");
      AdminDirectory.Members.remove(groupId, group_members[i].email);
    }
    group_members_email.push(group_members[i].email);
  }   
  
  
  for (var i = 0; i < allMembers_email.length; i++) { //Vi gör detta som nummer två för att spara lite tid,
    //och för att Google i bland ändrar e-postadress för en användare.
    
    //Denna e-post finns ej med, så vi lägger till personen
    if (!contains(group_members_email, allMembers_email[i])) { //Lägg till person till e-postlista
      
      if (contains(allMembers_both_email, allMembers_email[i])) { //Lägg till så att både kan skicka och ta emot
        Logger.log(allMembers_email[i] + " Borde lägga till i Googles e-postlista. Skicka och ta emot");
        addGroupMember(groupId, allMembers_email[i], 'MANAGER', 'ALL_MAIL');
      }
      else if (contains(allMembers_send_email, allMembers_email[i])) { //Lägg till så att bara kan skicka
        Logger.log(allMembers_email[i] + " Borde lägga till i Googles e-postlista. Bara skicka");
        addGroupMember(groupId, allMembers_email[i], 'MANAGER', 'NONE');
      }
      else if (contains(allMembers_receive_email, allMembers_email[i])){ //Lägg till så att bara kan ta emot
        Logger.log(allMembers_email[i] + " Borde lägga till i Googles e-postlista. Bara ta emot");
        addGroupMember(groupId, allMembers_email[i], 'MEMBER', 'ALL_MAIL');
      }
      
      else if (contains(allMembers_both_email_admin, allMembers_email[i])){ //Lägg till admin så att både kan skicka och ta emot
        Logger.log(allMembers_email[i] + " Borde lägga till i Googles e-postlista. Admin Skicka och ta emot");
        addGroupMember(groupId, allMembers_email[i], 'OWNER', 'ALL_MAIL');
      }
      else if (contains(allMembers_send_email_admin, allMembers_email[i])){ //Lägg till admin så att bara kan skicka
        Logger.log(allMembers_email[i] + " Borde lägga till i Googles e-postlista. Admin Bara skicka");
        addGroupMember(groupId, allMembers_email[i], 'OWNER', 'DISABLED');
      }
    }
    
    //Denna e-post finns redan med i gruppen, men har kanske fel roll?
    else {
      //Both, Send, Receive
      var memberTypeOld = getMembertype(groupId, group_members, allMembers_email[i])
      
      //Logger.log(allMembers_email[i] + " fanns redan på listan med rollen " + memberTypeOld);
      
      if (contains(allMembers_both_email, allMembers_email[i])) { //Ska kunna skicka och ta emot        
        if (memberTypeOld!="Both") { //Har någon annan roll sedan innan
          updateGroupMember(groupId, allMembers_email[i], 'MANAGER', 'ALL_MAIL');
          Logger.log(allMembers_email[i] + " fanns redan på listan med rollen " + memberTypeOld);
          Logger.log(allMembers_email[i] + " har nu rollen skicka och ta emot");
        }
      }
      else if (contains(allMembers_send_email, allMembers_email[i])) { //Ska bara kunna skicka        
        if (memberTypeOld!="Send") { //Har någon annan roll sedan innan
          updateGroupMember(groupId, allMembers_email[i], 'MANAGER', 'NONE');
          Logger.log(allMembers_email[i] + " fanns redan på listan med rollen " + memberTypeOld);
          Logger.log(allMembers_email[i] + " har nu rollen bara skicka");
        }
      }
      else if (contains(allMembers_receive_email, allMembers_email[i])) { //Ska bara kunna ta emot        
        if (memberTypeOld!="Receive") { //Har någon annan roll sedan innan
          updateGroupMember(groupId, allMembers_email[i], 'MEMBER', 'ALL_MAIL');
          Logger.log(allMembers_email[i] + " fanns redan på listan med rollen " + memberTypeOld);
          Logger.log(allMembers_email[i] + " har nu rollen bara ta emot");
        }
      }
      
      else if (contains(allMembers_both_email_admin, allMembers_email[i])) { //Ska kunna skicka och ta emot ADMIN        
        if (memberTypeOld!="OWNER_Both") { //Har någon annan roll sedan innan
          updateGroupMember(groupId, allMembers_email[i], 'OWNER', 'ALL_MAIL');
          Logger.log(allMembers_email[i] + " fanns redan på listan med rollen " + memberTypeOld);
          Logger.log(allMembers_email[i] + " har nu rollen bara ta emot ADMIN");
        }
      }
      else if (contains(allMembers_send_email_admin, allMembers_email[i])) { //Ska bara kunna skicka ADMIN      
        if (memberTypeOld!="OWNER_Send") { //Har någon annan roll sedan innan
          updateGroupMember(groupId, allMembers_email[i], 'OWNER', 'DISABLED');
          Logger.log(allMembers_email[i] + " fanns redan på listan med rollen " + memberTypeOld);
          Logger.log(allMembers_email[i] + " har nu rollen bara skicka ADMIN");
        }
      }
    }
  }
  var customFooterText = radInfo[grd["customFooterText"]];
  changeGroupPermissions(email, postPermission, customFooterText);  
  
  Logger.log("Slut på funktionen UpdateGroup");
}


/*
 * Ger lista över alla aktiva Google-konton i denna domän
 * om det finns flera domänen tillåter vi bara huvuddomänen
 *
 * @returns {string[]} - E-postadresser för aktiva Googlekonton
 */
function getEmailAdressesofAllActiveGoogleAccounts() {
  
  var emailAddresses = [];
  var users;
  var pageToken, page;
  var catchAllAddress = "*@" + domain;
  do {
    page = AdminDirectory.Users.list({
      domain: domain,
      orderBy: 'givenName',
      maxResults: 500,
      pageToken: pageToken
    });
    users = page.users;
    if (users) {
      for (var i = 0; i < users.length; i++) {
        var user = users[i];
        //Logger.log('%s (%s)', user.name.fullName, user.primaryEmail);
        
        if (!user.suspended) {
          
          for (var k = 0; k < user.emails.length; k++) { //Varje användare kan ha alias också
            
            var email = user.emails[k].address;
            if (email.endsWith(domain)) { //Endast adresser för huvuddomänen
              if (email!=catchAllAddress) {
                emailAddresses.push(email);
                //Logger.log(email);
              }
            }
          }
        }
      }
    } else {
      Logger.log('Ingen användare hittades.');
      var empty = [];
      return empty;
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  
  return emailAddresses;  
}


/*
 * Uppdatera en persons status i en specifik grupp
 *
 * @param {string} groupId - Id för denna grupp
 * @param {string} email - E-postadress för en specifik medlem i gruppen
 * @param {string} role - Önskad ny roll i gruppen
 * @param {string} delivery_settings - Inställning för e-postleverans
 */ 
function updateGroupMember(groupId, email, role, delivery_settings) {
   
  var settings = {
    delivery_settings: delivery_settings,
    role: role
  };
  try {
    AdminDirectory.Members.update(settings, groupId, email);
  }
  catch (e) {
    Logger.log("Kunde inte ändra medlemens rolltyp för e-postadress:" + email); 
  }
}


/*
 * Returnerar vilken typ av person detta är på listan
 *
 * @param {string} groupId - Id för denna grupp
 * @param {Objekt[]} group_members - Lista med medlemsobjekt
 * @param {string} email - E-postadress för en specifik medlem i gruppen
 *
 * @returns {string} - Textsträng som förklarar medlemstypen i gruppen
 */
function getMembertype(groupId, group_members, email) {
  
  for (var i = 0; i < group_members.length; i++) {
   
		if (group_members[i].email==email)	{
          
          if (group_members[i].role=='MANAGER') {
            var tmp_GroupMember = getGroupMember(groupId, email);
            var delivery_settings = tmp_GroupMember.delivery_settings;
            if(delivery_settings=='ALL_MAIL') {
              return "Both";
            }
            else {
              return "Send";
            }            
          }
          else if  (group_members[i].role=='OWNER') {
            var tmp_GroupMember = getGroupMember(groupId, email);
            var delivery_settings = tmp_GroupMember.delivery_settings;
            if(delivery_settings=='ALL_MAIL') {
              return "OWNER_Both";
            }
            else {
              return "OWNER_Send";
            }
          }
          else { 
            return "Receive"
          }
          return group_members[i].role;
		}	
	}
  return "Kunde inte hitta rollen på denna medlem " + email;
}


/*
 * Flytta runt e-postadresser till korrekt lista om de finns i flera olika
 *
 * @param {string[]} allMembers_both_email - E-postlista för att skicka och ta emot e-brev
 * @param {string[]} allMembers_send_email - E-postlista för att bara kunna skicka e-brev
 * @param {string[]} allMembers_receive_email - E-postlista för att bara kunna ta emot e-brev
 * @param {string[]} emailAdressesToSendSpamNotification - E-postlista för vart e-brev gällande misstänkt skräppost ska skickas till
 *
 * @returns {string[allMembers_both_email, allMembers_send_email, allMembers_receive_email]}
 */
function moveEmailToCorrectList(allMembers_both_email, allMembers_send_email, allMembers_receive_email, emailAdressesToSendSpamNotification) {
  
  //Om e-post finns i "skicka" och "ta emot" ska de läggas till i "båda"
  for (var i = 0; i < allMembers_send_email.length; i++) {
    if (contains(allMembers_receive_email, allMembers_send_email[i])) {
        allMembers_both_email.push(allMembers_send_email[i]);
    }
  }
  
  //Om e-post finns i "skicka" och "båda" ska de tas bort ur "skicka"
  allMembers_send_email = getListsWithUniqueElements(allMembers_both_email, allMembers_send_email);
  
  //Om e-post finns i "ta emot" och "båda" ska de tas bort ur "ta emot"
  allMembers_receive_email = getListsWithUniqueElements(allMembers_both_email, allMembers_receive_email);
  
  /*****E-postadresser för skräppostnotifikation*****/
  var allMembers_both_email_admin = [];
  var allMembers_send_email_admin = [];
  
  //Om e-post finns i "emailAdressesToSendSpamNotification" och i någon annan lista ska de läggas till i motsvarande adminlistan
  for (var i = 0; i < emailAdressesToSendSpamNotification.length; i++) {
    
    if (contains(allMembers_both_email, emailAdressesToSendSpamNotification[i])) {
      allMembers_both_email_admin.push(emailAdressesToSendSpamNotification[i]);
    }
    else if (contains(allMembers_receive_email, emailAdressesToSendSpamNotification[i])) {
      allMembers_both_email_admin.push(emailAdressesToSendSpamNotification[i]);
    }
    else {
      allMembers_send_email_admin.push(emailAdressesToSendSpamNotification[i]);
    }
  }  
  
  //Om e-post finns i "skicka admin" och "båda admin" ska de tas bort ur "skicka admin"
  allMembers_send_email_admin = getListsWithUniqueElements(allMembers_both_email_admin, allMembers_send_email_admin);
  
  
  //Om e-post finns i "båda" och "emailAdressesToSendSpamNotification" ska de tas bort ur "båda"
  allMembers_both_email = getListsWithUniqueElements(emailAdressesToSendSpamNotification, allMembers_both_email);
  
  //Om e-post finns i "skicka" och "emailAdressesToSendSpamNotification" ska de tas bort ur "skicka"
  allMembers_send_email = getListsWithUniqueElements(emailAdressesToSendSpamNotification, allMembers_send_email);
  
  //Om e-post finns i "ta emot" och "emailAdressesToSendSpamNotification" ska de tas bort ur "ta emot"
  allMembers_receive_email = getListsWithUniqueElements(emailAdressesToSendSpamNotification, allMembers_receive_email);
  
  /*****************************/
  
  //Vi tar bort alla upprepade e-postadresser inom sina egna listor
  allMembers_both_email = removeDublicates(allMembers_both_email);
  allMembers_send_email = removeDublicates(allMembers_send_email);
  allMembers_receive_email = removeDublicates(allMembers_receive_email);
  
  allMembers_both_email_admin = removeDublicates(allMembers_both_email_admin);
  allMembers_send_email_admin = removeDublicates(allMembers_send_email_admin);
  
  Logger.log("..........2Båda....................");
  Logger.log(allMembers_both_email);
  Logger.log("..........2Slut båda....................");
  
  Logger.log("..........2Bara skicka....................");
  Logger.log(allMembers_send_email);
  Logger.log("..........2Slut bara skicka....................");
  
  Logger.log("..........2Bara ta emot....................");
  Logger.log(allMembers_receive_email);
  Logger.log("..........2Slut bara ta emot....................");
  
  Logger.log("............................................");
  Logger.log("..........2Båda ADMIN....................");
  Logger.log(allMembers_both_email_admin);
  Logger.log("..........2Slut båda ADMIN....................");
  
  Logger.log("..........2Bara skicka ADMIN....................");
  Logger.log(allMembers_send_email_admin);
  Logger.log("..........2Slut bara skicka ADMIN....................");
  
  return [allMembers_both_email, allMembers_send_email, allMembers_receive_email, allMembers_both_email_admin, allMembers_send_email_admin];  
}


/*
 * Ta bort element ur secondList om de finns i mainList
 *
 * @param {string[]} mainList - Lista som vi lämnar orörd
 * @param {string[]} secondList - Lista som vi tar bort dubletter ur
 *
 * @returns {string[]} - Lista av secondList utan de element som fanns i mainList
 */
function getListsWithUniqueElements(mainList, secondList) {
  
  var tmp_email_list = [];
  
  for (var i = 0; i < secondList.length; i++) {
    if (!contains(mainList, secondList[i])) {
        tmp_email_list.push(secondList[i]);
    }
  }
  return tmp_email_list;
}


/*
 * Ger lista över alla unika e-postadresser för denna typ
 *
 * @param {Objekt[]} members - Objekt av medlemmar
 * @param {string} synk_option - Synkroniseringsinställning
 *
 * @returns {string[]} - Lista över unika e-postadresser
 */
function getMemberlistsMemberEmail(members, synk_option) {
  
  var members_email = [];
  
  for (var i = 0; i < members.length; i++) {
    members_email.push.apply(members_email, getEmailListSyncOption(members[i], synk_option, true));
  }
  
  for (var k = 0; k < members_email.length; k++) {
    members_email[k] = getGmailAdressWithoutDots(members_email[k]);
  }
  members_email = removeDublicates(members_email);
  //Ifall samma e-postadress är hos flera medlemmar eller upprepas i olika kontaktfält.
  //Sparar in på dataförfrågningar till Google något
  return members_email;
}


/*
 * Lägg till en medlem till en specifik grupp
 *
 * @param {string} groupId - Gruppens id hos Google
 * @param {string} email - E-postadress att lägg till
 * @param {string} role - Roll att tilldela
 * @param {string} delivery_settings - Om person ska ta emot e-post eller ej
 */
function addGroupMember(groupId, email, role, delivery_settings) {
    
  var member = {
    delivery_settings: delivery_settings,
    email: email,
    role: role
  };
  try {
    AdminDirectory.Members.insert(member, groupId);
  }
  catch (e) {
    
    if (e.message.endsWith("Member already exists.")) {
      Logger.log("Kan inte lägga till e-postadress då den redan är tillagd denna omgång eller ett alias för den: " + email);
    }
    else {       
      Logger.log("Kan inte lägga till e-postadress:" + email + " pga " + e.message);
      //Logger.log("GruppId:" + groupId);
      //Logger.log("Role:" + role);
      //Logger.log("Devlivery_settings:" + delivery_settings);
    }
  }
}


/*
 * Ändra behörigheter för en grupp efter att den är skapad
 *
 * @param {string} email - E-postadress för en grupp
 * @param {string} postPermission - Definierar vilka som ska få skicka till e-postlistan
 * @param {string} customFooterText - Text i sidfot om man så önskar för alla e-brev
 */
function changeGroupPermissions(email, postPermission, customFooterText) {  
  
  var customFooterText = customFooterText.trim();
  var includeCustomFooter = false;
  
  if (postPermission=='WRONG_INPUT') {
    postPermission = 'ANYONE_CAN_POST';
  }
  
  if (customFooterText) {
    includeCustomFooter = true;
  }
  else {
    customFooterText = '';
  }
  
  Logger.log("postPermission " + postPermission);
  var group = AdminGroupsSettings.newGroups();
  
  group.whoCanJoin = 'INVITED_CAN_JOIN';
  group.whoCanViewMembership = 'ALL_MANAGERS_CAN_VIEW';
  group.whoCanViewGroup = 'ALL_MANAGERS_CAN_VIEW';
  group.allowExternalMembers = true;
  group.whoCanPostMessage = postPermission;
  group.primaryLanguage = 'sv';
  group.isArchived = 'true';
  group.messageModerationLevel = 'MODERATE_NONE';
  group.spamModerationLevel = 'MODERATE';
  group.whoCanModerateMembers = 'NONE';
  group.whoCanModerateContent = 'OWNERS_ONLY';
  group.replyTo = 'REPLY_TO_SENDER';
  group.includeCustomFooter = includeCustomFooter;
  group.customFooterText = customFooterText;
  //group.membersCanPostAsTheGroup = true;  //TODO
  group.includeInGlobalAddressList = true;
  group.whoCanLeaveGroup = 'NONE_CAN_LEAVE';
  group.whoCanContactOwner = 'ALL_MANAGERS_CAN_CONTACT';
  group.whoCanDiscoverGroup = 'ALL_MEMBERS_CAN_DISCOVER';
  
  AdminGroupsSettings.Groups.patch(group, email);
}


/*
 * Skapa kolumnrubriker i kalkylarket och dölj kolumnen med Grupp-ID
 */
function createHeaders_Grupper() {
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Grupper).getSheets()[0];
  
  var grd = GrupperRubrikData();
  
  // Frys de två översta raderna på arket så att rubrikerna alltid syns
  sheet.setFrozenRows(2);
  
  /********Rad 1********************/
  var range1_rad1 = sheet.getRange(1, grd["scoutnet_list_id"]+1, 1, 2);
  var range2_rad1 = sheet.getRange(1, grd["scoutnet_list_id_send"]+1, 1, 2);
  var range3_rad1 = sheet.getRange(1, grd["scoutnet_list_id_receive"]+1, 1, 2);
  
  if (! (range1_rad1.isPartOfMerge() ||
         range2_rad1.isPartOfMerge() ||
      range3_rad1.isPartOfMerge())) { //Inga angivna celler på rad 1 är sammanfogade
    
    Logger.log("Inga av de angivna cellerna på rad 1 är sammanfogade");
    
    range1_rad1.merge();
    range2_rad1.merge();
    range3_rad1.merge();
    
    Logger.log("Vi har nu sammanfogat dem");    
  }
  else {
    Logger.log("Några celler är sedan tidigare sammanfogade på rad 1, så vi gör inget åt just det");
  }
  
  var values_rad1 = [
    ["Kan skicka och ta emot", "", "Kan skicka", "", "Kan ta emot", ""]
  ];

  // Sätter området för cellerna som vi ska ändra
  // De 6 kolumnerna för listId & synkinställning
  var range_rad1 = sheet.getRange(1, grd["scoutnet_list_id"]+1, 1, 6);
  range_rad1.setHorizontalAlignment("center");
  range_rad1.setFontWeight("bold");

  // Sätter våra rubriker på vårt område
  range_rad1.setValues(values_rad1);
  
  /********************************/
    
  /*******Rad 2********************/
  // Våra värden vi vill ha som rubriker för de olika kolumnerna på rad 2
  var values_rad2 = [
    ["Namn", "E-post", "Scoutnet-id", "Synkinställning", "Scoutnet-id", "Synkinställning", "Scoutnet-id", "Synkinställning", "Sidfot", "Grupp-ID hos Google (RÖR EJ)", "Länk", "Felmeddelande"]
  ];
  
  // Sätter området för cellerna på rad 2 som vi ska ändra
  var range_rad2 = sheet.getRange(2, 1, 1, values_rad2[0].length);

  // Sätter våra rubriker på vårt område med kursiv text
  range_rad2.setValues(values_rad2);
  range_rad2.setFontStyle("italic");
  
  /*******************************/
  
  /*******Sätt kantlinjer*********/
  
  var kolumn1 = getA1RangeOfColumns(sheet, grd["scoutnet_list_id"]+1, 2);
  //Kolumnen för scoutnet_list_id;
  kolumn1.setBorder(null, true, null, true, null, null);
  
  var kolumn2 = getA1RangeOfColumns(sheet, grd["scoutnet_list_id_send"]+1, 2);
  kolumn2.setBorder(null, true, null, true, null, null);
  
  var kolumn3 = getA1RangeOfColumns(sheet, grd["scoutnet_list_id_receive"]+1, 2);
  kolumn3.setBorder(null, true, null, true, null, null);  
  
  /*******************************/
  
  /*******Kolumn Grupp-ID*********/
  
  var column = getA1RangeOfColumns(sheet, grd["groupId"]+1, 1); //Kolumnen för Grupp-ID  
  column.setBackground("orange");
  column.setFontColor("blue");
  
  //Vi tar bort alla skyddade områden
  var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);  
  for (var i = 0; i < protections.length; i++) {
    var protection = protections[i];
    if (protection.canEdit()) {
      protection.remove();
    }
  }
  //Vi skyddar kolumnen för Grupp-ID så man inte råkar ändra av misstag
  column.protect().setWarningOnly(true);
  
  //Dölj kolumnen med group-id
  sheet.hideColumn(column);
  
  /*******************************/  
}


/*
 * Ger e-postadresser till vart information beträffande misstänkt skräppost ska skickas
 *
 * @returns {string[]} - Lista med e-postadresser
 */
function getEmailadressesToSendSpamNotification() {
  
  var emailAdresses = [];
  if (typeof moderateContentEmail !=='undefined' && moderateContentEmail) {
    emailAdresses = fetchScoutnetMembersMultipleMailinglists(moderateContentEmail, "", "");
  }
  else { //Om man ej anger listId för en e-postlista ska användaren som kör detta program bli notifierad
    var tmp_member = {
      manuell: Session.getActiveUser().getEmail()
    };
    emailAdresses.push(tmp_member);
  }
  emailAdresses = getMemberlistsMemberEmail(emailAdresses, "m-"); //Bara primäradress från Scoutnet
  Logger.log(emailAdresses);
  return emailAdresses;
}


/*
 * Visar kolumner som styr avancerade inställningar
 */
function avanceradLayout() {
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Grupper).getSheets()[0];
  
  var grd = GrupperRubrikData();
  
  sheet.showColumns(grd["scoutnet_list_id_send"]+1, 5);  
}


/*
 * Döljer kolumner som styr avancerade inställningar
 */
function enkelLayout() {
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Grupper).getSheets()[0];
  
  var grd = GrupperRubrikData();
  
  sheet.hideColumns(grd["scoutnet_list_id_send"]+1, 5);  
}


/*
 * Ger området för en eller flera kolumner
 *
 * @param {Objekt} sheet - Ett ark
 * @param {int} columnIndex - Kolumnindex
 * @param {int} numColumns - Antal kolumner med columnIndex längst till vänster
 *
 * @returns {Objekt} - Området för hela kolumnen
 */
function getA1RangeOfColumns(sheet, columnIndex, numColumns) {
  
  var range = sheet.getRange(1, columnIndex, 2, numColumns);
  //Vi anger att det ska vara två rader så att vi får en start och slutkolumn
  var a1_cell_row_one = range.getA1Notation();
  
  var a1Notation = a1_cell_row_one.replace(/[0-9]/g, '');  
  range = sheet.getRange(a1Notation);
  
  return range;
}
 

/*
 * Kontrollerar att formatet på en e-postadress är godkänt
 * genom att se om den innehåller @ och om domännamnet är godkänt
 *
 * @param {string} email - En e-postadress
 *
 * @returns {boolean} - Om e-postadressen är skriven på rätt format
 */
function checkEmailFormat(email) {
  
  var arr = email.split("@");
  var tmp_domain = arr[1];
  
  if (tmp_domain==domain) {
       return true;
  }
  return false;  
}


/*
 * Returnerar true eller false om en googlegrupp finns
 *
 * @param {string} email - E-postadress för en googlegrupp
 *
 * @returns {boolean} - Om gruppen finns eller ej
 */
function checkIfGroupExists(email) {
  
  var pageToken, page;
  do {
    page = AdminDirectory.Groups.list({
      domain: domain,
      maxResults: 150,
      pageToken: pageToken
    });
    var groups = page.groups;
    if (groups) {
      
      for (var i = 0; i < groups.length; i++) {
        
        var group = groups[i];
        if (group.email==email) { //Träff hittad
          
          Logger.log('Denna grupp finns redan. ' + email);
          return true;
        }        
      }      
    }
    else {
      Logger.log('Ingen grupp hittades med e-postadress. ' + email);      
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  
  Logger.log('Ingen grupp hittades med e-postadress. ' + email);
  return false;
}


/*
 * Testfunktion för att läsa alla grupper
 */
function TestListAllGroups() {
  var pageToken, page;
  do {
    page = AdminDirectory.Groups.list({
      domain: domain,
      maxResults: 150,
      pageToken: pageToken
    });
    var groups = page.groups;
    if (groups) {
      for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        Logger.log('%s (%s)', group.name, group.email);
      }
    } else {
      Logger.log('Inga grupper hittades.');
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}


/*
 * Testfunktion för att läsa kalkylarket
 */
function TestReadSpreadSheet() {
  
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl_Grupper);
  var data = sheet.getDataRange().getValues();
  var grd = GrupperRubrikData();
  
  for (var i = 1; i < data.length; i++) {
    
    Logger.log('Namn: ' + data[i][grd["namn"]] + ' E-post: ' + data[i][grd["e-post"]] + ' list-id: ' + data[i][grd["scoutnet_list_id"]] + ' grupp id: ' + data[i][grd["groupId"]]);           
  }
  return data;
}