const Spotify = require("../src");
const authData = require("../auth.json");
const { writeFileSync } = require("fs");
const { merge } = require("lodash");

const o_genre_playlist = {
  "Modern Rock": "5HufsVvMDoIPr9tGzoJpW0",
  Pop: "6gS3HhOiI17QNojjPuPzqc",
  Rock: "7dowgSWOmvdpwNkGFMUs6e",
  "Indie Pop": "1aYiM4zLmBuFq0Fg6NQb6a",
  "Indie Rock": "4XXr357Jej7eUBh7XPK8hb",
  "Modern Alternative Rock": "3PMlHfN3H3GmOcTgEcGwJT",
  "Indie Garage Rock": "7lCazMg1AalQrclLnSpn7v",
  Microhouse: "6FbDQuTcGT0IoZCtsbCISv",
  "Bedroom Pop": "339zjWDksACL7sNs2UehlX",
  House: "6AzCASXpbvX5o3F8yaj1y0",
  EDM: "3pDxuMpz94eDs7WFqudTbZ",
  Rap: "6s5MoZzR70Qef7x4bVxDO1",
  "Neo-psychedelic": "7qhZxfWGh9O2HWt3V7gpSA",
  "Stomp and Holler": "3zVZ3GsfiYp0vlVazHcDXI",
  "Psychedelic pop": "75MgjwXES1jwlJXcBVkrQh",
};

/**
 * Get all songs in a playlist related to a genre and store in a file
 *
 * @param {{ key: string }} genre_playlist
 * @param {string} outputFile
 */
async function main(genre_playlist, outputFile) {
  console.time("run-time");

  const spotify = await new Spotify(authData.clientID, authData.clientSecret);
  let songs = [];

  // map through object
  for (genre in genre_playlist) {
    const playlistId = genre_playlist[genre];

    // 200 songs per playlist
    const playlistTracks = await spotify.getPlaylistTracks(
      playlistId,
      // format songs
      (item) => ({
        id: item.id,
        name: item.name,
        artist: item.artists.map((a) => a.name).join(","),
        genre,
      }),
      2
    );

    console.log(`processed ${genre} of ${playlistTracks.length} songs`);
    songs.push(...playlistTracks);
  }

  const audioData = await spotify.getAudiosFeatures(
    songs.map((data) => data.id)
  );

  songs = merge(songs, audioData);

  // write to json file
  writeFileSync(outputFile, JSON.stringify(songs));

  console.timeEnd("run-time");

  return console.log(
    songs.length,
    "songs processed in and stored in genre_data.json"
  );
}

exports.default = main;
