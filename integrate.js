/*
 * Copyright 2014 Daniel Schep <dschep@gmail.com>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met: 
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer. 
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution. 
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

"use strict";

(function(Nuvola)
{

var USE_QUICKCONNECT = 'app.use_quickconnect';
var QUICKCONNECT_ID = 'app.quickconnect_id';
var HOST = 'app.host';
var PORT = 'app.port';

// Create media player component
var player = Nuvola.$object(Nuvola.MediaPlayer);

// Handy aliases
var PlaybackState = Nuvola.PlaybackState;
var PlayerAction = Nuvola.PlayerAction;

// Create new WebApp prototype
var WebApp = Nuvola.$WebApp();

// add config for host & port
WebApp._onInitAppRunner = function(emitter)
{
    Nuvola.WebApp._onInitAppRunner.call(this, emitter);

    Nuvola.config.setDefault(USE_QUICKCONNECT, "");
    Nuvola.config.setDefault(QUICKCONNECT_ID, "");
    Nuvola.config.setDefault(HOST, "");
    Nuvola.config.setDefault(PORT, "");

    Nuvola.core.connect("InitializationForm", this);
    Nuvola.core.connect("PreferencesForm", this);
}

WebApp._onPreferencesForm = function(emitter, values, entries)
{
    this.appendPreferences(values, entries);
}

// init prefs
WebApp._onInitializationForm = function(emitter, values, entries)
{
    if (!Nuvola.config.hasKey(USE_QUICKCONNECT))
        this.appendPreferences(values, entries);
}

// add prefs
WebApp.appendPreferences = function(values, entries)
{
    values[USE_QUICKCONNECT] = Nuvola.config.get(USE_QUICKCONNECT);
    values[QUICKCONNECT_ID] = Nuvola.config.get(QUICKCONNECT_ID);
    values[HOST] = Nuvola.config.get(HOST);
    values[PORT] = Nuvola.config.get(PORT);
    entries.push(['header', 'Synology Audio Station']);
    entries.push(['label', 'Address of your Synology NAS']);
    entries.push(['option', USE_QUICKCONNECT, 'true',
        'use QuickConnect', [QUICKCONNECT_ID], [HOST, PORT]]);
    entries.push(['string', QUICKCONNECT_ID, 'QuickConnect ID']);
    entries.push(['option', USE_QUICKCONNECT, 'false',
        'use custom address', [HOST, PORT], [QUICKCONNECT_ID]]);
    entries.push(['string', HOST, 'Host']);
    entries.push(['string', PORT, 'Port']);
}

// home url handler
WebApp._onHomePageRequest = function(emitter, result)
{
    result.url = (Nuvola.config.get(USE_QUICKCONNECT) === 'true')
    ? Nuvola.format("http://{1}.quickconnect.to:5001", Nuvola.config.get(QUICKCONNECT_ID))
    : Nuvola.format("http://{1}:{2}", Nuvola.config.get(HOST), Nuvola.config.get(PORT))
    result.url += '/webman/index.cgi?launchApp=SYNO.SDS.AudioStation.Application';
}

// Initialization routines
WebApp._onInitWebWorker = function(emitter)
{
    Nuvola.WebApp._onInitWebWorker.call(this, emitter);

    var state = document.readyState;
    if (state === "interactive" || state === "complete")
        this._onPageReady();
    else
        document.addEventListener("DOMContentLoaded", this._onPageReady.bind(this));
}

// Page is ready for magic
WebApp._onPageReady = function()
{
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect("ActionActivated", this);

    // Start update routine
    this.update();
}

// Extract data from the web page
WebApp.update = function()
{
    var album_artist = document.querySelector('.info-album-artist');
    var track = {
        title: (document.querySelector('.info-title') || {}).textContent || null,
        artist: album_artist ? album_artist.textContent.split(' - ').slice(1).join(' - ') : null,
        album: album_artist ? album_artist.textContent.split(' - ', 1)[0] : null,
        artLocation: (document.querySelector('.player-info-thumb') || {}).src || null
    }
    player.setTrack(track);

    var song_info = document.querySelector('.syno-as-player-song-info')
    var play_pause_btn = document.querySelector('.player-play > .syno-ux-button');
    if (!song_info || song_info.style.visibility === 'hidden') {
        player.setPlaybackState(PlaybackState.UNKNOWN);
        player.setCanPlay(play_pause_btn != undefined);
        player.setCanPause(false);
    } else {
        if (!play_pause_btn || !play_pause_btn.classList.contains('player-btn-pause')) {
            player.setPlaybackState(PlaybackState.PAUSED);
            player.setCanPlay(true);
            player.setCanPause(false);
        } else {
            player.setPlaybackState(PlaybackState.PLAYING);
            player.setCanPlay(false);
            player.setCanPause(true);
        }
    }

    player.setCanGoNext(document.querySelector('.player-next') != undefined);
    player.setCanGoPrev(document.querySelector('.player-prev') != undefined);


    // Schedule the next update
    setTimeout(this.update.bind(this), 500);
}

// Handler of playback actions
WebApp._onActionActivated = function(emitter, name, param)
{
    switch (name) {
        case PlayerAction.PLAY:
        case PlayerAction.TOGGLE_PLAY:
        case PlayerAction.PAUSE:
            Nuvola.clickOnElement(document.querySelector('.player-play button'));
            break;
        case PlayerAction.STOP:
            Nuvola.clickOnElement(document.querySelector('.player-stop button'));
            break;
        case PlayerAction.NEXT_SONG:
            Nuvola.clickOnElement(document.querySelector('.player-next button'));
            break;
        case PlayerAction.PREV_SONG:
            Nuvola.clickOnElement(document.querySelector('.player-prev button'));
            break;
    }
}

WebApp.start();

})(this);  // function(Nuvola)
