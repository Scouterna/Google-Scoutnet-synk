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
  
  var allMembers = fetchScoutnetMembers(); //Alla medlemmar
  Logger.log("AllMembers.length by fetchScoutnetMembers = " + allMembers.length);
  var useraccounts = getGoogleAccounts(defaultOrgUnitPath);
    
  var membersFromMailingLists = readUserAccountConfigMembers(allMembers); //Lägg till alla medlemmar som är med i e-postlista eller annat specat i konfiguration
  Logger.log("membersFromMailingLists.length by readUserAccountConfigMembers = " + membersFromMailingLists.length);
  
  var memberNumbers = getMemberNumbers(membersFromMailingLists); //Medlemmar med dessa unika medlemsnummer ska användas
  var tmpMemberNumbers = memberNumbers.slice(0); //Gör kopia
  var members = getMembersByMemberNumbers(membersFromMailingLists, memberNumbers);
  
  Logger.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  Logger.log("MemberNumbers.length = " + memberNumbers.length);
  Logger.log("tmpMemberNumbers.length = " + tmpMemberNumbers.length);
  /*
  Logger.log("Dessa Google-konton finns");
  for (i = 0; i < useraccounts.length; i++) {    
   Logger.log(useraccounts[i].name.fullName + " " + useraccounts[i].primaryEmail + " " + useraccounts[i].externalIds[0].value);     
  }  
  */
    
  for (var p = 0; p < userAccountConfig.length; p++) { //Gå igenom medlemslistorna
    
    var scoutnetListId = userAccountConfig[p].scoutnetListId;
    var orgUnitPath = defaultOrgUnitPath;
    
    if (userAccountConfig[p].orgUnitPath) {
      //Bara om man anger någon suborg så anger vi den, annars blir det knas med
      //sista snedstrecket      
      orgUnitPath = orgUnitPath + "/" + userAccountConfig[p].orgUnitPath;
    }
      
    Logger.log("----------------------------------");
    Logger.log("orgUnitPath = " + orgUnitPath);
    
    createSuborganisationIfNeeded(orgUnitPath);
          
    var membersInAList;
    if (scoutnetListId) {
      membersInAList = fetchScoutnetMembersMultipleMailinglists(scoutnetListId, "");
    }
    else { //Om man ej anger listId för en e-postlista
      membersInAList = getScoutleaders(allMembers);
    }
    Logger.log("MembersInAlist antal personer= " + membersInAList.length);
    Logger.log("TmpMemberNumbers.length = " + tmpMemberNumbers.length);
    
    var membersInAListFiltered = []; //Medlemmar i denna e-postlista som ska gälla för denna suborganisation
        
    LoopMembersInAList:
    for (var i = 0; i < membersInAList.length; i++) {  //Här skapar vi listan över vilka i denna e-postlista som redan är tillagda i
      for (var k = 0; k < tmpMemberNumbers.length; k++) { //någon organisation och inte ska läggas till i just denna.
        if (membersInAList[i].member_no == tmpMemberNumbers[k]) {
          
          Logger.log("I denna e-postlista finns " + membersInAList[i].first_name + " " + membersInAList[i].last_name);
          membersInAListFiltered.push(membersInAList[i]);
          tmpMemberNumbers.splice(k, 1); //Ta bort medlemsnumret ur listan
          continue LoopMembersInAList;
        }        
      }        
    }
    
    Logger.log("Antal Scoutnetkonton i denna suborg= " + membersInAListFiltered.length);
    Logger.log("Antal Googlekonton i denna hela org= " + useraccounts.length);
    
    for (var k = 0; k < membersInAListFiltered.length; k++) { //Inom varje medlemslista
      
      var account_exists = false;
      
      userAccountsOuterLoop:
      for (var i = 0; i < useraccounts.length; i++) { //Kolla alla Googlekonton        
        var num_externalIds = useraccounts[i].externalIds.length;
        //Logger.log("Antal externalIDS" + num_externalIds);        
        for (var m = 0; m < num_externalIds; m++) {
          
          // Logger.log("Kollar om Scoutnet_member_id =" + membersInAListFiltered[k].member_no + " och Google id =" + useraccounts[i].externalIds[m].value);
          if (membersInAListFiltered[k].member_no==useraccounts[i].externalIds[m].value) { //If member_id match. Account exists
            
            account_exists = true; //Träff
            updateAccount(membersInAListFiltered[k], useraccounts[i], orgUnitPath); //Uppdatera konto vid behov
            //Logger.log("Detta konto finns " + useraccounts[i].name.fullName + " " + useraccounts[i].primaryEmail + " " + useraccounts[i].externalIds[m].value);
            break userAccountsOuterLoop;
          }      
        }
      }
      
      if (!account_exists) { //Inget konto med detta medlemsnummer, så skapa det
        Logger.log("Dont exists K=" + k + membersInAListFiltered[k].first_name + " " + membersInAListFiltered[k].last_name);
        createAccount(membersInAListFiltered[k], orgUnitPath); //Skapa Googlekonto för denna användare      
      }
    }
  }   
  checkingIfToSuspendAccounts(useraccounts, memberNumbers);
}

/*
 * Läser in samtliga medlemmar som är med i någon av de e-postlistor eller kårfunk
 * som är specificerad i e-postlista eller kårfunktionär i listan userAccountConfig
 *
 * @param {Object[]} allMembers - Lista över medlemsobjekt
 *
 * @returns {Object[]} - Lista med medlemmar som är med i någon av de listor från Scoutnet som ska synkroniseras
 */
function readUserAccountConfigMembers(allMembers) {

  var membersInMailingLists = [];
  
  for (var i = 0; i < userAccountConfig.length; i++) {
    var scoutnetListId = userAccountConfig[i].scoutnetListId;
    var orgUnitPath = userAccountConfig[i].orgUnitPath;
    Logger.log("Read UserAccountConfig = " + i);
    Logger.log("aaa ScoutnetListId = " + scoutnetListId);
    
    if (scoutnetListId) {
      membersInMailingLists.push.apply(membersInMailingLists, fetchScoutnetMembersMultipleMailinglists(scoutnetListId, ""));
    }
    else {
      membersInMailingLists.push.apply(membersInMailingLists, getScoutleaders(allMembers));
    }

    Logger.log(scoutnetListId + "   " + orgUnitPath);
  }
  Logger.log("MembersInMailingLists.length " + membersInMailingLists.length); 
  
  return membersInMailingLists;
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
 * Kontrollera om ett användarkonto ska deaktiveras
 * Om det ej finns i listan med medlemsnummer så deaktiveras kontot
 *
 * @param {Objects[]} userAccounts - Lista med objekt av Googlekonton
 * @param {number[]} - Lista med medlemsnummer
 */
function checkingIfToSuspendAccounts(userAccounts, memberNumbers) {  
  
  Logger.log("Kolla om ett konto ska stängas av");
  
  for (var i = 0; i < userAccounts.length; i++) { //kolla alla Googlekonton
    
    var member_exists = false;
    var num_externalIds = userAccounts[i].externalIds.length;      
      
    for (var m = 0; m < num_externalIds; m++) {        
      
      if (contains(memberNumbers, userAccounts[i].externalIds[m].value)) { //Om member_id finns. Användarkonto finns
          
        member_exists = true; //Träff                  
        //Logger.log("Detta konto har en träff " + userAccounts[i].name.fullName + " " + userAccounts[i].primaryEmail + " " + userAccounts[i].externalIds[m].value);
      }        
    }
    if (!member_exists) { //Behöver inte loppa mer
      suspendAccount(userAccounts[i]);
    }
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
  
  var go_first_name = useraccount.name.givenName;
  var go_last_name = useraccount.name.familyName;
  var go_suspended = useraccount.suspended;
  var go_orgUnitPath = useraccount.orgUnitPath;
  
  var first_name = member.first_name;  
  var last_name = member.last_name;
  
  var email = useraccount.primaryEmail;
  
  if (go_first_name!=first_name || go_last_name!=last_name || go_suspended || go_orgUnitPath!=orgUnitPath) {
  
    var user = {
    name: {
      givenName: first_name,
      familyName: last_name
    },
    suspended: false,
    "orgUnitPath": orgUnitPath    
    };
    user = AdminDirectory.Users.update(user, email);
    Logger.log('Användare %s %s uppdaterad med namn till %s %s', go_first_name, go_last_name, first_name, last_name);  
    Logger.log("Användaren är nu i org " + orgUnitPath);
  }
}


/*
 * Stäng av användarkonto om det inte redan är avstängt
 *
 * @param {Object} userAccount - Ett objekt av ett Googlekonto
 */
function suspendAccount(userAccount) {
  
  var email = userAccount.primaryEmail;
  var suspended = userAccount.suspended;
  
  if (!suspended) {
  
    var user = {
      suspended: true
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
      maxResults: 150,
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
  
  var url = 'https://' + scoutnet_url + '/api/group/memberlist?id=' + groupId + '&key=' + api_key_list_all + '&pretty=1';
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
    //Logger.log(member.member_no + "   " + member.first_name + "  " + member.last_name);
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
 * Max 100 stycken
 */
function listAllUsers() {
  var pageToken, page;
  do {
    page = AdminDirectory.Users.list({
      domain: domain,
      query: "orgUnitPath='/Scoutnet'",
      orderBy: 'givenName',
      maxResults: 100,
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
}