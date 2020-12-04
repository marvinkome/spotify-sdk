const axios = require("axios");
const querystring = require("querystring");
const { chunk } = require("lodash");
const {
  formatSongData,
  openBrowserForAuth,
  readCache,
  cacheCode,
} = require("./utils");

class Spotify {
  constructor(clientID, clientSecret, options = { authType: null, scope: "" }) {
    this.clientID = clientID;
    this.clientSecret = clientSecret;
    this.token = null;
    this.axios = axios.create({
      baseURL: "https://api.spotify.com/v1/",
    });

    return (async () => {
      if (options.authType === "user") {
        await this.authorize_user(options.scope);
        return this;
      }

      await this.authorize();
      return this;
    })();
  }

  /**
   * Authorize and get spotify access token
   */
  async authorize() {
    const authKey = Buffer.from(
      `${this.clientID}:${this.clientSecret}`
    ).toString("base64");

    try {
      const axiosData = await axios.post(
        "https://accounts.spotify.com/api/token",
        querystring.stringify({
          grant_type: "client_credentials",
        }),
        {
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${authKey}`,
          },
        }
      );

      // set token
      const { access_token } = axiosData.data;
      this.axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${access_token}`;
      this.token = access_token;
    } catch (e) {
      console.error("SPOTIFY ERROR:: Error during authorization:", e.message);
      console.error({
        clientID: this.clientID,
        clientSecret: this.clientSecret,
        authKey,
      });
    }
  }

  async authorize_user(scope) {
    // get refresh token from cache
    const refresh_token = readCache("refresh_token");
    let code = null;

    const authKey = Buffer.from(
      `${this.clientID}:${this.clientSecret}`
    ).toString("base64");

    if (!refresh_token) {
      // go through normal auth
      code = (await openBrowserForAuth(this.clientID, scope)).code;
    }

    // get access token
    try {
      const axiosData = await axios.post(
        "https://accounts.spotify.com/api/token",
        querystring.stringify({
          grant_type: code ? "authorization_code" : "refresh_token",
          ...(code ? { code } : { refresh_token }),
          redirect_uri: "http://localhost:8008/callback",
        }),
        {
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${authKey}`,
          },
        }
      );

      // set access token
      const { access_token, refresh_token: new_token } = axiosData.data;

      this.axios.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${access_token}`;

      this.token = access_token;

      // cache refresh token
      if (new_token) {
        cacheCode("refresh_token", new_token);
      }
    } catch (e) {
      console.error(
        "SPOTIFY ERROR:: Error during authorization:",
        e.message,
        (e.response || {}).data
      );
      console.error({
        clientID: this.clientID,
        clientSecret: this.clientSecret,
        authKey,
      });
    }
  }

  /**
   * Search for a track and returns the first item found
   *
   * @param {string} title - The track title
   * @param {string} artist - The track artist
   * @param {boolean} formatted - Format track or send raw track data with all fields
   *
   * @returns {object} track details
   */
  async searchTrack(title, artist, formatted = true) {
    try {
      const { data } = await this.axios.get("/search", {
        params: {
          q: `track:${title} artist:${artist}`,
          type: "track",
        },
      });

      return formatted
        ? formatSongData(data.tracks.items[0])
        : data.tracks.items[0];
    } catch (e) {
      console.error("SPOTIFY ERROR:: searching for song:", e.message);
      console.error(e.config);
    }
  }

  /**
   * Get all playlist in by a user
   * This method requires user authType
   *
   * @param {string} title - The track title
   * @param {string} artist - The track artist
   * @param {boolean} formatted - Format track or send raw track data with all fields
   *
   * @returns {object} track details
   */
  async getUserPlaylists(formater) {
    const playlists = [];
    let next = null;

    // make first request to get total page count and next page
    let { items, total, ...resp } = await this.makeUserPlaylistRequest();
    next = resp.next;

    // set tracks
    for (let item of items) {
      playlists.push(formater ? formater(item) : item);
    }

    // get the total number of page (default is 20 per page)
    const total_pages = Math.ceil(total / 20);

    // go through total pages and repeat process
    if (total_pages > 1) {
      for (let i = 2; i <= total_pages; i++) {
        // make subsequent requests
        const { items, ...resp } = await this.makeUserPlaylistRequest(next);
        next = resp.next;

        // set tracks
        for (let item of items) {
          playlists.push(formater ? formater(item) : item);
        }
      }
    }

    return playlists;
  }

  async getUserAlbums(formater) {
    const playlists = [];
    let next = null;

    // make first request to get total page count and next page
    let { items, total, ...resp } = await this.makeUserAlbumRequest();
    next = resp.next;

    // set tracks
    for (let item of items) {
      playlists.push(formater ? formater(item) : item);
    }

    // get the total number of page (default is 20 per page)
    const total_pages = Math.ceil(total / 20);

    // go through total pages and repeat process
    if (total_pages > 1) {
      for (let i = 2; i <= total_pages; i++) {
        // make subsequent requests
        const { items, ...resp } = await this.makeUserAlbumRequest(next);
        next = resp.next;

        // set tracks
        for (let item of items) {
          playlists.push(formater ? formater(item) : item);
        }
      }
    }

    return playlists;
  }

  /**
   * Get all liked tracks in by a user
   * This method requires user authType
   *
   * @param {string} title - The track title
   * @param {string} artist - The track artist
   * @param {boolean} formatted - Format track or send raw track data with all fields
   *
   * @returns {object} track details
   */
  async getUserLikedSongs(formater) {
    const songs = [];
    let next = null;

    // make first request to get total page count and next page
    let { items, total, ...resp } = await this.makeUserLikedSongsRequest();
    next = resp.next;

    // set tracks
    for (let item of items) {
      songs.push(formater ? formater(item) : item);
    }

    // get the total number of page (default is 20 per page)
    const total_pages = Math.ceil(total / 20);

    // go through total pages and repeat process
    if (total_pages > 1) {
      for (let i = 2; i <= total_pages; i++) {
        // make subsequent requests
        const { items, ...resp } = await this.makeUserLikedSongsRequest(next);
        next = resp.next;

        // set tracks
        for (let item of items) {
          songs.push(formater ? formater(item) : item);
        }
      }
    }

    return songs;
  }

  /**
   * Gets all songs in a spotify playlist
   * @param {string} playlistId - The id of the playlist
   * @param {function} formater - A function that formats every item
   *
   */
  async getPlaylistTracks(playlistId, formater = formatSongData, pages = null) {
    const songs = [];
    let next = null;

    // make first request to get total pages count
    let { items, total, ...resp } = await this.makePlaylistRequest(playlistId);
    next = resp.next;

    // set tracks
    for (let item of items) {
      songs.push(formater ? formater(item.track) : item);
    }

    // get the total number of page (default is 100 per page)
    const total_pages = Math.ceil(total / 100);

    // go through total pages and repeat process
    if (total_pages > 1) {
      for (let i = 2; i <= total_pages; i++) {
        // limit the number of pages fetched
        if (pages) {
          if (i > pages) {
            break;
          }
        }

        // make subsequent requests
        const { items, ...resp } = await this.makePlaylistRequest(
          playlistId,
          next
        );
        next = resp.next;

        // set tracks
        for (let item of items) {
          songs.push(formater ? formater(item.track) : item);
        }
      }
    }

    return songs;
  }

  /**
   * Get all songs in a spotify album
   * @param {string} albumId
   * @param {boolean} formatted
   */
  async getAlbumTracks(albumId, formater = formatSongData) {
    const songs = [];
    let next = null;

    // make first request to get total pages count
    let { items, total, ...resp } = await this.makeAlbumRequest(albumId);
    next = resp.next;

    // set tracks
    for (let item of items) {
      songs.push(formater ? formater(item) : item);
    }

    // get the total number of page (default is 100 per page)
    const total_pages = Math.ceil(total / 100);

    // go through total pages and repeat process
    if (total_pages > 1) {
      for (let i = 2; i <= total_pages; i++) {
        // make subsequent requests
        const { items, ...resp } = await this.makeAlbumRequest(albumId, next);
        next = resp.next;

        // set tracks
        for (let item of items) {
          songs.push(formater ? formater(item.track) : item);
        }
      }
    }

    return songs;
  }

  /**
   * Get audio features of a track
   * @param {string[]} trackIds - track ids
   */
  async getAudiosFeatures(trackIds) {
    let audio_data = [];

    // split tracks in chunks
    const arrayOftrackIds = chunk(trackIds, 100);

    for (let tracks of arrayOftrackIds) {
      const data = await this.makeAudiosFeaturesRequest(tracks);
      audio_data = audio_data.concat(data.audio_features);
    }

    return audio_data;
  }

  // requests
  async makeUserPlaylistRequest(link = null) {
    try {
      const { data } = await this.axios.get(link || `/me/playlists`);
      return data;
    } catch (e) {
      console.error(
        "SPOTIFY ERROR:: cannot get user playlists data:",
        e.message
      );
      console.error(e.config);
      return {};
    }
  }

  async makeUserAlbumRequest(link = null) {
    try {
      const { data } = await this.axios.get(link || `/me/albums`);
      return data;
    } catch (e) {
      console.error("SPOTIFY ERROR:: cannot get user album data:", e.message);
      console.error(e.config);
      return {};
    }
  }

  async makeUserLikedSongsRequest(link = null) {
    try {
      const { data } = await this.axios.get(link || `/me/tracks`);
      return data;
    } catch (e) {
      console.error(
        "SPOTIFY ERROR:: cannot get user liked songs data:",
        e.message
      );
      console.error(e.config);
      return {};
    }
  }

  async makePlaylistRequest(playlistId, link = null) {
    try {
      const { data } = await this.axios.get(
        link || `/playlists/${playlistId}/tracks`
      );
      return data;
    } catch (e) {
      console.error("SPOTIFY ERROR:: cannot get playlist data:", e.message);
      console.error(e.config);
      return {};
    }
  }

  async makeAlbumRequest(albumId, link = null) {
    try {
      const { data } = await this.axios.get(
        link || `/albums/${albumId}/tracks`
      );

      return data;
    } catch (e) {
      console.error("SPOTIFY ERROR:: cannot get album data:", e.message);
      console.error(e.config);
      return {};
    }
  }

  async makeAudiosFeaturesRequest(trackIds) {
    try {
      const { data } = await this.axios.get("audio-features", {
        params: { ids: trackIds.join(",") },
      });

      return data;
    } catch (e) {
      console.error("SPOTIFY ERROR:: cannot get audio data:", e.message);
      console.error(e.config);
      return {};
    }
  }
}

exports.Spotify = Spotify;
