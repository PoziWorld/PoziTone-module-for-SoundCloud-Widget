/* =============================================================================

  Product: PoziTone module for SoundCloud Widget
  Author: PoziWorld
  Copyright: (c) 2016 PoziWorld
  License: pozitone.com/license

  Table of Contents:

    PageWatcher
      init()
      addRuntimeOnMessageListener()
      convertNotificationLogoUrl()
      setActiveWidget()
      getActiveWidget()
      onPlay()
      onPause()
      sendMediaEvent()
      triggerPlayerAction_playStop()
      triggerPlayerAction_mute()
      triggerPlayerAction_unmute()
      triggerPlayerAction_muteUnmute()
      triggerPlayerAction_showNotification()

 ============================================================================ */

( function() {
  'use strict';

  function PageWatcher() {
    var $$soundcloudIframes = document.querySelectorAll( 'iframe[src*="soundcloud.com"]' );

    if ( ! $$soundcloudIframes.length ) {
      console.warn( strConstExtensionName, ':', chrome.i18n.getMessage( 'playerNotFound' ) );

      return;
    }

    let self = this;

    const
        strModule = 'com_soundcloud'
      , strImgPath = 'modules/' + strModule + '/img/'
      ;

    this.widgets = [];

    [].forEach.call( $$soundcloudIframes, function ( $$soundcloudIframe ) {
      self.widgets.push( SC.Widget( $$soundcloudIframe ) );
    } );

    this.boolIsUserLoggedIn = false;
    this.boolHadPlayedBefore = false;
    this.boolDisregardSameMessage = true;

    this.objPlayerInfo = {
        strModule : strModule
      , boolIsReady : false
      , boolIsPlaying : false
      , boolIsMuted : false
      , intVolume : 0
      , intVolumeBeforeMuted : 0
      , boolCanPlayNextTrackLoggedOut : false
      , boolCanPlayPreviousTrackLoggedOut : false
    };

    this.objStationInfo = {
        strStationName : document.title // TODO: Change
      , strStationNamePlusDesc : document.title // TODO: Change
      , strLogoUrl : '/' + strImgPath + 'soundcloud-logo-48.svg'
      , strLogoDataUri : strImgPath + 'soundcloud-logo-80.png'
      , strTrackInfo : ''
      , strAdditionalInfo : ''
      , boolHasAddToPlaylistButton : false
    };

    this.init();
  }

  /**
   * Set event listeners, initialize API.
   *
   * @type    method
   * @param   No Parameters Taken
   * @return  void
   **/

  PageWatcher.prototype.init = function () {
    let self = this;

    self.addRuntimeOnMessageListener();
    pozitoneModule.api.init( objConst.strPozitoneEdition, self );
    self.convertNotificationLogoUrl();

    for ( let i = 0, intWidgetsCount = self.widgets.length; i < intWidgetsCount; i++ ) {
      let widget = self.widgets[ i ];

      widget.bind( SC.Widget.Events.READY, function() {
        self.objPlayerInfo.boolIsReady = true;

        widget.bind( SC.Widget.Events.PLAY, function() {
          self.onPlay( widget );
        } );

        widget.bind( SC.Widget.Events.PAUSE, function() {
          self.onPause( widget );
        } );
      } );
    }
  };

  /**
   * Listen for commands sent from Background and/or PoziTone.
   * If requested function found, call it.
   *
   * @type    method
   * @param   No Parameters Taken
   * @return  void
   **/

  PageWatcher.prototype.addRuntimeOnMessageListener = function () {
    chrome.runtime.onMessage.addListener(
      function( objMessage, objSender, funcSendResponse ) {
        pozitoneModule.api.processRequest(
            objMessage
          , objSender
          , funcSendResponse
        );

        // Indicate that the response function will be called asynchronously
        return true;
      }
    );
  };

  /**
   * Provide relative notification logo URL/src, get data URL.
   *
   * PoziTone can't access image files from other extensions.
   * Thus, image URLs have to be data URLs.
   *
   * @type    method
   * @param   No Parameters Taken
   * @return  void
   **/

  PageWatcher.prototype.convertNotificationLogoUrl = function () {
    let self = this;

    pozitoneModule.api.convertImageSrcToDataUrl(
        chrome.runtime.getURL( self.objStationInfo.strLogoDataUri )
      , function ( strDataUri ) {
          self.objStationInfo.strLogoDataUri = strDataUri;
        }
    );
  };

  /**
   * Save the provided widget as the last active, so that when a command is sent
   * it's applied to the appropriate widget.
   *
   * @type    method
   * @param   widget
   *            The currently active widget.
   * @return  void
   **/

  PageWatcher.prototype.setActiveWidget = function ( widget ) {
    this.widget = widget;
  };

  /**
   * Get the last active widget (the one the last event occurred on).
   *
   * @type    method
   * @param   No Parameters Taken
   * @return  object
   **/

  PageWatcher.prototype.getActiveWidget = function () {
    let widget = this.widget;

    if ( widget ) {
      return widget;
    }
    else {
      let widgets = this.widgets;

      if ( widgets.length ) {
        this.setActiveWidget( widgets[ 0 ] );

        return this.getActiveWidget();
      }
      else {
        return null;
      }
    }
  };

  /**
   * Fired when the sound begins to play.
   *
   * @type    method
   * @param   widget
   *            The widget the event occured on.
   * @return  void
   **/

  PageWatcher.prototype.onPlay = function ( widget ) {
    let self = this;

    self.objPlayerInfo.boolIsPlaying = true;

    // get information about currently playing sound
    widget.getCurrentSound( function( objCurrentSound ) {
      widget.getVolume( function( intVolume ) {
        self.objPlayerInfo.intVolume = intVolume;
        self.objStationInfo.strTrackInfo = pozitoneModule.api.setMediaInfo( objCurrentSound.user.username, objCurrentSound.title );

        if ( ! self.boolHadPlayedBefore ) {
          self.sendMediaEvent( 'onFirstPlay', widget );
          self.boolHadPlayedBefore = true;
        }
        else {
          self.sendMediaEvent( 'onPlay', widget );
        }
      });
    } );
  };

  /**
   * Fired when the sound pauses.
   *
   * @type    method
   * @param   widget
   *            The widget the event occured on.
   * @return  void
   **/

  PageWatcher.prototype.onPause = function ( widget ) {
    let self = this;

    self.objPlayerInfo.boolIsPlaying = false;

    // get information about currently playing sound
    widget.getCurrentSound( function( objCurrentSound ) {
      self.sendMediaEvent( 'onPause', widget );
    } );
  };

  /**
   * Send media event information to PoziTone.
   *
   * @type    method
   * @param   strFeedback
   *            Optional. Feedback for main actions (play/stop, mute/unmute).
   * @param   widget
   *            Optional. The widget the event occured on.
   * @return  void
   **/

  PageWatcher.prototype.sendMediaEvent = function ( strFeedback, widget ) {
    if ( widget ) {
      this.setActiveWidget( widget );
    }

    this.objStationInfo.strAdditionalInfo =
      ( typeof strFeedback === 'string' && strFeedback !== '' )
        ? strFeedback
        : ''
        ;

    var objData = {
        boolIsUserLoggedIn : this.boolIsUserLoggedIn
      , boolDisregardSameMessage : this.boolDisregardSameMessage
      , objPlayerInfo : this.objPlayerInfo
      , objStationInfo : this.objStationInfo
      , strCommand : ''
    };

    pozitoneModule.api.sendMediaEvent( objData );
  };

  /**
   * Toggle the sound.
   *
   * @type    method
   * @param   No Parameters Taken
   * @return  void
   **/

  PageWatcher.prototype.triggerPlayerAction_playStop = function() {
    this.getActiveWidget().toggle();
  };

  /**
   * Simulate "Mute" player method
   *
   * @type    method
   * @param   No Parameters Taken
   * @return  void
   **/

  PageWatcher.prototype.triggerPlayerAction_mute = function() {
    let self = this
      , widget = self.getActiveWidget()
      ;

    widget.getVolume( function ( flVolume ) {
      self.objPlayerInfo.intVolumeBeforeMuted = pozitoneModule.api.convertVolumeToPercent( flVolume );

      widget.setVolume( 0 );
      self.objPlayerInfo.boolIsMuted = true;

      self.sendMediaEvent( 'onMute' );
    } );
  };

  /**
   * Simulate "Unmute" player method
   *
   * @type    method
   * @param   No Parameters Taken
   * @return  void
   **/

  PageWatcher.prototype.triggerPlayerAction_unmute = function() {
    this.getActiveWidget().setVolume(
      pozitoneModule.api.convertPercentToVolume( this.objPlayerInfo.intVolumeBeforeMuted )
    );
    this.objPlayerInfo.boolIsMuted = false;

    this.sendMediaEvent( 'onUnmute' );
  };

  /**
   * If volume is not 0, then mute. Otherwise, unmute.
   *
   * @type    method
   * @param   No Parameters Taken
   * @return  void
   **/

  PageWatcher.prototype.triggerPlayerAction_muteUnmute = function() {
    let self = this
      , promise = new Promise( function( funcResolve, funcReject ) {
          self.getActiveWidget().getVolume( function ( flVolume ) {
            funcResolve( flVolume );
          } );
        } )
      ;

    promise
      .then( function ( flVolume ) {
        if ( flVolume === 0 ) {
          self.triggerPlayerAction_unmute();
        }
        else {
          self.triggerPlayerAction_mute();
        }
      } )
      ;
  };

  /**
   * Show the last shown notification again.
   *
   * @type    method
   * @param   No Parameters Taken
   * @return  void
   **/

  PageWatcher.prototype.triggerPlayerAction_showNotification = function() {
    this.sendMediaEvent( 'onShowNotification' );
  };

  if ( typeof pozitoneModule === 'undefined' ) {
    window.pozitoneModule = {};
  }

  pozitoneModule.pageWatcher = new PageWatcher();
}() );
