/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/scouternasetjanster
 */

var domain = 'xxxxscout.se';

var group_id = '765'; //Can be found in Scoutnet if you have proper permissions

//Get a csv/xls/json list of members, based on mailing lists you have set up
var api_key = '45aafaa5e25553354523497544531a2b4a13'; //Can be found in Scoutnet if you have proper permissions

var spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1ru524ccWIEMDOEJFDNDRUNSKDN459Ywk0/edit#gid=0';

var scoutnet_url = 'www.scoutnet.se'; //The url of Scoutnet


function Groups() {

  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl).getSheets()[0];
  var selection = sheet.getDataRange();
  var data = selection.getValues();

  var delete_rows = [];

  for (var i = 1; i < data.length; i++) {

    Logger.log('Namn: ' + data[i][0] + ' E-post: ' + data[i][1] + ' Scoutnet: ' + data[i][2] + ' grupp id: ' + data[i][4]);
    var name = data[i][0];
    var email = data[i][1];
    var scoutnet_id = data[i][2];
    var synk_option = data[i][3];
    var group_id = data[i][4];

    var update_group = "yes";

    if (group_id == "") { //We should create a group

      if (name == "" && email == "") { //Remove the row
        Logger.log("try remove row " + i+1);

        delete_rows.push(i+1);
        update_group = "no";
      }
      else if (name == "" && email != "") { //We don't do anything
      }
      else if (name != "" && email == "") { //We don't do anything
      }

      else if (name != "" && email != "") {

        if ("no" == checkIfGroupExists(email) && "yes" == checkEmailFormat(email)) {

          email = email.toLowerCase().replace(/\s+/g, ''); //Remove whitespaces
          email = removeDiacritics (email);

          var group = {
            "email": email,
            "name": name,
            "description": "Scoutnet"
          };

          AdminDirectory.Groups.insert(group);
          changeGroupPermissions(email);

          var group = AdminDirectory.Groups.get(email);
          var group_id = group.id;

          Logger.log("Created group: " + email);

          var cell = selection.getCell(i+1,2);
          cell.setValue(email);
          cell.setBackground("white");

          cell = selection.getCell(i+1,5);
          cell.setValue(group_id);

          cell = selection.getCell(i+1,6);
          var cell_url = '=HYPERLINK("https://admin.google.com/AdminHome?groupId='+ email + '&chromeless=1#OGX:Group";"Länk")';
          cell.setValue(cell_url);

        }
        else { //If the groups emailadress already exists

          var cell = selection.getCell(i+1,2);
          cell.setBackground("red");

        }
      }
    }
    else if (group_id != "") {

      if (name == "" && email == "") { //Remove the group

        Logger.log("try remove " + group_id + " row " + i+1);
        AdminDirectory.Groups.remove(group_id);
        Logger.log(group_id + " was removed");

        delete_rows.push(i+1);
        update_group = "no";

      }
      else if (email == "") { //If empty, put the emailadress back

        var tmp_usr = AdminDirectory.Groups.get(group_id);
        var tmp_email = tmp_usr.email;
        var cell = selection.getCell(i+1,2);
        cell.setValue(tmp_email);

      }
      else if (email != "") { //Checking if need to update

        var group = AdminDirectory.Groups.get(group_id);

        if (email != group.email) { //The email has changed

          var tmp_row = i+1;
          Logger.log("The email has changed on row " + tmp_row);

          if ("no" == checkIfGroupExists(email) && "yes" == checkEmailFormat(email)) {

            email = email.toLowerCase().replace(/\s+/g, ''); //Remove whitespaces
            email = removeDiacritics (email);

            Logger.log("try remove " + group_id + " row " + tmp_row);
            AdminDirectory.Groups.remove(group_id); //We do this because high risk for service unavailable if using patch/update
            Logger.log(group_id + " was removed");

            var tmp_group = {
              "email": email,
              "name": name,
              "description": "Scoutnet"
            };

            AdminDirectory.Groups.insert(tmp_group);
            changeGroupPermissions(email);

            Logger.log("Updated email for group: " + email);

            group = AdminDirectory.Groups.get(email);
            group_id = group.id;

            var cell = selection.getCell(i+1,2);
            cell.setValue(email);
            cell.setBackground("white");

            cell = selection.getCell(i+1,5);
            cell.setValue(group_id);

            cell = selection.getCell(i+1,6);
            var cell_url = '=HYPERLINK("https://admin.google.com/AdminHome?groupId='+ email + '&chromeless=1#OGX:Group";"Länk")';
            cell.setValue(cell_url);

          }
          else { //If the groups emailadress already exists

            var cell = selection.getCell(tmp_row,2);
            cell.setBackground("red");

          }
        }
        else if (name != group.name) { //If the name, but not the email changed
          var tmp_row = i+1;

          Logger.log("The name has changed on row " + tmp_row);
          var tmp_group = {
            name: name
          };
          AdminDirectory.Groups.patch(tmp_group, group_id);
        }
      }
    }
    if (update_group == "yes") {
      var cell_scoutnet_id = selection.getCell(i+1,3);
      updateGroup(group_id, scoutnet_id, cell_scoutnet_id, synk_option); //Update members of the group
    }
  }

  for (var k = delete_rows.length-1; k >= 0 ; k--) { //Remove rows, start from the highest number

    var tmp_row = delete_rows[k];
    Logger.log("Remove row " + tmp_row);
    sheet.deleteRow(tmp_row);
  }
}


/*
 * Return groupmembers of a specified group
 */
function getGroupMembers(group_id) {

  var group = [];

  var pageToken, page;
  do {
    page = AdminDirectory.Members.list(group_id,{
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

        var member = {
          email: member.email,
          role: member.role,
          status: member.status
        };
        group.push(member);
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  return group;
}


/*
 * If the member (it's member_no) has a google_account
 * then, get it back. If not return empty string ""
 */
function getGoogleAccount(scoutnet_email, member_no) {

  var users;

  var qry = "externalId='"+ member_no +"'";
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
      //Logger.log('No users found.');
      return "";
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}


/*
 * Update members of the groups
 */
function updateGroup(group_id, scoutnet_id, cell_scoutnet_id, synk_option) {

  var allmembers = fetchScoutnetMembersGroup(scoutnet_id, cell_scoutnet_id);
  var allmembers_email = [];

  var group_members = getGroupMembers(group_id); //All groupmembers with their role
  var group_members_email = [];

  for (k = 0; k < allmembers.length; k++) {

    var email = allmembers[k].email;
    var member_no = allmembers[k].member_no;
    var email_mum = allmembers[k].email_mum;
    var email_dad = allmembers[k].email_dad;
    var email_alt = allmembers[k].alt_email;

    var tmp_email = getGoogleAccount(email, member_no);

    synk_option = synk_option.toLowerCase().trim();

    if (synk_option.indexOf("@") != -1) { //Only add if person has Google-account and add their google-email

      if (tmp_email != "") { //This member has an google-account
        allmembers_email.push(tmp_email);
      }
    }
    else { //Only add Scoutnet-email

      if (synk_option.indexOf("m") != -1) { //Only add members personal adress
        if (email != "") { //Only add people with an emailadress
          allmembers_email.push(email);
        }
      }
      else if (synk_option.indexOf("f") != -1) { //Only add parents adress
        if (email_mum != "") { //Only add mums with an emailadress
          allmembers_email.push(email_mum);
        }
        if (email_dad != "") { //Only add dads with an emailadress
          allmembers_email.push(email_dad);
        }
      }
      else { //Add all emailadresses found in Scoutnet
        if (email != "") { //Only add people with an emailadress
          allmembers_email.push(email);
        }
        if (email_mum != "") { //Only add mums with an emailadress
          allmembers_email.push(email_mum);
        }
        if (email_dad != "") { //Only add dads with an emailadress
          allmembers_email.push(email_dad);
        }
        if (email_alt != "") { //Only add dads with an emailadress
          allmembers_email.push(email_alt);
        }
      }
    }

    if (synk_option.indexOf("-") == -1) { //Add both Scoutnet email and the Google-account email

      if (tmp_email != "") { //This member has an google-account
        allmembers_email.push(tmp_email);
      }
    }
    Logger.log("Namn " + allmembers[k].first_name + " " + allmembers[k].last_name);
  }

  for (i = 0; i < group_members.length; i++) {

    if (group_members[i].role == 'MEMBER') //Only remove people with the role member
      if (!contains(allmembers_email, group_members[i].email)) {

        Logger.log(group_members[i].email + " Should be removed from the " + group_id  + "Google mailinglist");
        AdminDirectory.Members.remove(group_id, group_members[i].email);
      }
    group_members_email.push(group_members[i].email);
  }

  for (i = 0; i < allmembers_email.length; i++) { //We do this second to save some time, also because Google sometimes
    //changes the emailadress of a user.

    if (!contains(group_members_email, allmembers_email[i])) { //Add member to mailinglist

      Logger.log(allmembers_email[i] + " Should be added to the Google mailinglist");
      addGroupMember(group_id, allmembers_email[i])
    }
  }
}


/*
 * Adds a member to a specified group
 */
function addGroupMember(group_id, email) {

  var member = {
    email: email,
    role: 'MEMBER'
  };
  try {
    AdminDirectory.Members.insert(member, group_id);
  }
  catch (e) {
    Logger.log("Could not add email:" + email);
  }
}


/*
 * Fetch list of people on this mailinglist
 * Return firstname,lastname, membernumber and email
 */
function fetchScoutnetMembersGroup(scoutnet_id, cell_scoutnet_id) {

  Logger.log("Scoutnet mailinglist-id=" + scoutnet_id);
  var email_fields = '&contact_fields=email_mum,email_dad,email_alt';
  var url = 'https://' + scoutnet_url + '/api/group/customlists?id=' + group_id + '&key='+ api_key + '&list_id=' + scoutnet_id + email_fields;
  var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
  //Logger.log(response);

  var json = response.getContentText();

  var data;
  var allmembers = [];

  try {
    data= JSON.parse(json);  //Make it into a Javascript object
  }
  catch (e) {
    Logger.log("ERROR, parsing json in fetchSconetMembersGroup for id: " + scoutnet_id);
    cell_scoutnet_id.setBackground("red");
    return allmembers;
  }
  cell_scoutnet_id.setBackground("white");

  if (scoutnet_id == "") {
    cell_scoutnet_id.setBackground("yellow");
  }

  var medlemmar = data.data;
  //Logger.log(medlemmar);

  var i = 0;
  for (x in medlemmar) {
    var medlem = medlemmar[x];

    var member_no = "";
    if (medlem.member_no){
      member_no = medlem.member_no.value
      member_no = JSON.stringify(member_no);
      member_no = member_no.substring(1, member_no.length - 1);
    }

    var first_name = "";
    if (medlem.first_name){
      first_name = medlem.first_name.value;
      first_name = JSON.stringify(first_name);
      first_name = first_name.substring(1, first_name.length - 1);
    }

    var last_name = "";
    if (medlem.last_name){
      last_name = medlem.last_name.value;
      last_name = JSON.stringify(last_name);
      last_name = last_name.substring(1, last_name.length - 1);
    }

    var email = "";
    if (medlem.email){
      email = medlem.email.value;
      email = JSON.stringify(email);
      email = email.substring(1, email.length - 1);
      email = email.toLowerCase().trim();
    }

    var email_mum = "";
    if (medlem.email_mum){
      email_mum = medlem.email_mum.value;
      email_mum = JSON.stringify(email_mum);
      email_mum = email_mum.substring(1, email_mum.length - 1);
      email_mum = email_mum.toLowerCase().trim();
    }

    var email_dad = "";
    if (medlem.email_dad){
      email_dad = medlem.email_dad.value;
      email_dad = JSON.stringify(email_dad);
      email_dad = email_dad.substring(1, email_dad.length - 1);
      email_dad = email_dad.toLowerCase().trim();
    }

    var alt_email = "";
    if (medlem.alt_email){
      alt_email = medlem.alt_email.value;
      alt_email = JSON.stringify(alt_email);
      alt_email = alt_email.substring(1, alt_email.length - 1);
      alt_email = alt_email.toLowerCase().trim();
    }

    var member = {
      member_no: member_no,
      first_name: first_name,
      last_name: last_name,
      email: email,
      email_mum: email_mum,
      email_dad: email_dad,
      alt_email: alt_email
    };

    allmembers.push(member);
  }
  return allmembers;
}


/*
 * Check if an object is included in an array
 * param, array, object
 */
function contains(a, obj) {
  for (var i = 0; i < a.length; i++) {
    if (a[i]  === obj) {
      return true;
    }
  }
  return false;
}

/*
 * Change the permissions of the group after it is created
 */
function changeGroupPermissions(email) {

  var group = AdminGroupsSettings.newGroups();

  group.whoCanJoin = 'INVITED_CAN_JOIN';
  group.whoCanViewMembership = 'ALL_MANAGERS_CAN_VIEW';
  group.whoCanInvite = 'ALL_MANAGERS_CAN_INVITE';
  group.whoCanAdd = 'ALL_MANAGERS_CAN_ADD';
  group.allowExternalMembers = true;
  group.whoCanPostMessage = 'ANYONE_CAN_POST';
  group.primaryLanguage = 'sv';
  group.messageModerationLevel = 'MODERATE_NONE';
  group.replyTo = 'REPLY_TO_SENDER';
  group.membersCanPostAsTheGroup = false;
  group.whoCanLeaveGroup = 'NONE_CAN_LEAVE';

  AdminGroupsSettings.Groups.patch(group, email);
}


/*
 * Create headers in the spreadsheet and hide the column with the group-id
 */
function createHeaders() {
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl);
  var data = sheet.getSheets()[0];

  // Freezes the first row
  data.setFrozenRows(1);

  // Set the values we want for headers
  var values = [
    ["Namn", "E-post", "Scoutnet-id", "Synkinställning", "grupp id hos Google RÖR EJ", "Länk"]
  ];

  // Set the range of cells
  var range = data.getRange("A1:F1");

  // Call the setValues method on range and pass in our values
  range.setValues(values);

  var column = data.getRange("E1:E100")
  column.setBackground("orange");
  column.setFontColor("blue");

  //Hide the column with the group-id
  data.hideColumns(5);
}


/*
 * Check the the format of the emailadress is ok
 */
function checkEmailFormat(email) {

  var arr = email.split("@");
  var tmp_domain = arr[1];

  if (tmp_domain == domain) {
       return "yes";
  }
  return "no";
}


/*
 * Returns "yes" if group exists, otherwise "no"
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
        if (group.email == email) { //Match found

          Logger.log('This group already exists. ' + email);
          return "yes";
        }
      }
    }
    else {
      Logger.log('No group found with emailadress. ' + email);
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  Logger.log('No group found with emailadress. ' + email);
  return "no";
}


/*
 * Test function to read all groups
 */
function listAllGroups() {
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
      Logger.log('No groups found.');
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}

/*
 * Test function to read the spreadsheet
 */
function readSpreadSheet() {

  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {

    Logger.log('Namn: ' + data[i][0] + ' E-post: ' + data[i][1] + ' medlem: ' + data[i][2] + ' grupp id: ' + data[i][4]);
  }
  return data;
}


/*
 * Replace special characters with their english corresponding character
 * https://stackoverflow.com/questions/18123501/replacing-accented-characters-with-plain-ascii-ones
 */
function removeDiacritics (str) {

  var defaultDiacriticsRemovalMap = [
    {'base':'A', 'letters':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
    {'base':'AA','letters':/[\uA732]/g},
    {'base':'AE','letters':/[\u00C6\u01FC\u01E2]/g},
    {'base':'AO','letters':/[\uA734]/g},
    {'base':'AU','letters':/[\uA736]/g},
    {'base':'AV','letters':/[\uA738\uA73A]/g},
    {'base':'AY','letters':/[\uA73C]/g},
    {'base':'B', 'letters':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
    {'base':'C', 'letters':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
    {'base':'D', 'letters':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
    {'base':'DZ','letters':/[\u01F1\u01C4]/g},
    {'base':'Dz','letters':/[\u01F2\u01C5]/g},
    {'base':'E', 'letters':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
    {'base':'F', 'letters':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
    {'base':'G', 'letters':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
    {'base':'H', 'letters':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
    {'base':'I', 'letters':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
    {'base':'J', 'letters':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
    {'base':'K', 'letters':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
    {'base':'L', 'letters':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
    {'base':'LJ','letters':/[\u01C7]/g},
    {'base':'Lj','letters':/[\u01C8]/g},
    {'base':'M', 'letters':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
    {'base':'N', 'letters':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
    {'base':'NJ','letters':/[\u01CA]/g},
    {'base':'Nj','letters':/[\u01CB]/g},
    {'base':'O', 'letters':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
    {'base':'OI','letters':/[\u01A2]/g},
    {'base':'OO','letters':/[\uA74E]/g},
    {'base':'OU','letters':/[\u0222]/g},
    {'base':'P', 'letters':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
    {'base':'Q', 'letters':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
    {'base':'R', 'letters':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
    {'base':'S', 'letters':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
    {'base':'T', 'letters':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
    {'base':'TZ','letters':/[\uA728]/g},
    {'base':'U', 'letters':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
    {'base':'V', 'letters':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
    {'base':'VY','letters':/[\uA760]/g},
    {'base':'W', 'letters':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
    {'base':'X', 'letters':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
    {'base':'Y', 'letters':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
    {'base':'Z', 'letters':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
    {'base':'a', 'letters':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
    {'base':'aa','letters':/[\uA733]/g},
    {'base':'ae','letters':/[\u00E6\u01FD\u01E3]/g},
    {'base':'ao','letters':/[\uA735]/g},
    {'base':'au','letters':/[\uA737]/g},
    {'base':'av','letters':/[\uA739\uA73B]/g},
    {'base':'ay','letters':/[\uA73D]/g},
    {'base':'b', 'letters':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
    {'base':'c', 'letters':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
    {'base':'d', 'letters':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g},
    {'base':'dz','letters':/[\u01F3\u01C6]/g},
    {'base':'e', 'letters':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
    {'base':'f', 'letters':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
    {'base':'g', 'letters':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
    {'base':'h', 'letters':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
    {'base':'hv','letters':/[\u0195]/g},
    {'base':'i', 'letters':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
    {'base':'j', 'letters':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
    {'base':'k', 'letters':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
    {'base':'l', 'letters':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
    {'base':'lj','letters':/[\u01C9]/g},
    {'base':'m', 'letters':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
    {'base':'n', 'letters':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
    {'base':'nj','letters':/[\u01CC]/g},
    {'base':'o', 'letters':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
    {'base':'oi','letters':/[\u01A3]/g},
    {'base':'ou','letters':/[\u0223]/g},
    {'base':'oo','letters':/[\uA74F]/g},
    {'base':'p','letters':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
    {'base':'q','letters':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
    {'base':'r','letters':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
    {'base':'s','letters':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
    {'base':'t','letters':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
    {'base':'tz','letters':/[\uA729]/g},
    {'base':'u','letters':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
    {'base':'v','letters':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
    {'base':'vy','letters':/[\uA761]/g},
    {'base':'w','letters':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
    {'base':'x','letters':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
    {'base':'y','letters':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
    {'base':'z','letters':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
  ];

  for(var i=0; i<defaultDiacriticsRemovalMap.length; i++) {
    str = str.replace(defaultDiacriticsRemovalMap[i].letters, defaultDiacriticsRemovalMap[i].base);
  }
  return str;
}
