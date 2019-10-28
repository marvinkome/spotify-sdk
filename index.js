const axios = require("axios");
const querystring = require("querystring");

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
   * @param {string} artist = The track artist
   *
   * @returns {object} track details
   */
  async searchTrack(title, artist) {
    try {
      const { data } = await this.axios.get("/search", {
        params: {
          q: `track:${title} artist:${artist}`,
          type: "track"
        }
      });

      return data.tracks.items[0];
    } catch (e) {
      console.error("SPOTIFY ERROR:: searching for song:", e.message);
      console.error(e.config);
    }
  }

  /**
   * Gets all songs in a spotify playlist
   * @param {string} playlistId - The id of the playlist
   */
  async getPlaylist(playlistId) {
    try {
      const { data } = await this.axios.get(`/playlists/${playlistId}/tracks`);
      return data;
    } catch (e) {
      console.error("SPOTIFY ERROR:: searching for song:", e.message);
      console.error(e.config);
    }
  }
}

exports.Spotify = Spotify;
