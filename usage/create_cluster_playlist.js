const fs = require("fs");
const authData = require("../auth.json");
const { groupBy } = require("lodash");
const { Spotify } = require("../src");

async function main(fileName) {
  let file;

  try {
    file = JSON.parse(fs.readFileSync(fileName));
  } catch (e) {
    console.log(e);
    return console.log("File not found");
  }

  const spotify = await new Spotify(authData.clientID, authData.clientSecret, {
    authType: "user",
    scope: "playlist-modify-public",
  });

  const clusterGroup = groupBy(file, "cluster");

  for (let [clusterKey, clusterSong] of Object.entries(clusterGroup)) {
    console.log("Create playlist for cluster", clusterKey);
    const songUris = clusterSong.map((song) => song.uri);

    await spotify.createPlaylist(
      `Liked songs mix ${clusterKey}`,
      songUris,
      "uayfxg5aa64qsu5i01s9bs51z"
    );

    console.log("Playlist created");
  }
}

(async () => await main("./input/liked_songs_clustered.json"))();
