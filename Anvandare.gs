/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/scouternasetjanster 
 */

/**
 * Anropa denna funktion om du vill synkronisera både användare och grupper direkt efter varandra
 */
function AnvandareOchGrupper() {  
  Anvandare();
  Grupper();
}


/*
 * Huvudfunktion för att hantera synkronisering av användarkonton med Scoutnet
 */
function Anvandare() {
  
  var defaultOrgUnitPath = "/Scoutnet";
  var suspendedOrgUnitPath = defaultOrgUnitPath + "/" + "Avstängda";
  
  var allMembers = fetchScoutnetMembers(); //Alla medlemmar med alla attribut som finns i APIt för konton
  Logger.log("AllMembers.length by fetchScoutnetMembers = " + allMembers.length);
  var useraccounts = getGoogleAccounts(defaultOrgUnitPath);
    
  var MembersProcessed = [];
  
  Logger.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  Logger.log("Antal medlemmar i scoutnet = % " , allMembers.length);

  
  for (var p = 0; p < userAccountConfig.length; p++) { //Gå igenom Listorna som är definierade i Konfiguration.gs, avsnitt "userAccountConfig"
    
    var scoutnetListId = userAccountConfig[p].scoutnetListId;
    var orgUnitPath = defaultOrgUnitPath;
    var membersincluded = [];
    var membersexcluded = [];
    
    if (userAccountConfig[p].orgUnitPath) {
      //Bara om man anger någon suborg så anger vi den, annars blir det knas med
      //sista snedstrecket      
      orgUnitPath = orgUnitPath + "/" + userAccountConfig[p].orgUnitPath;
    }
      
    Logger.log("----------------------------------");
    Logger.log("orgUnitPath = %s", orgUnitPath);
    Logger.log("Beskrivning: %s",userAccountConfig[p].description);
    
    createSuborganisationIfNeeded(orgUnitPath);
          
    var membersInAList;
    if (scoutnetListId) {
      membersInAList = fetchScoutnetMembersMultipleMailinglists(scoutnetListId, "", "");
    }
    else { //Om man ej anger listId för en e-postlista
      membersInAList = getScoutleaders(allMembers);
    }
    Logger.log("MembersInAlist antal personer= " + membersInAList.length);

    for (var i = 0; i < membersInAList.length; i++) {  //Här Processas alla medlemmar
      if(MembersProcessed.find(o => o == membersInAList[i].member_no)) // Leta efter kontot i listan över redan processade konton
      {
        Logger.log("Användaren är redan processad: " + membersInAList[i].first_name + " " + membersInAList[i].last_name);
      }
      else
      {
        Logger.log("Användaren ska processas: " + membersInAList[i].first_name + " " + membersInAList[i].last_name);
        MembersProcessed.push(membersInAList[i].member_no); //Lägg till kontot i listan över processade konton
        var obj = allMembers.find(obj => obj.member_no == membersInAList[i].member_no); //Leta upp kontot i listan övar alla konton 
        //anledningen till att inte använda objektet från epostlistan är att det finns bara begränsad information i det objektet

        var GoUser = useraccounts.find(u => u.externalIds.some(extid => extid.type === "organization" && extid.value === obj.member_no)); // leta upp befintligt Googlekonto som representerar rätt objekt
        if(GoUser) {
        // Användaren fanns i listan
          const ia = useraccounts.length
          const indx = useraccounts.findIndex(v => v.id === GoUser.id);
          useraccounts.splice(indx, indx >= 0 ? 1 : 0); // radera kontot ut listan med alla googlekonto, när updtateringen av alla konto är klar skall resterande konto i denna lista avaktiveras.
          const ib = useraccounts.length
          Logger.log("Hittade Googleanvändaren %s, id=%s ",GoUser.name.fullName,GoUser.id);
          //Logger.log("Antal innan: %s, efter: %s",ia,ib );
          updateAccount(obj, GoUser, orgUnitPath) //uppdatera alla uppgifter på googlekontot med uppgifter från Scoutnet
        }
        else
        {
          Logger.log("Skapar Ny Googleanvändare");
          createAccount(obj, orgUnitPath); //Skapa Googlekonto för denna användare
        }
      }
    }
  }
  Logger.log("Googlekonton som är kvar: %s",  useraccounts.length);

  for (var goacc in  useraccounts)
  {
    Logger.log("Stänger av konto, id: %s, %s",useraccounts[goacc].id, useraccounts[goacc].name.fullName);
    suspendAccount(useraccounts[goacc], suspendedOrgUnitPath)
  }
}



/**
 * Skapar en underorganisation om den inte finns
 * En sökväg till en underorganisation som parameter
 * Om den ej finns så skapas den
 * Fungerar på flera nivåer om de ovan inte redan är skapade
 *
 * @param {string} orgUnitPath - Sökväg för en underorganisation
 */
function createSuborganisationIfNeeded(orgUnitPath) { 
  
  var index = orgUnitPath.lastIndexOf("/");
  var parentOrgUnitPath = orgUnitPath.substring(0, index);
  var name = orgUnitPath.substring(index+1, orgUnitPath.length);
  
  Logger.log("parentOrgUnitPath " + parentOrgUnitPath);
  Logger.log("Orgname " + name);
  
  if (!checkIfOrgUnitExists(parentOrgUnitPath)) {
    //Vi kollar om föräldra organisationen finns rekursivt, om ej så skapar vi den
    createSuborganisationIfNeeded(parentOrgUnitPath);
  }
  
  var boolOrgUnitExists = checkIfOrgUnitExists(orgUnitPath);
  if (!boolOrgUnitExists) {
    
    var orgUnit = {      
      name: name,
      parentOrgUnitPath: parentOrgUnitPath
    };
  
    try {
      AdminDirectory.Orgunits.insert(orgUnit, 'my_customer');
      Logger.log("Skapade orgUnit " + orgUnitPath);
    }
    catch (e) {
      Logger.log("Misslyckades att skapa orgUnit " + orgUnitPath);
      Logger.log("Fel " + e);
    }    
  }
}


/*
 * Kontrollera om en organisationsenhet med denna fulla sökväg existerar
 *
 * @param {string} orgUnitPath - Sökväg för en underorganisation
 *
 * @returns {boolean} - True eller false om underorganisationen existerar
 */
function checkIfOrgUnitExists(orgUnitPath) { 
  
  try {
    var page = AdminDirectory.Orgunits.list('my_customer', {
      orgUnitPath: orgUnitPath,
    });
    Logger.log("OrgUnit " + orgUnitPath + " finns");
    return true;
  }
  catch (e) {
    Logger.log("OrgUnit " + orgUnitPath + " finns ej, men borde skapas");
    return false;
  }  
}



/*
 * Gör namn redo för att vara en del i en användares e-postadress
 *
 * @param {string} name - Namn på en person
 *
 * @returns {string} - Namn på personen så det fungerar att ha i en e-postadress
 */
function makeNameReadyForEmailAdress(name) {
  
  var nameEmail = name.toLowerCase().trim(); //Ta bort tomma mellanrum vid start och slut och konvertera till gemener
  nameEmail = nameEmail.replace(/([\s])+/g, '.'); //Ersätt alla tommas mellanrum med en punkt (.)
  nameEmail = nameEmail.replace(/[.][\-]/g, '-').replace(/[\-][.]/g, '-'); //Om punkt följd av bindestreck eller tvärt om. Bara bindestreck i så fall.
  nameEmail = removeDiacritics (nameEmail);
  nameEmail = nameEmail.replace(/[^0-9a-z.\-]/gi, ''); //Ta bort om det inte är en engelsk bokstav eller nummer
  return nameEmail;
}


/*
 * Skapa ett Google användarkonto för en medlem
 *
 * @param {Object} member - Ett medlemsobjekt
 * @param {string} orgUnitPath - Sökväg till en underorganisation
 */
function createAccount(member, orgUnitPath) {
  
  var first_name = member.first_name;
  var first_name_email = makeNameReadyForEmailAdress(first_name);
  
  var last_name = member.last_name;
  var last_name_email = makeNameReadyForEmailAdress(last_name);
  
  var email = first_name_email + "." + last_name_email + "@" + domain; 
 
  if (checkIfEmailExists(email)) {
    
     for (var t = 1; t < 5; t++) { //Ska inte vara fler personer med samma namn. Programmet kraschar då med mening då något antagligen gått fel
       
        email = first_name_email + "." + last_name_email + t + "@" + domain;
       
        if (!checkIfEmailExists(email)) { //Skapa denna e-postadress
          break;          
        }       
     }    
  }  
   
  var user = {
    primaryEmail: email,
    name: {
      givenName: first_name,
      familyName: last_name
    },
    "externalIds": [
      {
        "value": member.member_no,
        "type": "organization"      
      }
    ],
    "orgUnitPath": orgUnitPath,    
    password: Math.random().toString(36) // Generera ett slumpat lösenord
  };
  user = AdminDirectory.Users.insert(user);
  
  Logger.log('Användare %s skapad.', user.primaryEmail);  
}


/*
 * Kontrollera om ett konto med denna e-postadress existerar
 * @param {string} email - En e-postadress inom kårens GSuite
 *
 * @returns {boolean} - True eller false om e-postadressen finns
 */
function checkIfEmailExists(email) {  
  
  var pageToken, page;
  do {
    page = AdminDirectory.Users.list({
      domain: domain,
      query: email=email,
      orderBy: 'givenName',
      maxResults: 150,
      pageToken: pageToken
    });
    users = page.users;
    if (users) {
      Logger.log("Denna adress finns redan " + email);
      return true;      
    } else {
      Logger.log('Ingen användare hittades med ' + email);
      return false;
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  
}


/*
 * Uppdatera konto vid behov
 * Uppdatera namn, organisationssökväg och avbryt avstängning vid behov
 * 
 * @param {Object} member - Ett medlemsobjekt
 * @param {Object} useraccount - Ett Googlekontoobjekt
 * @param {string} orgUnitPath - Sökväg för en underorganisation
 */
function updateAccount(member, useraccount, orgUnitPath) {
  
  var phnum = intphonenumber(member.contact_mobile_phone); // gör mobilnummret till internationellt nummer om möjligt
  var update = false;
  
  if ( useraccount.name.givenName != member.first_name || useraccount.name.familyName != member.last_name || useraccount.suspended || useraccount.orgUnitPath != orgUnitPath  || ((!useraccount.recoveryEmail) && (member.email)) || ((useraccount.recoveryPhone != phnum) && (member.contact_mobile_phone)) ){
  // Något behöver uppdateras
    Logger.log('Användare %s %s uppdateras', useraccount.name.givenName, useraccount.name.familyName);  

    var user = {} // skapa kontoobjekt med det som skall ändras
    
    if(useraccount.name.givenName!=member.first_name){
      if (!user.name)
      {user.name = {}}
      Logger.log("Nytt förnamn: %s",member.first_name);
      user.name.givenName = member.first_name;
      update = true;
    }
    if(useraccount.name.familyName!=member.last_name){
      if (!user.name)
      {user.name = {}}
      Logger.log("Nytt efternamn: %s",member.last_name);
      user.name.givenName = member.last_name;
      update = true;
    }
    if(useraccount.orgUnitPath!=orgUnitPath){
      Logger.log("Ny OrganizationUnit: %s",orgUnitPath);
      user.orgUnitPath = orgUnitPath;
      update = true;
    }
    if((!useraccount.recoveryEmail) && (member.email))
    {
      Logger.log("Ny återställningsepost: %s",member.email);
      user.recoveryEmail = member.email;
      update = true;
    };
    // Lägg till återställningsinformation på Googlekontot
    if((useraccount.recoveryPhone != phnum) && (member.contact_mobile_phone))
    {  
      if(phnum){
        Logger.log("Nytt återställningsnummer: %s",phnum);
        user.recoveryPhone = phnum;
      update = true;
      }

    }
    if(useraccount.suspended){
      Logger.log("Aktiverad.");
      user.suspended = false;
    }

    try{
    user = AdminDirectory.Users.update(user, useraccount.primaryEmail);
    //Logger.log("Användaren är nu i org " + orgUnitPath);
    }
    catch(err) {
      Logger.log("--------------------------")
      Logger.log("Error: %s",err.message);
      Logger.log(user);
      Logger.log("--------------------------")
    }
    }
}


/*
 * Stäng av användarkonto om det inte redan är avstängt
 *
 * @param {Object} userAccount - Ett objekt av ett Googlekonto
 * @param {string} suspendedOrgUnitPath - Sökväg för underorganisationen för avstängda konton
 */
function suspendAccount(userAccount, suspendedOrgUnitPath) {
  
  var email = userAccount.primaryEmail;
  var suspended = userAccount.suspended;
  var orgUnitPath = userAccount.orgUnitPath;
  
  createSuborganisationIfNeeded(suspendedOrgUnitPath);
  
  if (!suspended || (orgUnitPath!=suspendedOrgUnitPath)) {
  
    var user = {
      suspended: true,
      "orgUnitPath": suspendedOrgUnitPath
    };
  
    user = AdminDirectory.Users.update(user, email);
    Logger.log('Användare %s är nu avstängd', email);  
  }
  else {
    Logger.log('Användare %s är redan avstängd', email);  
  }
}


/*
 * Returnerar en lista över alla Googlekonton för underorganisationen som synkroniserar med Scoutnet
 *
 * @param {string} defaultOrgUnitPath - Sökväg för en underorganisation
 *
 * @returns {Object[]} users - Lista med objekt av Googlekonton i denna underorganisation
 */
function getGoogleAccounts(defaultOrgUnitPath) {
  
  var users;
  var pageToken, page;
  do {
    page = AdminDirectory.Users.list({
      domain: domain,
      query: "orgUnitPath='" + defaultOrgUnitPath + "'",
      orderBy: 'givenName',
      maxResults: 500,
      pageToken: pageToken
    });
    users = page.users;
    if (users) {
      for (var i = 0; i < users.length; i++) {
        var user = users[i];
        //Logger.log('%s (%s)', user.name.fullName, user.primaryEmail);                
      }
    } else {
      Logger.log('Ingen användare hittades.');
      var empty = [];
      return empty;
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  
  return users;  
}


/*
 * Hämta en lista över alla aktiva scoutledare och andra funktionärer
 * genom att kontrollera om de har en avdelningsroll (unit_role) eller kårroll (group_role)
 *
 * @param {Object[]} allMembers - Lista med medlemsobjekt
 *
 * @returns {Object[]} leaders - Lista med medlemsobjekt för kårfunktionärer
 */
function getScoutleaders(allMembers) {
  
  var leaders = [];
  
  for (var i = 0; i < allMembers.length; i++) {
    
    var group_role = allMembers[i].group_role;
    var unit_role = allMembers[i].unit_role;
    
    if (group_role.length!=0 || unit_role.length!=0) {
     leaders.push(allMembers[i]);
    }    
  }
  return leaders;  
}


/*
 * Hämta lista över alla medlemmar
 *
 * @returns {Object[]} allMembers - Lista med medlemsobjekt för alla medlemmar i kåren
 */
function fetchScoutnetMembers() {  
  
  var url = 'https://' + scoutnet_url + '/api/' + organisationType + '/memberlist?id=' + groupId + '&key=' + api_key_list_all + '&pretty=1';
  var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
  //Logger.log(response); 
  
  var json = response.getContentText();
  var data = JSON.parse(json);
  
  var medlemmar = data.data;
  var allMembers = [];
  
  //Logger.log(medlemmar);
  for (x in medlemmar) {
    var medlem = medlemmar[x];
    
    var variabel_lista_not_lowercase = ['member_no', 'first_name', 'last_name', 'ssno', 'note', 'date_of_birth', 'status',
                                        'created_at', 'confirmed_at', 'group', 'unit', 'patrol', 'unit_role', 'group_role',
                                        'sex', 'address_co', 'address_1', 'address_2' , 'address_3', 'postcode', 'town',
                                        'country', 'contact_mobile_phone', 'contact_home_phone', 'contact_mothers_name',
                                        'contact_mobile_mum', 'contact_telephone_mum', 'contact_fathers_name', 'contact_mobile_dad',
                                       'contact_telephone_dad', 'prev_term', 'prev_term_due_date', 'current_term', 'current_term_due_date'];
    
    //Dessa attributvärden ska användas som gemener för bättre jämförelser
    var variabel_lista_lowercase = ['email', 'contact_email_mum', 'contact_email_dad', 'contact_alt_email', 'extra_emails'];
    
    var member = setMemberFields(medlem, variabel_lista_not_lowercase, variabel_lista_lowercase);
        
    //Logger.log("MEMBER print object " + member);
    //Logger.log("%s %s, Medlem %s, Mobil %s",member.first_name, member.last_name, member.member_no, member.contact_mobile_phone); //member.member_no + "   " + member.first_name + "  " + member.last_name);
    //Logger.log(member.date_of_birth + "   " + member.confirmed_at + "  " + member.unit);
    //Logger.log(member.unit_role + "   " + member.group_role + "  " + member.email);
    //Logger.log(member.email_mum + "   " + member.email_dad + "  " + member.alt_email);
    allMembers.push(member); 
    
  } 
  //Logger.log("FETCH MEMBERS print object " + allMembers);
  return allMembers;  
}


/*
 * Testfunktion för att lista alla Googlekonton som finns i underorganisationen "Scoutnet"
 * Max 200 stycken
 */
function listAllUsers() {
  var pageToken, page;
  do {
    page = AdminDirectory.Users.list({
      domain: domain,
      query: "orgUnitPath='/Scoutnet'",
      orderBy: 'givenName',
      maxResults: 200,
      pageToken: pageToken
    });
    var users = page.users;
    if (users) {
      for (var i = 0; i < users.length; i++) {
        var user = users[i];
        Logger.log('%s (%s)', user.name.fullName, user.primaryEmail);
        //Logger.log('%s (%s) %s', user.name.fullName, user.primaryEmail, externalIds[0].value);
      }
    } else {
      Logger.log('Inga användare hittades.');
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}Bandbredd