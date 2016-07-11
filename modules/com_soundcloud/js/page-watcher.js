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
      initObserver()
      initBodyObserver()
      createWidgetsArray()

 ============================================================================ */

( function() {
  'use strict';

  function PageWatcher() {
    const strModule = 'com_soundcloud';
    const strImgPath = 'modules/' + strModule + '/img/';

    this.DisconnectableObserver = null;
    this.widgets = [];
    this.initedWidgets = [];

    this.objSettings = {
        boolIsUserLoggedIn : false
      , boolHadPlayedBefore : false
      , boolDisregardSameMessage : true
    };

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
      , strLogoUrl : '/' + strImgPath + 'soundcloud-widget-pozitone-module-icon-32.png'
      , strLogoDataUri : strImgPath + 'soundcloud-widget-pozitone-module-icon-80.png'
      , strTrackInfo : ''
      , strAdditionalInfo : ''
      , boolHasAddToPlaylistButton : false
    };

    this.convertNotificationLogoUrl();

    this.strSoundcloudIframeSelector = 'iframe[src*="soundcloud.com"]';
    const $$soundcloudIframes = document.querySelectorAll( this.strSoundcloudIframeSelector );

    if ( ! $$soundcloudIframes.length ) {
      this.initBodyObserver();

      return;
    }

    this.createWidgetsArray( $$soundcloudIframes, this.widgets );
    this.init();
    this.initBodyObserver();
  }

  /**
   * Set event listeners, initialize API.
   *
   * @type    method
   * @param   arrWidgets
   *            Optional. Array of SoundCloud widgets.
   * @return  void
   **/

  PageWatcher.prototype.init = function ( arrWidgets ) {
    const self = this;
    const widgets = arrWidgets || self.widgets;
    const initedWidgets = self.initedWidgets;

    // This is to run only once
    if ( ! initedWidgets.length ) {
      self.objPlayerInfo.boolIsReady = true;
      self.addRuntimeOnMessageListener();
      pozitoneModule.api.init( objConst.strPozitoneEdition, self, boolConstIsOperaAddon );
    }

    for ( let i = 0, intWidgetsCount = widgets.length; i < intWidgetsCount; i++ ) {
      const widget = widgets[ i ];
      initedWidgets.push( widget );

      // Per widget settings, player & station info
      // Otherwise, wrong buttons may be displayed when there are multiple widgets on one page
      widget.objSettings = Object.assign( {}, self.objSettings );
      widget.objPlayerInfo = Object.assign( {}, self.objPlayerInfo );
      widget.objStationInfo = Object.assign( {}, self.objStationInfo );

      widget.bind( SC.Widget.Events.READY, function() {
        widget.objPlayerInfo.boolIsReady = true;

        widget.bind( SC.Widget.Events.PLAY, function() {
          self.onPlay( widget );
        } );

        widget.bind( SC.Widget.Events.PAUSE, function() {
          self.onPause( widget );
        } );
      } );
    }

    if ( ! arrWidgets ) {
      delete self.widgets;
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
    const self = this;

    pozitoneModule.api.convertImageSrcToDataUrl(
        chrome.runtime.getURL( self.objStationInfo.strLogoDataUri )
      , function ( strDataUri ) {
          self.objStationInfo.strLogoDataUri = strDataUri;
        }
      , 5
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
    const widget = this.widget;

    if ( widget ) {
      return widget;
    }
    else {
      const widgets = this.initedWidgets;

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
    const self = this;

    widget.objPlayerInfo.boolIsPlaying = true;

    // get information about currently playing sound
    widget.getCurrentSound( function( objCurrentSound ) {
      widget.getVolume( function( flVolume ) {
        widget.objPlayerInfo.intVolume = pozitoneModule.api.convertVolumeToPercent( flVolume );
        widget.objStationInfo.strTrackInfo = pozitoneModule.api.setMediaInfo( objCurrentSound.user.username, objCurrentSound.title );

        if ( ! widget.objSettings.boolHadPlayedBefore ) {
          self.sendMediaEvent( 'onFirstPlay', widget );
          widget.objSettings.boolHadPlayedBefore = true;
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
    const self = this;

    widget.objPlayerInfo.boolIsPlaying = false;

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
    else {
      widget = this.getActiveWidget();
    }

    widget.objStationInfo.strAdditionalInfo =
      ( typeof strFeedback === 'string' && strFeedback !== '' )
        ? strFeedback
        : ''
        ;

    const objData = {
        boolIsUserLoggedIn : widget.objSettings.boolIsUserLoggedIn
      , boolDisregardSameMessage : widget.objSettings.boolDisregardSameMessage
      , objPlayerInfo : widget.objPlayerInfo
      , objStationInfo : widget.objStationInfo
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
    const self = this;
    const widget = self.getActiveWidget();

    widget.getVolume( function ( flVolume ) {
      widget.objPlayerInfo.intVolumeBeforeMuted = pozitoneModule.api.convertVolumeToPercent( flVolume );
      widget.objPlayerInfo.boolIsMuted = true;
      widget.setVolume( 0 );

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
    const widget = this.getActiveWidget();
    const intVolumeBeforeMuted = widget.objPlayerInfo.intVolumeBeforeMuted;

    widget.objPlayerInfo.boolIsMuted = false;
    widget.objPlayerInfo.intVolume = intVolumeBeforeMuted;
    widget.setVolume( pozitoneModule.api.convertPercentToVolume( intVolumeBeforeMuted ) );

    this.sendMediaEvent( 'onUnmute', widget );
  };

  /**
   * If volume is not 0, then mute. Otherwise, unmute.
   *
   * @type    method
   * @param   No Parameters Taken
   * @return  void
   **/

  PageWatcher.prototype.triggerPlayerAction_muteUnmute = function() {
    const self = this;
    const promise = new Promise( function( funcResolve, funcReject ) {
      self.getActiveWidget().getVolume( function ( flVolume ) {
        funcResolve( flVolume );
      } );
    } );

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

  /**
   * Init MutationObserver.
   *
   * @type    method
   * @param   $target
   *            The Node on which to observe DOM mutations.
   * @param   objOptions
   *            A MutationObserverInit object, specifies what DOM mutations should be reported.
   * @param   funcCallback
   *            A function which will be called on each DOM mutation.
   * @param   boolIsDisconnectable
   *            Optional. Whether this observer should be disconnected later.
   * @return  void
   **/

  PageWatcher.prototype.initObserver = function( $target, objOptions, funcCallback, boolIsDisconnectable ) {
    const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    if (  typeof boolIsDisconnectable === 'undefined'
      &&  ! boolIsDisconnectable
    ) {
      const observer = new MutationObserver( funcCallback );

      observer.observe( $target, objOptions );
    }
    else {
      // Disconnect the one set previously
      if ( this.DisconnectableObserver ) {
        this.DisconnectableObserver.disconnect();
      }

      this.DisconnectableObserver = new MutationObserver( funcCallback );
      this.DisconnectableObserver.observe( $target, objOptions );
    }
  };

  /**
   * Init <body /> observer
   *
   * @type    method
   * @param   No Parameters Taken
   * @return  void
   **/

  PageWatcher.prototype.initBodyObserver = function() {
    const self = this;
    const $target = document.body;
    const objOptions = {
        childList : true
      , subtree : true
    };
    const funcCallback = function( arrMutations ) {
      for ( var i = 0, l = arrMutations.length; i < l; i++ ) {
        var objMutationRecord = arrMutations[ i ]
          , arrAddedNodes = objMutationRecord.addedNodes
          ;

        if ( arrAddedNodes.length ) {
          for ( let i = arrAddedNodes.length - 1; i >= 0; i-- ) {
            const $node = arrAddedNodes[ i ];
            const $parentNode = $node.parentNode;

            if ( ! $parentNode ) {
              continue;
            }

            const $$soundcloudIframes = $parentNode.querySelectorAll( self.strSoundcloudIframeSelector );

            if ( $$soundcloudIframes && $$soundcloudIframes.length ) {
              // TODO: Fix: at http://www.pcworld.com/column/pcworld-podcast/, this fires multiple times
              self.init( self.createWidgetsArray( $$soundcloudIframes ) );
            }
          }
        }
      }
    };

    self.initObserver( $target, objOptions, funcCallback, true );
  };

  /**
   * Init <body /> observer
   *
   * @type    method
   * @param   $$soundcloudIframes
   *            SoundCloud widget iframe nodes.
   * @param   arrayWidgets
   *            Array to push initialized widget into.
   * @return  array
   **/

  PageWatcher.prototype.createWidgetsArray = function( $$soundcloudIframes, arrayWidgets ) {
    if ( ! arrayWidgets ) {
      arrayWidgets = [];
    }

    for ( let i = 0, intWidgetsCount = $$soundcloudIframes.length; i < intWidgetsCount; i++ ) {
      arrayWidgets.push( SC.Widget( $$soundcloudIframes[ i ] ) );
    }

    return arrayWidgets;
  };

  if ( typeof pozitoneModule === 'undefined' ) {
    window.pozitoneModule = {};
  }

  pozitoneModule.pageWatcher = new PageWatcher();
}() );
