/**
 * @author Emil Öhman <emil.ohman@scouterna.se>
 * @website https://github.com/Scouterna
 */


/**
 * Kalla på denna funktionen för att köra allt efter varandra
 */
function Allt() {
 
  Anvandare();
  Grupper();
}


/**
 * Funktion för att skapa menyn i kalkylarket
 */
function onOpen() {
  ScoutnetSynkLib.addMenuForSpreadsheet();
}


function makeKonfigObject() {

  const konfigObject = {};
  konfigObject.domain = domain;
  konfigObject.scoutnetGroupId = scoutnetGroupId;
  konfigObject.api_key_list_all = api_key_list_all;
  konfigObject.api_key_mailinglists = api_key_mailinglists;
  konfigObject.moderateContentEmail = moderateContentEmail;
  konfigObject.syncUserContactInfo = syncUserContactInfo;
  konfigObject.syncUserAvatar = syncUserAvatar;
  konfigObject.defaultUserAvatarUrl = defaultUserAvatarUrl;
  konfigObject.organisationType = organisationType;
  konfigObject.scoutnet_url = scoutnet_url;

  konfigObject.userAccountConfig = userAccountConfig;

  konfigObject.medlemslista_egna_attribut_funktioner = medlemslista_egna_attribut_funktioner;

  //Kontaktgrupper
  konfigObject.groupName = groupName;
  konfigObject.MAX_NUMBER_OF_CONTACTS_FORCE_UPDATE = MAX_NUMBER_OF_CONTACTS_FORCE_UPDATE;
  konfigObject.contact_groups_email_subject = contact_groups_email_subject;
  konfigObject.contact_groups_email_sender_name = contact_groups_email_sender_name;
  konfigObject.contact_groups_email_sender_from = contact_groups_email_sender_from;
  konfigObject.contact_groups_email_plainBody = contact_groups_email_plainBody;
  konfigObject.contact_groups_email_htmlBody = contact_groups_email_htmlBody;
  konfigObject.version_oldest_ok = version_oldest_ok;
  konfigObject.noteKeysToReplace = noteKeysToReplace;

  return konfigObject;
}
