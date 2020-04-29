const http = require("http");
const qs = require("querystring");
const url = require("url");
const open = require("open");
const fs = require("fs");

function formatSongData(item) {
  if (item.id === null) {
    return { title: "", artists: [""] };
  }

  const data = {
    album: item.album && item.album.name,
    artists:
      item.artists &&
      item.artists.reduce((a, c) => {
        a.push(c.name);
        return a;
      }, []),

    disc_number: item.disc_number,
    title: item.name,
    track_number: item.track_number,
    cover_art: item.album && item.album.images.find(i => i.height === 640).url,
    year: item.album && item.album.release_date.split("-")[0]
  };

  return data;
}

async function openBrowserForAuth(
  client_id,
  scope,
  show_dialog = true,
  port = 8008
) {
  const spotifyUrl =
    "https://accounts.spotify.com/authorize?" +
    qs.stringify({
      client_id,
      response_type: "code",
      redirect_uri: "http://localhost:8008/callback",
      scope,
      show_dialog
    });

  return new Promise(resolve => {
    // create a server to send and reciecve the auth code in a promise
    const server = http.createServer((req, res) => {
      // parse url to collect pathname and query
      const { pathname, query } = url.parse(req.url);

      // for initial route, redirect to spotify for auth
      if (pathname === "/") {
        res.writeHead(302, { location: spotifyUrl });
        return res.end();
      }

      // for callback get the code and kill the server
      if (pathname === "/callback") {
        const { code } = qs.parse(query);
        res.write("Authorization Successful");

        // kill server
        res.end();
        server.close(() => {
          return resolve({ code });
        });
      }

      res.end();
    });

    server.listen(port, () => {
      console.log("Server running on :8008");
      open("http://localhost:8008");
    });
  });
}

function cacheCode(key, value) {
  const cache = JSON.parse(fs.readFileSync("./cache.json"));

  cache[key] = value;

  fs.writeFileSync("./cache.json", JSON.stringify(cache));
  return true;
}

function readCache(key) {
  try {
    const file = fs.readFileSync("./cache.json");
    const data = JSON.parse(file)[key];

    return data;
  } catch (e) {
    return false;
  }
}

module.exports = {
  formatSongData,
  openBrowserForAuth,
  cacheCode,
  readCache
};
