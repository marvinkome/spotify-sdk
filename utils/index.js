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

module.exports = {
  formatSongData
};
