const axios = require("axios");
const querystring = require("querystring");
const { formatSongData } = require("./utils");

class Spotify {
  constructor(clientID, clientSecret) {
    this.clientID = clientID;
    this.clientSecret = clientSecret;
    this.token = null;
    this.axios = axios.create({
      baseURL: "https://api.spotify.com/v1/"
    });

    return (async () => {
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
          grant_type: "client_credentials"
        }),
        {
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${authKey}`
          }
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
        authKey
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
          type: "track"
        }
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
   * Gets all songs in a spotify playlist
   * @param {string} playlistId - The id of the playlist
   * @param {boolean} formatted - Format track or send raw data with all playlist item date
   *
   */
  async getPlaylistTracks(playlistId, formatted = true) {
    const songs = [];

    // make first request to get total pages count
    const { items, total, next } = await this.makePlaylistRequest(playlistId);

    // set tracks
    for (let item of items) {
      songs.push(formatted ? formatSongData(item.track) : item);
    }

    // get the total number of page (default is 100 per page)
    const total_pages = Math.ceil(total / 100);

    // go through total pages and repeat process
    if (total_pages > 1) {
      for (let i = 2; i <= total_pages; i++) {
        // make subsequent requests
        const { items } = await this.makePlaylistRequest(playlistId, next);

        // set tracks
        for (let item of items) {
          songs.push(formatSongData ? formatSongData(item.track) : item);
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
  async getAlbumTracks(albumId, formatted = true) {
    const songs = [];

    // make first request to get total pages count
    const { items, total, next } = await this.makeAlbumRequest(albumId);

    // set tracks
    for (let item of items) {
      songs.push(formatted ? formatSongData(item) : item);
    }

    // get the total number of page (default is 100 per page)
    const total_pages = Math.ceil(total / 100);

    // go through total pages and repeat process
    if (total_pages > 1) {
      for (let i = 2; i <= total_pages; i++) {
        // make subsequent requests
        const { items } = await this.makeAlbumRequest(albumId, next);

        // set tracks
        for (let item of items) {
          songs.push(formatSongData ? formatSongData(item.track) : item);
        }
      }
    }

    return songs;
  }

  // requests
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
}

exports.Spotify = Spotify;
