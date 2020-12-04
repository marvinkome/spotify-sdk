const Spotify = require("../src");
const authData = require("../auth.json");
const blacklist = require("../blacklist.json");
const { writeFileSync } = require("fs");
const { merge, uniqBy } = require("lodash");

class MySpotifyData {
  constructor() {
    this.songs = [];

    return (async () => {
      this.spotify = await new Spotify(
        authData.clientID,
        authData.clientSecret,
        {
          authType: "user",
          scope: "playlist-read-private user-library-read",
        }
      );

      return this;
    })();
  }

  async main() {
    console.log("get playlist data");
    await this.getPlaylistsTracks();

    console.log("get album tracks");
    await this.getAlbumTracks();

    console.log("get liked songs");
    await this.getLikedSongs();

    this.songs = uniqBy(this.songs, "id");

    console.log("getting audio features");
    await this.getAudioFeatures();

    // write to json file
    writeFileSync("audio_data.json", JSON.stringify(this.songs));

    return console.log(
      this.songs.length,
      "songs process and stored in audio_data.json"
    );
  }

  async getPlaylistsTracks() {
    // get all my playlists
    let playlists = await this.spotify.getUserPlaylists((item) => ({
      id: item.id,
      name: item.name,
    }));

    playlists = playlists.filter(
      (item) => !blacklist.playlist.includes(item.name)
    );

    for (let playlist of playlists) {
      const playlistTracks = await this.spotify.getPlaylistTracks(
        playlist.id,
        (item) => ({
          id: item.id,
          name: item.name,
          artist: item.artists.map((a) => a.name).join(","),
          album: item.album.name,
          explicit: item.explicit,
          popularity: item.popularity,
          playlist: playlist.name,
        })
      );

      this.songs.push(...playlistTracks);
    }
  }

  async getLikedSongs() {
    let likedSongs = await this.spotify.getUserLikedSongs(({ track }) => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map((a) => a.name).join(","),
      album: track.album.name,
      explicit: track.explicit,
      popularity: track.popularity,
      playlist: "Liked Songs",
    }));

    this.songs.push(...likedSongs);
  }

  async getAlbumTracks() {
    // get all my albums
    let albums = await this.spotify.getUserAlbums((item) => ({
      id: item.album.id,
      name: item.album.name,
    }));

    for (let album of albums) {
      const albumTracks = await this.spotify.getAlbumTracks(
        album.id,
        (item) => ({
          id: item.id,
          name: item.name,
          artist: item.artists.map((a) => a.name).join(","),
          album: album.name,
          explicit: item.explicit,
          popularity: item.popularity,
          playlist: null,
        })
      );

      this.songs.push(...albumTracks);
    }
  }

  async getAudioFeatures() {
    const audioData = await this.spotify.getAudiosFeatures(
      this.songs.map((data) => data.id)
    );

    this.songs = merge(this.songs, audioData);
  }
}

async function main() {
  console.time("run-time");

  const myData = await new MySpotifyData();
  await myData.main();

  console.timeEnd("run-time");
}

main();
