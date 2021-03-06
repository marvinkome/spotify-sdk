const { Spotify } = require("../src");
const authData = require("../auth.json");
const { writeFileSync } = require("fs");
const { merge } = require("lodash");

// get playlist features
async function main(playlistId = "6f3lchHmBQed8GnWmayLn6", name = "unknown") {
  console.time("run-time");

  const spotify = await new Spotify(authData.clientID, authData.clientSecret);

  const playlistData = await spotify.getPlaylistTracks(playlistId, (item) => ({
    id: item.id,
    name: item.name,
    artist: item.artists.map((a) => a.name).join(","),
  }));

  // write to json file
  writeFileSync(`output/${name}-playlist.json`, JSON.stringify(playlistData));

  return console.timeEnd("run-time");
}

(async () => await main("37i9dQZEVXcN0pKiFKeFaA", "discover-weekly"))();
