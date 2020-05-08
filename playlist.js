const { Spotify } = require(".");
const { writeFileSync } = require("fs");
const { merge } = require("lodash");
const authData = require("auth.json");

// get playlist features
async function main(playlistId = "6f3lchHmBQed8GnWmayLn6") {
  const spotify = await new Spotify(authData.clientId, authData.clientSecret);

  const playlistData = await spotify.getPlaylistTracks(playlistId, item => ({
    id: item.id,
    name: item.name,
    artist: item.artists.map(a => a.name).join(",")
  }));

  const audioData = await spotify.getAudiosFeatures(
    playlistData.map(data => data.id)
  );

  const playlist_audio_feature = merge(playlistData, audioData);

  // write to json file
  writeFileSync("data.json", JSON.stringify(playlist_audio_feature));
}

(async () => await main())();
