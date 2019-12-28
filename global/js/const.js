/* =============================================================================

  Product: PoziTone module for SoundCloud Widget
  Author: PoziWorld
  Copyright: (c) 2016-2017 PoziWorld, Inc.
  License: pozitone.com/license

  Table of Contents:

    Constants
    Storage

 ============================================================================ */

/* =============================================================================

  Constants

 ============================================================================ */

const
    // Extension
    strConstExtensionId = chrome.runtime.id
  , objConstExtensionManifest = chrome.runtime.getManifest()
  , strConstExtensionName = objConstExtensionManifest.name
  , strConstExtensionVersion = objConstExtensionManifest.version

    // Browser & UI
  , boolConstIsBowserAvailable = typeof bowser === 'object'
  , boolConstIsOpera = boolConstIsBowserAvailable && bowser.name === 'Opera'
  , boolConstIsYandex = boolConstIsBowserAvailable && bowser.name === 'Yandex.Browser'
  , boolConstIsOperaAddon = boolConstIsOpera || boolConstIsYandex
  , strConstChromeVersion = boolConstIsBowserAvailable ? bowser.chromeVersion : ''
  , boolConstUseOptionsUi = strConstChromeVersion >= '40.0' && ! boolConstIsOpera

  , objConst = {
        strPozitoneEdition : 'test' // TODO: Use proper edition
      , strModuleId : 'com_soundcloud'
      , strModuleReadmeUrl : 'https://github.com/PoziWorld/SoundCloud-Widget-external-PoziTone-module/blob/master/README.md'
      , strHostApiVersionVar : 'strHostApiVersion'
      , strPozitoneInstallationUrl : ''
    }
  ;

( function () {
  init();

  /**
   * Initialize the module.
   */

  function init() {
    setPozitoneInstallationUrl();
  }

  /**
   * Figure out which store is the best for this browser.
   */

  function setPozitoneInstallationUrl() {
    let pozitoneInstallationUrl;

    if ( boolConstIsOperaAddon ) {
      pozitoneInstallationUrl = 'https://addons.opera.com/extensions/details/pozitone/';
    }
    else if ( bowser.name === 'Edge (Chromium)' ) {
      pozitoneInstallationUrl = 'https://microsoftedge.microsoft.com/addons/detail/mnfohmojhhcbbnafeehfhghjaeaokjbl';
    }
    else {
      pozitoneInstallationUrl = 'https://chrome.google.com/webstore/detail/pozitone/bdglbogiolkffcmojmmkipgnpkfipijm';
    }

    objConst.strPozitoneInstallationUrl = pozitoneInstallationUrl;
  }
} )();

/* =============================================================================

  Storage

 ============================================================================ */

var StorageApi = chrome.storage
  , StorageLocal = StorageApi.local
  , StorageSync = StorageApi.sync || StorageLocal
  ;
