const authData = require("../auth.json");
const { Spotify } = require("../src");
const { writeFileSync } = require("fs");
const { merge } = require("lodash");

// get playlist features
async function main(playlistId = "6f3lchHmBQed8GnWmayLn6", name = "unknown") {
  const spotify = await new Spotify(authData.clientID, authData.clientSecret);

  const playlistData = await spotify.getPlaylistTracks(playlistId, (item) => ({
    id: item.id,
    name: item.name,
    album: item.album.name,
    artist: item.artists.map((a) => a.name).join(","),
    explicit: item.explicit,
    popularity: item.popularity,
  }));

  const audioData = await spotify.getAudiosFeatures(
    playlistData.map((data) => data.id)
  );

  const playlist_audio_feature = merge(playlistData, audioData);

  // write to json file
  writeFileSync(
    `output/${name}-playlist-features.json`,
    JSON.stringify(playlist_audio_feature)
  );
}

(async () => await main("37i9dQZEVXcN0pKiFKeFaA", "discover-weekly"))();
